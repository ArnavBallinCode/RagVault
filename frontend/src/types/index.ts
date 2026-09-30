// Department type - fixed set V1
export type Department =
    | 'finance'
    | 'hr'
    | 'engineering'
    | 'product'
    | 'legal'
    | 'operations'
    | 'sales'
    | 'general';

export interface User {
    username: string;
    name: string;
    role: 'admin' | 'user';
    departments: string[];  // User's accessible departments
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
    department: string;  // NEW
    path: string;
    next_step: string;
}

export interface RefreshResponse {
    status: string;
    message: string;
    documents_indexed: number;
}

export interface DocumentInfo {
    filename: string;
    path: string;
    department: string;  // NEW
    size_bytes: number;
    size_mb: number;
    modified: string;
    uploaded_by?: string;
}

export interface DocumentsResponse {
    total_chunks: number;
    documents: string[];
    documents_info: DocumentInfo[];  // NEW: Detailed info
    count: number;
    user_departments: string[];  // NEW
    is_admin: boolean;  // NEW
    max_file_size_mb?: number;
}

export interface QueryRequest {
    query: string;
    top_k: number;
}

export interface SourceDetail {
    filename: string;
    pages: string | null;  // e.g., "1, 3, 5" or null
    focused_content: string;  // Query-relevant content only (precision extracted)
    matched_entities: string[];  // Entities matched for highlighting
    department: string;
}

export interface EvidenceNode {
    id: string;
    kind: 'answer' | 'source' | 'entity';
    label: string;
    department?: string | null;
}

export interface EvidenceEdge {
    source: string;
    target: string;
    relation: string;
}

export interface EvidenceGraph {
    nodes: EvidenceNode[];
    edges: EvidenceEdge[];
}

export interface QueryResponse {
    query: string;
    answer: string;
    sources: string[];
    source_details?: SourceDetail[];
    evidence_graph?: EvidenceGraph;
    timestamp: string;
}

export interface NodeStatus {
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    role: 'admin' | 'user';
    username: string;
    name: string;
    departments: string[];  // NEW
}

// User management types
export interface UserInfo {
    username: string;
    name: string;
    role: 'admin' | 'user';
    departments: string[];
}

export interface UsersResponse {
    users: UserInfo[];
    total: number;
    available_departments: string[];
}

export interface DepartmentsResponse {
    departments: string[];
    user_departments: string[];
    shared_department: string;
}

export interface StatsResponse {
    // Support both old and new formats
    latency_breakdown?: {
        retrieval_ms: number;
        rerank_ms: number;
        llm_ms: number;
        total_ms: number;
        retrieval_pct: number;
        rerank_pct: number;
        llm_pct: number;
    };
    // Old format
    latency?: {
        avg_query_ms: number;
        avg_retrieval_ms: number;
        avg_rerank_ms: number;
        avg_llm_ms: number;
    };
    errors?: {
        retrieval_rate: number;
        rerank_rate: number;
        llm_rate: number;
        total_rate: number;
        retrieval_count: number;
        rerank_count: number;
        llm_count: number;
        total_count: number;
    };
    index_health?: {
        documents_total: number;
        chunks_total: number;
        avg_chunks_per_doc: number;
        last_index_time: string | null;
        last_index_duration_ms: number;
        is_stale: boolean;
    };
    // Old format
    documents?: {
        total: number;
        chunks: number;
    };
    llm_stats?: {
        tokens_total: number;
        tokens_per_query_avg: number;
        llm_latency_p95: number;
    };
    usage?: {
        queries_total: number;
        queries_by_role: { admin: number; user: number };
        queries_per_minute: number;
        requests_total: number;
    };
    // Old format
    queries?: {
        total: number;
        by_role: { admin: number; user: number };
        successful: number;
        failed: number;
    };
    requests?: {
        total: number;
        by_endpoint: Record<string, number>;
        by_status: { success: number; error: number };
    };
    system: {
        rag_initialized: boolean;
        uptime_requests?: number;
    };
}
