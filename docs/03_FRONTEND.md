# RagVault Frontend Documentation

> Complete technical reference for the React + Vite frontend application, including components, API integration, and visual pipeline.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Components](#components)
6. [API Client](#api-client)
7. [State Management](#state-management)
8. [Styling](#styling)
9. [Development Guide](#development-guide)

---

## Overview

### What is the Frontend?

RagVault's frontend is a modern React application that provides a visual, interactive interface for:

- **Document Upload:** Drag-and-drop file upload
- **Visual Pipeline:** ReactFlow-based RAG visualization
- **Query Interface:** Natural language question input
- **Response Display:** Formatted answers with sources
- **Document Management:** List, delete, and manage documents
- **LLM Configuration:** Model settings and status

### Screenshots

```
┌────────────────────────────────────────────────────────────────────────────┐
│  RagVault                                                                  │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────────┐    ┌─────────┐    ┌──────────────────┐   │
│  │  DATA   │───▶│  PROCESSING │───▶│  QUERY  │───▶│    RESPONSE      │   │
│  │         │    │             │    │         │    │                  │   │
│  │ [Upload]│    │  248 chunks │    │ [Input] │    │ The answer is... │   │
│  │  .pdf   │    │   ⟳ Index   │    │ [Search]│    │ Sources: [1][2]  │   │
│  └─────────┘    └─────────────┘    └─────────┘    └──────────────────┘   │
│                                                                            │
│  ─────────────────────────────────────────────────────────────────────────│
│  [Controls]  🔍 Zoom | 🔒 Lock | 📐 Fit View                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | Component framework |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 7.x | Build tool & dev server |
| **ReactFlow** | 11.x | Visual pipeline diagrams |
| **React Router** | 7.x | Page navigation |
| **Lucide React** | 0.56+ | Icon library |
| **Framer Motion** | 12.x | Animations |

---

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main application (1019 lines)
│   ├── App.css              # Global styles
│   ├── main.tsx             # Entry point
│   ├── index.css            # Base styles
│   ├── api/
│   │   └── client.ts        # API client (97 lines)
│   └── types/
│       └── index.ts         # TypeScript types
├── public/
│   └── vite.svg             # Favicon
├── index.html               # HTML entry
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
└── eslint.config.js         # Linting rules
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Server runs at: **http://localhost:5173**

### Production Build

```bash
npm run build
npm run preview
```

### Available Scripts

```json
{
  "scripts": {
    "dev": "vite",                    // Start dev server
    "build": "tsc -b && vite build",  // Production build
    "lint": "eslint .",               // Run linter
    "preview": "vite preview"         // Preview build
  }
}
```

---

## Components

### Application Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  App                                                             │
│  ├── BrowserRouter                                               │
│  │   ├── Sidebar (navigation)                                   │
│  │   ├── Header (status bar)                                    │
│  │   └── Routes                                                 │
│  │       ├── PipelinePage (/)                                   │
│  │       ├── DocumentsPage (/documents)                         │
│  │       ├── LLMPage (/models)                                  │
│  │       └── ConfigPage (/settings)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar Component

```tsx
// App.tsx - Sidebar (lines 57-112)

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Pipeline', badge: null },
    { path: '/documents', icon: FolderOpen, label: 'Documents', badge: null },
    { path: '/models', icon: Cpu, label: 'LLM Settings', badge: null },
    { path: '/settings', icon: Settings, label: 'Configuration', badge: null },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Shield size={24} />
          <span>RagVault</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <a href="http://localhost:8000/docs" target="_blank" className="nav-item">
          <Terminal size={18} />
          <span>API Docs</span>
        </a>
      </div>
    </aside>
  );
};
```

### Pipeline Page (ReactFlow)

The main visual interface using ReactFlow:

```tsx
// App.tsx - PipelinePage (lines 362-411)

const PipelinePage = ({
  isOnline, health,
  uploadStatus, uploadFilename, onUpload,
  refreshStatus, refreshProgress, onRefresh,
  queryStatus, queryResult, onQuery
}: any) => {
  
  const initialNodes: Node[] = [
    { id: 'upload', type: 'upload', position: { x: 80, y: 150 }, data: {} },
    { id: 'process', type: 'process', position: { x: 380, y: 150 }, data: {} },
    { id: 'query', type: 'query', position: { x: 680, y: 150 }, data: {} },
    { id: 'result', type: 'result', position: { x: 1000, y: 150 }, data: {} },
  ];

  const initialEdges: Edge[] = [
    { id: 'e1', source: 'upload', target: 'process', animated: true },
    { id: 'e2', source: 'process', target: 'query', animated: true },
    { id: 'e3', source: 'query', target: 'result', animated: true },
  ];

  return (
    <div className="pipeline-page">
      <ReactFlow
        nodes={nodesWithData}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={30} />
        <Controls />
      </ReactFlow>
    </div>
  );
};
```

### Custom Node Types

#### UploadNode

```tsx
// App.tsx - UploadNode (lines 136-188)

const UploadNode = ({ data }: { data: any }) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) data.onUpload(file);
  };

  return (
    <div className="pipeline-node">
      <Handle type="source" position={Position.Right} />
      
      <div className="node-content-area">
        <h3>Data</h3>
        <p className="node-subtitle">Document Upload</p>

        <div
          className={`node-dropzone ${dragOver ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && data.onUpload(e.target.files[0])}
          />
          {data.status === 'idle' && <FileUp size={24} />}
          {data.status === 'uploading' && <Loader2 size={24} className="spin" />}
          {data.status === 'success' && <CheckCircle2 size={24} color="green" />}
        </div>
      </div>
    </div>
  );
};
```

#### QueryNode

```tsx
// App.tsx - QueryNode (lines 229-280)

const QueryNode = ({ data }: { data: any }) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(3);

  return (
    <div className="pipeline-node query">
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="node-content-area">
        <h3>Query</h3>
        <p className="node-subtitle">Hybrid RAG</p>

        <input
          type="text"
          className="node-input"
          placeholder="Ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && data.onQuery(query, topK)}
        />

        <div className="topk-inline">
          <span>Top K:</span>
          <input
            type="range"
            min={1} max={10}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
          <span>{topK}</span>
        </div>

        <button
          className="node-action-btn primary"
          onClick={() => data.onQuery(query, topK)}
          disabled={!query.trim() || data.status === 'querying'}
        >
          <Search size={16} /> Search
        </button>
      </div>
    </div>
  );
};
```

#### ResultNode

```tsx
// App.tsx - ResultNode (lines 282-353)

const ResultNode = ({ data }: { data: any }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyResult = () => {
    if (data.result?.answer) {
      navigator.clipboard.writeText(data.result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`pipeline-node result ${expanded ? 'expanded' : ''}`}>
      <Handle type="target" position={Position.Left} />

      <div className="node-content-area">
        <h3>Response</h3>
        
        {data.status === 'loading' && (
          <div className="result-loading">
            <Loader2 size={24} className="spin" />
            <span>Generating response...</span>
          </div>
        )}

        {data.result && (
          <div className="result-full">
            <div className="answer-box">{data.result.answer}</div>
            
            {data.result.sources.length > 0 && (
              <div className="sources-box">
                <span>Sources:</span>
                {data.result.sources.map((s: string, i: number) => (
                  <span key={i} className="source-tag">
                    {s.split('/').pop()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="node-toolbar">
        <button onClick={copyResult}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
};
```

### Documents Page

```tsx
// App.tsx - DocumentsPage (lines 417-592)

const DocumentsPage = ({ documents, isOnline, onRefresh, onDocumentsChange }: any) => {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{...} | null>(null);

  const handleDelete = (filename: string) => {
    confirmAction(
      'Delete Document',
      `Are you sure you want to delete "${filename}"?`,
      async () => {
        setDeleting(filename);
        await api.deleteDocument(filename);
        onDocumentsChange();
        setDeleting(null);
      }
    );
  };

  return (
    <div className="page-content">
      {/* Header with actions */}
      <div className="page-header">
        <h1>Documents</h1>
        <button onClick={onRefresh}>Re-index All</button>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <Database size={24} />
          <span>{documents?.count || 0}</span>
          <span>Total Documents</span>
        </div>
        <div className="stat-card">
          <FileText size={24} />
          <span>{documents?.total_chunks || 0}</span>
          <span>Total Chunks</span>
        </div>
      </div>

      {/* Document table */}
      <div className="documents-table">
        {documents?.documents_info?.map((doc: any) => (
          <div key={doc.filename} className="table-row">
            <span>{doc.filename}</span>
            <span>{doc.size_mb} MB</span>
            <button onClick={() => handleDelete(doc.filename)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### LLM Settings Page

```tsx
// App.tsx - LLMPage (lines 598-721)

const LLMPage = () => {
  const [llmInfo, setLlmInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLLMStatus = async () => {
      const endpoints = [
        'http://localhost:8081/v1/models',
        'http://localhost:8081/health',
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            setLlmInfo({ status: 'online', port: 8081 });
            break;
          }
        } catch {}
      }
      setLoading(false);
    };
    checkLLMStatus();
  }, []);

  return (
    <div className="page-content">
      <h1>LLM Settings</h1>
      
      <div className="settings-section">
        <h2>Model Status</h2>
        <div className="setting-row">
          <span>Server Status</span>
          <span className={`status-badge ${llmInfo?.status}`}>
            {llmInfo?.status === 'online' ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
        <div className="setting-row">
          <span>Model</span>
          <span>Mistral-Nemo-Instruct-2407.Q5_K_M</span>
        </div>
      </div>

      <div className="settings-section">
        <h2>Generation Settings</h2>
        <div className="setting-row">
          <span>Temperature</span>
          <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" />
        </div>
        <div className="setting-row">
          <span>Max Tokens</span>
          <input type="number" defaultValue="512" />
        </div>
      </div>
    </div>
  );
};
```

---

## API Client

### Client Implementation

```typescript
// frontend/src/api/client.ts

const API_BASE = 'http://localhost:8000';

export const api = {
  // Health check
  async health(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health status');
    return res.json();
  },

  // Upload document
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

  // Refresh indices
  async refresh(): Promise<RefreshResponse> {
    const res = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to refresh indices');
    return res.json();
  },

  // Get documents
  async getDocuments(): Promise<DocumentsResponse> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  // Delete document
  async deleteDocument(filename: string): Promise<{ status: string }> {
    const res = await fetch(
      `${API_BASE}/documents/${encodeURIComponent(filename)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // Clear all data
  async clearAll(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear data');
    return res.json();
  },

  // Query
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
```

### TypeScript Types

```typescript
// frontend/src/types/index.ts

export interface HealthResponse {
  status: string;
  documents_indexed: number;
  timestamp: string;
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
  documents: string[];
  count: number;
  total_chunks: number;
  documents_info: Array<{
    filename: string;
    size_mb: number;
    chunks?: number;
  }>;
}

export interface QueryResponse {
  query: string;
  answer: string;
  sources: string[];
  timestamp: string;
}
```

---

## State Management

### App-Level State

The main App component manages global state:

```tsx
// App.tsx - Main App component

function App() {
  // Connection status
  const [isOnline, setIsOnline] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);

  // Refresh state
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'processing'>('idle');
  const [refreshProgress, setRefreshProgress] = useState(0);

  // Query state
  const [queryStatus, setQueryStatus] = useState<'idle' | 'querying'>('idle');
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);

  // Documents
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);

  // Health check polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await api.health();
        setHealth(health);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handler functions
  const handleUpload = async (file: File) => {
    setUploadStatus('uploading');
    setUploadFilename(file.name);
    try {
      await api.uploadDocument(file);
      setUploadStatus('success');
      await loadDocuments();
    } catch {
      setUploadStatus('error');
    }
  };

  const handleQuery = async (query: string, topK: number) => {
    setQueryStatus('querying');
    try {
      const result = await api.query(query, topK);
      setQueryResult(result);
    } catch (e) {
      console.error('Query failed:', e);
    }
    setQueryStatus('idle');
  };

  // ... rest of component
}
```

---

## Styling

### CSS Variables

```css
/* App.css - Theme variables */

:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #111118;
  --bg-tertiary: #1a1a24;
  
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #606070;
  
  --accent-blue: #3b82f6;
  --accent-purple: #8b5cf6;
  --accent-green: #22c55e;
  --accent-red: #ef4444;
  
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

### Node Styling

```css
/* Pipeline node styles */

.pipeline-node {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1rem;
  min-width: 200px;
  box-shadow: var(--shadow);
}

.pipeline-node h3 {
  color: var(--text-primary);
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.pipeline-node .node-subtitle {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.node-dropzone {
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.node-dropzone.dragover {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.1);
}
```

---

## Development Guide

### Adding a New Page

1. **Create the component:**

```tsx
const NewPage = () => (
  <div className="page-content">
    <h1>New Page</h1>
    {/* Content */}
  </div>
);
```

2. **Add route:**

```tsx
<Routes>
  <Route path="/" element={<PipelinePage />} />
  <Route path="/new" element={<NewPage />} />
</Routes>
```

3. **Add navigation:**

```tsx
const navItems = [
  // ... existing items
  { path: '/new', icon: Star, label: 'New Page' },
];
```

### Adding a New API Method

```typescript
// api/client.ts

export const api = {
  // ... existing methods

  async newMethod(param: string): Promise<NewResponse> {
    const res = await fetch(`${API_BASE}/new-endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ param }),
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  },
};
```

### Environment Variables

```bash
# .env.local
VITE_API_URL=http://localhost:8000
VITE_LLM_URL=http://localhost:8081
```

```tsx
// Usage
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## Next Steps

- **[Backend Documentation](./02_BACKEND.md)** - API server details
- **[RAG Pipeline](./05_RAG_PIPELINE.md)** - Retrieval system
- **[Configuration](./09_CONFIGURATION.md)** - YAML reference

---

*Last updated: January 2026*
