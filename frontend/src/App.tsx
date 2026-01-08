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
  Clock,
} from 'lucide-react';

import { api } from './api/client';
import type { User as UserType, DocumentsResponse, QueryResponse, HealthResponse, StatsResponse } from './types';
import { Plus } from 'lucide-react';

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

const Sidebar = ({ isOpen, onClose, userRole }: { isOpen: boolean; onClose: () => void; userRole: 'admin' | 'user' }) => {

  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Pipeline', adminOnly: true },
    { path: '/chat', icon: MessageCircle, label: 'Chat', adminOnly: false },
    { path: '/documents', icon: FolderOpen, label: 'Documents', adminOnly: true },
    { path: '/metrics', icon: BarChart3, label: 'Metrics', adminOnly: true },
    { path: '/history', icon: Clock, label: 'History', adminOnly: true },
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

// Stage Node - Mini decorative node showing pipeline stages
const StageNode = ({ data }: { data: { label: string; icon: string } }) => {
  return (
    <div className="stage-node">
      <Handle type="target" position={Position.Left} className="stage-handle" />
      <span className="stage-icon">{data.icon}</span>
      <span className="stage-label">{data.label}</span>
      <Handle type="source" position={Position.Right} className="stage-handle" />
    </div>
  );
};

const nodeTypes = {
  upload: UploadNode,
  process: ProcessNode,
  query: QueryNode,
  result: ResultNode,
  stage: StageNode,
};

const PipelinePage = ({
  isOnline, health,
  uploadStatus, uploadFilename, onUpload,
  refreshStatus, refreshProgress, onRefresh,
  queryStatus, queryResult, queryProgress, queryStage, onQuery
}: any) => {
  // Expanded nodes: main action cards + intermediate stage nodes
  const initialNodes: Node[] = [
    // Main action cards
    { id: 'upload', type: 'upload', position: { x: 50, y: 200 }, data: {} },
    { id: 'process', type: 'process', position: { x: 350, y: 200 }, data: {} },
    { id: 'query', type: 'query', position: { x: 650, y: 200 }, data: {} },
    { id: 'result', type: 'result', position: { x: 950, y: 200 }, data: {} },
    // Pipeline stage indicators (mini nodes)
    { id: 'stage-chunk', type: 'stage', position: { x: 210, y: 120 }, data: { label: 'Chunking', icon: '✂️' } },
    { id: 'stage-embed', type: 'stage', position: { x: 250, y: 280 }, data: { label: 'Embedding', icon: '🔢' } },
    { id: 'stage-index', type: 'stage', position: { x: 290, y: 340 }, data: { label: 'Indexing', icon: '📚' } },
    { id: 'stage-retrieve', type: 'stage', position: { x: 510, y: 120 }, data: { label: 'Retrieval', icon: '🔍' } },
    { id: 'stage-rerank', type: 'stage', position: { x: 550, y: 280 }, data: { label: 'Reranking', icon: '📊' } },
    { id: 'stage-generate', type: 'stage', position: { x: 810, y: 120 }, data: { label: 'Generation', icon: '🤖' } },
  ];

  const initialEdges: Edge[] = [
    // Main flow
    { id: 'e-main-1', source: 'upload', target: 'process', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
    { id: 'e-main-2', source: 'process', target: 'query', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
    { id: 'e-main-3', source: 'query', target: 'result', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
    // Stage connections (decorative)
    { id: 'e-s1', source: 'upload', target: 'stage-chunk', animated: false, style: { stroke: 'rgba(139, 92, 246, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s2', source: 'stage-chunk', target: 'stage-embed', animated: false, style: { stroke: 'rgba(139, 92, 246, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s3', source: 'stage-embed', target: 'stage-index', animated: false, style: { stroke: 'rgba(139, 92, 246, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s4', source: 'stage-index', target: 'process', animated: false, style: { stroke: 'rgba(139, 92, 246, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s5', source: 'process', target: 'stage-retrieve', animated: false, style: { stroke: 'rgba(6, 182, 212, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s6', source: 'stage-retrieve', target: 'stage-rerank', animated: false, style: { stroke: 'rgba(6, 182, 212, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s7', source: 'stage-rerank', target: 'query', animated: false, style: { stroke: 'rgba(6, 182, 212, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s8', source: 'query', target: 'stage-generate', animated: false, style: { stroke: 'rgba(245, 158, 11, 0.3)', strokeDasharray: '5,5' } },
    { id: 'e-s9', source: 'stage-generate', target: 'result', animated: false, style: { stroke: 'rgba(245, 158, 11, 0.3)', strokeDasharray: '5,5' } },
  ];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodesWithData = nodes.map(node => {
    if (node.type === 'stage') {
      return node; // Stage nodes don't need extra data
    }
    return {
      ...node,
      data: {
        ...(node.id === 'upload' && { status: uploadStatus, filename: uploadFilename, onUpload, isOnline }),
        ...(node.id === 'process' && { status: refreshStatus, progress: refreshProgress, chunks: health?.documents_indexed || 0, onRefresh, isOnline }),
        ...(node.id === 'query' && { status: queryStatus, onQuery, isOnline }),
        ...(node.id === 'result' && { result: queryResult, status: queryStatus === 'querying' ? 'loading' : (queryResult ? 'ready' : 'idle'), progress: queryProgress, stage: queryStage }),
      }
    };
  });

  return (
    <div className="pipeline-page">
      <ReactFlow
        nodes={nodesWithData}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
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
// ============================================================================
// METRICS PAGE
// ============================================================================

const MetricsPage = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-state">
          <Loader2 size={48} className="spin" />
          <p>Loading operational metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="error-state">
          <XCircle size={48} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Extract data - support both old and new API formats
  const latency = stats.latency_breakdown || stats.latency || {
    retrieval_ms: 0, rerank_ms: 0, llm_ms: 0, total_ms: 0,
    retrieval_pct: 0, rerank_pct: 0, llm_pct: 0,
    avg_retrieval_ms: 0, avg_rerank_ms: 0, avg_llm_ms: 0, avg_query_ms: 0
  };

  const docs = stats.index_health || stats.documents || {
    documents_total: 0, chunks_total: 0, avg_chunks_per_doc: 0,
    total: 0, chunks: 0
  };

  const queries = stats.usage || stats.queries || {
    queries_total: 0, queries_by_role: { admin: 0, user: 0 }, queries_per_minute: 0,
    total: 0, by_role: { admin: 0, user: 0 }
  };

  const requests = stats.requests || { total: 0, by_endpoint: {}, by_status: { success: 0, error: 0 } };

  // Calculate latency values - handle both formats
  const retrievalMs = 'retrieval_ms' in latency ? latency.retrieval_ms : (latency as any).avg_retrieval_ms || 0;
  const rerankMs = 'rerank_ms' in latency ? latency.rerank_ms : (latency as any).avg_rerank_ms || 0;
  const llmMs = 'llm_ms' in latency ? latency.llm_ms : (latency as any).avg_llm_ms || 0;
  const totalMs = retrievalMs + rerankMs + llmMs;

  const retrievalPct = totalMs > 0 ? (retrievalMs / totalMs) * 100 : 0;
  const rerankPct = totalMs > 0 ? (rerankMs / totalMs) * 100 : 0;
  const llmPct = totalMs > 0 ? (llmMs / totalMs) * 100 : 0;

  // Calculate document values - handle both formats
  const docTotal = 'documents_total' in docs ? docs.documents_total : (docs as any).total || 0;
  const chunkTotal = 'chunks_total' in docs ? docs.chunks_total : (docs as any).chunks || 0;
  const avgChunks = docTotal > 0 ? chunkTotal / docTotal : 0;

  // Calculate query values - handle both formats
  const queryTotal = 'queries_total' in queries ? queries.queries_total : (queries as any).total || 0;
  const queryByRole = 'queries_by_role' in queries ? queries.queries_by_role : (queries as any).by_role || { admin: 0, user: 0 };

  // Calculate error rate from requests
  const errorRate = requests.total > 0 ? (requests.by_status.error / requests.total) * 100 : 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>⚡ Operational Metrics</h1>
          <p>SRE-grade observability for RAG system health and performance</p>
        </div>
        <button className="btn-secondary" onClick={fetchStats}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="operational-metrics">
        {/* PRIMARY PANEL: Query Latency Breakdown */}
        <div className="metrics-panel metrics-panel-hero">
          <div className="panel-header">
            <h2>⏱️ Query Lifecycle Breakdown</h2>
            <span className="panel-subtitle">Where is time being spent?</span>
          </div>
          <div className="latency-breakdown">
            <div className="latency-total">
              <span className="total-label">Total Query Time</span>
              <span className="total-value">{totalMs.toFixed(0)}ms</span>
            </div>
            <div className="latency-stages">
              <div className="stage-bar-container">
                <div className="stage-bar">
                  <div className="stage-segment retrieval" style={{ width: `${retrievalPct}%` }} />
                  <div className="stage-segment rerank" style={{ width: `${rerankPct}%` }} />
                  <div className="stage-segment llm" style={{ width: `${llmPct}%` }} />
                </div>
              </div>
              <div className="stage-details">
                <div className="stage-item">
                  <span className="stage-color retrieval"></span>
                  <span className="stage-name">Retrieval</span>
                  <span className="stage-time">{retrievalMs.toFixed(0)}ms</span>
                  <span className="stage-pct">{retrievalPct.toFixed(1)}%</span>
                </div>
                <div className="stage-item">
                  <span className="stage-color rerank"></span>
                  <span className="stage-name">Rerank</span>
                  <span className="stage-time">{rerankMs.toFixed(0)}ms</span>
                  <span className="stage-pct">{rerankPct.toFixed(1)}%</span>
                </div>
                <div className="stage-item">
                  <span className="stage-color llm"></span>
                  <span className="stage-name">LLM Generation</span>
                  <span className="stage-time">{llmMs.toFixed(0)}ms</span>
                  <span className="stage-pct">{llmPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Rate Panel */}
        <div className="metrics-panel">
          <div className="panel-header">
            <h2>🚨 Request Health</h2>
            <span className="panel-subtitle">Success vs Error Rate</span>
          </div>
          <div className="index-stats">
            <div className="index-stat-row">
              <div className="stat-group">
                <div className="stat-item-inline">
                  <span className="stat-label">Total Requests</span>
                  <span className="stat-value">{requests.total}</span>
                </div>
                <div className="stat-item-inline">
                  <span className="stat-label">Success</span>
                  <span className="stat-value" style={{ color: '#10b981' }}>{requests.by_status.success}</span>
                </div>
                <div className="stat-item-inline">
                  <span className="stat-label">Errors</span>
                  <span className="stat-value" style={{ color: '#ef4444' }}>{requests.by_status.error}</span>
                </div>
              </div>
            </div>
            <div className="index-stat-row">
              <div className="stat-item-block">
                <span className="stat-label">Error Rate</span>
                <span className={`stat-value-sm ${errorRate > 5 ? 'stale' : 'fresh'}`}>
                  {errorRate.toFixed(2)}% {errorRate < 1 ? '✅' : errorRate < 5 ? '⚠️' : '❌'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Index Health */}
        <div className="metrics-panel">
          <div className="panel-header">
            <h2>📚 Index Health</h2>
            <span className="panel-subtitle">Document and chunk counts</span>
          </div>
          <div className="index-stats">
            <div className="index-stat-row">
              <div className="stat-group">
                <div className="stat-item-inline">
                  <span className="stat-label">Documents</span>
                  <span className="stat-value">{docTotal}</span>
                </div>
                <div className="stat-item-inline">
                  <span className="stat-label">Chunks</span>
                  <span className="stat-value">{chunkTotal}</span>
                </div>
                <div className="stat-item-inline">
                  <span className="stat-label">Avg/Doc</span>
                  <span className="stat-value">{avgChunks.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="metrics-panel">
          <div className="panel-header">
            <h2>📈 Usage Patterns</h2>
            <span className="panel-subtitle">Query volume by role</span>
          </div>
          <div className="usage-stats">
            <div className="usage-row">
              <div className="usage-item">
                <span className="usage-label">Total Queries</span>
                <span className="usage-value">{queryTotal}</span>
              </div>
            </div>
            <div className="usage-breakdown">
              <div className="usage-bar-container">
                <div className="usage-bar">
                  <div
                    className="usage-segment admin"
                    style={{ width: queryTotal > 0 ? `${(queryByRole.admin / queryTotal) * 100}%` : '0%' }}
                  >
                    <span>{queryByRole.admin}</span>
                  </div>
                  <div
                    className="usage-segment user"
                    style={{ width: queryTotal > 0 ? `${(queryByRole.user / queryTotal) * 100}%` : '0%' }}
                  >
                    <span>{queryByRole.user}</span>
                  </div>
                </div>
              </div>
              <div className="usage-legend">
                <span><span className="legend-box admin"></span> Admin: {queryByRole.admin}</span>
                <span><span className="legend-box user"></span> User: {queryByRole.user}</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="metrics-panel">
          <div className="panel-header">
            <h2>🔧 System Status</h2>
          </div>
          <div className="system-status">
            <div className={`status-badge ${stats.system.rag_initialized ? 'online' : 'offline'}`}>
              {stats.system.rag_initialized ? '🟢 RAG Initialized' : '🔴 RAG Not Ready'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
// HISTORY PAGE (Admin Only)
// ============================================================================

const HistoryPage = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await api.getHistory();
        setHistory(data.history || []);
        setError(null);
      } catch (err) {
        setError('Failed to load history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="page-content history-page">
      <div className="page-header">
        <h1><Clock size={28} /> Query History</h1>
        <span className="history-count">{history.length} queries logged</span>
      </div>

      {loading && (
        <div className="loading-state">
          <Loader2 size={32} className="spin" />
          <p>Loading history...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="empty-state">
          <Clock size={48} opacity={0.3} />
          <h3>No history yet</h3>
          <p>Queries will appear here once users start asking questions.</p>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Query</th>
                <th>Sources</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, idx) => (
                <tr key={idx}>
                  <td className="history-time">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="history-user">
                    <span className={`user-badge ${entry.role}`}>
                      {entry.user}
                    </span>
                  </td>
                  <td className="history-query">
                    <div className="query-text">{entry.query}</div>
                    <div className="answer-preview">{entry.answer_preview}</div>
                  </td>
                  <td className="history-sources">
                    {entry.sources?.map((s: string, i: number) => (
                      <span key={i} className="source-chip-mini">
                        📄 {s.split('/').pop()}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

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
    <div className="chat-page-gpt">
      {/* Clean centered chat area */}
      <div className="chat-content-area">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">💬</div>
            <h1>RagVault</h1>
            <p>Ask anything about your documents</p>
          </div>
        ) : (
          <div className="chat-messages-gpt">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.role}`}>
                <div className="message-wrapper">
                  <div className="message-icon">
                    {msg.role === 'user' ? '👤' : '✨'}
                  </div>
                  <div className="message-body">
                    <div className="message-text">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="message-sources-gpt">
                        {msg.sources.map((s, i) => (
                          <span key={i} className="source-chip">📄 {s.split('/').pop()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-row assistant">
                <div className="message-wrapper">
                  <div className="message-icon">✨</div>
                  <div className="message-body">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ChatGPT-style floating input bar */}
      <div className="chat-input-gpt-wrapper">
        <div className="chat-input-gpt">
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
                className="input-action-btn"
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
            className="chat-input-field"
            placeholder={isOnline ? "Ask anything..." : "Connecting..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={!isOnline || isLoading}
          />

          {/* Top-K indicator (subtle) */}
          <div className="topk-mini" title={`Top K: ${topK} - ${topK <= 3 ? 'Focused' : topK <= 8 ? 'Balanced' : 'Broader'}`}>
            <input
              type="range"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="topk-mini-slider"
            />
            <span className="topk-mini-value">{topK}</span>
          </div>

          <button
            className="send-btn-gpt"
            onClick={sendMessage}
            disabled={!isOnline || isLoading || !input.trim()}
          >
            {isLoading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
        <p className="input-hint">RagVault uses your documents to provide contextual answers</p>
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
      // Health check is public, always try it
      try {
        const h = await api.health();
        setHealth(h);
        setIsOnline(h.status === 'healthy');
      } catch {
        setIsOnline(false);
        return; // If health fails, don't try documents
      }

      // Documents require admin role - only fetch if admin
      if (user.role === 'admin') {
        try {
          const d = await api.getDocuments();
          setDocuments(d);
        } catch {
          // Documents fetch failed, but backend is still online
          console.warn('Could not fetch documents');
        }
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user.role]);

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
              <Route path="/metrics" element={<MetricsPage />} />
              <Route path="/history" element={<HistoryPage />} />
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
