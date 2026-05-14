"""Export KPI Summary slice to public/data/kpi-from-excel.json (optional; requires path)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

EXCEL_PATH = Path(
    r"C:\Users\yosuke.akagi\Box\Rakuma（4月1日～データ移動先）\BU\Marketing\Integrated Planning\Integrated Planning\02.GMS\KPI\202605w2\KPI Fcst_HIGHLOW_260511.xlsx"
)
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "kpi-from-excel.json"

# Row index (0-based) -> metric id (Fcst values treated as "forecast" for demo; duplicate TGT when missing)
ROWS = {
    4: ("ttl", "gms_ttl"),
    6: ("ttl", "high_gms"),
    8: ("ttl", "low_gms"),
    11: ("high", "gms"),
    15: ("high", "buyer.buyer"),
    17: ("high", "buyer.newr13"),
    19: ("high", "buyer.r212"),
    21: ("high", "buyer.r1"),
    23: ("high", "buyer.rr"),
    25: ("high", "buyer.spending"),
    27: ("high", "seller.listing"),
    29: ("high", "seller.seller"),
    31: ("high", "seller.newr13"),
    33: ("high", "seller.r212"),
    35: ("high", "seller.r1"),
    37: ("high", "seller.rr"),
    39: ("high", "seller.freq"),
    41: ("high", "seller.order"),
    43: ("high", "seller.soldout_rate"),
    45: ("high", "seller.aov"),
    48: ("low", "gms"),
    52: ("low", "buyer.buyer"),
    54: ("low", "buyer.newr13"),
    56: ("low", "buyer.r212"),
    58: ("low", "buyer.r1"),
    60: ("low", "buyer.rr"),
    62: ("low", "buyer.spending"),
    64: ("low", "seller.listing"),
    66: ("low", "seller.seller"),
    68: ("low", "seller.newr13"),
    70: ("low", "seller.r212"),
    72: ("low", "seller.r1"),
    74: ("low", "seller.rr"),
    76: ("low", "seller.freq"),
    78: ("low", "seller.order"),
    80: ("low", "seller.soldout_rate"),
    82: ("low", "seller.aov"),
    85: ("ttl_nodup", "gms"),
    89: ("ttl_nodup", "buyer.buyer"),
    91: ("ttl_nodup", "buyer.newr13"),
    93: ("ttl_nodup", "buyer.r212"),
    95: ("ttl_nodup", "buyer.r1"),
    97: ("ttl_nodup", "buyer.rr"),
    99: ("ttl_nodup", "buyer.spending"),
    101: ("ttl_nodup", "seller.listing"),
    103: ("ttl_nodup", "seller.seller"),
    105: ("ttl_nodup", "seller.newr13"),
    107: ("ttl_nodup", "seller.r212"),
    109: ("ttl_nodup", "seller.r1"),
    111: ("ttl_nodup", "seller.rr"),
    113: ("ttl_nodup", "seller.freq"),
    115: ("ttl_nodup", "seller.order"),
    117: ("ttl_nodup", "seller.soldout_rate"),
    119: ("ttl_nodup", "seller.aov"),
}


def main() -> int:
    if not EXCEL_PATH.exists():
        print("Excel not found; skip export.", file=sys.stderr)
        return 1
    df = pd.read_excel(EXCEL_PATH, sheet_name="KPI Summary", header=None).iloc[:121]
    header = df.iloc[3]
    months: list[str] = []
    col_by_month: dict[str, int] = {}
    for c in range(1, len(header)):
        v = header.iloc[c]
        if pd.isna(v):
            continue
        if hasattr(v, "strftime"):
            key = v.strftime("%Y-%m")
            months.append(key)
            col_by_month[key] = c
    # last ~6 months of 2026 if present
    pick = [m for m in months if m.startswith("2026-")][-6:]
    if not pick:
        pick = months[-6:]
    data: dict = {"months": pick, "metrics": {}}
    for m in pick:
        col = col_by_month.get(m)
        if col is None:
            continue
        data["metrics"][m] = {}
        for r, (scope, mid) in ROWS.items():
            val = df.iloc[r, col]
            if pd.isna(val):
                continue
            data["metrics"][m].setdefault(scope, {})[mid] = {
                "forecast": float(val),
                # Demo: synthetic actual/target from forecast until TGT file is wired
                "actual": float(val) * 0.97,
                "target": float(val) * 1.02,
            }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
