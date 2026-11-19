"""Simulator package entry point."""
from app.config import SIMULATOR_MODE
from app.simulator.base import SimulatorAdapter
from app.simulator.mock import MockSimulator
from app.simulator.supplied import SuppliedSimulator

_mock_sim_instance: MockSimulator | None = None
_supplied_sim_instance: SuppliedSimulator | None = None


def get_simulator_mode() -> str:
    """Return active simulator mode ('supplied' or 'mock')."""
    from app.config import SIMULATOR_MODE
    return "supplied" if SIMULATOR_MODE == "supplied" else "mock"


def get_simulator() -> SimulatorAdapter:
    """Return configured simulator adapter instance."""
    global _mock_sim_instance, _supplied_sim_instance
    if get_simulator_mode() == "supplied":
        if _supplied_sim_instance is None:
            _supplied_sim_instance = SuppliedSimulator()
        return _supplied_sim_instance
    if _mock_sim_instance is None:
        _mock_sim_instance = MockSimulator()
    return _mock_sim_instance
