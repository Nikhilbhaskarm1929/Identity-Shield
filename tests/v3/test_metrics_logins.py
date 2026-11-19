"""Test for GET /api/v3/metrics/logins."""
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.v3.store import set_db_path, create_tables, insert_many


def test_metrics_logins_endpoint(tmp_path: Path):
    db_file = tmp_path / "test_logins.db"
    set_db_path(db_file)
    create_tables(db_file)

    # Insert dummy login events
    events = [
        {
            "event_id": "ev-001",
            "time": "2026-10-27T10:15:00Z",
            "source": "okta",
            "event_class": "auth",
            "action": "user.session.start",
            "identity_id": "user1",
            "raw_principal": "user1@corp.example",
            "session_id": "s1",
            "src_ip": "1.2.3.4",
            "user_agent": "Mozilla/5.0",
            "outcome": "success",
            "read_only": True,
            "late": False,
            "uncatalogued": False,
            "resolution_confidence": 1.0,
            "attrs": "{}",
        },
        {
            "event_id": "ev-002",
            "time": "2026-10-27T10:45:00Z",
            "source": "okta",
            "event_class": "auth",
            "action": "user.session.start",
            "identity_id": "user2",
            "raw_principal": "user2@corp.example",
            "session_id": "s2",
            "src_ip": "5.6.7.8",
            "user_agent": "Mozilla/5.0",
            "outcome": "success",
            "read_only": True,
            "late": False,
            "uncatalogued": False,
            "resolution_confidence": 1.0,
            "attrs": "{}",
        },
        {
            "event_id": "ev-003",
            "time": "2026-10-28T09:00:00Z",
            "source": "cloudtrail",
            "event_class": "auth",
            "action": "AssumeRoleWithSAML",
            "identity_id": "user1",
            "raw_principal": "user1@corp.example",
            "session_id": "s3",
            "src_ip": "1.2.3.4",
            "user_agent": "Boto3",
            "outcome": "success",
            "read_only": True,
            "late": False,
            "uncatalogued": False,
            "resolution_confidence": 1.0,
            "attrs": "{}",
        },
    ]
    insert_many("events_v3", events)

    # Insert a signal citing ev-001 as evidence
    signal = [{
        "signal_id": "sig-001",
        "detection_id": "D-ACC-01",
        "agent_num": 5,
        "identity_id": "user1",
        "session_id": "s1",
        "strength": 0.9,
        "confidence": 0.8,
        "evidence_event_ids": '["ev-001"]',
        "mitre": '["T1078"]',
        "stage": "initial_access",
        "summary": "Suspicious login",
        "details": "{}",
        "created_at": "2026-10-27T10:15:05Z",
    }]
    insert_many("signals_v3", signal)

    with TestClient(app) as client:
        # Test default daily bucket
        resp = client.get("/api/v3/metrics/logins")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

        # 2026-10-27 has 2 logins, 1 suspicious
        day1 = next(d for d in data if d["t"] == "2026-10-27")
        assert day1["total"] == 2
        assert day1["suspicious"] == 1

        # 2026-10-28 has 1 login, 0 suspicious
        day2 = next(d for d in data if d["t"] == "2026-10-28")
        assert day2["total"] == 1
        assert day2["suspicious"] == 0

        # Test hourly bucket
        resp_hour = client.get("/api/v3/metrics/logins?bucket=hour")
        assert resp_hour.status_code == 200
        hour_data = resp_hour.json()
        assert len(hour_data) == 2
