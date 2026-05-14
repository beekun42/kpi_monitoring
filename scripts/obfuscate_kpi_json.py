"""
KPI JSON をデモ・公開向けにスクランブルする。

1) 指標ごとの乱数倍率（任意）
   - 各 (scope, metric_id) で actual / forecast / target を同じ倍率で全月に掛算
     （TvF=F−T 等の関係はスケール上保たれる）。
   - 既定倍率レンジ [0.5, 2.0]（--min / --max）。

2) 月次バンドルのランダム割当（既定 ON）
   - `metrics["2026-07"]` など「1か月分の全スコープ・全指標の塊」を、別の月の塊と入れ替える。
   - 同じ月キー内の指標間の整合はそのまま。スパークライン上の「時系列の傾向」は読めなくなる。

--in-place 時は既定で .orig バックアップ（--no-backup で無効）。

使用例:
  python scripts/obfuscate_kpi_json.py public/data/kpi-from-excel.json --in-place
  python scripts/obfuscate_kpi_json.py public/data/kpi-from-excel.json --in-place --skip-multiply
  python scripts/obfuscate_kpi_json.py public/data/kpi-from-excel.json -o out.json --seed 1 --shuffle-seed 2
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
import sys
from pathlib import Path
from typing import Any


def collect_metric_keys(metrics: dict[str, Any], months: list[str]) -> list[tuple[str, str]]:
    keys: set[tuple[str, str]] = set()
    for month in months:
        bundle = metrics.get(month)
        if not isinstance(bundle, dict):
            continue
        for scope, idmap in bundle.items():
            if not isinstance(idmap, dict):
                continue
            for metric_id in idmap:
                keys.add((scope, metric_id))
    return sorted(keys)


def assign_multipliers(
    keys: list[tuple[str, str]],
    lo: float,
    hi: float,
    seed: int | None,
) -> dict[tuple[str, str], float]:
    rnd = random.Random(seed)
    return {k: rnd.uniform(lo, hi) for k in keys}


def apply_multipliers(
    metrics: dict[str, Any],
    months: list[str],
    multipliers: dict[tuple[str, str], float],
    decimals: int | None,
) -> None:
    for month in months:
        bundle = metrics.get(month)
        if not isinstance(bundle, dict):
            continue
        for scope, idmap in bundle.items():
            if not isinstance(idmap, dict):
                continue
            for metric_id, node in idmap.items():
                if not isinstance(node, dict):
                    continue
                m = multipliers[(scope, metric_id)]
                for field in ("actual", "forecast", "target"):
                    if field not in node:
                        continue
                    v = node[field]
                    if isinstance(v, (int, float)):
                        x = float(v) * m
                        if decimals is not None:
                            x = round(x, decimals)
                        node[field] = x


def shuffle_month_bundles(metrics: dict[str, Any], months: list[str], seed_shuffle: int | None) -> None:
    """各月キーに紐づくオブジェクト全体を、別月のオブジェクトと入れ替える（深いコピー）。"""
    smonths = [str(m) for m in months]
    bundles = [json.loads(json.dumps(metrics[m])) for m in smonths]
    n = len(smonths)
    if n <= 1:
        return
    perm = list(range(n))
    rnd = random.Random(seed_shuffle)
    rnd.shuffle(perm)
    for i, m in enumerate(smonths):
        metrics[m] = bundles[perm[i]]


def main() -> int:
    p = argparse.ArgumentParser(description="Obfuscate KPI JSON (multipliers + month-bundle shuffle).")
    p.add_argument("input", type=Path, help="Input kpi-from-excel.json path")
    p.add_argument("-o", "--output", type=Path, help="Output path (default: stdout as JSON)")
    p.add_argument("--in-place", action="store_true", help="Overwrite input file")
    p.add_argument("--no-backup", action="store_true", help="With --in-place, skip .orig backup")
    p.add_argument("--seed", type=int, default=None, help="RNG seed for multipliers (omit for random)")
    p.add_argument(
        "--shuffle-seed",
        type=int,
        default=None,
        help="RNG seed for month-bundle shuffle (default: seed+1 if --seed set, else random)",
    )
    p.add_argument("--skip-multiply", action="store_true", help="Skip per-metric multiplier step")
    p.add_argument(
        "--skip-shuffle-months",
        action="store_true",
        help="Skip month-bundle shuffle (keeps real time-series shape)",
    )
    p.add_argument("--min", dest="min_m", type=float, default=0.5, help="Min multiplier (default 0.5)")
    p.add_argument("--max", dest="max_m", type=float, default=2.0, help="Max multiplier (default 2.0)")
    p.add_argument(
        "--decimals",
        type=int,
        default=10,
        help="Round values to this many decimal places (negative to skip rounding)",
    )
    args = p.parse_args()

    inp: Path = args.input
    if not inp.is_file():
        print(f"Not found: {inp}", file=sys.stderr)
        return 1

    if args.in_place and args.output:
        print("Use either --in-place or -o, not both.", file=sys.stderr)
        return 1

    raw = inp.read_text(encoding="utf-8")
    data = json.loads(raw)
    months = data.get("months")
    metrics = data.get("metrics")
    if not isinstance(months, list) or not isinstance(metrics, dict):
        print("Invalid JSON: expected months[] and metrics{}", file=sys.stderr)
        return 1

    smonths = [str(m) for m in months]
    keys = collect_metric_keys(metrics, smonths)
    if not keys:
        print("No metric keys found.", file=sys.stderr)
        return 1

    if not args.skip_multiply:
        multipliers = assign_multipliers(keys, args.min_m, args.max_m, args.seed)
        dec = args.decimals if args.decimals >= 0 else None
        apply_multipliers(metrics, smonths, multipliers, dec)
        print(f"Multipliers applied: {len(keys)} metrics (seed={args.seed!r})", file=sys.stderr)
    else:
        print("Skipped: per-metric multipliers", file=sys.stderr)

    if not args.skip_shuffle_months:
        shuffle_seed = args.shuffle_seed
        if shuffle_seed is None:
            if args.seed is not None:
                shuffle_seed = args.seed + 100_003
            else:
                shuffle_seed = random.randrange(2**31)
        shuffle_month_bundles(metrics, smonths, shuffle_seed)
        print(f"Month bundles shuffled (shuffle_seed={shuffle_seed!r})", file=sys.stderr)
    else:
        print("Skipped: month-bundle shuffle", file=sys.stderr)

    out_text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"

    if args.in_place:
        if not args.no_backup:
            bak = inp.with_suffix(inp.suffix + ".orig")
            shutil.copy2(inp, bak)
            print(f"Backup: {bak}", file=sys.stderr)
        inp.write_text(out_text, encoding="utf-8")
        print(f"Wrote: {inp}", file=sys.stderr)
    elif args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(out_text, encoding="utf-8")
        print(f"Wrote: {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(out_text)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
