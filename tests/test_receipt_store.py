import tempfile
import unittest
from pathlib import Path

from src.trust.receipt_store import ReceiptStore


class ReceiptStoreTests(unittest.TestCase):
    def test_receipt_feedback_enters_review_queue(self):
        with tempfile.TemporaryDirectory() as directory:
            store = ReceiptStore(str(Path(directory) / 'receipts.json'))
            receipt = store.create({'actor': 'alice', 'response': {'answer': 'test'}})
            updated = store.add_feedback(receipt['id'], {
                'verdict': 'incorrect', 'note': 'source is stale', 'correction': '', 'reviewed_by': 'alice',
            })
            self.assertEqual(updated['review']['status'], 'needs_review')
            self.assertEqual(store.review_queue()[0]['id'], receipt['id'])

    def test_non_reviewed_receipts_are_not_in_queue(self):
        with tempfile.TemporaryDirectory() as directory:
            store = ReceiptStore(str(Path(directory) / 'receipts.json'))
            receipt = store.create({'actor': 'alice'})
            store.add_feedback(receipt['id'], {
                'verdict': 'correct', 'note': '', 'correction': '', 'reviewed_by': 'alice',
            })
            self.assertEqual(store.review_queue(), [])
