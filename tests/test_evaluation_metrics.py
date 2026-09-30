import unittest
from pathlib import Path

from evaluation.metrics import (
    binary_precision_recall,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
    reciprocal_rank,
    token_f1,
)
from evaluation.run import evaluate, metric_deltas
from evaluation.report import render_report
from evaluation.manifest import validate_manifest


class EvaluationMetricTests(unittest.TestCase):
    def test_retrieval_metrics_handle_source_paths(self):
        expected = {'contract.pdf'}
        retrieved = ['data/uploads/contract.pdf', 'other.pdf']
        self.assertEqual(recall_at_k(expected, retrieved, 2), 1.0)
        self.assertEqual(precision_at_k(expected, retrieved, 2), 0.5)
        self.assertEqual(reciprocal_rank(expected, retrieved), 1.0)
        self.assertEqual(ndcg_at_k(expected, retrieved, 2), 1.0)

    def test_token_f1_is_deterministic(self):
        self.assertEqual(token_f1('Mistral Nemo', 'mistral nemo'), 1.0)
        self.assertEqual(token_f1('Mistral', ''), 0.0)

    def test_abstention_metrics(self):
        metrics = binary_precision_recall([True, False], [True, True])
        self.assertEqual(metrics['precision'], 1.0)
        self.assertEqual(metrics['recall'], 0.5)
        self.assertEqual(metrics['false_negative_rate'], 0.5)

    def test_evaluate_tracks_answerable_and_abstention_cases(self):
        dataset = [
            {'id': 'a', 'expected_answer': 'offline rag', 'expected_sources': [{'document_id': 'a.txt'}], 'should_abstain': False},
            {'id': 'b', 'expected_answer': '', 'expected_sources': [], 'should_abstain': True},
        ]
        predictions = {
            'a': {'answer': 'offline rag', 'retrieved_sources': ['data/a.txt'], 'cited_sources': ['a.txt'], 'abstained': False},
            'b': {'answer': '', 'retrieved_sources': [], 'cited_sources': [], 'abstained': True},
        }
        result = evaluate(dataset, predictions, 2)
        self.assertEqual(result['retrieval']['recall_at_2'], 1.0)
        self.assertEqual(result['generation']['lexical_answer_f1'], 1.0)
        self.assertEqual(result['abstention']['precision'], 1.0)

    def test_metric_deltas_are_named_and_numeric(self):
        baseline = {'retrieval': {'recall_at_2': 0.9}}
        candidate = {'retrieval': {'recall_at_2': 0.8}}
        self.assertAlmostEqual(metric_deltas(baseline, candidate)['retrieval.recall_at_2'], -0.1)

    def test_report_shows_before_after_and_failure(self):
        report = render_report(
            {'retrieval': {'recall_at_2': 0.9}},
            {'retrieval': {'recall_at_2': 0.7}},
            max_regression=0.01,
        )
        self.assertIn('| retrieval.recall_at_2 | 0.9000 | 0.7000 | -0.2000 | Fail |', report)
        self.assertIn('**Decision:** FAIL', report)

    def test_manifest_requires_traceable_model_and_evidence_files(self):
        root = Path(__file__).resolve().parents[1]
        manifest = {
            'id': 'candidate', 'description': 'test', 'config_paths': ['config/init_config.yaml'],
            'models': {'generator': 'mistral', 'embedding': 'nomic', 'reranker': 'bge'},
            'dataset': 'evaluation/datasets/smoke.json',
            'predictions': 'evaluation/fixtures/smoke_predictions.json',
            'baseline': 'evaluation/baselines/smoke.json', 'k': 2, 'max_regression': 0.001,
        }
        self.assertEqual(validate_manifest(manifest, root), [])


if __name__ == '__main__':
    unittest.main()
