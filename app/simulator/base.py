"""Base interface for security enforcement simulator adapters."""

class SimulatorAdapter:
    def step_up(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        raise NotImplementedError

    def restrict(self, identity_id: str, scope: str = "default", action_id: str | None = None) -> str:
        raise NotImplementedError

    def revoke(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        raise NotImplementedError

    def revoke_sessions(self, identity_id: str, session_id: str | None = None, action_id: str | None = None) -> str:
        return self.revoke(identity_id=identity_id, session_id=session_id, action_id=action_id)

    def disable_key(self, identity_id: str, action_id: str | None = None) -> str:
        raise NotImplementedError

    def block_ip(self, ip_address: str, action_id: str | None = None) -> str:
        raise NotImplementedError

    def rollback(self, action_id: str) -> str:
        raise NotImplementedError
