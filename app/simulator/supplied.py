"""Adapter for hackathon organizers' supplied simulator (HTTP interface)."""
import json
import logging
import urllib.error
import urllib.request
from typing import Any

from app.simulator.base import SimulatorAdapter

log = logging.getLogger(__name__)


class SuppliedSimulator(SimulatorAdapter):
    mode: str = "supplied"

    def __init__(self, base_url: str | None = None, timeout: float = 5.0) -> None:
        if base_url is None:
            from app.config import SIMULATOR_URL
            base_url = SIMULATOR_URL
        self.base_url = (base_url or "http://127.0.0.1:9000").rstrip("/")
        self.timeout = timeout
        self._executed: dict[str, str] = {}  # action_id -> result ref

    def _post(self, payload: dict[str, Any], attempt: int = 1) -> dict[str, Any]:
        data = json.dumps(payload).encode("utf-8")
        url = f"{self.base_url}/enforce"
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_bytes = resp.read()
                return json.loads(resp_bytes.decode("utf-8")) if resp_bytes else {"status": "ok"}
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
            if attempt < 2:
                log.warning("Supplied simulator request failed (%s), retrying once...", exc)
                return self._post(payload, attempt=attempt + 1)
            err_msg = str(getattr(exc, "reason", exc))
            log.error("Supplied simulator error for action %s: %s", payload.get("action"), err_msg)
            raise RuntimeError(f"Supplied simulator execution error: {err_msg}") from exc

    def _execute(self, action: str, params: dict[str, Any], action_id: str | None = None) -> str:
        if action_id and action_id in self._executed:
            return self._executed[action_id]

        payload = {"action": action, "action_id": action_id, **params}
        res = self._post(payload)
        ref = res.get("ref") or res.get("result") or f"supplied:{action}:{params.get('identity_id', 'target')}:ok"
        if action_id:
            self._executed[action_id] = ref
        return ref

    def step_up(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        return self._execute("step_up", {"identity_id": identity_id, "session_id": session_id}, action_id=action_id)

    def restrict(self, identity_id: str, scope: str = "default", action_id: str | None = None) -> str:
        return self._execute("restrict", {"identity_id": identity_id, "scope": scope}, action_id=action_id)

    def revoke(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        return self._execute("revoke", {"identity_id": identity_id, "session_id": session_id}, action_id=action_id)

    def revoke_sessions(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        return self.revoke(identity_id=identity_id, session_id=session_id, action_id=action_id)

    def disable_key(self, identity_id: str, action_id: str | None = None) -> str:
        return self._execute("disable_key", {"identity_id": identity_id}, action_id=action_id)

    def block_ip(self, ip_address: str, action_id: str | None = None) -> str:
        return self._execute("block_ip", {"ip_address": ip_address, "identity_id": ip_address}, action_id=action_id)

    def rollback(self, action_id: str) -> str:
        return self._execute("rollback", {"action_id": action_id}, action_id=f"rb_{action_id}")
