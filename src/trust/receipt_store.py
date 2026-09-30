"""Small local, append-only decision receipt store.

Receipts are runtime data, intentionally kept outside the source tree. They make
each answer inspectable and give human feedback a durable path into evaluation.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ReceiptStore:
    def __init__(self, path: str = 'data/decision_receipts.json') -> None:
        self.path = Path(path)
        self._lock = threading.Lock()

    def _load(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        try:
            data = json.loads(self.path.read_text(encoding='utf-8'))
            return data if isinstance(data, list) else []
        except (json.JSONDecodeError, OSError):
            return []

    def _save(self, receipts: list[dict[str, Any]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=self.path.parent, delete=False) as handle:
            json.dump(receipts, handle, indent=2)
            handle.write('\n')
            temporary_path = handle.name
        os.replace(temporary_path, self.path)

    def create(self, receipt: dict[str, Any]) -> dict[str, Any]:
        entry = {
            'id': f"rcpt_{uuid.uuid4().hex[:16]}",
            'created_at': datetime.now(timezone.utc).isoformat(),
            'review': {'status': 'unreviewed'},
            **receipt,
        }
        with self._lock:
            receipts = self._load()
            receipts.append(entry)
            self._save(receipts[-1000:])
        return entry

    def list(self, actor: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        receipts = self._load()
        if actor:
            receipts = [receipt for receipt in receipts if receipt.get('actor') == actor]
        return list(reversed(receipts[-max(1, min(limit, 200)):]))

    def get(self, receipt_id: str) -> dict[str, Any] | None:
        return next((receipt for receipt in self._load() if receipt.get('id') == receipt_id), None)

    def add_feedback(self, receipt_id: str, feedback: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            receipts = self._load()
            for receipt in receipts:
                if receipt.get('id') == receipt_id:
                    receipt['review'] = {
                        **feedback,
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                        'status': 'needs_review' if feedback['verdict'] != 'correct' else 'confirmed',
                    }
                    self._save(receipts)
                    return receipt
        return None

    def review_queue(self) -> list[dict[str, Any]]:
        return [receipt for receipt in self.list(limit=200)
                if receipt.get('review', {}).get('status') == 'needs_review']


receipt_store = ReceiptStore()
