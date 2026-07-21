import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft, Search, CheckCircle, ClipboardCheck, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Status badge helpers ────────────────────────────────────────────────────
const STATUS_STYLES = {
  Confirmed:  { bg: '#dcfce7', color: '#15803d', icon: <CheckCircle size={12}/> },
  Received:   { bg: '#dbeafe', color: '#1d4ed8', icon: <CheckCircle size={12}/> },
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

// ─── Defect Details Modal ─────────────────────────────────────────────────────
function DefectDetailsModal({ item, onClose, onReplySaved }) {
  const { isAdmin } = useAuth();
  const [replies, setReplies] = useState({});
  const [savingReply, setSavingReply] = useState({});

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc2626' }}>Defect Logs: {item.description}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {item.defects?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No defects logged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {item.defects.map(d => (
                <div key={d.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', background: '#f8fafc' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    <strong>Rejected Qty:</strong> <span style={{ color: '#dc2626', fontWeight: 600 }}>{d.quantity} pcs</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    <strong>Reported By:</strong> {d.reported_by_name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    <strong>Remark:</strong> {d.remark}
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                    <strong>Date :</strong> {new Date(d.created_at).toLocaleDateString('en-GB')}
                  </div>
                  
                  {/* Images */}
                  {d.images && d.images.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                      {d.images.map((imgUrl, i) => (
                        <img key={i} src={imgUrl} alt={`Defect ${i}`} style={{ width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                      ))}
                    </div>
                  ) : d.image_url && (
                    <div style={{ marginBottom: '1rem' }}>
                      <img src={d.image_url} alt="Defect" style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                  )}

                  {/* Admin Reply Section */}
                  {d.admin_reply ? (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e0f2fe', borderRadius: '4px', borderLeft: '4px solid #0ea5e9' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0369a1', marginBottom: '4px' }}>Admin Reply:</div>
                      <div style={{ fontSize: '0.9rem' }}>{d.admin_reply}</div>
                    </div>
                  ) : isAdmin ? (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Write a reply (Admin only):</label>
                      <textarea
                        rows={2}
                        className="form-input"
                        placeholder="Type your reply here..."
                        value={replies[d.id] || ''}
                        onChange={e => handleReplyChange(d.id, e.target.value)}
                        style={{ marginBottom: '0.5rem' }}
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
                </div>
              ))}
            </div>
          )}
        </div>
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
      const newPassed = parseFloat(item.passed_quantity || 0) + parseFloat(quantity);
      await api.patch(`/supplier-po-items/${item.id}/`, { passed_quantity: newPassed });
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
  const [viewDefectItem, setViewDefectItem] = useState(null);

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
      {viewDefectItem && (
        <DefectDetailsModal
          item={viewDefectItem}
          onClose={() => setViewDefectItem(null)}
          onReplySaved={loadPO}
        />
      )}

      <button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#14b8a6', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem', padding: 0, fontSize: '1rem' }}>
        <ArrowLeft size={18} /> Back to Gate Entry List
      </button>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardCheck size={24} color="#14b8a6"/>
              Gate Entry / Quality Check
            </h2>
            <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              PO Number: <strong>{po.po_number}</strong> | Supplier: <strong>{po.supplier_detail?.name}</strong>
            </div>
          </div>
          <StatusBadge status={po.status} />
        </div>

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
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                          onClick={() => setViewDefectItem(item)}
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
                );
              })}
            </tbody>
          </table>
        </div>
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

  const fetchPOs = useCallback(() => {
    setLoading(true);
    api.get('/supplier-pos/')
      .then(res => {
        // Filter out Draft POs for Gate Entry
        const eligible = res.data.filter(p => p.status !== 'Draft');
        setPos(eligible);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!id) fetchPOs(); }, [id, fetchPOs]);

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
        </div>
      </div>

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
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : filteredPOs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <AlertTriangle size={32} style={{ marginBottom: '0.5rem', color: '#94a3b8' }}/>
                  <div style={{ fontWeight: 600 }}>No active POs ready for Gate Entry</div>
                </td>
              </tr>
            ) : filteredPOs.map(p => (
              <tr key={p.id} onClick={() => navigate(`/gate-entry/${p.id}`)} style={{ cursor: 'pointer', transition: 'background 0.15s' }}>
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
  );
}
