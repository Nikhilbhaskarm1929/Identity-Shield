import ast
import re
from pathlib import Path


def test_no_live_cloud_sdk_imports():
    """Rule verification: ensure no live AWS or Okta SDKs are imported in app/."""
    app_dir = Path("app")
    assert app_dir.exists(), "app directory does not exist"

    forbidden_modules = {"boto3", "botocore", "okta"}
    violations = []

    for py_file in app_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        try:
            tree = ast.parse(content, filename=str(py_file))
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root = alias.name.split(".")[0]
                    if root in forbidden_modules:
                        violations.append(f"{py_file}:{node.lineno} -> import {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    root = node.module.split(".")[0]
                    if root in forbidden_modules:
                        violations.append(f"{py_file}:{node.lineno} -> from {node.module} import ...")

    assert not violations, f"Forbidden cloud SDK imports detected:\n" + "\n".join(violations)


def test_no_live_cloud_api_endpoints():
    """Rule verification: ensure no hardcoded live cloud hostnames are used in app/ code."""
    app_dir = Path("app")
    domain_re = re.compile(r"https?://[^\s'\"`]*\.(?:amazonaws\.com|okta\.com)", re.IGNORECASE)
    violations = []

    for py_file in app_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        try:
            tree = ast.parse(content, filename=str(py_file))
        except SyntaxError:
            continue

        # Inspect only string constants in code, ignoring comments
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                for match in domain_re.finditer(node.value):
                    violations.append(f"{py_file}:{node.lineno} -> {match.group(0)}")

    assert not violations, f"Forbidden live cloud hostnames detected in app/ string constants:\n" + "\n".join(violations)
