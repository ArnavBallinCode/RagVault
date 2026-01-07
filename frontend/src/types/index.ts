export interface User {
    username: string;
    name: string;
    role: 'admin' | 'user';
}

export interface HealthResponse {
    status: string;
    rag_initialized: boolean;
    documents_indexed: number;
}

export interface UploadResponse {
    status: string;
    message: string;
    filename: string;
    path: string;
    next_step: string;
}

export interface RefreshResponse {
    status: string;
    message: string;
    documents_indexed: number;
}

export interface DocumentsResponse {
    total_chunks: number;
    documents: string[];
    count: number;
}

export interface QueryRequest {
    query: string;
    top_k: number;
}

export interface QueryResponse {
    query: string;
    answer: string;
    sources: string[];
    timestamp: string;
}

export interface NodeStatus {
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
}
