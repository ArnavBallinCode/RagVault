"""Validate the evidence contract attached to an agent configuration experiment."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


REQUIRED_FIELDS = {'id', 'description', 'config_paths', 'models', 'dataset', 'predictions', 'baseline', 'k', 'max_regression'}
MODEL_FIELDS = {'generator', 'embedding', 'reranker'}


def validate_manifest(manifest: dict[str, Any], root: Path) -> list[str]:
    """Return validation errors; manifests do not silently accept missing evidence."""
    errors = []
    missing = REQUIRED_FIELDS - manifest.keys()
    if missing:
        errors.append('missing fields: ' + ', '.join(sorted(missing)))
        return errors
    if not isinstance(manifest['id'], str) or not manifest['id'].strip():
        errors.append('id must be a non-empty string')
    if not isinstance(manifest['config_paths'], list) or not manifest['config_paths']:
        errors.append('config_paths must be a non-empty list')
    elif any(not (root / path).is_file() for path in manifest['config_paths']):
        errors.append('every config_paths entry must exist in the repository')
    if not isinstance(manifest['models'], dict) or MODEL_FIELDS - manifest['models'].keys():
        errors.append('models must identify generator, embedding, and reranker')
    for path_field in ('dataset', 'predictions', 'baseline'):
        if not isinstance(manifest[path_field], str) or not (root / manifest[path_field]).is_file():
            errors.append(f'{path_field} must name an existing repository file')
    if not isinstance(manifest['k'], int) or manifest['k'] < 1:
        errors.append('k must be a positive integer')
    if not isinstance(manifest['max_regression'], (int, float)) or manifest['max_regression'] < 0:
        errors.append('max_regression must be a non-negative number')
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args = parser.parse_args()

    paths = sorted(args.directory.glob('*.json')) if args.directory.exists() else []
    for path in paths:
        try:
            manifest = json.loads(path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as error:
            print(f'{path}: invalid JSON: {error}')
            return 1
        errors = validate_manifest(manifest, args.root)
        if errors:
            print(f'{path}: ' + '; '.join(errors))
            return 1
        print(f'{path}: valid')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
