"""Run deterministic RAGVault benchmark metrics from stored predictions.

The fixture mode is deliberately model-free for CI. Local model runs can export
the same prediction shape and use this command for reproducible comparisons.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .metrics import (
    binary_precision_recall, mean, ndcg_at_k, precision_at_k, recall_at_k,
    reciprocal_rank, token_f1,
)

ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> Any:
    with path.open(encoding='utf-8') as handle:
        return json.load(handle)


def evaluate(dataset: list[dict[str, Any]], predictions: dict[str, dict[str, Any]], k: int) -> dict[str, Any]:
    recall, precision, mrr, ndcg, correctness, citation = [], [], [], [], [], []
    abstain_predicted, abstain_expected = [], []

    for case in dataset:
        prediction = predictions.get(case['id'], {})
        expected_sources = {source['document_id'].lower() for source in case.get('expected_sources', [])}
        retrieved = prediction.get('retrieved_sources', [])
        recall.append(recall_at_k(expected_sources, retrieved, k))
        precision.append(precision_at_k(expected_sources, retrieved, k))
        mrr.append(reciprocal_rank(expected_sources, retrieved))
        ndcg.append(ndcg_at_k(expected_sources, retrieved, k))
        citation.append(recall_at_k(expected_sources, prediction.get('cited_sources', []), k))
        if case.get('expected_answer'):
            correctness.append(token_f1(case['expected_answer'], prediction.get('answer', '')))
        abstain_predicted.append(bool(prediction.get('abstained', False)))
        abstain_expected.append(bool(case.get('should_abstain', False)))

    abstention = binary_precision_recall(abstain_predicted, abstain_expected)
    return {
        'retrieval': {
            f'recall_at_{k}': mean(recall),
            f'precision_at_{k}': mean(precision),
            'mrr': mean(mrr),
            f'ndcg_at_{k}': mean(ndcg),
        },
        'generation': {
            'lexical_answer_f1': mean(correctness),
            'note': 'Deterministic lexical proxy; add human labels for semantic correctness.',
        },
        'evidence': {'citation_recall': mean(citation)},
        'abstention': abstention,
        'cases': len(dataset),
    }


def metric_deltas(baseline: dict[str, Any], candidate: dict[str, Any]) -> dict[str, float]:
    """Return numeric candidate-minus-baseline changes by fully-qualified metric."""
    deltas = {}
    for section in ('retrieval', 'generation', 'evidence', 'abstention'):
        for metric, candidate_value in candidate.get(section, {}).items():
            baseline_value = baseline.get(section, {}).get(metric)
            if isinstance(candidate_value, (int, float)) and isinstance(baseline_value, (int, float)):
                deltas[f'{section}.{metric}'] = candidate_value - baseline_value
    return deltas


def compare(baseline: dict[str, Any], candidate: dict[str, Any]) -> list[str]:
    lines = []
    for metric, delta in metric_deltas(baseline, candidate).items():
        section, name = metric.split('.', 1)
        baseline_value = baseline[section][name]
        candidate_value = candidate[section][name]
        lines.append(f'{metric}: baseline={baseline_value:.4f}, candidate={candidate_value:.4f}, delta={delta:+.4f}')
    return lines


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', type=Path, default=ROOT / 'evaluation' / 'datasets' / 'smoke.json')
    parser.add_argument('--predictions', type=Path, default=ROOT / 'evaluation' / 'fixtures' / 'smoke_predictions.json')
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--max-regression', type=float, default=None,
                        help='Fail if any evaluated metric falls by more than this amount.')
    parser.add_argument('--k', type=int, default=2)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'evaluation' / 'results')
    args = parser.parse_args()

    result = evaluate(load_json(args.dataset), load_json(args.predictions), args.k)
    result.update({
        'run_at': datetime.now(timezone.utc).isoformat(),
        'dataset': str(args.dataset),
        'predictions': str(args.predictions),
        'pipeline_version': 'legacy-rag-v1',
    })
    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_path = args.output_dir / 'latest.json'
    json_path.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    lines = ['# RAGVault evaluation result', '', f"Cases: {result['cases']}", '', '```json', json.dumps(result, indent=2), '```']
    failed_metrics = []
    if args.baseline:
        baseline = load_json(args.baseline)
        lines.extend(['', '## Baseline comparison', ''] + compare(baseline, result))
        if args.max_regression is not None:
            failed_metrics = [
                metric for metric, delta in metric_deltas(baseline, result).items()
                if delta < -args.max_regression
            ]
            if failed_metrics:
                lines.extend(['', '## Quality gate', '',
                              f'Failed: regression exceeds {args.max_regression:.4f} for ' + ', '.join(failed_metrics)])
    (args.output_dir / 'latest.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))
    if failed_metrics:
        print('Quality gate failed: ' + ', '.join(failed_metrics))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
