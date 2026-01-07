import { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  RefreshCw,
  FileText,
  Search,
  Shield,
  Wifi,
  WifiOff,
  Lock,
  LogOut,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  FileUp,
  Zap,
  LayoutDashboard,
  FolderOpen,
  Settings,
  Cpu,
  Eye,
  BarChart3,
  Download,
  Trash2,
  ChevronRight,
  Menu,
  X,
  Sliders,
  Terminal,
  Bot,
  Database,
  Play,
  Sparkles,
  MessageCircle,
  Send,
} from 'lucide-react';

import { api } from './api/client';
import type { User as UserType, DocumentsResponse, QueryResponse, HealthResponse } from './types';
import { Plus } from 'lucide-react';

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

const Sidebar = ({ isOpen, onClose, userRole }: { isOpen: boolean; onClose: () => void; userRole: 'admin' | 'user' }) => {

  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Pipeline', adminOnly: true },
    { path: '/chat', icon: MessageCircle, label: 'Chat', adminOnly: false },
    { path: '/documents', icon: FolderOpen, label: 'Documents', adminOnly: true },
    { path: '/models', icon: Cpu, label: 'LLM Settings', adminOnly: true },
    { path: '/settings', icon: Settings, label: 'Configuration', adminOnly: true },
  ];

  // Filter nav items based on role
  const navItems = userRole === 'admin'
    ? allNavItems
    : allNavItems.filter(item => !item.adminOnly);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Shield size={24} />
            <span>RagVault</span>
          </div>
          <button className="sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-title">Platform</span>
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                <ChevronRight size={14} className="nav-chevron" />
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="nav-item">
            <Terminal size={18} />
            <span>API Docs</span>
          </a>
        </div>
      </aside>
    </>
  );
};

const Breadcrumb = () => {
  const location = useLocation();
  const paths: Record<string, string> = {
    '/': 'Pipeline',
    '/documents': 'Documents',
    '/models': 'LLM Settings',
    '/settings': 'Configuration',
  };

  return (
    <div className="breadcrumb">
      <NavLink to="/" className="breadcrumb-item">Dashboard</NavLink>
      <ChevronRight size={14} />
      <span className="breadcrumb-current">{paths[location.pathname] || 'Pipeline'}</span>
    </div>
  );
};

// ============================================================================
// PIPELINE PAGE (React Flow)
// ============================================================================

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
      <Handle type="source" position={Position.Right} className="node-handle" />

      <div className="node-content-area">
        <h3>Data</h3>
        <p className="node-subtitle">Document Upload</p>

        <div
          className={`node-dropzone ${dragOver ? 'dragover' : ''} ${data.status}`}
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
          {data.status === 'success' && <CheckCircle2 size={24} color="var(--accent-green)" />}
          {data.status === 'error' && <XCircle size={24} color="var(--accent-red)" />}
        </div>

        {data.filename && (
          <div className="node-tag">{data.filename}</div>
        )}
      </div>

      <div className="node-toolbar">
        <button title="View"><Eye size={14} /></button>
        <button title="Stats"><BarChart3 size={14} /></button>
        <button title="Download"><Download size={14} /></button>
      </div>
    </div>
  );
};

const ProcessNode = ({ data }: { data: any }) => (
  <div className="pipeline-node processing">
    <Handle type="target" position={Position.Left} className="node-handle" />
    <Handle type="source" position={Position.Right} className="node-handle" />

    <div className="node-content-area">
      <h3>Processing</h3>
      <p className="node-subtitle">{data.status === 'processing' ? 'Indexing...' : 'Ready'}</p>

      {data.status === 'processing' ? (
        <div className="progress-ring-container">
          <svg className="progress-ring" viewBox="0 0 60 60">
            <circle className="progress-ring-bg" cx="30" cy="30" r="24" />
            <circle
              className="progress-ring-fill"
              cx="30" cy="30" r="24"
              strokeDasharray={150.8}
              strokeDashoffset={150.8 - (data.progress / 100) * 150.8}
            />
          </svg>
          <span className="progress-value">{data.progress}</span>
        </div>
      ) : (
        <button className="node-action-btn" onClick={data.onRefresh} disabled={!data.isOnline}>
          <Zap size={16} /> Index
        </button>
      )}

      <div className="node-tag">{data.chunks} chunks</div>
    </div>

    <div className="node-toolbar">
      <button title="Configure"><Sliders size={14} /></button>
      <button title="Logs"><Terminal size={14} /></button>
      <button title="Stats"><BarChart3 size={14} /></button>
    </div>
  </div>
);

const QueryNode = ({ data }: { data: any }) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(3);

  return (
    <div className="pipeline-node query">
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />

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
            min={1}
            max={10}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
          <span className="topk-val">{topK}</span>
        </div>

        <button
          className="node-action-btn primary"
          onClick={() => data.onQuery(query, topK)}
          disabled={!query.trim() || data.status === 'querying'}
        >
          {data.status === 'querying' ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          Search
        </button>
      </div>

      <div className="node-toolbar">
        <button title="Settings"><Sliders size={14} /></button>
        <button title="History"><Terminal size={14} /></button>
        <button title="Stats"><BarChart3 size={14} /></button>
      </div>
    </div>
  );
};

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
      <Handle type="target" position={Position.Left} className="node-handle" />

      <div className="node-content-area">
        <div className="node-header-row">
          <div>
            <h3>Response</h3>
            <p className="node-subtitle">{data.result ? 'Answer ready' : 'Waiting for query'}</p>
          </div>
          {data.result && (
            <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>

        {data.status === 'loading' && (
          <div className="result-loading">
            <div className="progress-ring-container">
              <svg className="progress-ring" viewBox="0 0 60 60">
                <circle className="progress-ring-bg" cx="30" cy="30" r="24" />
                <circle
                  className="progress-ring-fill generating"
                  cx="30" cy="30" r="24"
                  strokeDasharray={150.8}
                  strokeDashoffset={150.8 - (data.progress / 100) * 150.8}
                />
              </svg>
              <span className="progress-value">{data.progress}</span>
            </div>
            <div className="stage-info">
              <span className="stage-label">{data.stage || 'Processing...'}</span>
              <span className="stage-percent">{data.progress}%</span>
            </div>
          </div>
        )}

        {data.result && (
          <div className="result-full">
            <div className="answer-box markdown-content">
              <ReactMarkdown>{data.result.answer}</ReactMarkdown>
            </div>
            {data.result.sources.length > 0 && (
              <div className="sources-box">
                <span className="sources-label">Sources:</span>
                <div className="source-tags">
                  {data.result.sources.map((s: string, i: number) => (
                    <span key={i} className="source-tag-mini">{s.split('/').pop()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!data.result && data.status !== 'loading' && (
          <div className="node-empty">
            <Bot size={32} opacity={0.3} />
            <span>Ask a question to get started</span>
          </div>
        )}
      </div>

      <div className="node-toolbar">
        <button title="Copy" onClick={copyResult}>
          {copied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
        </button>
        <button title="Expand" onClick={() => setExpanded(!expanded)}><Eye size={14} /></button>
        <button title="Download" onClick={() => {
          if (data.result?.answer) {
            const blob = new Blob([data.result.answer], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'response.txt';
            a.click();
            URL.revokeObjectURL(url);
          }
        }}><Download size={14} /></button>
      </div>
    </div>
  );
};

const nodeTypes = {
  upload: UploadNode,
  process: ProcessNode,
  query: QueryNode,
  result: ResultNode,
};

const PipelinePage = ({
  isOnline, health,
  uploadStatus, uploadFilename, onUpload,
  refreshStatus, refreshProgress, onRefresh,
  queryStatus, queryResult, queryProgress, queryStage, onQuery
}: any) => {
  const initialNodes: Node[] = [
    { id: 'upload', type: 'upload', position: { x: 80, y: 150 }, data: {} },
    { id: 'process', type: 'process', position: { x: 380, y: 150 }, data: {} },
    { id: 'query', type: 'query', position: { x: 680, y: 150 }, data: {} },
    { id: 'result', type: 'result', position: { x: 1000, y: 150 }, data: {} },
  ];

  const initialEdges: Edge[] = [
    { id: 'e1', source: 'upload', target: 'process', animated: true, style: { stroke: 'rgba(255,255,255,0.2)' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e2', source: 'process', target: 'query', animated: true, style: { stroke: 'rgba(255,255,255,0.2)' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e3', source: 'query', target: 'result', animated: true, style: { stroke: 'rgba(255,255,255,0.2)' }, markerEnd: { type: MarkerType.ArrowClosed } },
  ];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodesWithData = nodes.map(node => ({
    ...node,
    data: {
      ...(node.id === 'upload' && { status: uploadStatus, filename: uploadFilename, onUpload, isOnline }),
      ...(node.id === 'process' && { status: refreshStatus, progress: refreshProgress, chunks: health?.documents_indexed || 0, onRefresh, isOnline }),
      ...(node.id === 'query' && { status: queryStatus, onQuery, isOnline }),
      ...(node.id === 'result' && { result: queryResult, status: queryStatus === 'querying' ? 'loading' : (queryResult ? 'ready' : 'idle'), progress: queryProgress, stage: queryStage }),
    }
  }));

  return (
    <div className="pipeline-page">
      <ReactFlow
        nodes={nodesWithData}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={30} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

// ============================================================================
// DOCUMENTS PAGE
// ============================================================================

const DocumentsPage = ({ documents, isOnline, onRefresh, onDocumentsChange }: any) => {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const handleDelete = (filename: string) => {
    confirmAction(
      'Delete Document',
      `Are you sure you want to delete "${filename}"? This cannot be undone.`,
      async () => {
        setConfirmModal(null);
        setDeleting(filename);
        try {
          await api.deleteDocument(filename);
          onDocumentsChange();
        } catch (err) {
          console.error('Delete failed:', err);
        }
        setDeleting(null);
      }
    );
  };

  const handleClearAll = () => {
    confirmAction(
      '⚠️ Clear All Data',
      'This will DELETE all documents, clear the cache, and reset the RAG system. This action cannot be undone!',
      async () => {
        setConfirmModal(null);
        setClearing(true);
        try {
          await api.clearAll();
          onDocumentsChange();
        } catch (err) {
          console.error('Clear failed:', err);
        }
        setClearing(false);
      }
    );
  };

  // Get documents_info for file sizes if available
  const docsInfo = documents?.documents_info || [];

  return (
    <div className="page-content">
      {/* Confirmation Modal */}
      {confirmModal?.show && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>{confirmModal.title}</h2>
            <p>{confirmModal.message}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmModal.onConfirm}>
                <Trash2 size={16} /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Documents</h1>
          <p>Manage your indexed documents • Max 10MB per file • Keep under 50MB total</p>
        </div>
        <div className="header-actions">
          <button className="btn-danger" onClick={handleClearAll} disabled={clearing}>
            <Trash2 size={16} /> {clearing ? 'Clearing...' : 'Clear All'}
          </button>
          <button className="btn-primary" onClick={onRefresh} disabled={!isOnline}>
            <RefreshCw size={16} /> Re-index All
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Database size={24} />
          <div>
            <span className="stat-value">{documents?.count || 0}</span>
            <span className="stat-label">Total Documents</span>
          </div>
        </div>
        <div className="stat-card">
          <FileText size={24} />
          <div>
            <span className="stat-value">{documents?.total_chunks || 0}</span>
            <span className="stat-label">Total Chunks</span>
          </div>
        </div>
        <div className="stat-card warning">
          <Sparkles size={24} />
          <div>
            <span className="stat-value">10MB</span>
            <span className="stat-label">Max File Size</span>
          </div>
        </div>
      </div>

      {documents?.total_chunks > 300 && (
        <div className="warning-banner">
          ⚠️ High chunk count ({documents.total_chunks}). May cause memory issues. Consider removing large files.
        </div>
      )}

      <div className="documents-table">
        <div className="table-header">
          <span>Document</span>
          <span>Size</span>
          <span>Actions</span>
        </div>
        {docsInfo.length > 0 ? (
          docsInfo.map((doc: any, i: number) => (
            <div key={i} className="table-row">
              <div className="doc-info">
                <FileText size={18} />
                <span>{doc.filename}</span>
              </div>
              <span className="doc-size">{doc.size_mb} MB</span>
              <div className="doc-actions">
                <button
                  title="Delete"
                  className="danger"
                  onClick={() => handleDelete(doc.filename)}
                  disabled={deleting === doc.filename}
                >
                  {deleting === doc.filename ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))
        ) : documents?.documents?.map((doc: string, i: number) => {
          const filename = doc.split('/').pop() || doc;
          return (
            <div key={i} className="table-row">
              <div className="doc-info">
                <FileText size={18} />
                <span>{filename}</span>
              </div>
              <span className="doc-size">-</span>
              <div className="doc-actions">
                <button
                  title="Delete"
                  className="danger"
                  onClick={() => handleDelete(filename)}
                  disabled={deleting === filename}
                >
                  {deleting === filename ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          );
        })}
        {(!documents?.documents || documents.documents.length === 0) && (
          <div className="empty-state">
            <FolderOpen size={48} />
            <p>No documents uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// LLM SETTINGS PAGE
// ============================================================================

const LLMPage = () => {
  const [llmInfo, setLlmInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLLMStatus = async () => {
      // Try multiple endpoints that llamafile might have
      const endpoints = [
        'http://localhost:8081/v1/models',
        'http://localhost:8081/health',
        'http://localhost:8081/',
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'GET',
            mode: 'cors',
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            setLlmInfo({
              status: 'online',
              port: 8081,
              model: data?.data?.[0]?.id || 'Mistral-Nemo-Instruct'
            });
            setLoading(false);
            return;
          }
        } catch {
          // Try next endpoint
        }
      }

      // If all CORS requests failed, try a no-cors request to at least detect if server is up
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        await fetch('http://localhost:8081/', {
          mode: 'no-cors',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        // If we get here, server is reachable (even if we can't read response)
        setLlmInfo({ status: 'online', port: 8081, model: 'Mistral-Nemo-Instruct' });
      } catch {
        setLlmInfo({ status: 'offline' });
      }
      setLoading(false);
    };
    checkLLMStatus();
  }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>LLM Settings</h1>
          <p>Configure your local language model (Llamafile on port 8081)</p>
        </div>
        <a href="http://localhost:8081" target="_blank" rel="noreferrer" className="btn-secondary">
          <Play size={16} /> Open LLM UI
        </a>
      </div>

      <div className="settings-section">
        <h2>Model Status</h2>
        <div className="settings-card">
          <div className="setting-row">
            <span>Server Status</span>
            <span className={`status-badge ${llmInfo?.status === 'online' ? 'online' : 'offline'}`}>
              {loading ? 'Checking...' : llmInfo?.status === 'online' ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          <div className="setting-row">
            <span>Server URL</span>
            <code>http://localhost:8081</code>
          </div>
          <div className="setting-row">
            <span>Model</span>
            <span>Mistral-Nemo-Instruct-2407.Q5_K_M</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Generation Settings</h2>
        <div className="settings-card">
          <div className="setting-row">
            <span>Temperature</span>
            <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" />
            <span>0.7</span>
          </div>
          <div className="setting-row">
            <span>Max Tokens</span>
            <input type="number" defaultValue="512" className="input-sm" />
          </div>
          <div className="setting-row">
            <span>Top P</span>
            <input type="range" min="0" max="1" step="0.1" defaultValue="0.9" />
            <span>0.9</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Prompt Template</h2>
        <div className="settings-card">
          <textarea
            className="prompt-editor"
            defaultValue={`You are a helpful AI assistant. Answer questions based on the provided context.

Context:
{context}

Question: {question}

Answer:`}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CONFIGURATION PAGE
// ============================================================================

const ConfigPage = () => (
  <div className="page-content">
    <div className="page-header">
      <div>
        <h1>Configuration</h1>
        <p>RAG system settings and constraints</p>
      </div>
    </div>

    <div className="settings-section">
      <h2>Retrieval Settings</h2>
      <div className="settings-card">
        <div className="setting-row">
          <span>Default Top K</span>
          <input type="number" defaultValue="3" className="input-sm" />
        </div>
        <div className="setting-row">
          <span>Use Reranking</span>
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-row">
          <span>Hybrid Search (BM25 + Vector)</span>
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-row">
          <span>BM25 Weight</span>
          <input type="range" min="0" max="1" step="0.1" defaultValue="0.5" />
          <span>0.5</span>
        </div>
      </div>
    </div>

    <div className="settings-section">
      <h2>System Constraints</h2>
      <div className="constraints-grid">
        <div className="constraint-card active">
          <WifiOff size={24} />
          <h4>Offline Operation</h4>
          <p>No internet required</p>
        </div>
        <div className="constraint-card active">
          <Cpu size={24} />
          <h4>Local Hardware</h4>
          <p>Runs on your machine</p>
        </div>
        <div className="constraint-card active">
          <Lock size={24} />
          <h4>Data Privacy</h4>
          <p>Data never leaves device</p>
        </div>
        <div className="constraint-card active">
          <RefreshCw size={24} />
          <h4>Incremental Learning</h4>
          <p>Add docs anytime</p>
        </div>
      </div>
    </div>

    <div className="settings-section">
      <h2>Chunk Settings</h2>
      <div className="settings-card">
        <div className="setting-row">
          <span>Chunk Size</span>
          <input type="number" defaultValue="500" className="input-sm" />
        </div>
        <div className="setting-row">
          <span>Chunk Overlap</span>
          <input type="number" defaultValue="100" className="input-sm" />
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// CHAT PAGE
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

const ChatPage = ({ isOnline, userRole, onUpload, onRefresh }: { isOnline: boolean; userRole: 'admin' | 'user'; onUpload?: (file: File) => Promise<void>; onRefresh?: () => Promise<void> }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [topK, setTopK] = useState(5);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setUploading(true);
    try {
      await onUpload(file);
      if (onRefresh) await onRefresh();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Document "${file.name}" uploaded and indexed successfully!`,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to upload: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isOnline) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.query(input, topK);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please make sure the LLM server is running.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-title">
            <MessageCircle size={24} />
            <h1>Chat</h1>
          </div>
          <div className="chat-settings">
            {userRole === 'admin' && onRefresh && (
              <button className="btn-secondary small" onClick={onRefresh} title="Re-index documents">
                <RefreshCw size={16} />
              </button>
            )}
            <span>Top K:</span>
            <input
              type="range"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
            <span className="topk-val">{topK}</span>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <Bot size={48} opacity={0.3} />
              <h2>Start a conversation</h2>
              <p>Ask questions about your uploaded documents</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="message-sources">
                    <span>Sources:</span>
                    {msg.sources.map((s, i) => (
                      <span key={i} className="source-tag-mini">{s.split('/').pop()}</span>
                    ))}
                  </div>
                )}
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-bubble typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          {userRole === 'admin' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.doc"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !isOnline}
                title="Upload document"
              >
                {uploading ? <Loader2 size={20} className="spin" /> : <Plus size={20} />}
              </button>
            </>
          )}
          <input
            type="text"
            placeholder={isOnline ? "Ask a question about your documents..." : "Backend offline..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={!isOnline || isLoading}
          />
          <button onClick={sendMessage} disabled={!isOnline || isLoading || !input.trim()}>
            {isLoading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LOGIN
// ============================================================================

const LoginModal = ({ onLogin }: { onLogin: (user: UserType) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(username, password);
      onLogin({
        username: response.username,
        name: response.name,
        role: response.role
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">🔒</div>
        <h1>RagVault</h1>
        <p>Secure Offline RAG System</p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-hint">
          Demo: admin/admin123
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

function AppContent({ user, setUser }: { user: UserType; setUser: (u: UserType | null) => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadFilename, setUploadFilename] = useState<string>();
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [queryStatus, setQueryStatus] = useState<'idle' | 'querying'>('idle');
  const [queryProgress, setQueryProgress] = useState(0);
  const [queryStage, setQueryStage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const h = await api.health();
        setHealth(h);
        setIsOnline(h.status === 'healthy');
        const d = await api.getDocuments();
        setDocuments(d);
      } catch {
        setIsOnline(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setUploadStatus('uploading');
    try {
      const res = await api.uploadDocument(file);
      setUploadStatus('success');
      setUploadFilename(res.filename);
    } catch {
      setUploadStatus('error');
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshStatus('processing');
    setRefreshProgress(0);
    const interval = setInterval(() => setRefreshProgress(p => Math.min(p + 10, 90)), 500);
    try {
      await api.refresh();
      clearInterval(interval);
      setRefreshProgress(100);
      const d = await api.getDocuments();
      setDocuments(d);
      const h = await api.health();
      setHealth(h);
      setTimeout(() => setRefreshStatus('idle'), 1000);
    } catch {
      clearInterval(interval);
      setRefreshStatus('idle');
    }
  }, []);

  const handleQuery = useCallback(async (query: string, topK: number) => {
    setQueryStatus('querying');
    setQueryResult(null);
    setQueryProgress(0);
    setQueryStage('Embedding query...');

    // Simulate progress stages
    const stages = [
      { progress: 15, stage: 'Embedding query...', delay: 300 },
      { progress: 35, stage: 'Searching documents...', delay: 500 },
      { progress: 55, stage: 'Reranking results...', delay: 800 },
      { progress: 75, stage: 'Generating response...', delay: 0 },
    ];

    let stageIndex = 0;
    const progressInterval = setInterval(() => {
      if (stageIndex < stages.length) {
        setQueryProgress(stages[stageIndex].progress);
        setQueryStage(stages[stageIndex].stage);
        stageIndex++;
      } else {
        // Slowly increment while waiting for response
        setQueryProgress(p => Math.min(p + 2, 95));
      }
    }, 600);

    try {
      const res = await api.query(query, topK);
      clearInterval(progressInterval);
      setQueryProgress(100);
      setQueryStage('Complete!');
      setQueryResult(res);
    } catch (err) {
      clearInterval(progressInterval);
      alert(err instanceof Error ? err.message : 'Query failed');
    }
    setQueryStatus('idle');
  }, []);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={user.role} />

      <main className="main-content">
        <header className="top-bar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <Breadcrumb />

          <div className="top-bar-right">
            <div className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <div className="user-pill" onClick={() => setUser(null)}>
              <span>{user.name.charAt(0)}</span>
              <LogOut size={14} />
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={
            <PipelinePage
              isOnline={isOnline}
              health={health}
              documents={documents}
              uploadStatus={uploadStatus}
              uploadFilename={uploadFilename}
              onUpload={handleUpload}
              refreshStatus={refreshStatus}
              refreshProgress={refreshProgress}
              onRefresh={handleRefresh}
              queryStatus={queryStatus}
              queryResult={queryResult}
              queryProgress={queryProgress}
              queryStage={queryStage}
              onQuery={handleQuery}
            />
          } />
          <Route path="/chat" element={
            <ChatPage
              isOnline={isOnline}
              userRole={user.role}
              onUpload={async (file) => {
                await api.uploadDocument(file);
              }}
              onRefresh={handleRefresh}
            />
          } />
          {user.role === 'admin' ? (
            <>
              <Route path="/documents" element={
                <DocumentsPage
                  documents={documents}
                  isOnline={isOnline}
                  onRefresh={handleRefresh}
                  onDocumentsChange={async () => {
                    const d = await api.getDocuments();
                    setDocuments(d);
                    try {
                      const h = await api.health();
                      setHealth(h);
                      setIsOnline(h.status === 'healthy');
                    } catch {
                      setIsOnline(false);
                    }
                  }}
                />
              } />
              <Route path="/models" element={<LLMPage />} />
              <Route path="/settings" element={<ConfigPage />} />
            </>
          ) : (
            <>
              <Route path="/documents" element={<Navigate to="/chat" replace />} />
              <Route path="/models" element={<Navigate to="/chat" replace />} />
              <Route path="/settings" element={<Navigate to="/chat" replace />} />
              <Route path="/" element={<Navigate to="/chat" replace />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<UserType | null>(null);

  if (!user) {
    return <LoginModal onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <AppContent user={user} setUser={setUser} />
    </BrowserRouter>
  );
}

export default App;
