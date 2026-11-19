import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from fastapi.testclient import TestClient

from app.main import app


def test_vendor_libraries_exist_and_hashes_match():
    vendor_dir = Path("static/vendor")
    assert vendor_dir.exists(), "Vendor directory does not exist"

    versions_file = vendor_dir / "VERSIONS.md"
    assert versions_file.exists(), "VERSIONS.md does not exist"
    versions_text = versions_file.read_text(encoding="utf-8")

    # Match rows like: | Library | `filename` | Version | Source URL | `sha256` | Size |
    row_pattern = re.compile(r"\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`([0-9a-fA-F]{64})`\s*\|\s*(\d+)\s*\|")
    matches = row_pattern.findall(versions_text)
    assert len(matches) >= 4, f"Found fewer vendor entries than expected: {len(matches)}"

    for lib_name, rel_path, version, source_url, expected_sha256, expected_size in matches:
        file_path = vendor_dir / rel_path
        assert file_path.exists(), f"Missing vendored library: {rel_path} ({lib_name})"
        file_bytes = file_path.read_bytes()
        assert len(file_bytes) > 1000, f"Vendored library unexpectedly small: {rel_path}"

        actual_sha256 = hashlib.sha256(file_bytes).hexdigest()
        assert actual_sha256 == expected_sha256, (
            f"SHA256 mismatch for {rel_path}:\n  expected {expected_sha256}\n  got      {actual_sha256}"
        )


def test_theme_css_tokens():
    theme_path = Path("static/v3/css/theme.css")
    assert theme_path.exists(), "Theme CSS does not exist"
    content = theme_path.read_text(encoding="utf-8")

    required_token_names = [
        "--bg",
        "--surface",
        "--panel",
        "--panel-border",
        "--text",
        "--muted",
        "--brand",
        "--cyan",
        "--violet",
        "--ok",
        "--warn",
        "--crit",
        "--radius-panel",
        "--radius-control",
    ]

    for token in required_token_names:
        # Check that token is defined with a value: e.g., --bg: <value>;
        pattern = re.compile(rf"{re.escape(token)}\s*:\s*([^;}}]+)[;}}]")
        match = pattern.search(content)
        assert match is not None, f"Missing token definition in theme.css: {token}"
        val = match.group(1).strip()
        assert len(val) > 0, f"Token {token} has empty value"

    required_classes = [
        ".glass",
        ".btn-primary",
        ".btn-ghost",
        ".btn-danger",
        "badge-band",
        "mitre-chip",
        ".skeleton",
        "prefers-reduced-motion",
    ]

    for cls in required_classes:
        assert cls in content, f"Missing token or class in theme.css: {cls}"


def test_core_and_fx_js_files_exist():
    # Parse <script ... src="..."> from static/v3/*.html and import statements in static/v3/js/core/*.js
    v3_dir = Path("static/v3")
    referenced_files = set()

    for html_file in v3_dir.glob("*.html"):
        text = html_file.read_text(encoding="utf-8")
        # Find script src
        for match in re.finditer(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']', text, re.IGNORECASE):
            src = match.group(1).split("?")[0]
            if not urlparse(src).scheme:
                # Local path
                if src.startswith("/"):
                    target = Path("static") / src.lstrip("/")
                else:
                    target = html_file.parent / src
                referenced_files.add(target.resolve())

    core_dir = Path("static/v3/js/core")
    if core_dir.exists():
        for js_file in core_dir.glob("*.js"):
            text = js_file.read_text(encoding="utf-8")
            for match in re.finditer(r'(?:import|from)\s+["\']([^"\']+)["\']', text):
                target_str = match.group(1).split("?")[0]
                if not urlparse(target_str).scheme:
                    if target_str.startswith("/"):
                        target = Path("static") / target_str.lstrip("/")
                    else:
                        target = js_file.parent / target_str
                    referenced_files.add(target.resolve())

    assert len(referenced_files) > 0, "No referenced JS files found"

    for path in referenced_files:
        assert path.exists(), f"Imported file does not exist on disk: {path}"
        assert path.stat().st_size > 50, f"Imported file is empty or too small: {path}"


def test_mock_fixtures_validity():
    mock_dir = Path("static/v3/mock")
    assert mock_dir.exists()

    required_fixtures = [
        "health.json",
        "agents.json",
        "cases.json",
        "case_detail.json",
        "graph.json",
        "geo.json",
        "metrics.json",
    ]

    for fix in required_fixtures:
        p = mock_dir / fix
        assert p.exists(), f"Missing mock fixture: {fix}"
        data = json.loads(p.read_text(encoding="utf-8"))
        assert data is not None

    # Specific fixture checks
    agents = json.loads((mock_dir / "agents.json").read_text(encoding="utf-8"))
    assert len(agents) == 15, "Mock agents fixture must contain exactly 15 agents"

    case_detail = json.loads((mock_dir / "case_detail.json").read_text(encoding="utf-8"))
    assert case_detail["case_id"] == "case-e1-svcreport"
    assert len(case_detail["steps"]) >= 6
    assert len(case_detail["reasons"]) >= 3
    assert len(case_detail["counterfactuals"]) >= 3


def test_fastapi_serves_v3_static_assets():
    with TestClient(app) as client:
        # Check all static/v3/*.html pages
        v3_dir = Path("static/v3")
        html_files = [f for f in v3_dir.glob("*.html") if not f.name.startswith("_")]
        assert len(html_files) >= 5, "Expected multiple v3 html files"

        for html_file in html_files:
            resp = client.get(f"/v3/{html_file.name}")
            assert resp.status_code == 200, f"Failed to GET /v3/{html_file.name}"
            assert "text/html" in resp.headers.get("content-type", ""), f"Non-HTML content type for {html_file.name}"

            # Check title
            title_match = re.search(r"<title>(.*?)</title>", resp.text, re.IGNORECASE | re.DOTALL)
            assert title_match is not None, f"Missing <title> tag in /v3/{html_file.name}"
            title = title_match.group(1).strip()
            assert len(title) > 0, f"Empty <title> in /v3/{html_file.name}"
            assert title.startswith("IdentityShield"), f"Title in {html_file.name} does not start with IdentityShield: {title}"

            # GET local referenced scripts and stylesheets
            for tag_match in re.finditer(r'<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)=["\']([^"\']+)["\']', resp.text, re.IGNORECASE):
                asset_url = tag_match.group(1).split("?")[0]
                if not urlparse(asset_url).scheme and not asset_url.startswith("#") and not asset_url.endswith(".ico"):
                    # Normalize local static asset url
                    if asset_url.startswith("/"):
                        req_path = asset_url
                    else:
                        req_path = f"/v3/{asset_url}"
                    asset_resp = client.get(req_path)
                    assert asset_resp.status_code == 200, f"Failed to serve asset {req_path} referenced in {html_file.name}"

        # Vendor Three.js
        resp_vendor = client.get("/vendor/three.min.js")
        assert resp_vendor.status_code == 200
        assert len(resp_vendor.content) > 100000

        # Mock JSON
        resp_mock = client.get("/v3/mock/health.json")
        assert resp_mock.status_code == 200
        assert resp_mock.json()["status"] == "ok"
