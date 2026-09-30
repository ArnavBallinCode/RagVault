# Agent experiment PR contract

An agent may propose only an allowlisted configuration change and must open a PR containing:

1. the configuration diff;
2. a prediction fixture in `evaluation/candidates/`; and
3. an experiment manifest, following the example below.

The agent runs the real local stack before opening its PR, exports its predictions, and records the exact model/configuration versions in the manifest. GitHub Actions independently recalculates metrics, enforces the regression threshold, uploads the report, and posts a before/after table to the PR.

```json
{
  "id": "rerank-batch-8",
  "description": "Increase reranking batch size after local validation.",
  "config_paths": ["config/init_config.yaml"],
  "models": {
    "generator": "Mistral-Nemo-Instruct-2407.Q5_K_M",
    "embedding": "nomic-embed-text-v1.5",
    "reranker": "bge-reranker-v2-m3"
  },
  "dataset": "evaluation/datasets/smoke.json",
  "predictions": "evaluation/candidates/rerank-batch-8.json",
  "baseline": "evaluation/baselines/smoke.json",
  "k": 2,
  "max_regression": 0.001
}
```

The current workflow posts the baseline smoke report on every relevant PR. The manifest is the contract for the next local agent-runner step: it ties a model/config change to exported evidence rather than allowing untraceable result files.
