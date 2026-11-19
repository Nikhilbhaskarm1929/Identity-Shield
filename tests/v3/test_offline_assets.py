import re
from pathlib import Path


def test_no_cdn_references_in_static():
    """Verify that no HTML/CSS/JS file under static/ (except memory.html) references external CDNs."""
    static_dir = Path("static")
    assert static_dir.exists(), "static directory does not exist"

    # Specific forbidden runtime CDN hostnames
    forbidden_cdns = [
        "cdn.tailwindcss.com",
        "fonts.googleapis.com",
        "fonts.gstatic.com",
        "unpkg.com",
    ]

    violations = []

    for file_path in static_dir.rglob("*"):
        if not file_path.is_file():
            continue
        # Skip memory.html (frozen file with own inline CSS) and VERSIONS.md/source comments
        if file_path.name in ("memory.html", "VERSIONS.md", "tailwind.js", "tailwind.css"):
            continue
        if file_path.suffix not in (".html", ".css", ".js"):
            continue

        content = file_path.read_text(encoding="utf-8", errors="ignore")
        for cdn in forbidden_cdns:
            if cdn in content:
                violations.append(f"{file_path} contains reference to {cdn}")

    assert not violations, f"Forbidden external CDN dependencies found:\n" + "\n".join(violations)


def test_local_tailwind_and_fonts_exist():
    """Verify that self-hosted Tailwind CSS and all required font files exist and are non-empty."""
    tailwind_css = Path("static/v3/css/tailwind.css")
    assert tailwind_css.exists(), "static/v3/css/tailwind.css does not exist"
    assert tailwind_css.stat().st_size > 10000, "tailwind.css is too small"

    fonts_dir = Path("static/vendor/fonts")
    assert fonts_dir.exists(), "static/vendor/fonts does not exist"

    expected_fonts = [
        "inter-400.woff2",
        "inter-500.woff2",
        "inter-600.woff2",
        "inter-700.woff2",
        "jetbrains-mono-400.woff2",
        "jetbrains-mono-500.woff2",
    ]

    for font_name in expected_fonts:
        font_file = fonts_dir / font_name
        assert font_file.exists(), f"Missing offline font: {font_name}"
        assert font_file.stat().st_size > 5000, f"Font file {font_name} unexpectedly small"


def test_theme_css_has_local_font_declarations():
    """Verify theme.css declares local @font-face rules with swap display."""
    theme_css = Path("static/v3/css/theme.css")
    assert theme_css.exists()
    content = theme_css.read_text(encoding="utf-8")

    assert "@font-face" in content
    assert "/vendor/fonts/inter-400.woff2" in content
    assert "/vendor/fonts/jetbrains-mono-400.woff2" in content
    assert "font-display: swap" in content
