# Evaluation harness

This folder provides the first reproducible quality gate for RAGVault pull requests.
It reports retrieval recall@k, precision@k, MRR, nDCG, lexical answer F1, citation recall, and abstention precision/recall. The small committed smoke fixture is intentionally model-free so GitHub-hosted CI stays fast and does not need to download the local Mistral, Nomic, or BGE artifacts.

Run the base gate locally:

```bash
/Users/arnavangarkar/miniconda3/envs/ragvault/bin/python -m evaluation.run \
  --baseline evaluation/baselines/smoke.json \
  --max-regression 0.001
```

For a model/configuration candidate, produce a JSON predictions file with the same shape as `fixtures/smoke_predictions.json`, add it under `evaluation/candidates/`, and open the PR with the corresponding config change. Include an experiment manifest under `evaluation/experiments/` describing the config paths, exact local model versions, dataset, prediction file, and threshold. CI evaluates every candidate file against the committed baseline, fails on a decline over the threshold, and posts a sticky before/after metrics table to the PR. This keeps proposed configurations reviewable and prevents silent metric regression.

The current smoke fixture validates the evaluator and CI wiring. A subsequent phase should add a larger, human-labelled benchmark and a local/self-hosted model-run job that generates candidate predictions from the real pipeline; GitHub-hosted runners cannot execute this repository's ignored local model files.
