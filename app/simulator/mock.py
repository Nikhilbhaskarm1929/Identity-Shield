"""In-memory mock simulator adapter recording calls."""
from app.simulator.base import SimulatorAdapter


class MockSimulator(SimulatorAdapter):
    mode: str = "mock"

    def __init__(self) -> None:
        self.calls: list[dict] = []

    def step_up(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        self.calls.append({"action": "step_up", "identity_id": identity_id, "session_id": session_id, "action_id": action_id})
        return "simulated:step_up:ok"

    def restrict(self, identity_id: str, scope: str = "default", action_id: str | None = None) -> str:
        self.calls.append({"action": "restrict", "identity_id": identity_id, "scope": scope, "action_id": action_id})
        return "simulated:restrict:ok"

    def revoke(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        self.calls.append({"action": "revoke", "identity_id": identity_id, "session_id": session_id, "action_id": action_id})
        return "simulated:revoke:ok"

    def revoke_sessions(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        return self.revoke(identity_id=identity_id, session_id=session_id, action_id=action_id)

    def disable_key(self, identity_id: str, action_id: str | None = None) -> str:
        self.calls.append({"action": "disable_key", "identity_id": identity_id, "action_id": action_id})
        return f"simulated:disable_key:{identity_id}:ok"

    def block_ip(self, ip_address: str, action_id: str | None = None) -> str:
        self.calls.append({"action": "block_ip", "ip_address": ip_address, "action_id": action_id})
        return f"simulated:block_ip:{ip_address}:ok"

    def rollback(self, action_id: str) -> str:
        self.calls.append({"action": "rollback", "action_id": action_id})
        return f"simulated:rollback:{action_id}:ok"
