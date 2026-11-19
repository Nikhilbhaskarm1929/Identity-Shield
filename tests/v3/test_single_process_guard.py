import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import lifespan
from app.v3.api import router as v3_router
from app.v3.lock import ProcessLock


def test_process_lock_acquisition_and_release(tmp_path):
    """Verify exclusive file lock acquire, reject second holder, and release."""
    lock_file = tmp_path / ".test_agents.lock"

    lock1 = ProcessLock(lock_path=lock_file)
    assert lock1.acquire() is True
    assert lock1.acquired is True
    assert lock1.holder_pid == os.getpid()

    # Second lock on same file must fail
    lock2 = ProcessLock(lock_path=lock_file)
    assert lock2.acquire() is False
    assert lock2.acquired is False
    assert lock2.holder_pid == os.getpid()

    # Release first lock
    lock1.release()
    assert lock1.acquired is False

    # Now second lock can acquire
    assert lock2.acquire() is True
    lock2.release()


def test_lifespan_disables_agents_on_secondary_worker(tmp_path):
    """Verify that if the lock is already held, lifespan sets disabled_secondary_worker."""
    lock_file = tmp_path / ".test_agents.lock"

    # Simulate primary worker holding the lock
    primary_lock = ProcessLock(lock_path=lock_file)
    assert primary_lock.acquire() is True

    test_app = FastAPI(lifespan=lifespan)
    test_app.include_router(v3_router)
    # Assign custom lock path pointing to the already-locked file
    secondary_lock = ProcessLock(lock_path=lock_file)
    test_app.state.process_lock = secondary_lock

    with TestClient(test_app) as client:
        # Check health endpoint
        h_resp = client.get("/api/v3/health")
        assert h_resp.status_code == 200
        h_data = h_resp.json()

        # Agents should be disabled on secondary worker
        assert h_data["agents"] == "disabled_secondary_worker"

        # Bus should report in_process mode
        assert h_data["bus"]["mode"] == "in_process"
        assert h_data["bus"]["workers_supported"] == 1

    # Cleanup primary lock
    primary_lock.release()
