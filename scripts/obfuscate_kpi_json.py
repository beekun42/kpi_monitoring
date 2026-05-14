"""
KPI JSON の数値を「指標ごと」の乱数倍率で一括スクランブルする（デモ・公開用）。

- 各 (scope, metric_id) に対して actual / forecast / target を「同じ倍率」で乗算する
  （全月で同じ倍率。TvF=F−T や TvA=A−T のスケールは保たれる）。
- 既定の倍率は [0.5, 2.0] の一様乱数（--min / --max で変更可）。
- --in-place のときは既定で .orig バックアップを作成する（--no-backup で無効）。

使用例:
  python scripts/obfuscate_kpi_json.py public/data/kpi-from-excel.json --in-place
  python scripts/obfuscate_kpi_json.py public/data/kpi-from-excel.json -o out.json --seed 12345
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


def main() -> int:
    p = argparse.ArgumentParser(description="Obfuscate KPI JSON with per-metric random multipliers.")
    p.add_argument("input", type=Path, help="Input kpi-from-excel.json path")
    p.add_argument("-o", "--output", type=Path, help="Output path (default: stdout as JSON)")
    p.add_argument("--in-place", action="store_true", help="Overwrite input file")
    p.add_argument("--no-backup", action="store_true", help="With --in-place, skip .orig backup")
    p.add_argument("--seed", type=int, default=None, help="RNG seed (omit for non-deterministic)")
    p.add_argument("--min", dest="min_m", type=float, default=0.5, help="Min multiplier (default 0.5)")
    p.add_argument("--max", dest="max_m", type=float, default=2.0, help="Max multiplier (default 2.0)")
    p.add_argument(
        "--decimals",
        type=int,
        default=10,
        help="Round values to this many decimal places (omit with negative to skip rounding)",
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

    keys = collect_metric_keys(metrics, [str(m) for m in months])
    if not keys:
        print("No metric keys found.", file=sys.stderr)
        return 1

    multipliers = assign_multipliers(keys, args.min_m, args.max_m, args.seed)
    dec = args.decimals if args.decimals >= 0 else None
    apply_multipliers(metrics, [str(m) for m in months], multipliers, dec)

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

    print(f"Metrics obfuscated: {len(keys)} (seed={args.seed!r})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
