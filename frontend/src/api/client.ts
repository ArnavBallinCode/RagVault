import type {
    HealthResponse,
    UploadResponse,
    RefreshResponse,
    DocumentsResponse,
    QueryResponse,
    LoginResponse
} from '../types';

const API_BASE = 'http://localhost:8000';

// Token management
let authToken: string | null = localStorage.getItem('ragvault_token');

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        localStorage.setItem('ragvault_token', token);
    } else {
        localStorage.removeItem('ragvault_token');
    }
};

export const getAuthToken = () => authToken;

export const clearAuth = () => {
    authToken = null;
    localStorage.removeItem('ragvault_token');
    localStorage.removeItem('ragvault_user');
};

const getHeaders = (includeAuth: boolean = true): HeadersInit => {
    const headers: HeadersInit = {};
    if (includeAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
};

const handleResponse = async (res: Response) => {
    if (res.status === 401) {
        clearAuth();
        window.location.href = '/';
        throw new Error('Session expired. Please login again.');
    }
    if (res.status === 403) {
        throw new Error('Access denied. Insufficient permissions.');
    }
    return res;
};

export const api = {
    async login(username: string, password: string): Promise<LoginResponse> {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(error.detail || 'Invalid credentials');
        }

        const data = await res.json();
        setAuthToken(data.access_token);
        localStorage.setItem('ragvault_user', JSON.stringify({
            username: data.username,
            name: data.name,
            role: data.role
        }));
        return data;
    },

    logout() {
        clearAuth();
    },

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
            headers: getHeaders(),
            body: formData,
        });

        await handleResponse(res);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Upload failed');
        }
        return res.json();
    },

    async refresh(): Promise<RefreshResponse> {
        const res = await fetch(`${API_BASE}/refresh`, {
            method: 'POST',
            headers: getHeaders(),
        });

        await handleResponse(res);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to refresh indices');
        }
        return res.json();
    },

    async getDocuments(): Promise<DocumentsResponse> {
        const res = await fetch(`${API_BASE}/documents`, {
            headers: getHeaders(),
        });

        await handleResponse(res);

        if (!res.ok) throw new Error('Failed to fetch documents');
        return res.json();
    },

    async deleteDocument(filename: string): Promise<{ status: string; message: string }> {
        const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        await handleResponse(res);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to delete document');
        }
        return res.json();
    },

    async clearAll(): Promise<{ status: string; message: string }> {
        const res = await fetch(`${API_BASE}/clear`, {
            method: 'POST',
            headers: getHeaders(),
        });

        await handleResponse(res);

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
        const res = await fetch(`${API_BASE}/limits`, {
            headers: getHeaders(),
        });

        await handleResponse(res);

        if (!res.ok) throw new Error('Failed to fetch limits');
        return res.json();
    },

    async query(query: string, topK: number): Promise<QueryResponse> {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getHeaders()
            },
            body: JSON.stringify({ query, top_k: topK }),
        });

        await handleResponse(res);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Query failed');
        }
        return res.json();
    },
};
