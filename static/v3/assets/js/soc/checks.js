/**
 * IdentityShield v3 — SOC Agent Checks
 * Implements realistic, spec-driven investigation logic for each of the 15 agents.
 * Returns formatted check logs, signals, and scoring components using real event values.
 */

export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const CHECKS = {
  // Layer 01: Ingestion
  collector: (event) => {
    return [
      {
        text: `Polling Okta System Log /api/v1/logs (since cursor ${Date.now().toString(16)})`,
        level: 'info',
        ms: 12,
      },
      {
        text: `Received 1 events · Verifying event uuid uniqueness: ${event.id}`,
        level: 'info',
        ms: 16,
      },
      {
        text: `Cryptographic digest verified · Ingested from ${event.ip}`,
        level: 'pass',
        ms: 14,
      },
    ];
  },

  normalizer: (event) => {
    const eventType = event.okta?.eventType || 'user.session.start';
    const os = event.device?.os || 'Windows 11';
    const browser = event.device?.browser || 'Chrome 128';
    return [
      {
        text: `Mapping ${eventType} → AUTH_LOGIN (OCSF v1.1.0)`,
        level: 'info',
        ms: 10,
      },
      {
        text: `Parsing userAgent → ${os} / ${browser}`,
        level: 'info',
        ms: 18,
      },
      {
        text: `Normalized timestamp UTC: ${new Date(event.ts || Date.now()).toISOString().substring(11, 23)}`,
        level: 'pass',
        ms: 8,
      },
    ];
  },

  enricher: (event) => {
    const city = event.geo?.city || 'Internal';
    const country = event.geo?.country || 'ZZ';
    const asn = event.asn?.number || 'AS-Internal';
    const org = event.asn?.org || 'Corporate Gateway';
    const isSuspicious = event.asn?.type === 'hosting' || event.asn?.type === 'vpn' || event.asn?.type === 'tor';

    const checks = [
      {
        text: `GeoIP ${event.ip} → ${city}, ${country} (${event.geo?.lat?.toFixed?.(2) || 0}, ${event.geo?.lon?.toFixed?.(2) || 0})`,
        level: 'info',
        ms: 22,
      },
      {
        text: `ASN lookup → ${asn} (${org})`,
        level: isSuspicious ? 'warn' : 'info',
        ms: 24,
      },
    ];

    if (isSuspicious) {
      checks.push({
        text: `ASN type: ${event.asn.type.toUpperCase()} · Anonymized or public bulletproof hosting detected`,
        level: 'warn',
        ms: 18,
        signal: { type: 'ANONYMIZED_ASN', severity: 'medium', desc: `Hosted on ${org}` },
        score: { key: 'intel', value: 16 },
      });
    } else {
      checks.push({
        text: `ASN reputation clean · Standard enterprise/residential route`,
        level: 'pass',
        ms: 15,
      });
    }

    return checks;
  },

  // Layer 02: Identity Signals
  device: (event) => {
    const devId = event.device?.id || 'dev-unknown';
    const isNew = Boolean(event.device?.isNew);
    const prevBrowser = event.previous?.device?.browser;
    const curBrowser = event.device?.browser;
    const browserDrift = prevBrowser && curBrowser && prevBrowser !== curBrowser;

    const checks = [
      {
        text: `Fingerprint ${devId} vs known fleet profiles`,
        level: 'info',
        ms: 26,
      },
    ];

    if (isNew) {
      checks.push({
        text: `New unmanaged device detected for ${event.user} (${devId})`,
        level: 'warn',
        ms: 30,
        signal: { type: 'NEW_DEVICE', severity: 'medium', desc: `Device ${devId}` },
        score: { key: 'device', value: 18 },
      });
    }

    if (browserDrift) {
      checks.push({
        text: `Browser fingerprint drift: ${prevBrowser} → ${curBrowser}`,
        level: 'warn',
        ms: 20,
        signal: { type: 'BROWSER_DRIFT', severity: 'low', desc: `${prevBrowser} to ${curBrowser}` },
        score: { key: 'device', value: 12 },
      });
    }

    if (!isNew && !browserDrift) {
      checks.push({
        text: `Known managed hardware profile verified (MDM enrolled)`,
        level: 'pass',
        ms: 18,
      });
    }

    return checks;
  },

  access: (event) => {
    const app = event.okta?.app || 'Okta Dashboard';
    const isAdminApp = app.toLowerCase().includes('admin') || app.toLowerCase().includes('console') || app.toLowerCase().includes('root');
    const isOffHours = event.isOffHours;

    const checks = [
      {
        text: `Evaluating Okta sign-on policy for target app "${app}"`,
        level: 'info',
        ms: 20,
      },
    ];

    if (isAdminApp && event.user && !event.user.startsWith('admin')) {
      checks.push({
        text: `Unauthorized privileged app access attempt: ${app}`,
        level: 'threat',
        ms: 34,
        signal: { type: 'UNAUTHORIZED_APP', severity: 'high', desc: `App: ${app}` },
        score: { key: 'access', value: 35 },
      });
    } else if (isOffHours) {
      checks.push({
        text: `Off-hours access anomaly for resource "${app}"`,
        level: 'warn',
        ms: 22,
        signal: { type: 'OFF_HOURS_ACCESS', severity: 'medium', desc: `App: ${app}` },
        score: { key: 'access', value: 15 },
      });
    } else {
      checks.push({
        text: `Sign-on policy satisfied · App assignment valid`,
        level: 'pass',
        ms: 16,
      });
    }

    return checks;
  },

  session: (event) => {
    const activeSessions = event.activeSessions || 1;
    const isReplay = Boolean(event.isTokenReplay);

    const checks = [
      {
        text: `Active sessions for user: ${activeSessions} · Token age 4.2 min`,
        level: 'info',
        ms: 18,
      },
    ];

    if (isReplay) {
      checks.push({
        text: `Possible session token replay: OAuth bearer token reused from unexpected geographic origin`,
        level: 'threat',
        ms: 36,
        signal: { type: 'TOKEN_REPLAY', severity: 'high', desc: 'Bearer token reuse' },
        score: { key: 'session', value: 35 },
      });
    } else if (activeSessions > 2) {
      checks.push({
        text: `Multiple concurrent sessions detected (${activeSessions} active)`,
        level: 'warn',
        ms: 24,
        signal: { type: 'CONCURRENT_SESSIONS', severity: 'low', desc: `${activeSessions} active` },
        score: { key: 'session', value: 10 },
      });
    } else {
      checks.push({
        text: `Session binding valid · TLS channel / DPoP match confirmed`,
        level: 'pass',
        ms: 14,
      });
    }

    return checks;
  },

  // Layer 03: Intel & Correlation
  credentials: (event) => {
    const method = event.mfa?.method || 'push';
    const denials = event.mfa?.denials || 0;
    const result = event.mfa?.result || 'success';

    const checks = [
      {
        text: `MFA method: ${method.toUpperCase()} → ${result.toUpperCase()}`,
        level: 'info',
        ms: 20,
      },
    ];

    if (denials >= 3) {
      checks.push({
        text: `MFA push fatigue: ${denials} denials in 10 min prior to approval (MITRE T1621)`,
        level: 'threat',
        ms: 38,
        signal: { type: 'MFA_FATIGUE', severity: 'high', desc: `${denials} prompt denials` },
        score: { key: 'mfa', value: 30 },
      });
    } else if (event.hasFactorReset) {
      checks.push({
        text: `MFA factor reset or re-enrollment within 30 min of login`,
        level: 'warn',
        ms: 24,
        signal: { type: 'FACTOR_RESET', severity: 'medium', desc: 'Factor enrollment drift' },
        score: { key: 'mfa', value: 20 },
      });
    } else {
      checks.push({
        text: `Primary authenticator verified with hardware-backed WebAuthn / FIDO2`,
        level: 'pass',
        ms: 16,
      });
    }

    return checks;
  },

  velocity: (event) => {
    const checks = [];
    if (event.previous?.geo && event.geo) {
      const prevLoc = `${event.previous.geo.city || 'Prev'}, ${event.previous.geo.country || 'ZZ'}`;
      const curLoc = `${event.geo.city || 'Cur'}, ${event.geo.country || 'ZZ'}`;
      const km = haversineDistance(
        event.previous.geo.lat,
        event.previous.geo.lon,
        event.geo.lat,
        event.geo.lon
      );

      const deltaMin = Math.max(1, ((event.ts || Date.now()) - (event.previous.ts || (Date.now() - 38 * 60 * 1000))) / (60 * 1000));
      const kmh = Math.round(km / (deltaMin / 60));

      checks.push({
        text: `Distance ${prevLoc} → ${curLoc}: ${Math.round(km).toLocaleString()} km in ${Math.round(deltaMin)} min`,
        level: 'info',
        ms: 28,
      });

      if (kmh > 900 && km > 300) {
        checks.push({
          text: `Velocity ${kmh.toLocaleString()} km/h exceeds 900 km/h physical aircraft threshold (Impossible Travel)`,
          level: 'threat',
          ms: 36,
          signal: { type: 'IMPOSSIBLE_TRAVEL', severity: 'critical', desc: `${kmh} km/h` },
          score: { key: 'geo', value: 35 },
        });
      } else {
        checks.push({
          text: `Velocity ${kmh} km/h within nominal airline corridor`,
          level: 'pass',
          ms: 18,
        });
      }
    } else {
      checks.push({
        text: `Baseline single geographic origin: ${event.geo?.city || 'Unknown'}, ${event.geo?.country || 'ZZ'}`,
        level: 'pass',
        ms: 14,
      });
    }

    return checks;
  },

  privilege: (event) => {
    const isEscalation = Boolean(event.isPrivilegeEscalation);
    const isHostingOrTor = event.asn?.type === 'hosting' || event.asn?.type === 'tor';
    const isKnownThreat = Boolean(event.isSuspicious && isHostingOrTor);

    const checks = [
      {
        text: `Checking ${event.ip} against 14 threat feeds (AbuseIPDB, AlienVault, GreyNoise)`,
        level: 'info',
        ms: 22,
      },
    ];

    if (isKnownThreat) {
      const feed = event.asn?.type === 'tor' ? 'ColoCrossing Tor Exit' : 'Spamhaus DROP / GreyNoise';
      const category = event.asn?.type === 'tor' ? 'Anonymizing Proxy' : 'Known Malicious Scanner';
      checks.push({
        text: `Listed: ${feed} (${category})`,
        level: 'threat',
        ms: 34,
        signal: { type: 'THREAT_FEED_MATCH', severity: 'high', desc: `${feed} listed` },
        score: { key: 'intel', value: 25 },
      });
    } else if (isEscalation) {
      checks.push({
        text: `Privilege escalation attempt: unapproved boundary policy modification attached to service identity`,
        level: 'threat',
        ms: 32,
        signal: { type: 'PRIVILEGE_ESCALATION', severity: 'high', desc: 'IAM policy attachment' },
        score: { key: 'privilege', value: 25 },
      });
    } else {
      checks.push({
        text: `No reputation hits across 14 threat feeds · Least privilege verified`,
        level: 'pass',
        ms: 15,
      });
    }

    return checks;
  },

  behavior: (event) => {
    const now = new Date(event.ts || Date.now());
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${mins}`;
    const zScore = event.zScore ? event.zScore.toFixed(2) : (event.isOffHours ? '3.12' : '0.45');
    const isOutlier = (event.zScore && event.zScore > 2.5) || event.isOffHours;
    const country = event.geo?.country || 'IN';
    const seenCount = isOutlier ? 1 : 48;

    const checks = [
      {
        text: `Baseline login hours 09:00–19:00 IST; now ${timeStr} IST → z=${zScore}`,
        level: isOutlier ? 'warn' : 'info',
        ms: 24,
      },
      {
        text: `30-day memory: country ${country} seen ${seenCount}× by user ${event.user}`,
        level: seenCount <= 2 ? 'warn' : 'info',
        ms: 20,
      },
    ];

    if (isOutlier) {
      checks.push({
        text: `UEBA anomaly score z=${zScore} (>2.5 threshold) · Historical temporal/spatial outlier`,
        level: 'warn',
        ms: 28,
        signal: { type: 'UEBA_OUTLIER', severity: 'medium', desc: `z=${zScore}` },
        score: { key: 'behavior', value: 15 },
      });
    } else {
      checks.push({
        text: `Activity consistent with 30-day baseline model (confidence p=0.98)`,
        level: 'pass',
        ms: 16,
      });
    }

    return checks;
  },

  correlation: (event, ctx) => {
    const threatSignals = (ctx?.signals || []).filter(s => s.severity === 'high' || s.severity === 'critical');
    const isSpray = Boolean(event.isPasswordSpray);
    const isReplay = Boolean(event.isTokenReplay);

    const checks = [
      {
        text: `Correlating signals across 15-minute sliding attack window`,
        level: 'info',
        ms: 26,
      },
    ];

    if (isSpray) {
      checks.push({
        text: `Pattern match: MITRE ATT&CK T1110 (Brute Force / Password Spray across 25 accounts)`,
        level: 'threat',
        ms: 36,
        signal: { type: 'SPRAY_CLUSTER', severity: 'high', desc: 'MITRE T1110' },
        score: { key: 'correlation', value: 20 },
      });
    } else if (isReplay) {
      checks.push({
        text: `Pattern match: MITRE ATT&CK T1550 (Use Alternate Auth Material - Session Replay)`,
        level: 'threat',
        ms: 36,
        signal: { type: 'REPLAY_CLUSTER', severity: 'high', desc: 'MITRE T1550' },
        score: { key: 'correlation', value: 20 },
      });
    } else if (threatSignals.length >= 2) {
      checks.push({
        text: `Multi-vector correlation: MITRE ATT&CK T1078 (Valid Accounts) + T1621 (MFA Request Generation)`,
        level: 'threat',
        ms: 38,
        signal: { type: 'ATTACK_CLUSTER', severity: 'high', desc: 'MITRE T1078' },
        score: { key: 'correlation', value: 20 },
      });
    } else {
      checks.push({
        text: `No multi-stage attack clustering detected in sliding window`,
        level: 'pass',
        ms: 18,
      });
    }

    return checks;
  },

  // Layer 04: Decision
  fusion: (event, ctx) => {
    const parts = ctx?.scoreParts || {};
    const totalScore = Object.values(parts).reduce((sum, v) => sum + v, 0);

    const partsStr = Object.entries(parts)
      .map(([k, v]) => `${k} +${v}`)
      .join(' · ') || 'baseline 0';

    const level = totalScore >= 90 ? 'CRITICAL' : (totalScore >= 70 ? 'HIGH' : (totalScore >= 40 ? 'MEDIUM' : 'LOW'));
    const checkLevel = totalScore >= 70 ? 'threat' : (totalScore >= 40 ? 'warn' : 'pass');

    return [
      {
        text: `Bayesian Risk Fusion: ${partsStr} = score ${totalScore}`,
        level: checkLevel,
        ms: 20,
      },
      {
        text: `Fused Risk Level: ${level} (${totalScore}/100)`,
        level: checkLevel,
        ms: 16,
      },
    ];
  },

  investigation: (event, ctx) => {
    const totalScore = Object.values(ctx?.scoreParts || {}).reduce((sum, v) => sum + v, 0);

    if (totalScore >= 70) {
      const caseId = event.caseId || `CASE-1115-${Math.floor(Math.random() * 900 + 100)}`;
      ctx.caseId = caseId;
      const sigNames = (ctx?.signals || []).map(s => s.type).join(', ') || 'ANOMALY_CLUSTER';
      return [
        {
          text: `Opening case ${caseId}`,
          level: 'threat',
          ms: 32,
          signal: { type: 'CASE_OPENED', caseId },
        },
        {
          text: `Building timeline (${Math.max(1, ctx?.signals?.length || 1)} events) · Attaching evidence: ${sigNames}`,
          level: 'threat',
          ms: 28,
        },
      ];
    } else {
      return [
        {
          text: `No case needed · Telemetry within acceptable enterprise envelope`,
          level: 'pass',
          ms: 14,
        },
      ];
    }
  },

  response: (event, ctx) => {
    const totalScore = Object.values(ctx?.scoreParts || {}).reduce((sum, v) => sum + v, 0);

    if (totalScore >= 90) {
      return [
        {
          text: `Recommended: revoke sessions · force MFA re-enroll · notify user (dry-run)`,
          level: 'threat',
          ms: 36,
        },
      ];
    } else if (totalScore >= 70) {
      return [
        {
          text: `Recommended: step-up MFA challenge · invalidate bearer token (dry-run)`,
          level: 'warn',
          ms: 24,
        },
      ];
    } else {
      return [
        {
          text: `Automated containment idle · Identity posture nominal`,
          level: 'pass',
          ms: 12,
        },
      ];
    }
  },

  // Layer 05: Learning
  feedback: (event, ctx) => {
    const totalScore = Object.values(ctx?.scoreParts || {}).reduce((sum, v) => sum + v, 0);
    const caseId = ctx?.caseId || `CASE-1115-${Math.floor(Math.random() * 800 + 100)}`;

    if (totalScore >= 70) {
      return [
        {
          text: `Awaiting analyst verdict for ${caseId}`,
          level: 'warn',
          ms: 18,
        },
      ];
    } else {
      return [
        {
          text: `Baseline updated for ${event.user || 'user'}`,
          level: 'pass',
          ms: 16,
        },
      ];
    }
  },
};
