import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Layers, Plus, UserCheck, CheckSquare, ClipboardCheck,
  X, Check, XCircle, Clock, AlertCircle, RefreshCw,
  ChevronRight, User,
} from 'lucide-react';

// ─── Status badge helpers ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
  assigned: { bg: '#ede9fe', color: '#6d28d9', label: 'Assigned' },
};

const QC_COLORS = {
  pass: { bg: '#d1fae5', color: '#065f46', label: 'PASS' },
  reject: { bg: '#fee2e2', color: '#991b1b', label: 'REJECT' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, padding: '2px 10px',
      borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
    }}>{cfg.label}</span>
  );
}

function QCBadge({ result }) {
  const cfg = QC_COLORS[result] || {};
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, padding: '2px 10px',
      borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
    }}>{cfg.label}</span>
  );
}

// ─── Tab definitions per role ─────────────────────────────────────────────────
const TABS = {
  supervisor: [
    { id: 'batch',   label: 'My Batch',              icon: <Layers size={16} /> },
    { id: 'assign',  label: 'Assign to Contractors', icon: <UserCheck size={16} /> },
    { id: 'qc',      label: 'Quality Check',         icon: <ClipboardCheck size={16} /> },
  ],
  contractor: [
    { id: 'mywork',  label: 'My Assignments',        icon: <CheckSquare size={16} /> },
  ],
  admin: [
    { id: 'batch',   label: 'All Batches',           icon: <Layers size={16} /> },
    { id: 'assign',  label: 'All Assignments',       icon: <UserCheck size={16} /> },
    { id: 'qc',      label: 'All QC Records',        icon: <ClipboardCheck size={16} /> },
  ],
};

// ─── Main Component ───────────────────────────────────────────────────────────
function Sanding() {
  const { user, isAdmin, isSandingSupervisor, isContractor } = useAuth();
  const role = user?.role;

  const tabs = TABS[isAdmin ? 'admin' : isSandingSupervisor ? 'supervisor' : 'contractor'] || [];
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'batch');

  // Data state
  const [samples, setSamples] = useState([]);
  const [batches, setBatches] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [qcRecords, setQCRecords] = useState([]);
  const [pendingQC, setPendingQC] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [batchModal, setBatchModal] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // batch object
  const [qcModal, setQCModal]     = useState(null); // assignment object
  const [completeModal, setCompleteModal] = useState(null); // assignment (for contractor)

  const [assignForm, setAssignForm] = useState({ contractor: '', batch: '' });
  const [qcForm, setQCForm]       = useState({ result: 'pass', notes: '' });
  const [completeNotes, setCompleteNotes] = useState('');
  const [selectedSample, setSelectedSample] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [saving, setSaving]         = useState(false);
  const [feedback, setFeedback]     = useState(null);

  // ── Fetch helpers ──
  const fetchSamples = useCallback(async () => {
    try { const r = await api.get('/samples/', { params: { nopage: true } }); setSamples(r.data.results || r.data); } catch {}
  }, []);

  const fetchBatches = useCallback(async () => {
    try { const r = await api.get('/sanding/batches/', { params: { nopage: true } }); setBatches(r.data.results || r.data); } catch {}
  }, []);

  const fetchAssignments = useCallback(async () => {
    try { const r = await api.get('/sanding/assignments/', { params: { nopage: true } }); setAssignments(r.data.results || r.data); } catch {}
  }, []);

  const fetchQC = useCallback(async () => {
    try {
      const [qcRes, pendRes] = await Promise.all([
        api.get('/sanding/qc/', { params: { nopage: true } }),
        api.get('/sanding/qc/pending/', { params: { nopage: true } }),
      ]);
      setQCRecords(qcRes.data.results || qcRes.data);
      setPendingQC(pendRes.data.results || pendRes.data);
    } catch {}
  }, []);

  const fetchMyAssignments = useCallback(async () => {
    try { const r = await api.get('/sanding/assignments/', { params: { nopage: true } }); setMyAssignments(r.data.results || r.data); } catch {}
  }, []);

  const fetchContractors = useCallback(async () => {
    if (!isSandingSupervisor) return;
    try {
      const r = await api.get(`/users/${user.id}/contractors/`, { params: { nopage: true } });
      setContractors(r.data.results || r.data);
    } catch {}
  }, [isSandingSupervisor, user?.id]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const tasks = [];
    if (isContractor) {
      tasks.push(fetchMyAssignments());
    } else {
      tasks.push(fetchSamples(), fetchBatches(), fetchAssignments(), fetchQC());
      if (isSandingSupervisor) tasks.push(fetchContractors());
    }
    await Promise.all(tasks);
    setLoading(false);
  }, [isContractor, isSandingSupervisor, fetchSamples, fetchBatches, fetchAssignments, fetchQC, fetchMyAssignments, fetchContractors]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Supervisor: Add sample to batch ──
  const handleAddToBatch = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/sanding/batches/', { sample: selectedSample, notes: batchNotes });
      setFeedback({ type: 'success', msg: 'Sample added to your Sanding batch!' });
      setBatchModal(false);
      setSelectedSample('');
      setBatchNotes('');
      fetchBatches();
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || Object.values(err.response?.data || {}).flat().join(' ')
        || 'Failed to add sample.';
      setFeedback({ type: 'error', msg });
    } finally { setSaving(false); }
  };

  // ── Supervisor: Assign batch to contractor ──
  const handleAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/sanding/assignments/', {
        batch: assignModal.id,
        contractor: assignForm.contractor,
      });
      setFeedback({ type: 'success', msg: 'Assignment created successfully!' });
      setAssignModal(null);
      setAssignForm({ contractor: '', batch: '' });
      fetchAssignments();
      fetchBatches();
    } catch (err) {
      const msg = Object.values(err.response?.data || {}).flat().join(' ') || 'Assignment failed.';
      setFeedback({ type: 'error', msg });
    } finally { setSaving(false); }
  };

  // ── Supervisor: Submit QC ──
  const handleQC = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/sanding/qc/', { assignment: qcModal.id, ...qcForm });
      setFeedback({ type: 'success', msg: `QC recorded: ${qcForm.result.toUpperCase()}` });
      setQCModal(null);
      setQCForm({ result: 'pass', notes: '' });
      fetchQC();
    } catch (err) {
      const msg = Object.values(err.response?.data || {}).flat().join(' ') || 'QC submission failed.';
      setFeedback({ type: 'error', msg });
    } finally { setSaving(false); }
  };

  // ── Contractor: Mark complete ──
  const handleComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/sanding/assignments/${completeModal.id}/complete/`, {
        contractor_notes: completeNotes,
      });
      setFeedback({ type: 'success', msg: 'Assignment marked as completed!' });
      setCompleteModal(null);
      setCompleteNotes('');
      fetchMyAssignments();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not complete assignment.';
      setFeedback({ type: 'error', msg });
    } finally { setSaving(false); }
  };

  // Samples not yet in batch
  const batchedSampleIds = new Set(batches.map((b) => b.sample));
  const availableSamples = samples.filter((s) => !batchedSampleIds.has(s.id));

  // ─── RENDER TABS ──────────────────────────────────────────────────────────

  const renderBatchTab = () => (
    <div className="sanding-section">
      <div className="sanding-section-header">
        <div>
          <h3>{isAdmin ? 'All Sanding Batches' : 'My Sanding Batch'}</h3>
          <p>{isAdmin ? 'Overview of all supervisor batches' : 'Samples you have self-assigned for sanding'}</p>
        </div>
        {isSandingSupervisor && (
          <button className="btn-primary sanding-btn" onClick={() => setBatchModal(true)}>
            <Plus size={16} /> Add Sample
          </button>
        )}
      </div>

      {batches.length === 0 ? (
        <div className="sanding-empty">
          <Layers size={40} color="#d1d5db" />
          <p>No samples in your sanding batch yet.</p>
          {isSandingSupervisor && (
            <button className="btn-primary" onClick={() => setBatchModal(true)}>Add First Sample</button>
          )}
        </div>
      ) : (
        <div className="sanding-cards">
          {batches.map((b) => (
            <div key={b.id} className="sanding-card">
              <div className="sanding-card-header">
                <div>
                  <p className="sanding-sample-id">{b.sample_detail?.sample_id}</p>
                  <p className="sanding-product">{b.sample_detail?.product_name}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="sanding-card-meta">
                <span>Buyer: {b.sample_detail?.buyer_code}</span>
                <span>Wood: {b.sample_detail?.wood_type}</span>
                <span>{b.assignment_count} assignment{b.assignment_count !== 1 ? 's' : ''}</span>
              </div>
              {b.notes && <p className="sanding-card-notes">{b.notes}</p>}
              {isSandingSupervisor && b.status !== 'completed' && (
                <button
                  className="sanding-assign-btn"
                  onClick={() => { setAssignModal(b); setActiveTab('assign'); }}
                >
                  <UserCheck size={14} /> Assign to Contractor
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAssignTab = () => (
    <div className="sanding-section">
      <div className="sanding-section-header">
        <div>
          <h3>{isAdmin ? 'All Assignments' : 'Contractor Assignments'}</h3>
          <p>Track which contractor is working on each sample</p>
        </div>
      </div>

      {/* Quick assign from batch */}
      {isSandingSupervisor && batches.filter(b => b.status !== 'completed').length > 0 && (
        <div className="sanding-quick-assign">
          <p className="sanding-quick-title">Quick Assign from Batch</p>
          <div className="sanding-batch-chips">
            {batches.filter(b => b.status !== 'completed').map((b) => (
              <button
                key={b.id}
                className="sanding-chip"
                onClick={() => setAssignModal(b)}
              >
                {b.sample_detail?.sample_id} — {b.sample_detail?.product_name}
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="sanding-empty">
          <UserCheck size={40} color="#d1d5db" />
          <p>No assignments yet.</p>
        </div>
      ) : (
        <div className="sanding-assign-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sample</th>
                <th>Contractor</th>
                <th>Assigned At</th>
                <th>Status</th>
                <th>Completed At</th>
                <th>QC</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <p style={{ fontWeight: 600 }}>{a.batch_detail?.sample_detail?.sample_id}</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{a.batch_detail?.sample_detail?.product_name}</p>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="sanding-mini-avatar">{(a.contractor_detail?.full_name?.[0] || '?').toUpperCase()}</div>
                      {a.contractor_detail?.full_name}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ fontSize: '0.8rem' }}>{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</td>
                  <td>
                    {a.qc_result ? (
                      <QCBadge result={a.qc_result.result} />
                    ) : a.status === 'completed' && isSandingSupervisor ? (
                      <button className="sanding-qc-trigger" onClick={() => setQCModal(a)}>
                        Do QC
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderQCTab = () => (
    <div className="sanding-section">
      <div className="sanding-section-header">
        <div>
          <h3>Quality Check</h3>
          <p>Review completed work and mark Pass or Reject</p>
        </div>
        <button className="sanding-refresh-btn" onClick={fetchQC}><RefreshCw size={14} /></button>
      </div>

      {/* Pending QC */}
      {pendingQC.length > 0 && (
        <div className="sanding-pending-qc">
          <p className="sanding-pending-title">
            <AlertCircle size={16} color="#f59e0b" />
            {pendingQC.length} Completed assignment{pendingQC.length !== 1 ? 's' : ''} awaiting QC
          </p>
          <div className="sanding-cards">
            {pendingQC.map((a) => (
              <div key={a.id} className="sanding-card pending-qc-card">
                <div className="sanding-card-header">
                  <div>
                    <p className="sanding-sample-id">{a.batch_detail?.sample_detail?.sample_id}</p>
                    <p className="sanding-product">{a.batch_detail?.sample_detail?.product_name}</p>
                  </div>
                  <span className="sanding-awaiting-badge">Awaiting QC</span>
                </div>
                <div className="sanding-card-meta">
                  <span>Contractor: {a.contractor_detail?.full_name}</span>
                  <span>Done: {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</span>
                </div>
                {a.contractor_notes && (
                  <p className="sanding-card-notes">Note: {a.contractor_notes}</p>
                )}
                {isSandingSupervisor && (
                  <button className="btn-primary sanding-btn" onClick={() => setQCModal(a)}>
                    <ClipboardCheck size={14} /> Perform QC
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done QC records */}
      <div className="sanding-qc-history">
        <p className="sanding-history-title">QC History ({qcRecords.length})</p>
        {qcRecords.length === 0 ? (
          <div className="sanding-empty"><ClipboardCheck size={36} color="#d1d5db" /><p>No QC records yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Sample</th>
                <th>Contractor</th>
                <th>Checked By</th>
                <th>Result</th>
                <th>Notes</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {qcRecords.map((q) => (
                <tr key={q.id}>
                  <td>
                    <p style={{ fontWeight: 600 }}>{q.assignment_detail?.batch_detail?.sample_detail?.sample_id}</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{q.assignment_detail?.batch_detail?.sample_detail?.product_name}</p>
                  </td>
                  <td>{q.assignment_detail?.contractor_detail?.full_name}</td>
                  <td>{q.checked_by_name}</td>
                  <td><QCBadge result={q.result} /></td>
                  <td style={{ fontSize: '0.8rem', maxWidth: 150 }}>{q.notes || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(q.checked_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderMyWorkTab = () => (
    <div className="sanding-section">
      <div className="sanding-section-header">
        <div>
          <h3>My Sanding Assignments</h3>
          <p>Samples assigned to you by your supervisor</p>
        </div>
        <button className="sanding-refresh-btn" onClick={fetchMyAssignments}><RefreshCw size={14} /></button>
      </div>

      {myAssignments.length === 0 ? (
        <div className="sanding-empty">
          <CheckSquare size={40} color="#d1d5db" />
          <p>No assignments yet. Your supervisor will assign samples to you.</p>
        </div>
      ) : (
        <div className="sanding-cards">
          {myAssignments.map((a) => (
            <div key={a.id} className={`sanding-card ${a.status === 'completed' ? 'completed-card' : ''}`}>
              <div className="sanding-card-header">
                <div>
                  <p className="sanding-sample-id">{a.batch_detail?.sample_detail?.sample_id}</p>
                  <p className="sanding-product">{a.batch_detail?.sample_detail?.product_name}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="sanding-card-meta">
                <span>Buyer: {a.batch_detail?.sample_detail?.buyer_code}</span>
                <span>Wood: {a.batch_detail?.sample_detail?.wood_type}</span>
                <span>Finish: {a.batch_detail?.sample_detail?.finish_color}</span>
              </div>
              <div className="sanding-card-meta" style={{ marginTop: 4 }}>
                <span>Assigned: {new Date(a.assigned_at).toLocaleDateString()}</span>
                {a.completed_at && <span>Done: {new Date(a.completed_at).toLocaleDateString()}</span>}
              </div>
              {a.qc_result && (
                <div className="sanding-qc-result-row">
                  QC: <QCBadge result={a.qc_result.result} />
                  {a.qc_result.notes && <span className="sanding-qc-note">{a.qc_result.notes}</span>}
                </div>
              )}
              {a.status !== 'completed' && (
                <button
                  className="btn-primary sanding-btn"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => { setCompleteModal(a); setCompleteNotes(''); }}
                >
                  <Check size={14} /> Mark as Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Main Layout ──────────────────────────────────────────────────────────
  return (
    <div className="sanding-page">
      {/* Page header */}
      <div className="sanding-page-header">
        <div>
          <h1 className="sanding-page-title">Sanding</h1>
          <p className="sanding-page-sub">
            {isAdmin ? 'Full overview of all sanding operations' :
             isSandingSupervisor ? `Manage your sanding batch and contractors` :
             `View and complete your assigned sanding work`}
          </p>
        </div>
        <div className="sanding-role-pill">
          <User size={14} />
          {user?.full_name} &middot; {isSandingSupervisor ? 'Sanding Supervisor' : user?.role}
        </div>
      </div>

      {/* Global feedback */}
      {feedback && (
        <div className={`sanding-feedback ${feedback.type}`}>
          {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="sanding-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sanding-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="sanding-loading">Loading...</div>
      ) : (
        <div className="sanding-tab-content">
          {activeTab === 'batch'  && renderBatchTab()}
          {activeTab === 'assign' && renderAssignTab()}
          {activeTab === 'qc'     && renderQCTab()}
          {activeTab === 'mywork' && renderMyWorkTab()}
        </div>
      )}

      {/* ── MODAL: Add to Batch ── */}
      {batchModal && (
        <div className="modal-overlay" onClick={() => setBatchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Sample to Sanding Batch</h2>
              <button className="modal-close" onClick={() => setBatchModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddToBatch}>
                <div className="form-group">
                  <label className="form-label">Select Sample *</label>
                  <select
                    className="form-input"
                    value={selectedSample}
                    onChange={(e) => setSelectedSample(e.target.value)}
                    required
                  >
                    <option value="">-- Choose a sample --</option>
                    {availableSamples.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sample_id} — {s.product_name} ({s.buyer_code})
                      </option>
                    ))}
                  </select>
                  {availableSamples.length === 0 && (
                    <p className="sanding-no-samples">All samples are already in your batch.</p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    placeholder="Optional notes..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setBatchModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving || !selectedSample}>
                    {saving ? 'Adding...' : 'Add to Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Assign to Contractor ── */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign to Contractor</h2>
              <button className="modal-close" onClick={() => setAssignModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="sanding-modal-sample-info">
                <p className="sanding-sample-id">{assignModal.sample_detail?.sample_id}</p>
                <p className="sanding-product">{assignModal.sample_detail?.product_name}</p>
              </div>
              <form onSubmit={handleAssign}>
                <div className="form-group">
                  <label className="form-label">Select Contractor *</label>
                  <select
                    className="form-input"
                    value={assignForm.contractor}
                    onChange={(e) => setAssignForm((p) => ({ ...p, contractor: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose a contractor --</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                  {contractors.length === 0 && (
                    <p className="sanding-no-samples">No contractors found under your supervision.</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving || !assignForm.contractor}>
                    {saving ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: QC ── */}
      {qcModal && (
        <div className="modal-overlay" onClick={() => setQCModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quality Check</h2>
              <button className="modal-close" onClick={() => setQCModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="sanding-modal-sample-info">
                <p className="sanding-sample-id">{qcModal.batch_detail?.sample_detail?.sample_id}</p>
                <p className="sanding-product">{qcModal.batch_detail?.sample_detail?.product_name}</p>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>
                  Contractor: {qcModal.contractor_detail?.full_name}
                </p>
                {qcModal.contractor_notes && (
                  <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Contractor note: {qcModal.contractor_notes}</p>
                )}
              </div>
              <form onSubmit={handleQC}>
                <div className="form-group">
                  <label className="form-label">QC Result *</label>
                  <div className="sanding-qc-options">
                    <label className={`sanding-qc-option pass ${qcForm.result === 'pass' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="result"
                        value="pass"
                        checked={qcForm.result === 'pass'}
                        onChange={() => setQCForm((p) => ({ ...p, result: 'pass' }))}
                      />
                      <Check size={18} /> PASS
                    </label>
                    <label className={`sanding-qc-option reject ${qcForm.result === 'reject' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="result"
                        value="reject"
                        checked={qcForm.result === 'reject'}
                        onChange={() => setQCForm((p) => ({ ...p, result: 'reject' }))}
                      />
                      <XCircle size={18} /> REJECT
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes / Reason</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={qcForm.notes}
                    onChange={(e) => setQCForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional quality notes or rejection reason..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setQCModal(null)}>Cancel</button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ backgroundColor: qcForm.result === 'pass' ? '#22c55e' : '#ef4444' }}
                    disabled={saving}
                  >
                    {saving ? 'Submitting...' : `Submit ${qcForm.result.toUpperCase()}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Contractor — Mark Complete ── */}
      {completeModal && (
        <div className="modal-overlay" onClick={() => setCompleteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mark Assignment Complete</h2>
              <button className="modal-close" onClick={() => setCompleteModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="sanding-modal-sample-info">
                <p className="sanding-sample-id">{completeModal.batch_detail?.sample_detail?.sample_id}</p>
                <p className="sanding-product">{completeModal.batch_detail?.sample_detail?.product_name}</p>
              </div>
              <form onSubmit={handleComplete}>
                <div className="form-group">
                  <label className="form-label">Completion Notes (optional)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={completeNotes}
                    onChange={(e) => setCompleteNotes(e.target.value)}
                    placeholder="Describe what you did or any observations..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setCompleteModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Submitting...' : 'Mark as Completed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sanding;
