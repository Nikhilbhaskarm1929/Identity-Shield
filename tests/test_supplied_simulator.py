from datetime import datetime, timezone
import json
from unittest.mock import MagicMock, patch
import urllib.error

import pytest

from app.decision.respond import apply_action
from app.models import Alert
from app.simulator.base import SimulatorAdapter
from app.simulator.supplied import SuppliedSimulator


def _make_alert(alert_id="alt-1", identity_id="user@example.com", risk=50.0, band="step_up", action="step_up"):
    now = datetime.now(timezone.utc)
    return Alert(
        alert_id=alert_id,
        identity_id=identity_id,
        session_id="sess-1",
        risk=risk,
        confidence=0.85,
        band=band,
        patterns=["P1"],
        mitre=["T1078"],
        reasons=["Suspicious login"],
        evidence_event_ids=["evt-1"],
        recommended_action=action,
        first_seen=now,
        last_seen=now,
    )


def test_supplied_simulator_actions_mapping():
    """Verify each action produces the expected request payload."""
    sim = SuppliedSimulator(base_url="http://127.0.0.1:9999")

    captured_requests = []

    def fake_urlopen(req, timeout=5.0):
        body = json.loads(req.data.decode("utf-8"))
        captured_requests.append({"url": req.full_url, "method": req.get_method(), "body": body})
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"ref": f"supplied:{body['action']}:{body.get('identity_id', 'none')}:ok"}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=fake_urlopen):
        # 1. step_up
        res1 = sim.step_up("user@example.com", "sess-123", action_id="act-1")
        assert "supplied:step_up:user@example.com:ok" in res1

        # 2. restrict
        res2 = sim.restrict("user@example.com", "quarantine", action_id="act-2")
        assert "supplied:restrict:user@example.com:ok" in res2

        # 3. revoke
        res3 = sim.revoke("user@example.com", "sess-123", action_id="act-3")
        assert "supplied:revoke:user@example.com:ok" in res3

        # 4. disable_key
        res4 = sim.disable_key("AKIAIOSFODNN7EXAMPLE", action_id="act-4")
        assert "supplied:disable_key:AKIAIOSFODNN7EXAMPLE:ok" in res4

        # 5. block_ip
        res5 = sim.block_ip("198.51.100.42", action_id="act-5")
        assert "supplied:block_ip:198.51.100.42:ok" in res5

    assert len(captured_requests) == 5
    for req in captured_requests:
        assert req["url"] == "http://127.0.0.1:9999/enforce"
        assert req["method"] == "POST"


def test_supplied_simulator_retry_once():
    """Verify one retry on transient failure."""
    sim = SuppliedSimulator(base_url="http://127.0.0.1:9999")
    call_count = 0

    def fake_urlopen(req, timeout=5.0):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise urllib.error.URLError("Connection refused")
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"ref": "supplied:step_up:retry:ok"}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=fake_urlopen):
        res = sim.step_up("retry_user", action_id="act-retry")
        assert res == "supplied:step_up:retry:ok"
        assert call_count == 2


def test_supplied_simulator_failure_handled_cleanly():
    """Verify that permanent simulator failure is caught and turned into status=failed."""
    sim = SuppliedSimulator(base_url="http://127.0.0.1:9999")

    def failing_urlopen(req, timeout=5.0):
        raise urllib.error.URLError("Target simulator host down")

    alert = _make_alert("alt-fail-1", "sim_failure_user@example.com", risk=75.0, band="restrict", action="restrict")

    with patch("urllib.request.urlopen", side_effect=failing_urlopen):
        result = apply_action(alert, "restrict", approved_by="system", sim=sim)
        assert result.status == "failed"
        assert "Simulator execution error" in result.detail


def test_supplied_simulator_idempotency():
    """Verify action_id prevents duplicate network requests."""
    sim = SuppliedSimulator(base_url="http://127.0.0.1:9999")
    call_count = 0

    def fake_urlopen(req, timeout=5.0):
        nonlocal call_count
        call_count += 1
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"ref": "supplied:step_up:cached:ok"}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=fake_urlopen):
        res1 = sim.step_up("user@example.com", action_id="idemp-1")
        res2 = sim.step_up("user@example.com", action_id="idemp-1")
        assert res1 == res2
        assert call_count == 1, "Expected second call with same action_id to be served from cache"


def test_revoke_without_approval_blocked():
    """Verify revoke action requires explicit approval and is never sent to simulator."""
    sim = MagicMock(spec=SimulatorAdapter)
    alert = _make_alert("alt-rev-1", "bob@example.com", risk=95.0, band="revoke", action="revoke")

    # Without analyst approval
    res = apply_action(alert, "revoke", approved_by=None, sim=sim)
    assert res.status == "refused"
    assert "Revoke containment requires explicit analyst approval" in res.detail
    sim.revoke.assert_not_called()
