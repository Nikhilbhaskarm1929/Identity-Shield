"""Verify that the dashboard contains zero hardcoded mockup values."""
from pathlib import Path

FORBIDDEN_STRINGS = [
    "98.7",
    "12.4K",
    "142 ms",
    "Risk Score: 92",
    "Protection Rate",
]


def test_dashboard_v3_no_hardcoded():
    dashboard_path = Path("static/v3/index.html")
    assert dashboard_path.exists(), "static/v3/index.html must exist"
    content = dashboard_path.read_text(encoding="utf-8")

    for forbidden in FORBIDDEN_STRINGS:
        assert forbidden not in content, f"Found hardcoded '{forbidden}' in {dashboard_path}"


def test_dashboard_root_no_hardcoded():
    root_path = Path("static/index.html")
    if root_path.exists():
        content = root_path.read_text(encoding="utf-8")
        for forbidden in FORBIDDEN_STRINGS:
            assert forbidden not in content, f"Found hardcoded '{forbidden}' in {root_path}"
