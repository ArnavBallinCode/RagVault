import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom';
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
  Users,
  GitBranch,
} from 'lucide-react';

import { api } from './api/client';
import type { User as UserType, DocumentsResponse, QueryResponse, HealthResponse, StatsResponse, DecisionReceipt } from './types';
import { Plus } from 'lucide-react';

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

const Sidebar = ({ isOpen, onClose, userRole }: { isOpen: boolean; onClose: () => void; userRole: 'admin' | 'user' }) => {

  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Pipeline', adminOnly: true },
    { path: '/chat', icon: MessageCircle, label: 'Chat', adminOnly: false },
    { path: '/documents', icon: FolderOpen, label: 'Documents', adminOnly: false },
    { path: '/users', icon: Users, label: 'User Management', adminOnly: true },
    { path: '/metrics', icon: BarChart3, label: 'Metrics', adminOnly: true },
    { path: '/history', icon: Clock, label: 'History', adminOnly: true },
    { path: '/receipts', icon: Shield, label: 'Decision Receipts', adminOnly: true },
    { path: '/experiments', icon: BarChart3, label: 'Experiments', adminOnly: true },
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
    '/receipts': 'Decision Receipts',
    '/experiments': 'Experiments',
  };

  return (
    <div className="breadcrumb">
      <NavLink to="/" className="breadcrumb-item">Dashboard</NavLink>
      <ChevronRight size={14} />
      <span className="breadcrumb-current">{paths[location.pathname] || 'Pipeline'}</span>
    </div>
  );
};

const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState<DecisionReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadReceipts = useCallback(async () => {
    setLoading(true);
    try { const response = await api.getReceipts(); setReceipts(response.receipts); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load receipts'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadReceipts(); }, [loadReceipts]);
  const sendFeedback = async (id: string, verdict: 'correct' | 'incorrect' | 'needs_review') => {
    try { await api.submitReceiptFeedback(id, verdict); await loadReceipts(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save feedback'); }
  };
  return <div className="page-content receipts-page">
    <div className="page-header"><div><h1>Decision Receipts</h1><p>Replayable answers, evidence, runtime configuration, and reviewer feedback.</p></div><button className="btn-secondary" onClick={loadReceipts}><RefreshCw size={15} /> Refresh</button></div>
    <div className="trust-note"><Shield size={16} /> Receipts store fingerprints and evidence metadata—not copies of document contents.</div>
    {error && <div className="error-message">{error}</div>}
    {loading ? <div className="empty-state"><Loader2 className="spin" /> Loading receipts…</div> : receipts.length === 0 ? <div className="empty-state"><Shield size={30} /><p>Ask a question to create the first receipt.</p></div> : <div className="receipt-list">{receipts.map((receipt) => <article className="receipt-card" key={receipt.id}>
      <div className="receipt-card-header"><div><span className="receipt-id">{receipt.id}</span><span className={`evidence-status ${receipt.response.evidence_status}`}>{receipt.response.evidence_status.replace('_', ' ')}</span></div><time>{new Date(receipt.created_at).toLocaleString()}</time></div>
      <p className="receipt-query">{receipt.request.query}</p><p className="receipt-answer">{receipt.response.answer}</p>
      <div className="receipt-meta">{receipt.response.sources.length} source(s) · {receipt.runtime.models?.rerank_model || 'configured reranker'} · review: {receipt.review.status}</div>
      <div className="receipt-actions"><button onClick={() => sendFeedback(receipt.id, 'correct')} disabled={receipt.review.status === 'confirmed'}><Check size={14} /> Correct</button><button onClick={() => sendFeedback(receipt.id, 'needs_review')}><Eye size={14} /> Review</button><button onClick={() => sendFeedback(receipt.id, 'incorrect')}><XCircle size={14} /> Incorrect</button></div>
    </article>)}</div>}
  </div>;
};

const ExperimentsPage = () => {
  const [data, setData] = useState<any>({ experiments: [] });
  const [candidateCount, setCandidateCount] = useState(0);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const [experiments, candidates] = await Promise.all([api.getExperiments(), api.getLearningCandidates()]);
    setData(experiments); setCandidateCount(candidates.total);
  }, []);
  useEffect(() => { load().catch((err) => setMessage(err.message)); }, [load]);
  const exportCases = async () => {
    try { const result = await api.exportLearningCandidates(); setMessage(`Exported ${result.cases} reviewed cases · ${result.sha256.slice(0, 12)}…`); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Export failed'); }
  };
  return <div className="page-content experiments-page">
    <div className="page-header"><div><h1>Experiments & Learning</h1><p>Versioned benchmark comparisons and human-reviewed cases awaiting dataset review.</p></div><button className="btn-secondary" onClick={() => load()}><RefreshCw size={15} /> Refresh</button></div>
    <div className="experiment-summary"><div><span>Reviewed candidates</span><strong>{candidateCount}</strong></div><div><span>Committed experiments</span><strong>{data.experiments.length}</strong></div><button className="btn-primary" onClick={exportCases} disabled={!candidateCount}>Export reviewed cases</button></div>
    {message && <div className="trust-note">{message}</div>}
    <div className="experiment-list">{data.experiments.map((experiment: any) => <article className="receipt-card" key={experiment.id}>
      <div className="receipt-card-header"><div><span className="receipt-id">{experiment.id}</span><span className={`evidence-status ${experiment.passed ? 'supported' : 'insufficient_evidence'}`}>{experiment.passed ? 'gate passed' : 'gate failed'}</span></div><span className="receipt-meta">tolerance {experiment.max_regression}</span></div>
      <p className="receipt-query">{experiment.description}</p><div className="receipt-meta">Config: {experiment.config_paths.join(', ')}</div>
      <div className="metric-grid">{Object.entries(experiment.deltas).map(([metric, delta]: any) => <div key={metric}><span>{metric}</span><strong className={delta < 0 ? 'metric-negative' : 'metric-positive'}>{delta >= 0 ? '+' : ''}{delta.toFixed(4)}</strong></div>)}</div>
    </article>)}</div>
  </div>;
};

// ============================================================================
// PIPELINE PAGE (React Flow)
// ============================================================================

const UploadNode = ({ data }: { data: any }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedDept, setSelectedDept] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const departments = [
    { value: 'general', label: 'General (All Users)' },
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'HR' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'product', label: 'Product' },
    { value: 'legal', label: 'Legal' },
    { value: 'operations', label: 'Operations' },
    { value: 'sales', label: 'Sales' },
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) data.onUpload(file, selectedDept);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) data.onUpload(file, selectedDept);
  };

  return (
    <div className="pipeline-node">
      <Handle type="source" position={Position.Right} className="node-handle" />

      <div className="node-content-area">
        <h3>Data</h3>
        <p className="node-subtitle">Document Upload</p>

        {/* Department Selector */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="dept-selector"
          style={{
            width: '100%',
            padding: '6px 8px',
            marginBottom: '8px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {departments.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

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
            accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.tiff,.bmp"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
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
  const [activeSource, setActiveSource] = useState<any | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSource(null);
    };
    if (activeSource) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [activeSource]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const popup = popupRef.current;
      if (popup && !popup.contains(e.target as HTMLElement)) {
        setActiveSource(null);
      }
    };
    if (activeSource) {
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeSource]);

  const copyResult = () => {
    if (data.result?.answer) {
      navigator.clipboard.writeText(data.result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSourceClick = (source: any, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPopupPosition({ x: rect.left, y: rect.bottom + 8 });
    setActiveSource(source);
  };

  // Department colors
  const deptColors: Record<string, string> = {
    finance: '#10b981', hr: '#8b5cf6', engineering: '#3b82f6',
    product: '#f59e0b', legal: '#ef4444', operations: '#06b6d4',
    sales: '#ec4899', general: '#6b7280'
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
            {data.result.source_details?.length > 0 ? (
              <div className="sources-box">
                <span className="sources-label">Sources:</span>
                <div className="source-tags">
                  {data.result.source_details.map((source: any, i: number) => (
                    <button
                      key={i}
                      className="source-tag-mini clickable"
                      onClick={(e) => handleSourceClick(source, e)}
                      title="Click to view extracted content"
                    >
                      <FileText size={12} />
                      {source.filename}
                      {source.page && <span className="page-indicator">p.{source.page}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ) : data.result.sources?.length > 0 && (
              <div className="sources-box">
                <span className="sources-label">Sources:</span>
                <div className="source-tags">
                  {data.result.sources.map((s: string, i: number) => (
                    <span key={i} className="source-tag-mini">{s.split('/').pop()}</span>
                  ))}
                </div>
              </div>
            )}
            {data.result.evidence_graph?.nodes?.length > 1 && (
              <div className="evidence-map">
                <button className="evidence-map-toggle" onClick={() => setShowEvidence(!showEvidence)}>
                  <span><GitBranch size={14} /> Evidence map</span>
                  <span>{showEvidence ? 'Hide' : 'Show'}</span>
                </button>
                {showEvidence && (
                  <div className="evidence-map-body">
                    <div className="evidence-node answer-node">Generated answer</div>
                    {data.result.evidence_graph.nodes
                      .filter((node: any) => node.kind === 'source')
                      .map((node: any) => {
                        const entities = data.result.evidence_graph.edges
                          .filter((edge: any) => edge.source === node.id && edge.relation === 'mentions')
                          .map((edge: any) => data.result.evidence_graph.nodes.find((candidate: any) => candidate.id === edge.target)?.label)
                          .filter(Boolean);
                        return (
                          <div className="evidence-source-row" key={node.id}>
                            <span className="evidence-link">supported by</span>
                            <div className="evidence-node source-node">
                              <FileText size={13} /> {node.label}
                              {entities.length > 0 && <div className="evidence-entities">{entities.map((entity: string) => <span key={entity}>{entity}</span>)}</div>}
                            </div>
                          </div>
                        );
                      })}
                    <p className="evidence-map-note">Shows this response’s retrieval trail and matched terms. It is not a factual-confidence score.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Source Evidence Pop-up - Rendered via Portal to escape React Flow transform */}
        {activeSource && popupPosition && createPortal(
          <div
            ref={popupRef}
            className="source-popup"
            style={{
              position: 'fixed',
              left: Math.min(popupPosition.x, window.innerWidth - 400),
              top: Math.min(popupPosition.y, window.innerHeight - 300),
              zIndex: 9999
            }}
          >
            <div className="source-popup-header">
              <div className="popup-title">
                <FileText size={16} />
                <span>{activeSource.filename}</span>
              </div>
              <div className="popup-meta">
                <span
                  className="popup-dept-badge"
                  style={{ backgroundColor: deptColors[activeSource.department] || '#6b7280' }}
                >
                  {activeSource.department}
                </span>
                {activeSource.pages && (
                  <span className="popup-page">Pages {activeSource.pages}</span>
                )}
              </div>
              <button className="popup-close" onClick={() => setActiveSource(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="source-popup-content">
              <p dangerouslySetInnerHTML={{
                __html: activeSource.matched_entities?.length
                  ? activeSource.focused_content.replace(
                    new RegExp(`(${activeSource.matched_entities.map((e: string) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'),
                    '<mark>$1</mark>'
                  )
                  : activeSource.focused_content
              }} />
            </div>
            <div className="source-popup-footer">
              <Link
                to="/documents"
                className="btn-secondary btn-sm"
                onClick={() => setActiveSource(null)}
              >
                <Eye size={14} /> View Documents
              </Link>
            </div>
          </div>,
          document.body
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
  const [viewing, setViewing] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Get user role from localStorage
  const storedUser = localStorage.getItem('ragvault_user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const userRole = parsedUser?.role || 'user';
  const isAdmin = userRole === 'admin';
  const userDepts = parsedUser?.departments || ['general'];

  // Check if user can access document
  const canAccessDocument = (docDept: string): boolean => {
    if (isAdmin) return true;
    if (userDepts.includes('*')) return true;
    if (docDept === 'general') return true;
    return userDepts.includes(docDept);
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const handleView = async (filename: string) => {
    setViewing(filename);
    try {
      const url = await api.viewDocument(filename);
      setViewUrl(url);
    } catch (error) {
      console.error('Failed to view document:', error);
      setViewing(null);
    }
  };

  const handleCloseViewer = () => {
    if (viewUrl) {
      URL.revokeObjectURL(viewUrl);
    }
    setViewUrl(null);
    setViewing(null);
  };

  const handleDownload = async (filename: string) => {
    setDownloading(filename);
    try {
      await api.downloadDocument(filename);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
    setDownloading(null);
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

  // Department badge color mapping
  const deptColors: Record<string, string> = {
    finance: '#10b981',
    hr: '#8b5cf6',
    engineering: '#3b82f6',
    product: '#f59e0b',
    legal: '#ef4444',
    operations: '#06b6d4',
    sales: '#ec4899',
    general: '#6b7280'
  };

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
          <p>
            {isAdmin
              ? 'Manage all documents • Max 10MB per file • Keep under 50MB total'
              : `Viewing documents from: ${userDepts.join(', ') || 'general'}`
            }
          </p>
        </div>
        {isAdmin && (
          <div className="header-actions">
            <button className="btn-danger" onClick={handleClearAll} disabled={clearing}>
              <Trash2 size={16} /> {clearing ? 'Clearing...' : 'Clear All'}
            </button>
            <button className="btn-primary" onClick={onRefresh} disabled={!isOnline}>
              <RefreshCw size={16} /> Re-index All
            </button>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Database size={24} />
          <div>
            <span className="stat-value">{documents?.count || 0}</span>
            <span className="stat-label">{isAdmin ? 'Total Documents' : 'Your Documents'}</span>
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
            <span className="stat-value">{userDepts.length}</span>
            <span className="stat-label">Departments Access</span>
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
          <span>Department</span>
          <span>Size</span>
          <span>Actions</span>
        </div>
        {docsInfo.length > 0 ? (
          docsInfo.map((doc: any, i: number) => {
            const hasAccess = canAccessDocument(doc.department);
            return (
              <div key={i} className="table-row">
                <div className="doc-info">
                  <FileText size={18} />
                  <span>{doc.filename}</span>
                </div>
                <span
                  className="dept-badge"
                  style={{
                    backgroundColor: deptColors[doc.department] || '#6b7280',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  {doc.department}
                </span>
                <span className="doc-size">{doc.size_mb} MB</span>
                <div className="doc-actions">
                  {/* View Button */}
                  <button
                    title={hasAccess ? "View document" : "You don't have permission to view"}
                    className={hasAccess ? '' : 'disabled'}
                    onClick={() => hasAccess && handleView(doc.filename)}
                    disabled={!hasAccess || viewing === doc.filename}
                  >
                    {viewing === doc.filename ? (
                      <Loader2 size={14} className="spin" />
                    ) : hasAccess ? (
                      <Eye size={14} />
                    ) : (
                      <Lock size={14} />
                    )}
                  </button>
                  {/* Download Button */}
                  <button
                    title={hasAccess ? "Download document" : "Download restricted for your role"}
                    className={hasAccess ? 'download' : 'disabled'}
                    onClick={() => hasAccess && handleDownload(doc.filename)}
                    disabled={!hasAccess || downloading === doc.filename}
                  >
                    {downloading === doc.filename ? (
                      <Loader2 size={14} className="spin" />
                    ) : hasAccess ? (
                      <Download size={14} />
                    ) : (
                      <Lock size={14} />
                    )}
                  </button>
                  {/* Delete Button (Admin only) */}
                  {isAdmin && (
                    <button
                      title="Delete"
                      className="danger"
                      onClick={() => handleDelete(doc.filename)}
                      disabled={deleting === doc.filename}
                    >
                      {deleting === doc.filename ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : documents?.documents?.map((doc: string, i: number) => {
          const filename = doc.split('/').pop() || doc;
          return (
            <div key={i} className="table-row">
              <div className="doc-info">
                <FileText size={18} />
                <span>{filename}</span>
              </div>
              <span className="dept-badge" style={{ backgroundColor: '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px' }}>general</span>
              <span className="doc-size">-</span>
              <div className="doc-actions">
                <button title="View document" onClick={() => handleView(filename)} disabled={viewing === filename}>
                  {viewing === filename ? <Loader2 size={14} className="spin" /> : <Eye size={14} />}
                </button>
                <button title="Download document" className="download" onClick={() => handleDownload(filename)} disabled={downloading === filename}>
                  {downloading === filename ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                </button>
                {isAdmin && (
                  <button title="Delete" className="danger" onClick={() => handleDelete(filename)} disabled={deleting === filename}>
                    {deleting === filename ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                  </button>
                )}
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

      {/* PDF Viewer Modal */}
      {viewUrl && (
        <div className="modal-overlay" onClick={handleCloseViewer}>
          <div className="viewer-modal" onClick={e => e.stopPropagation()}>
            <div className="viewer-header">
              <h3>{viewing}</h3>
              <div className="viewer-actions">
                <button onClick={() => viewing && handleDownload(viewing)} title="Download">
                  <Download size={18} />
                </button>
                <button onClick={handleCloseViewer} title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="viewer-content">
              {viewing?.toLowerCase().endsWith('.pdf') ? (
                <iframe src={viewUrl} title="Document Viewer" />
              ) : viewing?.toLowerCase().match(/\.(png|jpg|jpeg|gif|bmp)$/) ? (
                <img src={viewUrl} alt={viewing || 'Document'} />
              ) : (
                <div className="viewer-unsupported">
                  <FileText size={48} />
                  <p>Preview not available for this file type</p>
                  <button className="btn-primary" onClick={() => viewing && handleDownload(viewing)}>
                    <Download size={16} /> Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
// USER MANAGEMENT PAGE (Admin Only)
// ============================================================================

interface UserData {
  username: string;
  name: string;
  role: string;
  departments: string[];
}

const UsersPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [availableDepts, setAvailableDepts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editDepts, setEditDepts] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.users);
      setAvailableDepts(data.available_departments);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const startEditing = (user: UserData) => {
    setEditingUser(user.username);
    setEditDepts([...user.departments]);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditDepts([]);
  };

  const toggleDept = (dept: string) => {
    if (editDepts.includes(dept)) {
      setEditDepts(editDepts.filter(d => d !== dept));
    } else {
      setEditDepts([...editDepts, dept]);
    }
  };

  const saveChanges = async (username: string) => {
    setSaving(username);
    try {
      await api.updateUserDepartments(username, editDepts);
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('Failed to update user departments');
    } finally {
      setSaving(null);
    }
  };

  const roleColors: Record<string, string> = {
    admin: '#ef4444',
    user: '#3b82f6',
  };

  const deptColors: Record<string, string> = {
    finance: '#10b981',
    hr: '#8b5cf6',
    engineering: '#3b82f6',
    product: '#f59e0b',
    legal: '#ef4444',
    operations: '#06b6d4',
    sales: '#ec4899',
    general: '#6b7280',
    '*': '#fbbf24'
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-state">
          <Loader2 size={32} className="spin" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage user permissions and department access</p>
        </div>
        <button className="btn-primary" onClick={fetchUsers}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Users size={24} />
          <div>
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card">
          <Shield size={24} />
          <div>
            <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
        <div className="stat-card">
          <FolderOpen size={24} />
          <div>
            <span className="stat-value">{availableDepts.length}</span>
            <span className="stat-label">Departments</span>
          </div>
        </div>
      </div>

      <div className="users-table">
        <div className="table-header">
          <span>User</span>
          <span>Role</span>
          <span>Departments</span>
          <span>Actions</span>
        </div>
        {users.map(user => (
          <div key={user.username} className="table-row">
            <div className="user-info">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div>
                <span className="user-name">{user.name}</span>
                <span className="user-username">@{user.username}</span>
              </div>
            </div>
            <span
              className="role-badge"
              style={{
                backgroundColor: roleColors[user.role] || '#6b7280',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}
            >
              {user.role}
            </span>
            <div className="dept-list">
              {editingUser === user.username ? (
                <div className="dept-editor">
                  {availableDepts.map(dept => (
                    <label
                      key={dept}
                      className={`dept-checkbox ${editDepts.includes(dept) ? 'selected' : ''}`}
                      style={{
                        borderColor: editDepts.includes(dept) ? deptColors[dept] || '#6b7280' : 'transparent',
                        backgroundColor: editDepts.includes(dept) ? `${deptColors[dept]}20` : 'var(--card-bg)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editDepts.includes(dept)}
                        onChange={() => toggleDept(dept)}
                      />
                      <span style={{ color: deptColors[dept] || '#6b7280' }}>{dept}</span>
                    </label>
                  ))}
                  {user.role !== 'admin' && (
                    <label
                      className={`dept-checkbox ${editDepts.includes('*') ? 'selected' : ''}`}
                      style={{
                        borderColor: editDepts.includes('*') ? '#fbbf24' : 'transparent',
                        backgroundColor: editDepts.includes('*') ? '#fbbf2420' : 'var(--card-bg)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editDepts.includes('*')}
                        onChange={() => toggleDept('*')}
                      />
                      <span style={{ color: '#fbbf24' }}>* (All)</span>
                    </label>
                  )}
                </div>
              ) : (
                <div className="dept-tags">
                  {user.departments.map(dept => (
                    <span
                      key={dept}
                      className="dept-tag"
                      style={{
                        backgroundColor: deptColors[dept] || '#6b7280',
                        color: 'white'
                      }}
                    >
                      {dept === '*' ? 'All Departments' : dept}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="user-actions">
              {editingUser === user.username ? (
                <>
                  <button
                    className="btn-success"
                    onClick={() => saveChanges(user.username)}
                    disabled={saving === user.username}
                  >
                    {saving === user.username ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                    Save
                  </button>
                  <button className="btn-secondary" onClick={cancelEditing}>
                    <X size={14} /> Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => startEditing(user)}
                  disabled={user.role === 'admin' && user.username === 'admin'}
                  title={user.role === 'admin' && user.username === 'admin' ? 'Cannot modify root admin' : 'Edit departments'}
                >
                  <Settings size={14} /> Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .users-table {
          background: var(--card-bg);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .users-table .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 3fr 1.5fr;
          padding: 16px 20px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .users-table .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 3fr 1.5fr;
          padding: 16px 20px;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.2s;
        }
        .users-table .table-row:last-child {
          border-bottom: none;
        }
        .users-table .table-row:hover {
          background: rgba(255,255,255,0.02);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          color: white;
        }
        .user-info > div {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .user-username {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .dept-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .dept-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .dept-tag {
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
        }
        .dept-editor {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .dept-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        .dept-checkbox input {
          display: none;
        }
        .dept-checkbox:hover {
          background: rgba(255,255,255,0.05);
        }
        .user-actions {
          display: flex;
          gap: 8px;
        }
        .user-actions button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-success {
          background: #10b981;
          color: white;
          border: none;
        }
        .btn-success:hover {
          background: #059669;
        }
        .btn-secondary {
          background: var(--card-bg);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.05);
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 16px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

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
  source_details?: { filename: string; pages: string | null; focused_content: string; matched_entities: string[]; department: string }[];
  timestamp: Date;
}

const ChatPage = ({ isOnline, userRole, onRefresh }: { isOnline: boolean; userRole: 'admin' | 'user'; onRefresh?: () => Promise<void> }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [topK, setTopK] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [selectedDept, setSelectedDept] = useState('general');
  const [activeSource, setActiveSource] = useState<any | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSource(null);
    };
    if (activeSource) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [activeSource]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const popup = popupRef.current;
      if (popup && !popup.contains(e.target as HTMLElement)) {
        setActiveSource(null);
      }
    };
    if (activeSource) {
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeSource]);

  const handleSourceClick = (source: any, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPopupPosition({ x: rect.left, y: rect.bottom + 8 });
    setActiveSource(source);
  };

  // Department colors
  const deptColors: Record<string, string> = {
    finance: '#10b981', hr: '#8b5cf6', engineering: '#3b82f6',
    product: '#f59e0b', legal: '#ef4444', operations: '#06b6d4',
    sales: '#ec4899', general: '#6b7280'
  };

  const departments = [
    { value: 'general', label: 'General' },
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'HR' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'product', label: 'Product' },
    { value: 'legal', label: 'Legal' },
    { value: 'operations', label: 'Operations' },
    { value: 'sales', label: 'Sales' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await api.uploadDocument(file, selectedDept);
      if (onRefresh) await onRefresh();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Document "${file.name}" uploaded to **${selectedDept}** department and indexed!`,
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
        source_details: response.source_details,
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

  const quickActions = [
    { label: 'Summarize', icon: '📝' },
    { label: 'Compare', icon: '⚖️' },
    { label: 'Find', icon: '🔍' },
    { label: 'Explain', icon: '💡' },
    { label: 'Analyze', icon: '📊' },
  ];

  const handleQuickAction = (action: string) => {
    setInput(`${action} `);
  };

  return (
    <div className="chat-container">
      {/* Messages Area or Empty State */}
      {messages.length === 0 ? (
        <div className="chat-empty-state">
          <h1 className="chat-logo-large">RagVault</h1>
          <p className="chat-tagline">Ask anything about your documents</p>

          <div className="quick-actions">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="quick-action-btn"
                onClick={() => handleQuickAction(action.label)}
              >
                <span>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
              <div className={`message-bubble ${msg.role}`}>
                {msg.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
                {msg.source_details && msg.source_details.length > 0 ? (
                  <div className="message-sources">
                    {msg.source_details.map((source, i) => (
                      <button
                        key={i}
                        className="source-badge clickable"
                        onClick={(e) => handleSourceClick(source, e)}
                        title="Click to view extracted content"
                      >
                        <FileText size={12} />
                        {source.filename}
                        {source.pages && <span className="page-indicator">p.{source.pages}</span>}
                      </button>
                    ))}
                  </div>
                ) : msg.sources && msg.sources.length > 0 && (
                  <div className="message-sources">
                    {msg.sources.map((s, i) => (
                      <span key={i} className="source-badge">
                        <FileText size={12} />
                        {s.split('/').pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-wrapper assistant">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

          {/* Source Evidence Pop-up */}
          {activeSource && popupPosition && (
            <div
              ref={popupRef}
              className="source-popup"
              style={{
                position: 'fixed',
                left: Math.min(popupPosition.x, window.innerWidth - 400),
                top: Math.min(popupPosition.y, window.innerHeight - 300),
                zIndex: 9999
              }}
            >
              <div className="source-popup-header">
                <div className="popup-title">
                  <FileText size={16} />
                  <span>{activeSource.filename}</span>
                </div>
                <div className="popup-meta">
                  <span
                    className="popup-dept-badge"
                    style={{ backgroundColor: deptColors[activeSource.department] || '#6b7280' }}
                  >
                    {activeSource.department}
                  </span>
                  {activeSource.pages && (
                    <span className="popup-page">Pages {activeSource.pages}</span>
                  )}
                </div>
                <button className="popup-close" onClick={() => setActiveSource(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="source-popup-content">
                <p dangerouslySetInnerHTML={{
                  __html: activeSource.matched_entities?.length
                    ? activeSource.focused_content.replace(
                      new RegExp(`(${activeSource.matched_entities.map((e: string) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'),
                      '<mark>$1</mark>'
                    )
                    : activeSource.focused_content
                }} />
              </div>
              <div className="source-popup-footer">
                <Link
                  to="/documents"
                  className="btn-secondary btn-sm"
                  onClick={() => setActiveSource(null)}
                >
                  <Eye size={14} /> View Documents
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Input Bar - Perplexity Style */}
      <div className="chat-input-container">
        <div className="chat-input-bar">
          {/* Mode Selector */}
          <div className="mode-selector">
            <button className="mode-btn active" title="RAG Search">
              <Search size={16} />
            </button>
            <button className="mode-btn" title="Documents" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={16} />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.doc,.png,.jpg,.jpeg,.tiff,.bmp"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* Main Input */}
          <input
            type="text"
            className="chat-input-field"
            placeholder="Ask Anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={!isOnline || isLoading}
          />

          {/* Input Actions */}
          <div className="input-actions">
            {/* Admin: Department Selector */}
            {userRole === 'admin' && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="dept-select-compact"
                title="Upload department"
              >
                {departments.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            )}

            {/* Top-K Slider (Admin) */}
            {userRole === 'admin' && (
              <div className="topk-slider-container">
                <span>K</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
                <span className="topk-value">{topK}</span>
              </div>
            )}

            {/* Upload Button (visible for admins) */}
            {userRole === 'admin' && (
              <button
                className="input-action-btn upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Upload document"
              >
                {uploading ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
              </button>
            )}

            {/* Send Button */}
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!isOnline || isLoading || !input.trim()}
            >
              {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>

        <p className="input-footer">
          RagVault uses your documents to provide contextual answers
        </p>
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
        role: response.role,
        departments: response.departments || ['general']
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

      // Documents - all users can fetch (API filters by department)
      try {
        const d = await api.getDocuments();
        setDocuments(d);
      } catch {
        // Documents fetch failed, but backend is still online
        console.warn('Could not fetch documents');
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user.role]);

  const handleUpload = useCallback(async (file: File, department: string = 'general') => {
    setUploadStatus('uploading');
    try {
      const res = await api.uploadDocument(file, department);
      setUploadStatus('success');
      setUploadFilename(res.filename);
      // Refresh documents list after upload
      const d = await api.getDocuments();
      setDocuments(d);
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
              onRefresh={handleRefresh}
            />
          } />
          {/* Documents page accessible to all users (filtered by department) */}
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
          {/* Admin-only routes */}
          {user.role === 'admin' ? (
            <>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/receipts" element={<ReceiptsPage />} />
              <Route path="/experiments" element={<ExperimentsPage />} />
              <Route path="/models" element={<LLMPage />} />
              <Route path="/settings" element={<ConfigPage />} />
            </>
          ) : (
            <>
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
