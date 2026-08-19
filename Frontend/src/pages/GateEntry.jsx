import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft, Search, CheckCircle, ClipboardCheck, AlertTriangle, ChevronRight, FileText, Package, XCircle, ChevronUp, ArrowRight, Box, Clock, Hourglass, Check, Truck, Download,
  ShieldCheck, List, Building2, Calendar, Play, Scan
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import { OrderBySelect, ORDER_OPTIONS_DATE_PONO } from '../components/OrderBySelect';
import QRScannerModal from '../components/QRScannerModal';
import DebitNotePrintout from '../components/DebitNotePrintout';
import GRNPrintoutModal from '../components/GRNPrintoutModal';
import RecordInstallmentModal from '../components/RecordInstallmentModal';
import { useLastVisitedItem } from '../hooks/useLastVisitedItem';



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
    
    if (imageLoaded && canvasRef.current) {
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
              <label className="form-label">Defect Images (Optional, {savedImages.length} saved)</label>
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
  const [invoiceNo, setInvoiceNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const addedQty = parseFloat(quantity);
      const res = await api.post(`/supplier-po-items/${item.id}/receive-qc/`, { 
        passed_qty: addedQty,
        supplier_invoice_no: invoiceNo,
        vehicle_no: vehicleNo
      });
      onSaved(res.data?.receipt);
    } catch (err) {
      console.error(err);
      alert('Failed to save passed quantity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>Pass Pieces (Gate QC)</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Quantity to Pass * (Max: {remaining})</label>
              <input required type="number" min="0.01" step="0.01" max={remaining} className="form-input"
                value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier Invoice / Challan No. (Optional)</label>
              <input type="text" placeholder="e.g. INV-2026-101" className="form-input"
                value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Truck / Vehicle No. (Optional)</label>
              <input type="text" placeholder="e.g. RJ-14-GB-9900" className="form-input"
                value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ background: '#16a34a' }} disabled={saving}>
                {saving ? 'Saving…' : 'Confirm Pass & Generate GRN'}
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
  const [poReceipts, setPoReceipts] = useState([]);
  const [poDebitNotes, setPoDebitNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecordInstallmentModal, setShowRecordInstallmentModal] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [selectedDebitNote, setSelectedDebitNote] = useState(null);
  const [selectedGRN, setSelectedGRN] = useState(null);

  const toggleLogs = (itemId) => setExpandedLogs(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  const loadPO = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/supplier-pos/${poId}/`),
      api.get('/gate-inward-receipts/', { params: { supplier_po: poId } }),
      api.get('/supplier-debit-notes/', { params: { supplier_po: poId } })
    ]).then(([poRes, rcptRes, dnRes]) => {
      setPo(poRes.data);
      setPoReceipts(rcptRes.data?.results || rcptRes.data || []);
      setPoDebitNotes(dnRes.data?.results || dnRes.data || []);
    }).finally(() => setLoading(false));
  }, [poId]);

  useEffect(() => { loadPO(); }, [loadPO]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading PO details…</div>;
  if (!po) return null;

  const items = po.items || [];
  const totalItemsCount = items.length;

  let passedItemsCount = 0;
  let rejectedItemsCount = 0;
  let outstandingItemsCount = 0;

  items.forEach(item => {
    const rejectedTotal = (item.defects || []).reduce((acc, d) => acc + parseFloat(d.quantity || 0), 0);
    const passedTotal = parseFloat(item.passed_quantity || 0);
    const ordered = parseFloat(item.quantity || 0);
    const remaining = Math.max(0, ordered - passedTotal - rejectedTotal);

    if (passedTotal > 0) passedItemsCount++;
    if (rejectedTotal > 0) rejectedItemsCount++;
    if (remaining > 0) outstandingItemsCount++;
  });

  const grnGroupMap = {};
  poReceipts.forEach(rcpt => {
    const key = rcpt.grn_number || `GRN-${rcpt.round_number || 1}`;
    if (!grnGroupMap[key]) {
      const matchingDN = poDebitNotes.find(dn => 
        (dn.item_description && dn.item_description.includes(key)) || 
        (dn.remarks && dn.remarks.includes(key)) ||
        (rcpt.supplier_invoice_no && dn.original_inv_no === rcpt.supplier_invoice_no)
      );

      grnGroupMap[key] = {
        grn_number: key,
        round_number: rcpt.round_number || 1,
        receipt_date: rcpt.receipt_date,
        supplier_invoice_no: rcpt.supplier_invoice_no || rcpt.challan_no,
        supplier_invoice_date: rcpt.supplier_invoice_date,
        vehicle_no: rcpt.vehicle_no,
        inspected_by_name: rcpt.inspected_by_name,
        notes: rcpt.notes,
        debit_note: matchingDN || null,
        items: []
      };
    }
    grnGroupMap[key].items.push(rcpt);
  });
  const grnRoundsList = Object.values(grnGroupMap).sort((a, b) => (b.round_number || 0) - (a.round_number || 0));

  return (
    <div className="new-page-form" style={{ padding: '0.5rem 0 2rem' }}>
      <DebitNotePrintout
        debitNote={selectedDebitNote}
        onClose={() => setSelectedDebitNote(null)}
      />

      <GRNPrintoutModal
        receipt={selectedGRN}
        onClose={() => setSelectedGRN(null)}
      />

      {showRecordInstallmentModal && (
        <RecordInstallmentModal
          po={po}
          onClose={() => setShowRecordInstallmentModal(false)}
          onSaved={(resData) => {
            setShowRecordInstallmentModal(false);
            if (resData?.receipts?.length > 0) {
              setSelectedGRN({
                grn_number: resData.grn_number,
                round_number: resData.round_number,
                supplier_po: po,
                batch_items: resData.receipts
              });
            }
            loadPO();
          }}
        />
      )}
      {/* Header Card */}
      <div className="po-header-card">
        <div className="po-header-left">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ClipboardCheck size={22} strokeWidth={2.2} />
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.6rem 0', color: '#1e293b', letterSpacing: '-0.02em' }}>
              Gate Entry / Quality Check
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem 2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  PO Number
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>
                  {po.po_number}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Supplier
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  {po.supplier_detail?.name || 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Status
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#fff7ed',
                  border: '1px solid #ffedd5',
                  color: '#ea580c',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <Clock size={13} strokeWidth={2.5} />
                  <span>{po.status || 'Pending'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{ width: '1px', height: '60px', backgroundColor: '#e2e8f0' }} className="po-header-divider" />

        {/* Summary Metric Cards (2x2 grid on mobile) */}
        <div className="po-qc-metrics-wrapper">
          {/* Total Items */}
          <div className="po-qc-metric-card">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.35rem'
            }}>
              <Box size={18} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {totalItemsCount}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
              Total Items
            </div>
          </div>

          {/* Passed */}
          <div className="po-qc-metric-card">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.35rem'
            }}>
              <CheckCircle size={18} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {passedItemsCount}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
              Passed
            </div>
          </div>

          {/* Rejected */}
          <div className="po-qc-metric-card">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.35rem'
            }}>
              <XCircle size={18} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {rejectedItemsCount}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
              Rejected
            </div>
          </div>

          {/* Outstanding */}
          <div className="po-qc-metric-card">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.35rem'
            }}>
              <Hourglass size={18} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {outstandingItemsCount}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
              Outstanding
            </div>
          </div>
        </div>
      </div>

      {/* Subtitle Section Header & Record Installment Action Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingLeft: '0.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <Box size={20} color="#059669" strokeWidth={2.2} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Item Details & Cumulative QC Progress
            </h3>
          </div>
          <div style={{ width: '36px', height: '3px', backgroundColor: '#10b981', borderRadius: '2px', marginLeft: '1.85rem' }} />
        </div>

        <button
          type="button"
          onClick={() => setShowRecordInstallmentModal(true)}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
          }}
        >
          <Truck size={18} />
          <span>+ Record Delivery Installment / Inward Shipment</span>
        </button>
      </div>

      {/* Table Card Container */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        marginBottom: '1.5rem'
      }}>
        <div className="po-desktop-table">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '950px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '50px' }}>#</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description of Goods</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ordered Qty</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passed Qty</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejected Qty</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Balance Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const rejectedTotal = (item.defects || []).reduce((acc, d) => acc + parseFloat(d.quantity || 0), 0);
                  const passedTotal = parseFloat(item.passed_quantity || 0);
                  const ordered = parseFloat(item.quantity || 0);
                  const remaining = Math.max(0, ordered - passedTotal - rejectedTotal);

                  let skuCode = item.description || '';
                  let skuDetail = '';
                  const match = item.description?.match(/^([^\s(]+)\s*\((.*)\)$/);
                  if (match) {
                    skuCode = match[1];
                    skuDetail = `(${match[2]})`;
                  } else if (item.description?.includes(' - ')) {
                    const parts = item.description.split(' - ');
                    skuCode = parts[0];
                    skuDetail = `(${parts.slice(1).join(' - ')})`;
                  }

                  return (
                    <React.Fragment key={item.id}>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '1.1rem 1.25rem', verticalAlign: 'middle' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#d1fae5',
                            color: '#059669',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </div>
                        </td>

                        <td style={{ padding: '1.1rem 1.25rem', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem', marginBottom: skuDetail ? '2px' : 0 }}>
                            {skuCode}
                          </div>
                          {skuDetail && (
                            <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
                              {skuDetail}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '1.1rem 1.25rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
                            {item.quantity} {item.unit || 'pcs'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            Ordered
                          </div>
                        </td>

                        <td style={{ padding: '1.1rem 1.25rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                            {passedTotal} {item.unit || 'pcs'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            Passed
                          </div>
                        </td>

                        <td style={{ padding: '1.1rem 1.25rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.95rem' }}>
                            {rejectedTotal} {item.unit || 'pcs'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            Rejected
                          </div>
                        </td>

                        <td style={{ padding: '1.1rem 1.25rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: remaining > 0 ? '#ea580c' : '#059669', fontSize: '0.95rem' }}>
                            {remaining} {item.unit || 'pcs'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            Outstanding
                          </div>
                        </td>
                      </tr>

                      {expandedLogs[item.id] && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0 1.25rem 1.25rem 1.25rem', backgroundColor: '#fafafa' }}>
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

        {/* Mobile View */}
        <div className="po-mobile-cards" style={{ padding: '0.75rem' }}>
          {items.map((item, idx) => {
            const rejectedTotal = (item.defects || []).reduce((acc, d) => acc + parseFloat(d.quantity || 0), 0);
            const passedTotal = parseFloat(item.passed_quantity || 0);
            const ordered = parseFloat(item.quantity || 0);
            const remaining = Math.max(0, ordered - passedTotal - rejectedTotal);

            return (
              <div key={item.id} className="po-mobile-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                     <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#d1fae5', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>
                       {idx + 1}
                     </div>
                     <div>
                       <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem', marginBottom: '0.2rem' }}>{item.description}</div>
                       <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Rem: {remaining > 0 ? remaining : 0} {item.unit || 'pcs'}</div>
                     </div>
                   </div>
                </div>

                {/* 2x2 Quantities Grid */}
                <div className="po-mobile-qty-grid">
                   <div className="po-mobile-qty-item">
                     <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase' }}>Ordered</div>
                     <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>{item.quantity} {item.unit || 'pcs'}</div>
                   </div>
                   <div className="po-mobile-qty-item">
                     <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase' }}>Passed</div>
                     <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#059669' }}>{passedTotal} {item.unit || 'pcs'}</div>
                   </div>
                   <div className="po-mobile-qty-item">
                     <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase' }}>Rejected</div>
                     <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#dc2626' }}>{rejectedTotal} {item.unit || 'pcs'}</div>
                   </div>
                   <div className="po-mobile-qty-item">
                     <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase' }}>Outstanding</div>
                     <div style={{ fontSize: '0.92rem', fontWeight: 800, color: remaining > 0 ? '#ea580c' : '#059669' }}>{remaining} {item.unit || 'pcs'}</div>
                   </div>
                </div>

                 {expandedLogs[item.id] && (
                  <InlineDefectLogs item={item} onClose={() => toggleLogs(item.id)} onReplySaved={loadPO} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Round-by-Round Delivery History Timeline */}
      <div style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
          <Package size={20} color="#059669" strokeWidth={2.2} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Inward Delivery Rounds & Goods Received Notes (GRN Audit Trail)
          </h3>
        </div>

        {grnRoundsList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {grnRoundsList.map(grnGroup => (
              <div
                key={grnGroup.grn_number}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7', padding: '4px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.88rem' }}>
                      Round #{grnGroup.round_number} ({grnGroup.grn_number})
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                      Inv / Challan: <strong>{grnGroup.supplier_invoice_no || 'N/A'}</strong>
                    </span>
                    {grnGroup.vehicle_no && (
                      <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                        Truck: <strong>{grnGroup.vehicle_no}</strong>
                      </span>
                    )}
                    {grnGroup.receipt_date && (
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Date: {grnGroup.receipt_date}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {grnGroup.debit_note && (
                      <button
                        type="button"
                        onClick={() => setSelectedDebitNote(grnGroup.debit_note)}
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          borderRadius: '8px',
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <Download size={15} /> Download Combined Debit Note PDF
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedGRN({
                        grn_number: grnGroup.grn_number,
                        round_number: grnGroup.round_number,
                        receipt_date: grnGroup.receipt_date,
                        supplier_invoice_no: grnGroup.supplier_invoice_no,
                        supplier_invoice_date: grnGroup.supplier_invoice_date,
                        vehicle_no: grnGroup.vehicle_no,
                        inspected_by_name: grnGroup.inspected_by_name,
                        supplier_po: po,
                        batch_items: grnGroup.items
                      })}
                      style={{ fontSize: '0.8rem', padding: '5px 12px', color: '#059669', borderColor: '#a7f3d0', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <FileText size={15} /> Print GRN Voucher
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>#</th>
                        <th style={{ padding: '6px 8px' }}>Item Description</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Passed Qty</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rejected Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grnGroup.items.map((rcpt, idx) => (
                        <tr key={rcpt.id || idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontWeight: 700, color: '#1e293b' }}>
                            {rcpt.po_item_description || 'Raw Material Item'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                            {rcpt.passed_qty} {rcpt.po_item_unit || 'pcs'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: rcpt.rejected_qty > 0 ? '#dc2626' : '#64748b' }}>
                            {rcpt.rejected_qty} {rcpt.po_item_unit || 'pcs'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No delivery rounds recorded yet. Click <strong>+ Record Delivery Installment</strong> above to log your first shipment.
          </div>
        )}
      </div>

      {/* Bottom Banner Card */}
      <div style={{
        backgroundColor: '#e6f7f2',
        border: '1px solid #a7f3d0',
        borderRadius: '20px',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginTop: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#059669',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Check size={22} strokeWidth={3} />
          </div>

          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>
              Quality comes first!
            </h4>
            <div style={{ fontSize: '0.88rem', color: '#047857', fontWeight: 500 }}>
              Please verify each item carefully before passing or rejecting the lot.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="10" width="36" height="46" rx="4" fill="#ffffff" stroke="#059669" strokeWidth="2"/>
            <rect x="14" y="6" width="18" height="7" rx="2" fill="#059669"/>
            <line x1="12" y1="22" x2="34" y2="22" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="30" x2="28" y2="30" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 38L16 42L26 34" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
{/*             
            <rect x="56" y="20" width="34" height="30" rx="3" fill="#d97706"/>
            <polygon points="56,20 73,10 90,20" fill="#f59e0b"/>
            <line x1="73" y1="10" x2="73" y2="50" stroke="#b45309" strokeWidth="1.5"/>
            <line x1="56" y1="20" x2="90" y2="20" stroke="#b45309" strokeWidth="1.5"/>
            
            <circle cx="85" cy="42" r="10" fill="#10b981"/>
            <path d="M80 42L83 45L89 39" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> */}

            <path d="M48 12L50 16L54 18L50 20L48 24L46 20L42 18L46 16Z" fill="#34d399" opacity="0.7"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function GateEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pos, setPos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const hasVisitedItem = sessionStorage.getItem('last_visited_gate_entry');
      const savedPage = sessionStorage.getItem('last_visited_page_gate_entry');
      if (hasVisitedItem && savedPage) return Number(savedPage);
    } catch (e) {}
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  const { lastVisitedId, setHighlightRef } = useLastVisitedItem('gate_entry', id, currentPage);

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanningLookup, setScanningLookup] = useState(false);

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


  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [searchTerm, ordering]);

  const handleScanSuccess = async (scannedCode) => {
    setShowScanner(false);
    setScanningLookup(true);
    try {
      const res = await api.post('/scan-lookup/', { code: scannedCode });
      setScanResult(res.data);
    } catch (err) {
      console.error("Scan lookup error:", err);
      alert(`Error verifying code '${scannedCode}'. Please check server connection.`);
    } finally {
      setScanningLookup(false);
    }
  };

  if (id) {
    return <QCForm poId={id} onBack={() => { navigate('/pos?tab=gate-entry'); fetchPOs(); }} />;
  }

  const filteredPOs = pos.filter(p => {
    return !searchTerm || 
      p.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_detail?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      {/* QR Scanner Camera Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        title="Scan Gate-In Invoice / PO QR Code"
      />

      {/* Scanned PO Verification Result Modal */}
      {scanResult && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }} onClick={() => setScanResult(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>

            {scanResult.found ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      PO Verified & Matched!
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Scanned Code: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0284c7' }}>{scanResult.scanned_code}</code>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>PO Number:</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{scanResult.po_details.po_number}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Supplier:</span>
                    <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{scanResult.po_details.supplier_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>PO Status:</span>
                    <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {scanResult.po_details.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Total Items:</span>
                    <strong style={{ fontSize: '0.88rem', color: '#16a34a' }}>{scanResult.po_details.items_count} Line Items</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setScanResult(null)}
                    style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Close
                  </button>

                  {scanResult.po_details.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const poId = scanResult.po_details.id;
                        setScanResult(null);
                        navigate(`/gate-entry/${poId}`);
                      }}
                      style={{ flex: 2, backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      Open Gate Inward Form →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#991b1b' }}>
                      PO Not Found in ERP
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Scanned Code: <code>{scanResult.scanned_code}</code>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem' }}>
                  {scanResult.message || "No active Purchase Order matching this QR code was found in your ERP database."}
                </p>

                <button
                  type="button"
                  onClick={() => { setScanResult(null); setShowScanner(true); }}
                  style={{ width: '100%', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Try Scanning Again
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Page Header Banner */}
      <div className="banner-animated" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: '#e6f7f3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ClipboardCheck size={26} color="#0d9488" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
              Gate Entry / QC
            </h1>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.86rem', fontWeight: 450 }}>
              Record material receipts and perform quality checks on POs
            </p>
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowScanner(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.35rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f766e'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0d9488'}
          >
            <Scan size={18} /> Scan Invoice QR Code
          </button>
        </div>
      </div>

      {/* ── Stat Cards Grid (4 KPI Cards) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: TOTAL ENTRIES */}
        <div className="stat-card-animated" style={{
          backgroundColor: '#e6f7f3',
          borderRadius: '14px',
          padding: '1.1rem 1.25rem',
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
          animationDelay: '100ms'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={20} color="#0d9488" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL ENTRIES
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b', marginTop: '2px', lineHeight: 1.1 }}>
              {pos.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '4px', fontWeight: 500 }}>
              All Gate Entries
            </div>
          </div>
        </div>

        {/* Card 2: PENDING */}
        <div className="stat-card-animated" style={{
          backgroundColor: '#fff8ed',
          borderRadius: '14px',
          padding: '1.1rem 1.25rem',
          border: '1px solid #fde68a',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
          animationDelay: '150ms'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Hourglass size={20} color="#d97706" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PENDING
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706', marginTop: '2px', lineHeight: 1.1 }}>
              {pos.filter(p => p.status === 'Pending').length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: '4px', fontWeight: 500 }}>
              Awaiting QC
            </div>
          </div>
        </div>

        {/* Card 3: COMPLETED */}
        <div className="stat-card-animated" style={{
          backgroundColor: '#f0f6fe',
          borderRadius: '14px',
          padding: '1.1rem 1.25rem',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
          animationDelay: '200ms'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={20} color="#1d4ed8" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              COMPLETED
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1d4ed8', marginTop: '2px', lineHeight: 1.1 }}>
              {pos.filter(p => p.status === 'Received').length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#2563eb', marginTop: '4px', fontWeight: 500 }}>
              Quality Checked
            </div>
          </div>
        </div>

        {/* Card 4: TODAY'S ENTRIES */}
        <div className="stat-card-animated" style={{
          backgroundColor: '#faf5ff',
          borderRadius: '14px',
          padding: '1.1rem 1.25rem',
          border: '1px solid #e9d5ff',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
          animationDelay: '250ms'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#f3e8ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <List size={20} color="#7e22ce" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TODAY'S ENTRIES
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#7e22ce', marginTop: '2px', lineHeight: 1.1 }}>
              {pos.filter(p => p.po_date && new Date(p.po_date).toDateString() === new Date().toDateString()).length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b21a8', marginTop: '4px', fontWeight: 500 }}>
              Today
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="filter-bar-animated" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '0.85rem 1.25rem',
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        marginBottom: '1.5rem'
      }}>
        <div className="filter-bar-inner po-filter-bar-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="po-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 300px', maxWidth: '420px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 0.85rem', height: '42px' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by PO number or supplier..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '0.88rem',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: '#8b5a2b', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>ORDER BY:</span>
            <div style={{ width: '165px' }}>
              <OrderBySelect
                options={ORDER_OPTIONS_DATE_PONO}
                value={ordering}
                onChange={setOrdering}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop Data Table ── */}
      <div className="po-desktop-table table-fade-slide-in">
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7f3ee', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#524b42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} color="#8b5a2b" /> PO NUMBER
                  </div>
                </th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#524b42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={14} color="#8b5a2b" /> SUPPLIER
                  </div>
                </th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#524b42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} color="#8b5a2b" /> PO DATE
                  </div>
                </th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#524b42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Package size={14} color="#8b5a2b" /> ITEMS COUNT
                  </div>
                </th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#524b42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  STATUS
                </th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#524b42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ACTION
                </th>
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
              ) : filteredPOs.map((p, idx) => {
                const isRecentlyVisited = String(p.id) === String(lastVisitedId);
                return (
                  <tr
                    key={p.id}
                    ref={isRecentlyVisited ? setHighlightRef : null}
                    onClick={() => navigate(`/gate-entry/${p.id}`)}
                    style={{
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      borderBottom: '1px solid #f1f5f9',
                      animationDelay: `${Math.min(idx * 30, 300)}ms`
                    }}
                    className={`table-row-stagger smooth-fade-in ${isRecentlyVisited ? 'row-recently-visited' : ''}`}
                  >
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '10px', background: '#f5eee6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={16} color="#8b5a2b"/>
                        </div>
                        <strong style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 700 }}>{p.po_number}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 700, color: '#1e293b' }}>
                      {p.supplier_detail?.name || '—'}
                    </td>
                    <td style={{ padding: '0.95rem 1rem', color: '#475569', fontWeight: 500 }}>
                      {p.po_date ? new Date(p.po_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 700, color: '#1e293b' }}>
                      {(p.items || []).length}
                    </td>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <StatusBadge status={p.status}/>
                    </td>
                    <td style={{ padding: '0.95rem 1rem' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/gate-entry/${p.id}`); }}
                        style={{
                          backgroundColor: '#e6f7f3',
                          border: '1px solid #a7f3d0',
                          color: '#0d9488',
                          borderRadius: '8px',
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Play size={12} fill="#0d9488" color="#0d9488" /> Start QC
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Entry Count & Teal Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0 0.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            Showing 1 to {filteredPOs.length} of {pos.length || filteredPOs.length} entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.5 : 1
              }}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  border: 'none',
                  backgroundColor: currentPage === pageNum ? '#0d9488' : '#ffffff',
                  color: currentPage === pageNum ? '#ffffff' : '#64748b',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: currentPage === pageNum ? '0 2px 4px rgba(13, 148, 136, 0.2)' : 'none'
                }}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.5 : 1
              }}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Cards Fallback */}
      <div className="po-mobile-cards" style={{ padding: '0 0.5rem' }}>
        {loading ? (
          <CardSkeleton count={4} />
        ) : filteredPOs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <AlertTriangle size={32} style={{ marginBottom: '0.5rem', color: '#94a3b8' }}/>
            <div style={{ fontWeight: 600 }}>No active POs ready for Gate Entry</div>
          </div>
        ) : filteredPOs.map(p => {
          const isRecentlyVisited = String(p.id) === String(lastVisitedId);
          return (
            <div
              className={`po-mobile-card ${isRecentlyVisited ? 'card-recently-visited' : ''}`}
              key={p.id}
              ref={isRecentlyVisited ? setHighlightRef : null}
              onClick={() => navigate(`/gate-entry/${p.id}`)}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#f5ede3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={24} color="#8b5a2b"/>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                      {p.po_number}
                    </div>
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
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4b5563', letterSpacing: '0.02em', marginBottom: '0.1rem' }}>ITEMS & ORDERED QTY</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>
                        {(p.items || []).length} Line Item{(p.items || []).length !== 1 ? 's' : ''} ({p.total_ordered_qty !== undefined ? p.total_ordered_qty : (p.items || []).reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0)} Pcs)
                      </div>
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
          );
        })}
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
}
