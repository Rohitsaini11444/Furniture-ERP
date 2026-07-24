import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft, Search, CheckCircle, ClipboardCheck, AlertTriangle, ChevronRight, FileText, Package, XCircle, ChevronUp, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';

// ─── Status badge helpers ────────────────────────────────────────────────────
const STATUS_STYLES = {
  Pending:   { bg: '#fef3c7', color: '#d97706', icon: <CheckCircle size={12}/> },
  Received:  { bg: '#dbeafe', color: '#1d4ed8', icon: <CheckCircle size={12}/> },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600,
    }}>
      {s.icon}{status}
    </span>
  );
}

// ─── Inline Defect Logs ───────────────────────────────────────────────────────
function InlineDefectLogs({ item, onClose, onReplySaved }) {
  const { isAdmin } = useAuth();
  const [replies, setReplies] = useState({});
  const [savingReply, setSavingReply] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const defects = item.defects || [];

  const handleReplyChange = (defectId, text) => {
    setReplies(prev => ({ ...prev, [defectId]: text }));
  };

  const submitReply = async (defectId) => {
    const text = replies[defectId];
    if (!text) return;
    setSavingReply(prev => ({ ...prev, [defectId]: true }));
    try {
      await api.patch(`/supplier-po-defects/${defectId}/`, { admin_reply: text });
      onReplySaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save reply.');
    } finally {
      setSavingReply(prev => ({ ...prev, [defectId]: false }));
    }
  };

  if (defects.length === 0) {
    return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>No defects logged.</div>;
  }

  const d = defects[currentIndex];

  return (
    <div style={{ background: '#fff1f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <XCircle size={18} color="#dc2626" />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Rejected Logs ({defects.length})</h4>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
          <ChevronUp size={20} color="#1e293b" />
        </button>
      </div>

      <div>
        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#1e293b' }}>Rejected Qty:</strong> <span style={{ color: '#dc2626', fontWeight: 700 }}>{d.quantity} pcs</span>
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#1e293b' }}>Reported By:</strong> <span style={{ color: '#334155' }}>{d.reported_by_name || 'Unknown'}</span>
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#1e293b' }}>Remark:</strong> <span style={{ color: '#334155' }}>{d.remark}</span>
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          <strong style={{ color: '#1e293b' }}>Date:</strong> <span style={{ color: '#334155' }}>{new Date(d.created_at).toLocaleDateString('en-GB')}</span>
        </div>
        
        {d.images && d.images.length > 0 ? (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {d.images.map((imgUrl, i) => (
              <img key={i} src={imgUrl} alt={`Defect ${i}`} style={{ height: '100px', width: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'cover' }} />
            ))}
          </div>
        ) : d.image_url && (
          <div style={{ marginBottom: '1.25rem' }}>
            <img src={d.image_url} alt="Defect" style={{ height: '100px', width: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'cover' }} />
          </div>
        )}

        {/* Admin Reply Section */}
        {d.admin_reply ? (
          <div style={{ padding: '0.75rem', background: '#e0f2fe', borderRadius: '8px', borderLeft: '4px solid #0ea5e9' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0369a1', marginBottom: '4px' }}>Admin Reply:</div>
            <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>{d.admin_reply}</div>
          </div>
        ) : isAdmin ? (
          <div style={{ borderTop: '1px solid #fecaca', paddingTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Write a reply (Admin only):</label>
            <textarea
              rows={2}
              className="form-input"
              placeholder="Type your reply here..."
              value={replies[d.id] || ''}
              onChange={e => handleReplyChange(d.id, e.target.value)}
              style={{ marginBottom: '0.5rem', borderColor: '#fecaca' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#0ea5e9' }}
                onClick={() => submitReply(d.id)}
                disabled={savingReply[d.id] || !replies[d.id]}
              >
                {savingReply[d.id] ? 'Saving...' : 'Submit Reply'}
              </button>
            </div>
          </div>
        ) : null}

        {defects.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px dashed #fecaca', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Showing {currentIndex + 1} of {defects.length} log{defects.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', color: currentIndex === 0 ? '#cbd5e1' : '#64748b' }}>
                <ArrowLeft size={16} />
              </button>
              <button onClick={() => setCurrentIndex(prev => Math.min(defects.length - 1, prev + 1))} disabled={currentIndex === defects.length - 1} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentIndex === defects.length - 1 ? 'not-allowed' : 'pointer', color: currentIndex === defects.length - 1 ? '#cbd5e1' : '#64748b' }}>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reject Item Modal ────────────────────────────────────────────────────────
function RejectItemModal({ item, remaining, onClose, onSaved }) {
  const [quantity, setQuantity] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [savedImages, setSavedImages] = useState([]);
  const [undoStack, setUndoStack] = useState([]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const maxWidth = 450;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageLoaded(true);
        setUndoStack([canvas.toDataURL()]);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset file input
  };

  const startDrawing = (e) => {
    if (!imageLoaded) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
    setUndoStack(prev => [...prev, canvas.toDataURL()]);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    if (undoStack.length > 1) {
      const newStack = [...undoStack];
      newStack.pop(); // Remove current state
      const lastState = newStack[newStack.length - 1]; // Get previous state
      setUndoStack(newStack);
      
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = lastState;
    } else if (undoStack.length === 1) {
      // Revert to original uploaded image
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = undoStack[0];
    }
  };

  const handleSaveImage = () => {
    if (!imageLoaded) return;
    canvasRef.current.toBlob(blob => {
      setSavedImages(prev => [...prev, blob]);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setImageLoaded(false);
      setUndoStack([]);
    }, 'image/png');
  };

  const processSubmit = async (finalImages) => {
    setSaving(true);
    const formData = new FormData();
    formData.append('po_item', item.id);
    formData.append('quantity', quantity);
    formData.append('remark', remark);
    
    finalImages.forEach((blob, idx) => {
      if (idx === 0) {
        formData.append('defective_image', blob, 'defect.png');
      } else {
        formData.append('images', blob, `defect_${idx}.png`);
      }
    });

    try {
      await api.post('/supplier-po-defects/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save defect.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savedImages.length === 0 && !imageLoaded) return alert("Please upload and annotate at least one image.");
    
    if (imageLoaded) {
      canvasRef.current.toBlob(blob => {
        processSubmit([...savedImages, blob]);
      }, 'image/png');
    } else {
      processSubmit(savedImages);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc2626' }}>Reject Pieces</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Rejected Quantity * (Max: {remaining})</label>
              <input required type="number" min="0.01" step="0.01" max={remaining} className="form-input"
                value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Remark *</label>
              <textarea required rows={2} className="form-input"
                value={remark} onChange={e => setRemark(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Defect Images ({savedImages.length} saved)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <input type="file" accept="image/*" onChange={handleImageUpload} />
                {imageLoaded && (
                  <>
                    <button type="button" onClick={handleUndo} style={{ background: '#e2e8f0', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Undo</button>
                    <button type="button" onClick={handleSaveImage} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Save & Add Another</button>
                  </>
                )}
              </div>
              
              <div style={{ border: '1px solid #ccc', background: '#f8fafc', display: imageLoaded ? 'flex' : 'none', justifyContent: 'center', touchAction: 'none' }}>
                <canvas 
                  ref={canvasRef} 
                  style={{ cursor: 'crosshair', maxWidth: '100%', touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseOut={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                />
              </div>
              {!imageLoaded && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Upload an image to start annotating.</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ background: '#dc2626' }} disabled={saving}>
                {saving ? 'Saving…' : 'Submit Rejection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Pass Item Modal ────────────────────────────────────────────────────────
function PassItemModal({ item, remaining, onClose, onSaved }) {
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const addedQty = parseFloat(quantity);
      await api.post(`/supplier-po-items/${item.id}/receive-qc/`, { passed_qty: addedQty });
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save passed quantity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>Pass Pieces</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Quantity to Pass * (Max: {remaining})</label>
              <input required type="number" min="0.01" step="0.01" max={remaining} className="form-input"
                value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ background: '#16a34a' }} disabled={saving}>
                {saving ? 'Saving…' : 'Confirm Pass'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── QC Form (Gate Entry Check) ───────────────────────────────────────────────
function QCForm({ poId, onBack }) {
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectItemData, setRejectItemData] = useState(null);
  const [passItemData, setPassItemData] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});

  const toggleLogs = (itemId) => setExpandedLogs(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  const loadPO = useCallback(() => {
    setLoading(true);
    api.get(`/supplier-pos/${poId}/`)
      .then(res => setPo(res.data))
      .finally(() => setLoading(false));
  }, [poId]);

  useEffect(() => { loadPO(); }, [loadPO]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading PO details…</div>;
  if (!po) return null;

  return (
    <div className="new-page-form" style={{ padding: '1rem 0' }}>
      {rejectItemData && (
        <RejectItemModal 
          item={rejectItemData.item}
          remaining={rejectItemData.remaining}
          onClose={() => setRejectItemData(null)} 
          onSaved={() => { setRejectItemData(null); loadPO(); }}
        />
      )}
      {passItemData && (
        <PassItemModal 
          item={passItemData.item} 
          remaining={passItemData.remaining}
          onClose={() => setPassItemData(null)} 
          onSaved={() => { setPassItemData(null); loadPO(); }}
        />
      )}

      <button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#14b8a6', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem', padding: 0, fontSize: '1rem' }}>
        <ArrowLeft size={18} /> Back to Gate Entry List
      </button>

      <div className="pi-form-container" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ClipboardCheck size={22} color="#0284c7"/>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
              Gate Entry / Quality Check
            </h2>
          </div>
          <StatusBadge status={po.status} />
        </div>

        <div style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
          <div>PO Number: <strong style={{ color: '#1e293b', fontWeight: 700 }}>{po.po_number}</strong></div>
          <div>Supplier: <strong style={{ color: '#1e293b', fontWeight: 700 }}>{po.supplier_detail?.name}</strong></div>
        </div>
      </div>

      <div style={{ padding: '0 0.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', marginTop: '0.5rem' }}>Item Details</h3>
      </div>

        <div className="po-desktop-table">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Description</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ordered Qty</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Passed Qty</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rejected Qty</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(po.items || []).map((item, idx) => {
                  const rejectedTotal = (item.defects || []).reduce((acc, d) => acc + parseFloat(d.quantity || 0), 0);
                  const passedTotal = parseFloat(item.passed_quantity || 0);
                  const ordered = parseFloat(item.quantity || 0);
                  const remaining = ordered - passedTotal - rejectedTotal;

                  return (
                    <React.Fragment key={item.id}>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '12px 10px' }}>
                          {item.description}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rem: {remaining > 0 ? remaining : 0} {item.unit}</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>{item.quantity} {item.unit}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>
                          {passedTotal}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>
                          {rejectedTotal}
                          {item.defects?.length > 0 && (
                            <div 
                              style={{ fontSize: '0.75rem', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', marginTop: '4px' }}
                              onClick={() => toggleLogs(item.id)}
                            >
                              View {item.defects.length} log(s)
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setPassItemData({ item, remaining })}
                              disabled={remaining <= 0}
                              style={{ background: remaining > 0 ? '#dcfce7' : '#f1f5f9', border: remaining > 0 ? '1px solid #86efac' : '1px solid #cbd5e1', borderRadius: '4px', cursor: remaining > 0 ? 'pointer' : 'not-allowed', color: remaining > 0 ? '#16a34a' : '#94a3b8', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              Pass
                            </button>
                            <button type="button" onClick={() => setRejectItemData({ item, remaining })}
                              disabled={remaining <= 0}
                              style={{ background: remaining > 0 ? '#fee2e2' : '#f1f5f9', border: remaining > 0 ? '1px solid #fca5a5' : '1px solid #cbd5e1', borderRadius: '4px', cursor: remaining > 0 ? 'pointer' : 'not-allowed', color: remaining > 0 ? '#dc2626' : '#94a3b8', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedLogs[item.id] && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0 1rem 1rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <InlineDefectLogs item={item} onClose={() => toggleLogs(item.id)} onReplySaved={loadPO} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="po-mobile-cards" style={{ padding: '0 0.5rem' }}>
          {(po.items || []).map((item, idx) => {
            const rejectedTotal = (item.defects || []).reduce((acc, d) => acc + parseFloat(d.quantity || 0), 0);
            const passedTotal = parseFloat(item.passed_quantity || 0);
            const ordered = parseFloat(item.quantity || 0);
            const remaining = ordered - passedTotal - rejectedTotal;

            return (
              <div key={item.id} className="po-mobile-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#f5ede3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                       <Package size={24} color="#8b5a2b"/>
                     </div>
                     <div>
                       <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem', marginBottom: '0.2rem' }}>{item.description}</div>
                       <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Rem: {remaining > 0 ? remaining : 0} {item.unit}</div>
                     </div>
                   </div>
                   <div style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700, fontSize: '0.8rem', padding: '4px 10px', borderRadius: '999px' }}>
                     #{idx + 1}
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', padding: '1rem 0', margin: '0 -0.25rem' }}>
                   <div style={{ flex: 1, padding: '0 0.5rem', borderRight: '1px solid #e2e8f0' }}>
                     <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem' }}>Ordered</div>
                     <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{item.quantity} {item.unit}</div>
                   </div>
                   <div style={{ flex: 1, padding: '0 0.5rem', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem' }}>Passed</div>
                     <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>{passedTotal}</div>
                   </div>
                   <div style={{ flex: 1, padding: '0 0.5rem', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem' }}>Rejected</div>
                     <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>{rejectedTotal}</div>
                   </div>
                   <div style={{ paddingLeft: '0.5rem', display: 'flex', alignItems: 'center' }}>
                     {item.defects?.length > 0 && (
                        <div 
                          style={{ fontSize: '0.75rem', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', paddingRight: '0.5rem' }}
                          onClick={() => toggleLogs(item.id)}
                        >
                          <FileText size={14}/> View {item.defects.length} log(s)
                        </div>
                      )}
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setPassItemData({ item, remaining })}
                    disabled={remaining <= 0}
                    style={{ background: remaining > 0 ? '#ecfdf5' : '#f1f5f9', border: remaining > 0 ? '1px solid #a7f3d0' : '1px solid #cbd5e1', borderRadius: '8px', cursor: remaining > 0 ? 'pointer' : 'not-allowed', color: remaining > 0 ? '#059669' : '#94a3b8', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={16}/> Pass
                  </button>
                  <button type="button" onClick={() => setRejectItemData({ item, remaining })}
                    disabled={remaining <= 0}
                    style={{ background: remaining > 0 ? '#fef2f2' : '#f1f5f9', border: remaining > 0 ? '1px solid #fecaca' : '1px solid #cbd5e1', borderRadius: '8px', cursor: remaining > 0 ? 'pointer' : 'not-allowed', color: remaining > 0 ? '#dc2626' : '#94a3b8', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <XCircle size={16}/> Reject
                  </button>
                </div>

                {expandedLogs[item.id] && (
                  <InlineDefectLogs item={item} onClose={() => toggleLogs(item.id)} onReplySaved={loadPO} />
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
}

// ─── Main Gate Entry List Page ────────────────────────────────────────────────
export default function GateEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pos, setPos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  const fetchPOs = useCallback(() => {
    setLoading(true);
    api.get('/supplier-pos/', { params: { page: currentPage, ordering: ordering } })
      .then(res => {
        const data = res.data.results || res.data;
        setPos(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering]);

  useEffect(() => { if (!id) fetchPOs(); }, [id, fetchPOs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ordering]);

  if (id) {
    return <QCForm poId={id} onBack={() => { navigate('/gate-entry'); fetchPOs(); }} />;
  }

  const filteredPOs = pos.filter(p => {
    return !searchTerm || 
      p.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_detail?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardCheck size={28} color="#14b8a6"/> Gate Entry / QC
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Record material receipts and perform quality checks on POs
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-bar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 220 }}>
            <Search size={15} className="filter-icon"/>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by PO number or supplier..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <span className="filter-label">Order By:</span>
            <select
              className="filter-input"
              value={ordering}
              onChange={e => setOrdering(e.target.value)}
              style={{ minWidth: '130px' }}
            >
              <option value="-created_at">Latest First</option>
              <option value="created_at">Oldest First</option>
              <option value="po_number">PO No (A-Z)</option>
              <option value="-po_number">PO No (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="po-desktop-table">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>PO Date</th>
                <th>Items count</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} cols={6} hasImage={false} />
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <AlertTriangle size={32} style={{ marginBottom: '0.5rem', color: '#94a3b8' }}/>
                    <div style={{ fontWeight: 600 }}>No active POs ready for Gate Entry</div>
                  </td>
                </tr>
              ) : filteredPOs.map(p => (
                <tr key={p.id} onClick={() => navigate(`/gate-entry/${p.id}`)} style={{ cursor: 'pointer', transition: 'background 0.15s' }} className="smooth-fade-in">
                  <td style={{ fontWeight: 600 }}>{p.po_number}</td>
                  <td>{p.supplier_detail?.name || '—'}</td>
                  <td>{p.po_date ? new Date(p.po_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td>{(p.items || []).length}</td>
                  <td><StatusBadge status={p.status}/></td>
                  <td>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#14b8a6', borderColor: '#ccfbf1' }} onClick={(e) => { e.stopPropagation(); navigate(`/gate-entry/${p.id}`); }}>
                      Start QC
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="po-mobile-cards" style={{ padding: '0 0.5rem' }}>
        {loading ? (
          <CardSkeleton count={4} />
        ) : filteredPOs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <AlertTriangle size={32} style={{ marginBottom: '0.5rem', color: '#94a3b8' }}/>
            <div style={{ fontWeight: 600 }}>No active POs ready for Gate Entry</div>
          </div>
        ) : filteredPOs.map(p => (
          <div className="po-mobile-card" key={p.id} onClick={() => navigate(`/gate-entry/${p.id}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#f5ede3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={24} color="#8b5a2b"/>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{p.po_number}</div>
                  <div style={{ color: '#334155', fontSize: '0.9rem' }}>{p.supplier_detail?.name || '—'}</div>
                </div>
              </div>
              <ChevronRight size={20} color="#64748b" />
            </div>

            <div style={{ height: '1px', background: '#e2e8f0', margin: '0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-start' }}>
                <div style={{ background: '#ecfdf5', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={18} color="#059669" />
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4b5563', letterSpacing: '0.02em', marginBottom: '0.1rem' }}>ITEM COUNT</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>{(p.items || []).length} Item{(p.items || []).length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <button
                className="btn-secondary"
                onClick={(e) => { e.stopPropagation(); navigate(`/gate-entry/${p.id}`); }}
                style={{
                  padding: '0.6rem 1rem',
                  fontSize: '0.9rem',
                  color: '#14b8a6',
                  borderColor: '#99f6e4',
                  borderRadius: '10px',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 600
                }}
              >
                Start QC
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
}
