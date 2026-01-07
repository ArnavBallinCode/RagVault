import type {
    HealthResponse,
    UploadResponse,
    RefreshResponse,
    DocumentsResponse,
    QueryResponse
} from '../types';

const API_BASE = 'http://localhost:8000';

export const api = {
    async health(): Promise<HealthResponse> {
        const res = await fetch(`${API_BASE}/health`);
        if (!res.ok) throw new Error('Failed to fetch health status');
        return res.json();
    },

    async uploadDocument(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Upload failed');
        }
        return res.json();
    },

    async refresh(): Promise<RefreshResponse> {
        const res = await fetch(`${API_BASE}/refresh`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to refresh indices');
        }
        return res.json();
    },

    async getDocuments(): Promise<DocumentsResponse> {
        const res = await fetch(`${API_BASE}/documents`);
        if (!res.ok) throw new Error('Failed to fetch documents');
        return res.json();
    },

    async deleteDocument(filename: string): Promise<{ status: string; message: string }> {
        const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to delete document');
        }
        return res.json();
    },

    async clearAll(): Promise<{ status: string; message: string }> {
        const res = await fetch(`${API_BASE}/clear`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to clear data');
        }
        return res.json();
    },

    async getLimits(): Promise<{
        max_file_size_mb: number;
        max_total_documents: number;
        supported_formats: string[];
    }> {
        const res = await fetch(`${API_BASE}/limits`);
        if (!res.ok) throw new Error('Failed to fetch limits');
        return res.json();
    },

    async query(query: string, topK: number): Promise<QueryResponse> {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: topK }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Query failed');
        }
        return res.json();
    },
};
