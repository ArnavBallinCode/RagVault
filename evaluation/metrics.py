"""Transparent, dependency-free metric implementations used by the harness."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Iterable, Sequence


def normalize_id(value: str) -> str:
    return value.replace('\\', '/').split('/')[-1].lower()


def token_f1(expected: str, actual: str) -> float:
    """A deterministic lexical correctness proxy, not an LLM-as-judge score."""
    expected_tokens = re.findall(r"[a-z0-9]+", expected.lower())
    actual_tokens = re.findall(r"[a-z0-9]+", actual.lower())
    if not expected_tokens or not actual_tokens:
        return float(expected_tokens == actual_tokens)
    overlap = sum((Counter(expected_tokens) & Counter(actual_tokens)).values())
    precision = overlap / len(actual_tokens)
    recall = overlap / len(expected_tokens)
    return 0.0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)


def recall_at_k(expected: set[str], retrieved: Sequence[str], k: int) -> float | None:
    if not expected:
        return None
    hits = len(expected & {normalize_id(item) for item in retrieved[:k]})
    return hits / len(expected)


def precision_at_k(expected: set[str], retrieved: Sequence[str], k: int) -> float | None:
    if not expected:
        return None
    selected = retrieved[:k]
    if not selected:
        return 0.0
    return sum(normalize_id(item) in expected for item in selected) / len(selected)


def reciprocal_rank(expected: set[str], retrieved: Sequence[str]) -> float | None:
    if not expected:
        return None
    for index, item in enumerate(retrieved, start=1):
        if normalize_id(item) in expected:
            return 1.0 / index
    return 0.0


def ndcg_at_k(expected: set[str], retrieved: Sequence[str], k: int) -> float | None:
    if not expected:
        return None
    dcg = sum(
        1.0 / math.log2(index + 1)
        for index, item in enumerate(retrieved[:k], start=1)
        if normalize_id(item) in expected
    )
    ideal_count = min(len(expected), k)
    ideal = sum(1.0 / math.log2(index + 1) for index in range(1, ideal_count + 1))
    return 0.0 if ideal == 0 else dcg / ideal


def mean(values: Iterable[float | None]) -> float | None:
    usable = [value for value in values if value is not None]
    return sum(usable) / len(usable) if usable else None


def binary_precision_recall(predicted: Sequence[bool], expected: Sequence[bool]) -> dict[str, float]:
    tp = sum(p and e for p, e in zip(predicted, expected))
    fp = sum(p and not e for p, e in zip(predicted, expected))
    fn = sum(not p and e for p, e in zip(predicted, expected))
    return {
        'precision': tp / (tp + fp) if tp + fp else 0.0,
        'recall': tp / (tp + fn) if tp + fn else 0.0,
        'false_positive_rate': fp / len(expected) if expected else 0.0,
        'false_negative_rate': fn / len(expected) if expected else 0.0,
    }
