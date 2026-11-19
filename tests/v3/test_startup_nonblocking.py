import time
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
import networkx as nx
import pandas as pd
import pytest

from app.main import lifespan
from app.pipeline import PipelineResult
from app.v3.api import router as v3_router


def create_test_app(pipeline_fn):
    test_app = FastAPI(lifespan=lifespan)
    test_app.state._is_async_startup_test = True
    test_app.include_router(v3_router)
    return test_app


def test_startup_nonblocking_and_readiness_transitions():
    """Verify server answers immediately with warming_up, then transitions to ready."""
    def slow_pipeline(*args, **kwargs):
        time.sleep(0.6)
        return PipelineResult(
            events=pd.DataFrame([{"id": 1}, {"id": 2}, {"id": 3}]),
            graph=nx.MultiDiGraph(),
            alerts=[],
            metrics=MagicMock(),
            status="ok",
            detail="done",
            data_mode="sample",
        )

    with patch("app.main.run_pipeline", side_effect=slow_pipeline):
        test_app = create_test_app(slow_pipeline)
        start_time = time.time()
        with TestClient(test_app) as client:
            elapsed_startup = time.time() - start_time
            # Startup must be fast (< 1.0s) because pipeline runs in background
            assert elapsed_startup < 1.0, f"Startup blocked for {elapsed_startup:.2f}s"

            # 1. Health immediately responds during warm-up
            h_resp = client.get("/api/v3/health")
            assert h_resp.status_code == 200
            h_data = h_resp.json()
            assert h_data["pipeline"] == "warming_up"
            assert h_data["events_processed"] == 0

            # 2. /ready returns 503 during warm-up
            ready_resp = client.get("/api/v3/ready")
            assert ready_resp.status_code == 503

            # 3. /cases returns 503 during warm-up
            cases_resp = client.get("/api/v3/cases")
            assert cases_resp.status_code == 503
            assert "warming up" in cases_resp.json().get("detail", "").lower()

            # Wait for background pipeline to complete
            time.sleep(1.0)

            # 4. Now /ready returns 200
            ready_resp2 = client.get("/api/v3/ready")
            assert ready_resp2.status_code == 200
            assert ready_resp2.json()["pipeline"] == "ready"
            assert ready_resp2.json()["events_processed"] == 3

            # 5. Cases returns 200 once ready
            cases_resp2 = client.get("/api/v3/cases")
            assert cases_resp2.status_code == 200


def test_startup_pipeline_error_sets_error_state():
    """Verify failure in background run surfaces as pipeline: error."""
    def broken_pipeline(*args, **kwargs):
        raise RuntimeError("Corrupted sample parquet file")

    with patch("app.main.run_pipeline", side_effect=broken_pipeline):
        test_app = create_test_app(broken_pipeline)
        with TestClient(test_app) as client:
            time.sleep(0.3)
            h_resp = client.get("/api/v3/health")
            assert h_resp.status_code == 200
            assert h_resp.json()["pipeline"] == "error"

            ready_resp = client.get("/api/v3/ready")
            assert ready_resp.status_code == 503
            assert "Corrupted sample parquet file" in ready_resp.json().get("detail", "")
