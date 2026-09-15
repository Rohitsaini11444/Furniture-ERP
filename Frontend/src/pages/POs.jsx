import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft, Plus, Trash2, Search, Download, FileText,
  ChevronDown, Package, Building2, Calendar, MoreVertical,
  CheckCircle, Clock, XCircle, TruckIcon, Eye, ClipboardCheck, ShoppingBag, AlertCircle, X,
  Home, ChevronRight, Pencil, DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import SearchableSelect from '../components/SearchableSelect';
import { OrderBySelect, ORDER_OPTIONS_DATE_PONO } from '../components/OrderBySelect';
import { StatusSelect, PO_STATUS_OPTIONS } from '../components/StatusSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import GateEntry from './GateEntry';
import VendorManagement from './VendorManagement';
import SupplierAllocationBreakdownModal from '../components/SupplierAllocationBreakdownModal';
import { useLastVisitedItem } from '../hooks/useLastVisitedItem';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesModal from '../components/UnsavedChangesModal';


// ─── Status badge helpers ──────────────────────────────────────────────────────
const STATUS_STYLES = {
  Pending:            { bg: '#fef3c7', color: '#d97706', icon: <Clock size={12}/> },
  'Partial Received': { bg: '#fff7ed', color: '#ea580c', icon: <Clock size={12}/> },
  Received:           { bg: '#dbeafe', color: '#1d4ed8', icon: <CheckCircle size={12}/> },
  Cancelled:          { bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={12}/> },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
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

// ─── Empty line item template ──────────────────────────────────────────────────
function emptyItem() {
  return { buyer: '', buyer_pi: '', description: '', quantity: '', unit: 'pcs', rate: '', amount: '' };
}

// ─── Format INR ───────────────────────────────────────────────────────────────
function fmtINR(val) {
  if (!val && val !== 0) return '—';
  return `₹${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// ─── Supplier Form Modal (inline quick-create) ─────────────────────────────────
function SupplierModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', address: '', phone: '', gstin: '', state_name: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/suppliers/', form);
      onSaved(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Supplier</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              {[
                { key: 'name', label: 'Supplier Name *', req: true },
                { key: 'phone', label: 'Phone', req: false },
                { key: 'gstin', label: 'GSTIN/UIN', req: false },
                { key: 'state_name', label: 'State Name', req: false },
                { key: 'cartage_gst_rate', label: 'Cartage GST Rate (%)', req: false, placeholder: '18.00' },
                { key: 'cartage_ledger_name', label: 'Cartage Ledger Name', req: false, placeholder: 'PUR. CARTAGE GST @ 18% -  3 %' },
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input required={f.req} type="text" className="form-input" placeholder={f.placeholder || ''}
                    value={form[f.key] !== undefined ? form[f.key] : ''} onChange={e => setForm({...form, [f.key]: e.target.value})} />
                </div>
              ))}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <textarea rows={3} className="form-input"
                  value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── API Error Parser ──────────────────────────────────────────────────────────
function formatApiError(err) {
  if (!err || !err.response) return err?.message || 'Network or connection error occurred.';
  const data = err.response.data;
  if (!data) return 'Failed to save Purchase Order. Please try again.';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const errorList = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'items' && Array.isArray(val)) {
        val.forEach((itemErr, idx) => {
          if (typeof itemErr === 'object' && itemErr !== null) {
            for (const [fName, fVal] of Object.entries(itemErr)) {
              const msg = Array.isArray(fVal) ? fVal.join(' ') : String(fVal);
              const label = fName === 'quantity' ? 'Quantity' : fName === 'rate' ? 'Rate' : fName === 'description' ? 'Description' : fName;
              errorList.push(`Line Item #${idx + 1} (${label}): ${msg}`);
            }
          } else if (itemErr) {
            errorList.push(`Line Item #${idx + 1}: ${Array.isArray(itemErr) ? itemErr.join(' ') : String(itemErr)}`);
          }
        });
      } else {
        const msg = Array.isArray(val) ? val.join(' ') : String(val);
        const label = key === 'po_number' ? 'PO Number' : key === 'po_date' ? 'PO Date' : key === 'due_date' ? 'Due Date' : key === 'supplier' ? 'Supplier' : key;
        errorList.push(`${label}: ${msg}`);
      }
    }
    return errorList.join('\n') || 'Validation failed. Please review your input.';
  }
  return 'Failed to save Purchase Order.';
}

// ─── PO Form (Create / Edit) ───────────────────────────────────────────────────
function POForm({ poId, onBack, onSaved }) {
  const { isStoreManager } = useAuth();
  const isNew = !poId;
  const formTopRef = React.useRef(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Auto-scroll to top when formError is updated
  useEffect(() => {
    if (formError) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [formError]);

  const [suppliers, setSuppliers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [buyerPIs, setBuyerPIs] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  // Load reference data
  useEffect(() => {
    Promise.all([
      api.get('/suppliers/'),
      api.get('/buyers/'),
      api.get('/buyer-pis/'),
      api.get('/users/supervisors/'),
    ]).then(([s, b, p, u]) => {
      setSuppliers(s.data.results || s.data);
      setBuyers(b.data.results || b.data);
      setBuyerPIs(p.data.results || p.data);
      setSupervisors(u.data.results || u.data || []);
    }).catch(err => {
      console.error('Error loading reference data:', err);
    });
  }, []);

  const [selectedPiData, setSelectedPiData] = useState(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const {
    isDirty,
    setIsDirty,
    showExitModal,
    confirmExit,
    handleSaveAndExit,
    handleSaveDraft,
    handleDiscardAndExit,
    handleCancelExit,
    currentDraftId,
    setCurrentDraftId,
    clearDraft
  } = useUnsavedChanges({
    formType: 'po',
    formLabel: 'Supplier PO',
    getFormTitle: (data) => {
      const sObj = suppliers.find(s => s.id === data?.header?.supplier);
      return `PO ${data?.header?.po_number || 'New'} - ${sObj?.name || 'Draft'} (${data?.items?.length || 0} items)`;
    },
    getFormData: () => ({ header, items }),
    targetPath: '/pos/new',
    onSaveForm: async () => {
      const formEl = document.getElementById('po-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  const [header, setHeader] = useState({
    po_number: '',
    po_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    supplier: '',
    buyer_pi: '',
    mode_of_payment: '',
    terms_of_delivery: '',
    supervisor: '',
    nku_refs: '',
    remarks: '',
    status: 'Pending',
  });

  const [items, setItems] = useState([emptyItem()]);

  // Restore draft if passed via state
  useEffect(() => {
    if (location.state?.draftData && isNew) {
      if (location.state.draftData.header) {
        setHeader(location.state.draftData.header);
      }
      if (location.state.draftData.items) {
        setItems(location.state.draftData.items);
      }
      setIsDirty(true);
      if (location.state.draftId) {
        setCurrentDraftId(location.state.draftId);
      }
    }
  }, [location.state, isNew]);

  // Load existing PO for edit
  useEffect(() => {
    if (!isNew && poId) {
      setLoading(true);
      api.get(`/supplier-pos/${poId}/`)
        .then(res => {
          const d = res.data;
          setHeader({
            po_number: d.po_number,
            po_date: d.po_date,
            due_date: d.due_date || '',
            supplier: d.supplier,
            buyer_pi: d.buyer_pi || '',
            mode_of_payment: d.mode_of_payment || '',
            terms_of_delivery: d.terms_of_delivery || '',
            supervisor: d.supervisor || '',
            nku_refs: d.nku_refs || '',
            remarks: d.remarks || '',
            status: d.status || 'Pending',
            supplier_history: d.supplier_history || [],
          });
          if (d.buyer_pi) {
            api.get(`/buyer-pis/${d.buyer_pi}/`).then(resPi => setSelectedPiData(resPi.data)).catch(() => {});
          }
          const loadedItems = (d.items || []).map(it => ({
            id: it.id,
            buyer: it.buyer || '',
            buyer_pi: it.buyer_pi || d.buyer_pi || '',
            buyer_pi_item: it.buyer_pi_item || '',
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            rate: it.rate,
            amount: it.amount,
          }));
          setItems(loadedItems.length ? loadedItems : [emptyItem()]);
        })
        .finally(() => setLoading(false));
    }
  }, [poId, isNew]);

  const updateHeader = (key, val) => {
    if (isStoreManager) return;
    setIsDirty(true);
    setHeader(h => ({ ...h, [key]: val }));
  };

  const handleSelectHeaderPI = (val) => {
    updateHeader('buyer_pi', val);
    if (val) {
      api.get(`/buyer-pis/${val}/`).then(res => {
        setSelectedPiData(res.data);
      }).catch(err => console.error(err));
    } else {
      setSelectedPiData(null);
    }
  };

  const handleAutoFillFromPI = () => {
    if (!selectedPiData || !selectedPiData.items || selectedPiData.items.length === 0) return;
    setIsDirty(true);
    const newItems = selectedPiData.items.map(it => ({
      buyer: selectedPiData.buyer || '',
      buyer_pi: selectedPiData.id,
      buyer_pi_item: it.id || '',
      description: `${it.style_no || ''} - ${it.product_name || ''}`.trim() || 'Item from PI',
      quantity: it.units ? String(it.units) : '1',
      unit: 'pcs',
      rate: '',
      amount: '',
    }));
    setItems(newItems);
  };

  // Handle ?pi= query param for auto-fill from Buyer PI
  useEffect(() => {
    if (isNew) {
      const searchParams = new URLSearchParams(location.search);
      const piParam = searchParams.get('pi');
      if (piParam && !header.buyer_pi) {
        setHeader(h => ({ ...h, buyer_pi: piParam }));
        api.get(`/buyer-pis/${piParam}/`).then(res => {
          setSelectedPiData(res.data);
          if (res.data && res.data.items && res.data.items.length > 0) {
            setItems(curr => {
              const isOnlyEmpty = curr.length === 1 && !curr[0].description && !curr[0].quantity;
              if (isOnlyEmpty) {
                return res.data.items.map(it => ({
                  buyer: res.data.buyer || '',
                  buyer_pi: res.data.id,
                  buyer_pi_item: it.id || '',
                  description: `${it.style_no || ''} - ${it.product_name || ''}`.trim() || 'Item from PI',
                  quantity: it.units ? String(it.units) : '1',
                  unit: 'pcs',
                  rate: '',
                  amount: '',
                }));
              }
              return curr;
            });
          }
        }).catch(err => console.error(err));
      }
    }
  }, [location.search, isNew]);

  const updateItem = (idx, key, val) => {
    if (isStoreManager) return;
    setIsDirty(true);
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };

      // When buyer_pi changes, auto-fill/replace description & suggested quantity
      if (key === 'buyer_pi') {
        if (val) {
          const selectedPi = buyerPIs.find(p => p.id === val);
          if (selectedPi) {
            if (!next[idx].buyer && selectedPi.buyer) {
              next[idx].buyer = selectedPi.buyer;
            }
            api.get(`/buyer-pis/${val}/`).then(res => {
              const piData = res.data;
              if (piData && piData.items && piData.items.length > 0) {
                const piItemsSummary = piData.items.map(piItem => `${piItem.style_no} (${piItem.units} pcs)`).join(', ');
                const totalPiUnits = piData.items.reduce((acc, it) => acc + (parseInt(it.units) || 0), 0);
                
                setItems(curr => {
                  const updated = [...curr];
                  updated[idx].description = piItemsSummary;
                  updated[idx].quantity = totalPiUnits > 0 ? String(totalPiUnits) : '1';
                  const q = parseFloat(updated[idx].quantity) || 0;
                  const r = parseFloat(updated[idx].rate) || 0;
                  updated[idx].amount = q && r ? (q * r).toFixed(2) : '';
                  return updated;
                });
              }
            }).catch(err => console.error(err));
          }
        }
      }

      // Auto-calculate amount
      if (key === 'quantity' || key === 'rate') {
        const q = parseFloat(key === 'quantity' ? val : next[idx].quantity) || 0;
        const r = parseFloat(key === 'rate' ? val : next[idx].rate) || 0;
        next[idx].amount = q && r ? (q * r).toFixed(2) : '';
      }
      return next;
    });
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const totalAmount = items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);

  // Financial Comparison: Calculate linked Buyer PI Selling Value in USD & INR
  const EXCHANGE_RATE_INR = 85.0; // Default USD to INR exchange rate
  let totalPiSalesUsd = 0;
  const processedPiIds = new Set();

  items.forEach(it => {
    if (it.buyer_pi && !processedPiIds.has(it.buyer_pi)) {
      processedPiIds.add(it.buyer_pi);
      const pObj = buyerPIs.find(p => p.id === it.buyer_pi);
      if (pObj && pObj.items && Array.isArray(pObj.items)) {
        totalPiSalesUsd += pObj.items.reduce((acc, piItem) => acc + (parseFloat(piItem.total_amount) || 0), 0);
      }
    }
  });

  const totalPiSalesInr = totalPiSalesUsd * EXCHANGE_RATE_INR;
  const isLoss = totalPiSalesInr > 0 && totalAmount > totalPiSalesInr;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-validate rate and quantity digits on client side before API call
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const q = parseFloat(it.quantity);
      const r = parseFloat(it.rate);

      if (isNaN(q) || q <= 0) {
        setFormError(`Line Item #${i + 1}: Quantity must be greater than 0.`);
        return;
      }
      if (q > 999999) {
        setFormError(`Line Item #${i + 1}: Quantity cannot exceed 999,999 units.`);
        return;
      }
      if (isNaN(r) || r < 0) {
        setFormError(`Line Item #${i + 1}: Rate cannot be negative.`);
        return;
      }
      if (r > 99999999.99) {
        setFormError(`Line Item #${i + 1}: Rate cannot exceed ₹99,999,999.99 (max 10 integer digits + 2 decimals).`);
        return;
      }
    }

    setSaving(true);
    const payload = {
      ...header,
      supervisor: header.supervisor || null,
      items: items.map(it => ({
        ...(it.id ? { id: it.id } : {}),
        buyer: it.buyer || null,
        buyer_pi: it.buyer_pi || header.buyer_pi || null,
        buyer_pi_item: it.buyer_pi_item || null,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        rate: it.rate,
        remark: it.remark || '',
      })),
    };
    try {
      if (isNew) {
        await api.post('/supplier-pos/', payload);
      } else {
        await api.put(`/supplier-pos/${poId}/`, payload);
      }
      if (currentDraftId) clearDraft(currentDraftId);
      setIsDirty(false);
      onSaved();
    } catch (err) {
      console.error('PO Save Error:', err);
      const formatted = formatApiError(err);
      setFormError(formatted);
    } finally {
      setSaving(false);
    }
  };

  const handleSupplierAdded = (newSupplier) => {
    setSuppliers(prev => [newSupplier, ...prev]);
    setHeader(h => ({ ...h, supplier: newSupplier.id }));
    setShowSupplierModal(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        @media (max-width: 1024px) {
          .po-header-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .po-summary-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .po-header-grid {
            grid-template-columns: 1fr !important;
          }
          .po-summary-grid {
            grid-template-columns: 1fr !important;
          }
          .po-action-btns {
            flex-direction: column-reverse !important;
            width: 100% !important;
          }
          .po-action-btns button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>

      {/* Header bar matching Daily Issue / Samples / BuyerPIs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={() => {
              if (isStoreManager) {
                onBack ? onBack() : navigate('/pos');
              } else {
                if (confirmExit('/pos')) onBack ? onBack() : navigate('/pos');
              }
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Back to Purchase Orders"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Purchase Orders
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {isNew ? 'Create New Purchase Order' : 'View / Edit PO Details'}
              {!isNew && header.po_number && (
                <span style={{ backgroundColor: '#fff3e0', color: '#b45309', padding: '0.2rem 0.65rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700, border: '1px solid #fed7aa' }}>
                  {header.po_number}
                </span>
              )}
            </h1>
          </div>
        </div>

        {header.buyer_pi && selectedPiData && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowBreakdownModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                borderRadius: '8px',
                fontWeight: 650,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              <Eye size={16} /> View PI Allocation Breakdown ({selectedPiData.pi_no})
            </button>
          </div>
        )}
      </div>

      {showSupplierModal && (
        <SupplierModal onClose={() => setShowSupplierModal(false)} onSaved={handleSupplierAdded} />
      )}

      {/* Main Full-Width Form Card Container */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '1.75rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <form id="po-form" onSubmit={handleSubmit}>
          {formError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', color: '#991b1b', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Form Validation Error:</strong>
                  <span>{formError}</span>
                </div>
              </div>
              <button type="button" onClick={() => setFormError('')} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: '2px' }}>
                <X size={18} />
              </button>
            </div>
          )}

          {isStoreManager && (
            <div style={{ backgroundColor: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#0369a1', fontWeight: 650, fontSize: '0.9rem' }}>
              <Eye size={18} />
              <span>View Only Mode: As a Store Manager, you are viewing this Purchase Order in read-only mode.</span>
            </div>
          )}

          <fieldset disabled={isStoreManager} style={{ border: 'none', padding: 0, margin: 0 }}>
            {/* ── Section 1: PO Header Details ── */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem',
              backgroundColor: '#fafaf9',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} color="#8b5a2b" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Purchase Order Details
                  </h3>
                </div>
                {!isStoreManager && (
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#475569',
                      fontSize: '0.8rem',
                      fontWeight: 650,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Quick Add Supplier
                  </button>
                )}
              </div>

              {/* Row 1: Primary Identifiers & Supplier (4 columns) */}
              <div className="po-header-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>PO Number *</label>
                  <input required type="text" className="form-input" placeholder="e.g. PO-14489"
                    value={header.po_number} onChange={e => updateHeader('po_number', e.target.value)} />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>Supplier *</label>
                  </div>
                  <SearchableSelect
                    options={suppliers}
                    value={header.supplier}
                    onChange={val => updateHeader('supplier', val)}
                    placeholder="Select Supplier..."
                    searchPlaceholder="Search supplier..."
                    codeKey=""
                    titleKey="name"
                    icon={Building2}
                    footerIcon={Building2}
                    footerText={(count) => ` ${count} supplier${count !== 1 ? 's' : ''} found`}
                    disabled={isStoreManager}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <CustomDatePicker
                    label="PO Date"
                    required
                    value={header.po_date}
                    onChange={val => updateHeader('po_date', val)}
                    disabled={isStoreManager}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <CustomDatePicker
                    label="PO Due Date"
                    value={header.due_date}
                    onChange={val => updateHeader('due_date', val)}
                    disabled={isStoreManager}
                  />
                </div>
              </div>

              {/* Row 2: Status, Payment, Supervisor, Buyer PI (4 columns) */}
              <div className="po-header-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Status *</label>
                  <SearchableSelect
                    options={[
                      { id: 'Pending', name: 'Pending', icon: Clock },
                      { id: 'Received', name: 'Received', icon: CheckCircle },
                      { id: 'Cancelled', name: 'Cancelled', icon: XCircle }
                    ]}
                    value={header.status}
                    onChange={val => updateHeader('status', val)}
                    showSearch={false}
                    clearable={false}
                    placeholder="Select status..."
                    titleKey="name"
                    disabled={isStoreManager}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Mode of Payment</label>
                  <input type="text" className="form-input" placeholder="e.g. Bank Transfer / Cheque"
                    disabled={isStoreManager}
                    value={header.mode_of_payment} onChange={e => updateHeader('mode_of_payment', e.target.value)} />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Supervisor</label>
                  <CustomSelect
                    value={header.supervisor}
                    disabled={isStoreManager}
                    onChange={val => {
                      const selectedVal = val?.target ? val.target.value : val;
                      updateHeader('supervisor', selectedVal);
                    }}
                    placeholder="-- Select Supervisor --"
                    options={[
                      { value: '', label: '-- Select Supervisor --' },
                      ...supervisors.map(sup => {
                        const nameStr = sup.full_name || (sup.first_name || sup.last_name ? `${sup.first_name || ''} ${sup.last_name || ''}`.trim() : sup.username);
                        const batchStr = sup.batch_category ? sup.batch_category.charAt(0).toUpperCase() + sup.batch_category.slice(1) : '';
                        const displayLabel = batchStr ? `${nameStr} (${batchStr})` : nameStr;
                        return {
                          value: sup.id,
                          label: displayLabel,
                        };
                      })
                    ]}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>Linked Buyer PI (Optional)</label>
                    {header.buyer_pi && selectedPiData && (
                      <button
                        type="button"
                        onClick={() => setShowBreakdownModal(true)}
                        style={{ background: 'none', border: 'none', color: '#8b5a2b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        View Breakdown
                      </button>
                    )}
                  </div>
                  <SearchableSelect
                    options={buyerPIs}
                    value={header.buyer_pi}
                    onChange={val => handleSelectHeaderPI(val)}
                    placeholder="-- Select Buyer PI to Auto-Fill --"
                    searchPlaceholder="Search PI Number..."
                    codeKey="pi_no"
                    titleKey="buyer_name"
                    icon={FileText}
                    disabled={isStoreManager}
                  />
                </div>
              </div>

              {/* Row 3: Terms, Reference, Remarks (3 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Terms of Delivery</label>
                  <input type="text" className="form-input" placeholder="e.g. Ex-Factory / FOB"
                    disabled={isStoreManager}
                    value={header.terms_of_delivery} onChange={e => updateHeader('terms_of_delivery', e.target.value)} />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>NKU / External Reference #</label>
                  <input type="text" className="form-input" placeholder="e.g. NKU # P0010167N1"
                    disabled={isStoreManager}
                    value={header.nku_refs} onChange={e => updateHeader('nku_refs', e.target.value)} />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Special Remarks</label>
                  <input type="text" className="form-input" placeholder="Any special instructions..."
                    disabled={isStoreManager}
                    value={header.remarks} onChange={e => updateHeader('remarks', e.target.value)} />
                </div>
              </div>

              {/* Supplier Info Strip if selected */}
              {header.supplier && (() => {
                const sup = suppliers.find(s => s.id === header.supplier);
                if (!sup) return null;
                return (
                  <div style={{ marginTop: '1.15rem', background: '#ffffff', borderRadius: '10px', padding: '0.85rem 1.15rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={18} color="#64748b" />
                      </div>
                      <div>
                        <strong style={{ color: '#1e293b', fontSize: '0.92rem', display: 'block' }}>{sup.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {sup.address || 'No street address provided'}
                          {sup.state_name ? ` • ${sup.state_name}` : ''}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem', color: '#475569' }}>
                      {sup.phone && <span>📞 {sup.phone}</span>}
                      {sup.gstin && <span><strong>GSTIN:</strong> {sup.gstin}</span>}
                    </div>
                  </div>
                );
              })()}

              {/* Supplier Transfer History Audit Trail */}
              {header.supplier_history && header.supplier_history.length > 0 && (
                <div style={{ marginTop: '1rem', background: '#fffbe6', borderRadius: '12px', padding: '1rem', border: '1px solid #ffe58f' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d48806', margin: '0 0 0.5rem 0' }}>
                    📜 Supplier Transfer History Log ({header.supplier_history.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {header.supplier_history.map((hist, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: '#8c6b00', backgroundColor: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #ffe58f' }}>
                        Transferred from <strong>{hist.previous_supplier_name || 'Previous Supplier'}</strong> to <strong>{hist.new_supplier_name || 'New Supplier'}</strong> by <strong>{hist.changed_by_name}</strong> on {new Date(hist.changed_at).toLocaleDateString('en-IN')}:
                        {hist.reason && <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#595959' }}>"{hist.reason}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 2: PO Line Items ── */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem',
              backgroundColor: '#fafaf9',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={18} color="#8b5a2b" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Line Items
                  </h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '0.15rem 0.55rem', borderRadius: '12px' }}>
                    {items.length} {items.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                {!isStoreManager && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {selectedPiData?.items?.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoFillFromPI}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.82rem',
                          fontWeight: 650,
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={14} /> Auto-Fill from Buyer PI ({selectedPiData.pi_no})
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={addItem}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        fontWeight: 650
                      }}
                    >
                      <Plus size={15}/> Add Item
                    </button>
                  </div>
                )}
              </div>

              {/* Full-width Line Items Table */}
              <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {(header.buyer_pi ? ['#','Description of Goods *','Quantity *','Unit','Rate (₹) *','Amount (₹)', !isStoreManager ? 'Action' : null].filter(Boolean) : ['#','Buyer (Order Ref)','Buyer PI (Optional)','Description of Goods *','Quantity *','Unit','Rate (₹) *','Amount (₹)', !isStoreManager ? 'Action' : null].filter(Boolean)).map(h => (
                        <th key={h} style={{
                          padding: '10px 12px',
                          textAlign: h === 'Action' ? 'center' : (h === '#' ? 'center' : (h === 'Amount (₹)' ? 'right' : 'left')),
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#475569',
                          whiteSpace: 'nowrap',
                          width: h === 'Action' ? '56px' : (h === '#' ? '44px' : 'auto')
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                          {idx + 1}
                        </td>
                        {!header.buyer_pi && (
                          <>
                            <td style={{ padding: '6px 8px' }}>
                              <CustomSelect
                                value={item.buyer}
                                disabled={isStoreManager}
                                onChange={e => {
                                  const val = e.target ? e.target.value : e;
                                  updateItem(idx, 'buyer', val);
                                }}
                                options={[
                                  { value: '', label: 'No buyer ref' },
                                  ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                                ]}
                                placeholder="No buyer ref"
                                style={{ minWidth: '140px' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <CustomSelect
                                value={item.buyer_pi}
                                onChange={e => {
                                  const val = e.target ? e.target.value : e;
                                  updateItem(idx, 'buyer_pi', val);
                                }}
                                disabled={isStoreManager || !item.buyer}
                                options={[
                                  { value: '', label: 'None' },
                                  ...buyerPIs.filter(p => !item.buyer || String(p.buyer) === String(item.buyer)).map(p => ({ value: p.id, label: p.pi_no }))
                                ]}
                                placeholder="None"
                                style={{ minWidth: '130px' }}
                              />
                            </td>
                          </>
                        )}
                        <td style={{ padding: '6px 8px' }}>
                          <textarea rows={2} required className="form-input"
                            disabled={isStoreManager}
                            style={{ minWidth: '240px', width: '100%', fontSize: '0.82rem', padding: '6px 8px', resize: 'vertical' }}
                            placeholder="e.g. Natural Jute Fabric / 2601-068SBWWKW"
                            value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input required type="number" step="0.01" min="0.01" max="999999" className="form-input"
                            disabled={isStoreManager}
                            style={{ width: '95px', fontSize: '0.82rem', padding: '6px 8px' }}
                            placeholder="0.00" value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <CustomSelect
                            value={item.unit}
                            disabled={isStoreManager}
                            onChange={e => {
                              const val = e.target ? e.target.value : e;
                              updateItem(idx, 'unit', val);
                            }}
                            options={['pcs','mtr','Ft²','kg','nos','set']}
                            style={{ minWidth: '85px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input required type="number" step="0.01" min="0" max="99999999.99" className="form-input"
                            disabled={isStoreManager}
                            style={{ width: '110px', fontSize: '0.82rem', padding: '6px 8px' }}
                            placeholder="0.00" value={item.rate}
                            onChange={e => updateItem(idx, 'rate', e.target.value)} />
                        </td>
                        <td style={{ padding: '6px 12px', fontWeight: 700, color: '#8b5a2b', whiteSpace: 'nowrap', minWidth: '110px', textAlign: 'right' }}>
                          {item.amount ? `₹${parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        {!isStoreManager && (
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', textAlign: 'center', width: '56px' }}>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              title="Remove item"
                              disabled={items.length <= 1}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid #fee2e2',
                                backgroundColor: '#fef2f2',
                                color: items.length <= 1 ? '#cbd5e1' : '#dc2626',
                                cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                if (items.length > 1) {
                                  e.currentTarget.style.backgroundColor = '#dc2626';
                                  e.currentTarget.style.color = '#ffffff';
                                  e.currentTarget.style.borderColor = '#dc2626';
                                }
                              }}
                              onMouseLeave={e => {
                                if (items.length > 1) {
                                  e.currentTarget.style.backgroundColor = '#fef2f2';
                                  e.currentTarget.style.color = '#dc2626';
                                  e.currentTarget.style.borderColor = '#fee2e2';
                                }
                              }}
                            >
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Summary Metrics Strip ── */}
              <div className="po-summary-grid" style={{
                display: 'grid',
                gridTemplateColumns: totalPiSalesUsd > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                gap: '1rem',
                marginTop: '1.25rem'
              }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Line Items</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{items.length}</span>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Units</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                    {items.reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supplier PO Total Amount</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5a2b' }}>
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {totalPiSalesUsd > 0 && (
                  <div style={{
                    backgroundColor: isLoss ? '#fef2f2' : '#f0fdf4',
                    border: isLoss ? '1px solid #fecaca' : '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isLoss ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {isLoss ? 'Est. Trade Loss' : 'Est. Trade Margin'}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isLoss ? '#dc2626' : '#16a34a' }}>
                      {isLoss
                        ? `-₹${(totalAmount - totalPiSalesInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : `+₹${(totalPiSalesInr - totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Profitability / Trade Loss Notice Alert */}
              {totalPiSalesUsd > 0 && (
                <div style={{
                  marginTop: '1rem',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  border: isLoss ? '1.5px solid #fca5a5' : '1.5px solid #bbf7d0',
                  backgroundColor: isLoss ? '#fef2f2' : '#f0fdf4',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isLoss ? '#991b1b' : '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} color={isLoss ? '#dc2626' : '#16a34a'} style={{ flexShrink: 0 }} />
                      <span>{isLoss ? '⚠️ Trade Loss Alert: Supplier Cost Exceeds Buyer Revenue!' : 'Profitable Purchase Order Analysis'}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isLoss ? '#b91c1c' : '#15803d', background: isLoss ? '#fee2e2' : '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      Reference Rate: 1 USD = ₹{EXCHANGE_RATE_INR} INR
                    </span>
                  </div>

                  {isLoss ? (
                    <div style={{ fontSize: '0.84rem', color: '#7f1d1d', fontWeight: 600, lineHeight: 1.5 }}>
                      Your Purchase Cost (₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) is higher than your Buyer PI Sales Revenue (~₹{totalPiSalesInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}). You will incur an estimated loss of <strong style={{ textDecoration: 'underline' }}>₹{(totalAmount - totalPiSalesInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> on this order.
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.84rem', color: '#14532d', fontWeight: 600 }}>
                      Estimated Gross Margin: <strong>₹{(totalPiSalesInr - totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> ({(((totalPiSalesInr - totalAmount) / totalPiSalesInr) * 100).toFixed(1)}% margin vs linked Buyer PI revenue).
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Section 3: Bottom Action Buttons ── */}
            <div className="po-action-btns" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (isStoreManager) {
                    onBack ? onBack() : navigate('/pos');
                  } else {
                    if (confirmExit('/pos')) onBack ? onBack() : navigate('/pos');
                  }
                }}
                style={{ padding: '0.65rem 1.6rem', borderRadius: '10px' }}
              >
                {isStoreManager ? 'Back to Listing' : 'Cancel'}
              </button>

              {!isStoreManager && (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ borderColor: '#8b5a2b', color: '#8b5a2b', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px', padding: '0.65rem 1.4rem' }}
                    onClick={() => handleSaveDraft()}
                  >
                    <FileText size={16} /> Save as Draft
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}
                    style={{ padding: '0.65rem 2.2rem', borderRadius: '10px', fontWeight: 800, backgroundColor: '#8b5a2b', borderColor: '#8b5a2b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {saving ? 'Saving…' : isNew ? 'Create PO' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </fieldset>
        </form>
      </div>

      <SupplierAllocationBreakdownModal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        piData={selectedPiData}
      />

      <UnsavedChangesModal
        isOpen={showExitModal}
        onSave={handleSaveAndExit}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />
    </div>
  );
}

function POs() {
  const { isStoreManager } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const initialTab = (rawTab === 'gate-entry' || rawTab === 'vendor-management') ? rawTab : 'pos';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Dynamic active tab sliding indicator
  const tabsContainerRef = useRef(null);
  const tabRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const updateTabIndicator = useCallback(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        top: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
      });
    }
  }, [activeTab]);

  React.useLayoutEffect(() => {
    updateTabIndicator();
  }, [activeTab, updateTabIndicator]);

  useEffect(() => {
    const handleResize = () => updateTabIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateTabIndicator]);

  const [pos, setPos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const hasVisitedItem = sessionStorage.getItem('last_visited_pos');
      const savedPage = sessionStorage.getItem('last_visited_page_pos');
      if (hasVisitedItem && savedPage) return Number(savedPage);
    } catch (e) {}
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  const { lastVisitedId, setHighlightRef } = useLastVisitedItem('pos', id, currentPage);

  const fetchPOs = useCallback(() => {
    setLoading(true);
    const params = { page: currentPage, page_size: 50, ordering: ordering };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;

    api.get('/supplier-pos/', { params })
      .then(res => {
        const data = res.data.results || res.data || [];
        setPos(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50) || 1);
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering, debouncedSearch, statusFilter]);

  useEffect(() => { if (!id) fetchPOs(); }, [id, fetchPOs]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, ordering]);

  const handleCancelPO = async (poItem, e) => {
    if (e) e.stopPropagation();
    if (poItem.status === 'Cancelled') {
      alert('This Purchase Order is already cancelled.');
      return;
    }
    if (window.confirm(`Are you sure you want to cancel Purchase Order "${poItem.po_number}"? This will mark its status as Cancelled.`)) {
      try {
        await api.put(`/supplier-pos/${poItem.id}/`, {
          po_number: poItem.po_number,
          po_date: poItem.po_date,
          due_date: poItem.due_date || null,
          supplier: poItem.supplier || poItem.supplier_detail?.id,
          mode_of_payment: poItem.mode_of_payment || '',
          terms_of_delivery: poItem.terms_of_delivery || '',
          supervisor: poItem.supervisor || poItem.supervisor_detail?.id || null,
          nku_refs: poItem.nku_refs || '',
          remarks: poItem.remarks || '',
          status: 'Cancelled'
        });
        fetchPOs();
      } catch (err) {
        console.error('Failed to cancel PO', err);
        alert('Failed to cancel Purchase Order.');
      }
    }
  };

  const handleDownloadPDF = async (poItem, e) => {
    e.stopPropagation();
    setDownloading(poItem.id);
    try {
      const res = await api.get(`/supplier-pos/${poItem.id}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${poItem.po_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF.');
    } finally {
      setDownloading(null);
    }
  };

  const location = useLocation();
  const fromBuyer = location.state?.fromBuyer;

  // If we're on a detail/create route
  if (id) {
    return (
      <POForm
        poId={id === 'new' ? null : id}
        onBack={() => {
          if (fromBuyer) {
            navigate(`/buyers/${fromBuyer}`);
          } else {
            navigate('/pos');
          }
        }}
        onSaved={() => {
          if (fromBuyer) {
            navigate(`/buyers/${fromBuyer}`);
          } else {
            navigate('/pos');
          }
          fetchPOs();
        }}
      />
    );
  }

  const filteredPOs = pos;

  // Stats
  const stats = {
    total: pos.length,
    pending: pos.filter(p => p.status === 'Pending').length,
    received: pos.filter(p => p.status === 'Received').length,
    totalValue: pos.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0),
  };

  return (
    <div style={{ padding: '0 0 2rem' }}>
      <style>{`
        .po-tabs-container {
          display: flex;
          align-items: center;
          background-color: #ffffff;
          border-radius: 16px;
          padding: 0.5rem 0.75rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          margin-bottom: 1.5rem;
          gap: 1.5rem;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .po-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .po-tab-btn {
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          border-radius: 8px 8px 0 0;
          color: #475569;
          font-weight: 500;
          padding: 0.65rem 1.1rem;
          cursor: pointer;
          font-size: 0.92rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          white-space: nowrap;
          transition: all 0.15s ease-in-out;
        }
        .po-tab-btn.active-pos {
          background-color: #e6f4f1;
          border-bottom-color: #0d9488;
          color: #0d9488;
          font-weight: 700;
        }
        .po-tab-btn.active-gate {
          background-color: #e6f4f1;
          border-bottom-color: #0d9488;
          color: #0d9488;
          font-weight: 700;
        }
        .po-tab-btn.active-vendor {
          background-color: #fef2f2;
          border-bottom-color: #dc2626;
          color: #dc2626;
          font-weight: 700;
        }
        .po-tab-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .po-main-banner {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .po-stat-grid-v2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .po-filter-card {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 0.85rem 1.25rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          margin-bottom: 1.5rem;
        }

        .po-table-card {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        .po-table-card table {
          width: 100%;
          border-collapse: collapse;
        }

        .po-table-card th {
          background-color: #f7f3ee !important;
          color: #524b42;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        .po-table-card td {
          padding: 0.95rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.88rem;
          vertical-align: middle;
        }

        .po-table-card tr:last-child td {
          border-bottom: none;
        }

        .po-table-card tr:hover td {
          background-color: #fafaf9;
        }

        .po-action-pill-btn {
          border-radius: 8px;
          padding: 0.35rem 0.8rem;
          font-size: 0.78rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
          transition: all 0.15s ease;
          line-height: 1.2;
        }

        @media (max-width: 768px) {
          .po-header-actions {
            width: 100% !important;
          }
          .po-header-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
          .po-stat-grid-v2 {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          .po-stat-card-item {
            padding: 0.65rem 0.75rem !important;
            gap: 0.6rem !important;
          }
          .po-stat-card-icon {
            width: 36px !important;
            height: 36px !important;
          }
          .po-stat-card-value {
            font-size: 1.25rem !important;
          }
          .po-stat-card-sub {
            font-size: 0.7rem !important;
          }
          .po-filter-card {
            padding: 0.85rem !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .po-filter-bar-inner {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          .po-search-wrap {
            width: 100% !important;
            max-width: 100% !important;
            height: 42px !important;
            flex: none !important;
          }
          .po-filters-wrap {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.65rem !important;
          }
          .po-filter-item {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.3rem !important;
          }
          .po-filter-item span {
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            color: #64748b !important;
            display: block !important;
          }
          .po-filter-item > div {
            width: 100% !important;
          }
        }
      `}</style>

      {/* ── Module Tabs Navigation ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.25rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button
          onClick={() => { setActiveTab('pos'); setSearchParams({}); }}
          style={{
            padding: '0.65rem 1.1rem',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: activeTab === 'pos' ? '#8b5a2b' : '#64748b',
            borderBottom: activeTab === 'pos' ? '3px solid #8b5a2b' : '3px solid transparent',
            background: 'none',
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={17} /> Purchase Orders Listing ({pos.length})
        </button>

        <button
          onClick={() => { setActiveTab('gate-entry'); setSearchParams({ tab: 'gate-entry' }); }}
          style={{
            padding: '0.65rem 1.1rem',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: activeTab === 'gate-entry' ? '#8b5a2b' : '#64748b',
            borderBottom: activeTab === 'gate-entry' ? '3px solid #8b5a2b' : '3px solid transparent',
            background: 'none',
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <ClipboardCheck size={17} /> Gate Entry & Material Receiving ({pos.length})
        </button>

        <button
          onClick={() => { setActiveTab('vendor-management'); setSearchParams({ tab: 'vendor-management' }); }}
          style={{
            padding: '0.65rem 1.1rem',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: activeTab === 'vendor-management' ? '#8b5a2b' : '#64748b',
            borderBottom: activeTab === 'vendor-management' ? '3px solid #8b5a2b' : '3px solid transparent',
            background: 'none',
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <TruckIcon size={17} /> Vendor / Supplier Management ({pos.length})
        </button>
      </div>

      <div key={activeTab} className="po-tab-content-wrapper">
        {activeTab === 'vendor-management' ? (
          <VendorManagement />
        ) : activeTab === 'gate-entry' ? (
          <GateEntry />
        ) : (
          <>
            {/* ── Main Page Header Bar ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#faf5ee',
                  border: '1px solid #f0eae1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8b5a2b',
                  flexShrink: 0
                }}>
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.55rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}>
                    Purchase Orders & Gate Entry
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    Supplier POs, material receipts, and quality check inspection
                  </p>
                </div>
              </div>
              {!isStoreManager && (
                <button
                  type="button"
                  onClick={() => navigate('/pos/new')}
                  style={{
                    backgroundColor: '#8b5a2b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.35rem',
                    fontSize: '0.88rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 5px rgba(139, 90, 43, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={16} /> Create New PO
                </button>
              )}
            </div>

            {/* ── Executive KPI Metric Cards Strip ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              {/* Card 1: Total POs */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Purchase Orders
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {stats.total}
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginLeft: '6px' }}>Orders</span>
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#faf5ee', border: '1px solid #f0eae1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5a2b' }}>
                  <FileText size={20} />
                </div>
              </div>

              {/* Card 2: Pending Action */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pending Actions
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                    {stats.pending}
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#b45309', marginLeft: '6px' }}>Awaiting QC</span>
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <Clock size={20} />
                </div>
              </div>

              {/* Card 3: Fully Received */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Fully Received
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0d9488', marginTop: '2px' }}>
                    {stats.received}
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f766e', marginLeft: '6px' }}>Completed</span>
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                  <Package size={20} />
                </div>
              </div>

              {/* Card 4: Total Value */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Procurement Value
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                    ₹{stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <DollarSign size={20} />
                </div>
              </div>
            </div>

            {/* ── Unified Search & Filters Card ── */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '0.85rem 1.15rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.85rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flex: '1 1 280px',
                maxWidth: '420px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0 0.85rem',
                height: '38px',
                boxSizing: 'border-box'
              }}>
                <Search size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search by PO number or supplier..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '0.86rem',
                    color: '#1e293b'
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '170px' }}>
                  <StatusSelect
                    options={PO_STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="All Statuses"
                  />
                </div>

                <div style={{ minWidth: '170px' }}>
                  <OrderBySelect
                    options={ORDER_OPTIONS_DATE_PONO}
                    value={ordering}
                    onChange={setOrdering}
                    width="170px"
                  />
                </div>

                {(searchTerm || statusFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8rem',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={13} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* ── Desktop Table ── */}
            <div className="po-desktop-table table-fade-slide-in">
              <div className="po-table-card">
                <table>
                  <thead>
                    <tr>
                      <th>PO NUMBER</th>
                      <th>SUPPLIER</th>
                      <th>SUPERVISOR</th>
                      <th>PO DATE</th>
                      <th>DUE DATE</th>
                      <th>ITEMS & ORDERED QTY</th>
                      <th>TOTAL AMOUNT</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right', paddingRight: '1rem' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={6} cols={9} hasImage={false} />
                    ) : filteredPOs.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                          <div style={{ fontWeight: 600 }}>No Purchase Orders found</div>
                          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            {searchTerm || statusFilter ? 'Try adjusting your filters.' : 'Create your first PO to get started.'}
                          </div>
                        </td>
                      </tr>
                    ) : filteredPOs.map((p, idx) => {
                      const isRecentlyVisited = String(p.id) === String(lastVisitedId);
                      const totalQty = p.total_ordered_qty !== undefined ? p.total_ordered_qty : (p.items || []).reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0);
                      return (
                        <tr
                          key={p.id}
                          ref={isRecentlyVisited ? setHighlightRef : null}
                          onClick={() => navigate(`/pos/${p.id}`)}
                          style={{
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            animationDelay: `${Math.min(idx * 30, 300)}ms`
                          }}
                          className={`table-row-stagger smooth-fade-in ${isRecentlyVisited ? 'row-recently-visited' : ''}`}
                          title="Click to view/edit"
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ width: 34, height: 34, borderRadius: '10px', background: '#f5eee6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={16} color="#8b5a2b"/>
                              </div>
                              <strong style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 700 }}>{p.po_number}</strong>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.supplier_detail?.name || '—'}</div>
                            {p.supplier_detail?.state_name && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1px' }}>{p.supplier_detail.state_name}</div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}>
                              {p.supervisor_detail?.full_name || p.supervisor_detail?.username || p.supervisor || '—'}
                            </span>
                          </td>
                          <td style={{ color: '#475569', fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                            {formatDisplayDate(p.po_date)}
                          </td>
                          <td style={{ color: '#475569', fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                            {formatDisplayDate(p.due_date)}
                          </td>
                          <td>
                            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 8px', fontSize: '0.76rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                              {(p.items || []).length} Item{(p.items || []).length !== 1 ? 's' : ''} ({totalQty} pcs)
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                            {fmtINR(p.total_amount)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <StatusBadge status={p.status}/>
                          </td>
                          <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); navigate(`/gate-entry/${p.id}`); }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  backgroundColor: '#f0fdfa',
                                  border: '1px solid #99f6e4',
                                  color: '#0d9488',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                                title="Record Gate Entry QC Inspection"
                              >
                                <ClipboardCheck size={13} /> Gate Entry
                              </button>

                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); navigate(`/pos/${p.id}`); }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#475569',
                                  cursor: 'pointer'
                                }}
                                title={isStoreManager ? 'View Purchase Order' : 'Edit Purchase Order'}
                              >
                                {isStoreManager ? <Eye size={13} /> : <Pencil size={13} />}
                              </button>

                              <button
                                type="button"
                                onClick={e => handleDownloadPDF(p, e)}
                                disabled={downloading === p.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  border: '1px solid #bfdbfe',
                                  backgroundColor: '#eff6ff',
                                  color: '#2563eb',
                                  cursor: 'pointer'
                                }}
                                title="Download PO PDF"
                              >
                                <Download size={13} />
                              </button>

                              {!isStoreManager && (
                                <button
                                  type="button"
                                  onClick={e => handleCancelPO(p, e)}
                                  disabled={p.status === 'Cancelled'}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    border: p.status === 'Cancelled' ? '1px solid #e2e8f0' : '1px solid #fecaca',
                                    backgroundColor: p.status === 'Cancelled' ? '#f8fafc' : '#fef2f2',
                                    color: p.status === 'Cancelled' ? '#94a3b8' : '#dc2626',
                                    cursor: p.status === 'Cancelled' ? 'not-allowed' : 'pointer'
                                  }}
                                  title={p.status === 'Cancelled' ? 'PO is already cancelled' : 'Cancel Purchase Order'}
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Entry Count & Styled Pagination */}
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
                        backgroundColor: currentPage === pageNum ? '#8b5a2b' : '#ffffff',
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
                        boxShadow: currentPage === pageNum ? '0 2px 4px rgba(139, 90, 43, 0.2)' : 'none'
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

            {/* Mobile Cards fallback */}
            <div className="po-mobile-cards table-fade-slide-in" style={{ padding: '0 0.5rem' }}>
              {loading ? (
                <CardSkeleton count={4} />
              ) : filteredPOs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                  <div style={{ fontWeight: 600 }}>No Purchase Orders found</div>
                </div>
              ) : filteredPOs.map((p, idx) => {
                const isRecentlyVisited = String(p.id) === String(lastVisitedId);
                return (
                  <div
                    className={`po-mobile-card table-row-stagger ${isRecentlyVisited ? 'card-recently-visited' : ''}`}
                    key={p.id}
                    ref={isRecentlyVisited ? setHighlightRef : null}
                    onClick={() => navigate(`/pos/${p.id}`)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      animationDelay: `${Math.min(idx * 30, 300)}ms`
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#f5ede3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={24} color="#8b5a2b"/>
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                            {p.po_number}
                          </div>
                          <div style={{ color: '#334155', fontSize: '0.9rem' }}>{p.supplier_detail?.name || '—'}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.1rem' }}>{p.supplier_detail?.state_name || '—'}</div>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>TOTAL AMOUNT</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8b5a2b' }}>
                          {fmtINR(p.total_amount)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '1rem' }}>
                      <button
                        onClick={e => handleDownloadPDF(p, e)}
                        disabled={downloading === p.id}
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '0.75rem 0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          minWidth: '60px'
                        }}
                      >
                        <Download size={22}/>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{downloading === p.id ? '...' : 'PDF'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default POs;
