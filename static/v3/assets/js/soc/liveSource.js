/**
 * IdentityShield v3 — SOC Live Data Source
 * Subscribes to live SSE stream (/api/v3/stream) or falls back to polling /api/v3/events,
 * normalizing incoming payloads to canonical LoginEvent format.
 */

export class LiveSource {
  constructor(onEventCallback, onStatusCallback) {
    this.onEvent = onEventCallback;
    this.onStatus = onStatusCallback;
    this.evtSource = null;
    this.pollTimer = null;
    this.idleTimer = null;
    this.isConnected = false;
  }

  connect() {
    this.disconnect();

    if (typeof EventSource !== 'undefined') {
      try {
        this.evtSource = new EventSource('/api/v3/stream');

        this.evtSource.onopen = () => {
          this.isConnected = true;
          if (this.onStatus) this.onStatus({ status: 'connected', mode: 'live' });
          this.resetIdleTimer();
        };

        this.evtSource.onmessage = (e) => {
          this.resetIdleTimer();
          try {
            const raw = JSON.parse(e.data);
            const normalized = this.normalize(raw);
            if (this.onEvent) this.onEvent(normalized);
          } catch (err) {
            console.error('Failed to parse SSE payload:', err);
          }
        };

        this.evtSource.onerror = () => {
          // Fall back to polling if SSE endpoint is not active
          if (this.evtSource) {
            this.evtSource.close();
            this.evtSource = null;
          }
          this.startPolling();
        };

        return;
      } catch (err) {
        console.warn('SSE initialization failed, falling back to polling:', err);
      }
    }

    this.startPolling();
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);

    const poll = async () => {
      try {
        const res = await fetch('/api/v3/events?limit=5');
        if (res.ok) {
          const data = await res.json();
          this.isConnected = true;
          if (this.onStatus) this.onStatus({ status: 'connected', mode: 'poll' });
          this.resetIdleTimer();

          const list = data.events || data || [];
          if (Array.isArray(list) && list.length > 0) {
            list.forEach((raw) => {
              const normalized = this.normalize(raw);
              if (this.onEvent) this.onEvent(normalized);
            });
          }
        }
      } catch (err) {
        this.isConnected = false;
        if (this.onStatus) this.onStatus({ status: 'offline', mode: 'error' });
      }
    };

    poll();
    this.pollTimer = setInterval(poll, 4000);
  }

  resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.onStatus) this.onStatus({ status: 'idle', message: 'Waiting for Okta events…' });
    }, 10000);
  }

  normalize(raw) {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return {
      id: raw.id || `EVT-${randomHex}`,
      ts: raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now(),
      user: raw.user_id || raw.actor?.alternateId || raw.user || 'omana@corp.example',
      ip: raw.ip || raw.client?.ipAddress || '115.114.78.22',
      geo: {
        city: raw.city || raw.client?.geographicalContext?.city || 'Bengaluru',
        country: raw.country || raw.client?.geographicalContext?.country || 'IN',
        lat: raw.latitude || raw.client?.geographicalContext?.geolocation?.lat || 12.97,
        lon: raw.longitude || raw.client?.geographicalContext?.geolocation?.lon || 77.59,
      },
      asn: {
        number: raw.asn || 'AS13335',
        org: raw.isp || raw.org || 'Cloudflare Enterprise',
        type: raw.is_vpn ? 'vpn' : (raw.is_hosting ? 'hosting' : 'isp'),
      },
      device: {
        id: raw.device_id || 'dev-mac-014',
        os: raw.os || 'macOS 14.5',
        browser: raw.browser || 'Chrome 128',
        isNew: Boolean(raw.is_new_device),
      },
      mfa: {
        method: raw.mfa_factor || 'push',
        result: raw.mfa_status || 'success',
        denials: raw.mfa_denials || 0,
      },
      okta: {
        eventType: raw.event_type || 'user.session.start',
        outcome: raw.outcome || 'SUCCESS',
        app: raw.target_app || 'Okta Dashboard',
      },
      previous: raw.previous_event || null,
      isSuspicious: Boolean(raw.risk_score && raw.risk_score >= 70),
    };
  }

  disconnect() {
    if (this.evtSource) {
      this.evtSource.close();
      this.evtSource = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.isConnected = false;
  }
}
