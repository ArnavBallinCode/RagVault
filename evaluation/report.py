"""Render a reviewer-friendly before/after evaluation report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .run import load_json, metric_deltas


def render_report(
    baseline: dict[str, Any],
    candidate: dict[str, Any],
    max_regression: float,
    title: str = 'RAGVault evaluation gate',
) -> str:
    """Create a compact Markdown table suitable for a pull-request comment."""
    deltas = metric_deltas(baseline, candidate)
    rows = []
    failures = []
    for metric, delta in deltas.items():
        section, name = metric.split('.', 1)
        before = baseline[section][name]
        after = candidate[section][name]
        passed = delta >= -max_regression
        if not passed:
            failures.append(metric)
        rows.append(
            f'| {metric} | {before:.4f} | {after:.4f} | {delta:+.4f} | '
            f"{'Pass' if passed else 'Fail'} |"
        )

    decision = 'PASS — no metric regressed beyond the configured tolerance.'
    if failures:
        decision = 'FAIL — regression threshold exceeded: ' + ', '.join(failures)
    return '\n'.join([
        '<!-- ragvault-evaluation-report -->',
        f'## {title}',
        '',
        f'**Decision:** {decision}',
        '',
        '| Metric | Before | After | Delta | Gate |',
        '| --- | ---: | ---: | ---: | --- |',
        *rows,
        '',
        f'Tolerance: a metric may decline by at most `{max_regression:.4f}`.',
    ]) + '\n'


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--max-regression', type=float, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--title', default='RAGVault evaluation gate')
    args = parser.parse_args()

    report = render_report(
        load_json(args.baseline), load_json(args.candidate), args.max_regression, args.title,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding='utf-8')
    print(report)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
