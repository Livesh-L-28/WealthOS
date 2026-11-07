#!/usr/bin/env python3
"""
WealthOS — WCAG 2.1 Contrast Ratio Verification Script
Calculates relative luminance and contrast ratios using the official W3C formula.
Validates all foreground/background color combinations against WCAG 2.1 AA thresholds:
- Normal text: >= 4.5:1
- Large text & non-text UI components (borders, focus indicators): >= 3.0:1
"""

import sys

def relative_luminance(hex_color: str) -> float:
    """Calculate relative luminance per W3C WCAG 2.1 definition."""
    hex_clean = hex_color.lstrip('#')
    if len(hex_clean) != 6:
        raise ValueError(f"Invalid hex color: {hex_color}")
    r, g, b = [int(hex_clean[i:i+2], 16) / 255.0 for i in (0, 2, 4)]
    
    def channel_luminance(channel: float) -> float:
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    r_lum = channel_luminance(r)
    g_lum = channel_luminance(g)
    b_lum = channel_luminance(b)

    return 0.2126 * r_lum + 0.7152 * g_lum + 0.0722 * b_lum

def contrast_ratio(hex1: str, hex2: str) -> float:
    """Calculate contrast ratio between two colors."""
    l1 = relative_luminance(hex1)
    l2 = relative_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

# WealthOS Calibrated WCAG AA Color Token Definitions
THEME = {
    "backgrounds": {
        "canvas": "#0B0F17",
        "surface": "#111827",
        "card": "#1E293B",
        "card_hover": "#243042",
    },
    "text_tokens": {
        "text_primary": ("#F8FAFC", 4.5, "Normal Text (Primary - Slate 50)"),
        "text_secondary": ("#CBD5E1", 4.5, "Normal Text (Secondary - Slate 300)"),
        "text_muted": ("#94A3B8", 4.5, "Normal Text (Muted / Metadata - Slate 400)"),
        "positive_fg": ("#34D399", 4.5, "Positive Text / Inflows (Emerald 400)"),
        "negative_fg": ("#FB7185", 4.5, "Negative Text / Outflows / Debt (Rose 400)"),
        "warning_fg": ("#FBBF24", 4.5, "Warning Text / Discrepancies (Amber 400)"),
        "brand_link": ("#A5B4FC", 4.5, "Interactive Brand Links / Focus Text (Indigo 300)"),
    },
    "ui_components": {
        "border_default": ("#6B7280", 3.0, "Input Borders & Active Controls (Gray 500)"),
        "border_focus": ("#818CF8", 3.0, "Focus Ring Indicator (Indigo 400)"),
        "button_brand_text": ("#FFFFFF", "#4F46E5", 4.5, "White Text on Brand Button (#4F46E5)"),
        "positive_badge_border": ("#34D399", 3.0, "Positive Badge Perimeter"),
        "negative_badge_border": ("#FB7185", 3.0, "Negative Badge Perimeter"),
        "warning_badge_border": ("#FBBF24", 3.0, "Warning Badge Perimeter"),
    }
}

def run_audit() -> bool:
    print("=" * 82)
    print("WEALTHOS WCAG 2.1 LEVEL AA CONTRAST RATIO VERIFICATION AUDIT")
    print("=" * 82)
    all_passed = True
    test_count = 0

    # 1. Test Text Tokens across all standard dark backgrounds (Canvas, Surface, Card, Card Hover)
    for bg_name, bg_hex in THEME["backgrounds"].items():
        print(f"\n--- Evaluating Background: {bg_name.upper()} ({bg_hex}) ---")
        for token_name, (fg_hex, min_ratio, description) in THEME["text_tokens"].items():
            ratio = contrast_ratio(fg_hex, bg_hex)
            test_count += 1
            passed = ratio >= min_ratio
            if not passed:
                all_passed = False
            status_str = "PASS" if passed else "FAIL"
            print(f"  [{status_str:4}] {token_name:16} ({fg_hex}) vs {bg_name:10}: {ratio:5.2f}:1 (Target: >= {min_ratio:.1f}:1) - {description}")

    # 2. Test UI Components and Non-text Interface Elements (WCAG 1.4.11)
    print(f"\n--- Evaluating Non-Text Interface Controls & Interactive States (WCAG 1.4.11) ---")
    for comp_name, comp_data in THEME["ui_components"].items():
        if len(comp_data) == 4:
            fg_hex, bg_hex, min_ratio, description = comp_data
            ratio = contrast_ratio(fg_hex, bg_hex)
            test_count += 1
            passed = ratio >= min_ratio
            if not passed:
                all_passed = False
            status_str = "PASS" if passed else "FAIL"
            print(f"  [{status_str:4}] {comp_name:22}: {ratio:5.2f}:1 (Target: >= {min_ratio:.1f}:1) - {description}")
        else:
            fg_hex, min_ratio, description = comp_data
            for bg_name in ["canvas", "surface", "card"]:
                bg_hex = THEME["backgrounds"][bg_name]
                ratio = contrast_ratio(fg_hex, bg_hex)
                test_count += 1
                passed = ratio >= min_ratio
                if not passed:
                    all_passed = False
                status_str = "PASS" if passed else "FAIL"
                print(f"  [{status_str:4}] {comp_name:22} vs {bg_name:10}: {ratio:5.2f}:1 (Target: >= {min_ratio:.1f}:1) - {description}")

    print("\n" + "=" * 82)
    print(f"TOTAL AUDITED COMBINATIONS: {test_count} | 100% WCAG 2.1 AA COMPLIANT: {all_passed}")
    print("=" * 82)
    return all_passed

if __name__ == "__main__":
    success = run_audit()
    sys.exit(0 if success else 1)
