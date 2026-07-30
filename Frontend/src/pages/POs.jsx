import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft, Plus, Trash2, Search, Download, FileText,
  ChevronDown, Package, Building2, Calendar, MoreVertical,
  CheckCircle, Clock, XCircle, TruckIcon, Eye, ClipboardCheck, ShoppingBag, AlertCircle, X
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import SearchableSelect from '../components/SearchableSelect';
import { OrderBySelect, ORDER_OPTIONS_DATE_PONO } from '../components/OrderBySelect';
import { StatusSelect, PO_STATUS_OPTIONS } from '../components/StatusSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import GateEntry from './GateEntry';


// ─── Status badge helpers ──────────────────────────────────────────────────────
const STATUS_STYLES = {
  Pending:    { bg: '#fef3c7', color: '#d97706', icon: <Clock size={12}/> },
  Received:   { bg: '#dbeafe', color: '#1d4ed8', icon: <CheckCircle size={12}/> },
  Cancelled:  { bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={12}/> },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Draft;
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
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>➕ Add New Supplier</h2>
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
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input required={f.req} type="text" className="form-input"
                    value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} />
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

  const [header, setHeader] = useState({
    po_number: '',
    po_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    supplier: '',
    mode_of_payment: '',
    terms_of_delivery: '',
    supervisor: '',
    nku_refs: '',
    remarks: '',
    status: 'Pending',
  });

  const [items, setItems] = useState([emptyItem()]);

  // Load reference data
  useEffect(() => {
    Promise.all([
      api.get('/suppliers/'),
      api.get('/buyers/'),
      api.get('/buyer-pis/'),
    ]).then(([s, b, p]) => {
      setSuppliers(s.data.results || s.data);
      setBuyers(b.data.results || b.data);
      setBuyerPIs(p.data.results || p.data);
    });
  }, []);

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
            mode_of_payment: d.mode_of_payment || '',
            terms_of_delivery: d.terms_of_delivery || '',
            supervisor: d.supervisor || '',
            nku_refs: d.nku_refs || '',
            remarks: d.remarks || '',
            status: d.status || 'Pending',
          });
          const loadedItems = (d.items || []).map(it => ({
            id: it.id,
            buyer: it.buyer || '',
            buyer_pi: it.buyer_pi || '',
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
  }, [poId]);

  const updateHeader = (key, val) => setHeader(h => ({ ...h, [key]: val }));

  const updateItem = (idx, key, val) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };

      // When buyer_pi changes, auto-fill description & suggested quantity if empty
      if (key === 'buyer_pi' && val) {
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
                if (!updated[idx].description || updated[idx].description === '') {
                  updated[idx].description = piItemsSummary;
                }
                if (!updated[idx].quantity || parseFloat(updated[idx].quantity) <= 0) {
                  updated[idx].quantity = totalPiUnits > 0 ? String(totalPiUnits) : '1';
                }
                const q = parseFloat(updated[idx].quantity) || 0;
                const r = parseFloat(updated[idx].rate) || 0;
                updated[idx].amount = q && r ? (q * r).toFixed(2) : '';
                return updated;
              });
            }
          }).catch(err => console.error(err));
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
      items: items.map(it => ({
        ...(it.id ? { id: it.id } : {}),
        buyer: it.buyer || null,
        buyer_pi: it.buyer_pi || null,
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
    <div className="new-page-form" style={{ padding: '1rem 0' }}>
      {showSupplierModal && (
        <SupplierModal onClose={() => setShowSupplierModal(false)} onSaved={handleSupplierAdded} />
      )}

      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#8b5a2b', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem', padding: 0, fontSize: '1rem' }}
      >
        <ArrowLeft size={18} /> Back to Purchase Orders
      </button>

      <form onSubmit={handleSubmit}>
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

        <div className="pi-form-container" style={{ marginBottom: '1.5rem' }}>
          <div className="modal-header" style={{ padding: 0, marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <h2 className="pi-form-title" style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
              <FileText size={20} color="#8b5a2b"/>
              {isNew ? 'Create New PO' : 'Edit PO'}
              {!isNew && <span style={{ backgroundColor: '#fff3e0', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>{header.po_number}</span>}
            </h2>
          </div>

          {/* ── PO Header Details ── */}
          <div className="form-section">
            <h3 className="form-section-title">📋 PO Details</h3>
            <div className="pi-info-grid">
              <div className="form-group">
                <label className="form-label">PO Number *</label>
                <input required type="text" className="form-input" placeholder="e.g. PO-14489"
                  value={header.po_number} onChange={e => updateHeader('po_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status *</label>
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
                />
              </div>
              <div className="form-group">
                <CustomDatePicker
                  label="PO Date"
                  required
                  value={header.po_date}
                  onChange={val => updateHeader('po_date', val)}
                />
              </div>
              <div className="form-group">
                <CustomDatePicker
                  label="PO Due Date"
                  value={header.due_date}
                  onChange={val => updateHeader('due_date', val)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mode of Payment</label>
                <input type="text" className="form-input" placeholder="e.g. Bank Transfer / Cheque"
                  value={header.mode_of_payment} onChange={e => updateHeader('mode_of_payment', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Supervisor</label>
                <CustomSelect
                  value={header.supervisor}
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
                        value: displayLabel,
                        label: displayLabel,
                      };
                    }),
                    ...(header.supervisor && !supervisors.some(s => {
                      const nameStr = s.full_name || (s.first_name || s.last_name ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : s.username);
                      const batchStr = s.batch_category ? s.batch_category.charAt(0).toUpperCase() + s.batch_category.slice(1) : '';
                      const displayLabel = batchStr ? `${nameStr} (${batchStr})` : nameStr;
                      return displayLabel === header.supervisor || nameStr === header.supervisor;
                    }) ? [{ value: header.supervisor, label: header.supervisor }] : [])
                  ]}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Terms of Delivery</label>
                <input type="text" className="form-input" placeholder="e.g. Ex-Factory / FOB"
                  value={header.terms_of_delivery} onChange={e => updateHeader('terms_of_delivery', e.target.value)} />
              </div>
              <div className="form-group full-width">
                <label className="form-label">NKU Reference Numbers</label>
                <input type="text" className="form-input" placeholder="e.g. NKU # P0010167N1"
                  value={header.nku_refs} onChange={e => updateHeader('nku_refs', e.target.value)} />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Remarks</label>
                <textarea rows={2} className="form-input" placeholder="Any special instructions..."
                  value={header.remarks} onChange={e => updateHeader('remarks', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Supplier ── */}
          <div className="form-section">
            <h3 className="form-section-title">🏢 Supplier (Bill From)</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Supplier *</label>
                <SearchableSelect
                  options={suppliers}
                  value={header.supplier}
                  onChange={val => updateHeader('supplier', val)}
                  placeholder="Select Supplier..."
                  searchPlaceholder="Search supplier..."
                  codeKey=""
                  titleKey="name"
                  icon={Building2}
                  onAddNew={() => setShowSupplierModal(true)}
                  addNewText="Add New Supplier"
                  footerIcon={Building2}
                  footerText={(count) => `🏢 ${count} supplier${count !== 1 ? 's' : ''} found`}
                />
              </div>
              <button type="button" className="btn-secondary" onClick={() => setShowSupplierModal(true)}
                style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap', height: '44px', border: '1px dashed #d6c7b2', backgroundColor: '#faf8f5', color: '#8b5a2b', borderRadius: '10px', fontWeight: 700 }}>
                + New Supplier
              </button>
            </div>

            {header.supplier && (() => {
              const sup = suppliers.find(s => s.id === header.supplier);
              if (!sup) return null;
              return (
                <div style={{ marginTop: '1rem', background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{sup.name}</strong>
                    {sup.address && <div>{sup.address}</div>}
                    {sup.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>📞 {sup.phone}</div>}
                    {sup.gstin && <div style={{ marginTop: '0.2rem' }}>GSTIN: {sup.gstin}</div>}
                    {sup.state_name && <div>State: {sup.state_name}</div>}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className="pi-form-container" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="form-section-title" style={{ margin: 0 }}>📦 Line Items</h3>
            <button type="button" className="btn-secondary" onClick={addItem}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
              <Plus size={15}/> Add Item
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#','Buyer (Order Ref)','Buyer PI (Optional)','Description of Goods *','Quantity *','Unit','Rate (₹) *','Amount (₹)',''].map(h => (
                    <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <CustomSelect
                        value={item.buyer}
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
                        disabled={!item.buyer}
                        options={[
                          { value: '', label: 'None' },
                          ...buyerPIs.filter(p => !item.buyer || String(p.buyer) === String(item.buyer)).map(p => ({ value: p.id, label: p.pi_no }))
                        ]}
                        placeholder="None"
                        style={{ minWidth: '130px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <textarea rows={2} required className="form-input"
                        style={{ minWidth: '220px', fontSize: '0.82rem', padding: '6px 8px', resize: 'vertical' }}
                        placeholder="e.g. Natural Jute Fabric / 2601-068SBWWKW"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input required type="number" step="0.01" min="0.01" max="999999" className="form-input"
                        style={{ width: '95px', fontSize: '0.82rem', padding: '6px 8px' }}
                        placeholder="0.00" value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <CustomSelect
                        value={item.unit}
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
                        style={{ width: '105px', fontSize: '0.82rem', padding: '6px 8px' }}
                        placeholder="0.00" value={item.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#8b5a2b', whiteSpace: 'nowrap', minWidth: '100px' }}>
                      {item.amount ? `₹${parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <button type="button" onClick={() => removeItem(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }}>
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ background: '#fcfaf6', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#9a3412', marginBottom: '0.25rem', fontWeight: 600 }}>Supplier PO Total Amount</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5a2b' }}>
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Profitability & Financial Comparison Indicator */}
            {totalPiSalesUsd > 0 && (
              <div style={{
                marginTop: '1rem',
                borderRadius: '14px',
                padding: '1.15rem 1.25rem',
                border: isLoss ? '1.5px solid #fca5a5' : '1.5px solid #bbf7d0',
                backgroundColor: isLoss ? '#fef2f2' : '#f0fdf4',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isLoss ? '#991b1b' : '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={20} color={isLoss ? '#dc2626' : '#16a34a'} style={{ flexShrink: 0 }} />
                    <span>{isLoss ? '⚠️ Trade Loss Alert: Supplier Cost Exceeds Buyer Revenue!' : '🟢 Profitable Purchase Order'}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isLoss ? '#b91c1c' : '#15803d', background: isLoss ? '#fee2e2' : '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                    Reference Exchange Rate: 1 USD = ₹{EXCHANGE_RATE_INR} INR
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Buyer PI Selling Revenue</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                      ${totalPiSalesUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginLeft: '6px' }}>
                        (~₹{totalPiSalesInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supplier Purchase Cost</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isLoss ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                    </div>
                  </div>
                </div>

                {isLoss ? (
                  <div style={{ fontSize: '0.84rem', color: '#7f1d1d', marginTop: '2px', fontWeight: 600, lineHeight: 1.5 }}>
                    ⚠️ Your Purchase Cost (₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) is higher than your Buyer PI Sales Revenue (~₹{totalPiSalesInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}). You will incur an estimated loss of <strong style={{ textDecoration: 'underline' }}>₹{(totalAmount - totalPiSalesInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> on this order. Please lower unit purchase rates or check quantities!
                  </div>
                ) : (
                  <div style={{ fontSize: '0.84rem', color: '#14532d', marginTop: '2px', fontWeight: 600 }}>
                    ✨ Estimated Profit Margin: <strong>₹{(totalPiSalesInr - totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> ({(((totalPiSalesInr - totalAmount) / totalPiSalesInr) * 100).toFixed(1)}% margin).
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button type="button" className="btn-secondary" onClick={onBack} style={{ flex: 1, margin: 0, justifyContent: 'center' }}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}
            style={{ flex: 1, margin: 0, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saving ? 'Saving…' : isNew ? 'Create PO' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main POs List Page ─────────────────────────────────────────────────────────
function POs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'gate-entry' ? 'gate-entry' : 'pos';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [pos, setPos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  
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
  }, [searchTerm, statusFilter, ordering]);

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
          supervisor: poItem.supervisor || '',
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

  const filteredPOs = pos.filter(p => {
    const matchSearch = !searchTerm ||
      p.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_detail?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const stats = {
    total: pos.length,
    pending: pos.filter(p => p.status === 'Pending').length,
    received: pos.filter(p => p.status === 'Received').length,
    totalValue: pos.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0),
  };

  return (
    <div>
      {/* ── Module Tabs (PO Listing & Gate Entry) ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        gap: '2rem'
      }}>
        <button
          onClick={() => { setActiveTab('pos'); setSearchParams({}); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pos' ? '3px solid #14b8a6' : '3px solid transparent',
            color: activeTab === 'pos' ? '#14b8a6' : 'var(--text-muted)',
            fontWeight: activeTab === 'pos' ? 600 : 500,
            padding: '0.75rem 0.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={18} /> Purchase Orders Listing
        </button>

        <button
          onClick={() => { setActiveTab('gate-entry'); setSearchParams({ tab: 'gate-entry' }); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'gate-entry' ? '3px solid #14b8a6' : '3px solid transparent',
            color: activeTab === 'gate-entry' ? '#14b8a6' : 'var(--text-muted)',
            fontWeight: activeTab === 'gate-entry' ? 600 : 500,
            padding: '0.75rem 0.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ClipboardCheck size={18} /> Gate Entry & Material Receiving
        </button>
      </div>

      {activeTab === 'gate-entry' ? (
        <GateEntry />
      ) : (
        <>
          <style>{`
            @media (max-width: 768px) {
              .po-header-actions {
                width: 100% !important;
                margin-top: 0.5rem !important;
              }
              .po-header-actions button {
                width: 100% !important;
                justify-content: center !important;
              }
              .po-stat-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 0.75rem !important;
              }
              .po-filter-bar-inner {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 0.65rem !important;
              }
              .po-search-wrap {
                width: 100% !important;
                max-width: 100% !important;
                flex: none !important;
              }
              .po-search-wrap input {
                height: 42px !important;
                max-height: 42px !important;
                box-sizing: border-box !important;
                border-radius: 10px !important;
              }
              .po-filters-wrap {
                width: 100% !important;
                flex-direction: column !important;
                gap: 0.5rem !important;
              }
              .po-filter-item {
                width: 100% !important;
                justify-content: space-between !important;
              }
              .po-filter-item > div {
                flex: 1 !important;
                width: auto !important;
              }
            }
          `}</style>

          {/* ── Page Header ── */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '0 0.5rem 1rem' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={28} color="#8b5a2b" style={{ flexShrink: 0 }} /> Purchase Orders & Gate Entry
              </h2>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Supplier POs, material receipts, and quality check inspection
              </p>
            </div>
            <div className="po-header-actions">
              <button className="btn-primary" onClick={() => navigate('/pos/new')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#8b5a2b', borderRadius: '10px' }}>
                <Plus size={16}/> Create New PO
              </button>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="po-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total POs', value: stats.total, color: '#8b5a2b', bg: '#8b5a2b15' },
              { label: 'Pending', value: stats.pending, color: '#d97706', bg: '#fef3c7' },
              { label: 'Received', value: stats.received, color: '#1d4ed8', bg: '#dbeafe' },
              { label: 'Total Value', value: `₹${stats.totalValue.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, color: '#8b5a2b', bg: '#8b5a2b15' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1rem 1.25rem', border: `1px solid ${card.color}22` }}>
                <div style={{ fontSize: '0.75rem', color: card.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color, marginTop: '4px' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* ── Filter Bar ── */}
          <div className="filter-bar">
            <div className="filter-bar-inner po-filter-bar-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="po-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 260px', minWidth: '200px', maxWidth: '380px' }}>
                <Search size={15} className="filter-icon"/>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search by PO number or supplier..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ flex: 1, height: '42px', boxSizing: 'border-box', borderRadius: '10px' }}
                />
              </div>

              <div className="po-filters-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="po-filter-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="filter-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: '#8b5a2b', whiteSpace: 'nowrap' }}>STATUS:</span>
                  <div style={{ width: '165px' }}>
                    <StatusSelect
                      options={PO_STATUS_OPTIONS}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      placeholder="All Statuses"
                    />
                  </div>
                </div>

                <div className="po-filter-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="filter-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: '#8b5a2b', whiteSpace: 'nowrap' }}>ORDER BY:</span>
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
          </div>

          {/* ── Desktop Table & Mobile Cards ── */}
          <div className="po-desktop-table">
            <div className="table-container">
              <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>PO Date</th>
                  <th>Due Date</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} cols={8} hasImage={false} />
                ) : filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                      <div style={{ fontWeight: 600 }}>No Purchase Orders found</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {searchTerm || statusFilter ? 'Try adjusting your filters.' : 'Create your first PO to get started.'}
                      </div>
                    </td>
                  </tr>
                ) : filteredPOs.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/pos/${p.id}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="smooth-fade-in"
                    title="Click to view/edit"
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#8b5a2b15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={15} color="#8b5a2b"/>
                        </div>
                        <strong>{p.po_number}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.supplier_detail?.name || '—'}</div>
                      {p.supplier_detail?.state_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.supplier_detail.state_name}</div>
                      )}
                    </td>
                    <td>{p.po_date ? new Date(p.po_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td>{p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td>
                      <span style={{ background: '#f1f5f9', borderRadius: '999px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {(p.items || []).length} item{(p.items || []).length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#8b5a2b' }}>{fmtINR(p.total_amount)}</td>
                    <td><StatusBadge status={p.status}/></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#14b8a6', borderColor: '#ccfbf1' }}
                          onClick={e => { e.stopPropagation(); navigate(`/gate-entry/${p.id}`); }}
                          title="Record Gate Entry QC Inspection"
                        >
                          <ClipboardCheck size={13}/> Gate Entry
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={e => { e.stopPropagation(); navigate(`/pos/${p.id}`); }}
                        >
                          <Eye size={13}/> Edit
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                          onClick={e => handleDownloadPDF(p, e)}
                          disabled={downloading === p.id}
                          title="Download PDF"
                        >
                          <Download size={13}/> {downloading === p.id ? '…' : 'PDF'}
                        </button>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '0.3rem 0.7rem',
                            fontSize: '0.78rem',
                            color: p.status === 'Cancelled' ? '#94a3b8' : '#d97706',
                            borderColor: p.status === 'Cancelled' ? '#e2e8f0' : '#fde68a',
                            backgroundColor: p.status === 'Cancelled' ? '#f8fafc' : '#fffbeb',
                            cursor: p.status === 'Cancelled' ? 'not-allowed' : 'pointer'
                          }}
                          onClick={e => handleCancelPO(p, e)}
                          disabled={p.status === 'Cancelled'}
                          title={p.status === 'Cancelled' ? 'PO is already cancelled' : 'Cancel Purchase Order'}
                        >
                          {p.status === 'Cancelled' ? 'Cancelled' : 'Cancel PO'}
                        </button>
                      </div>
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
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontWeight: 600 }}>No Purchase Orders found</div>
          </div>
        ) : filteredPOs.map(p => (
          <div className="po-mobile-card" key={p.id} onClick={() => navigate(`/pos/${p.id}`)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#f5ede3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={24} color="#8b5a2b"/>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem', marginBottom: '0.2rem' }}>{p.po_number}</div>
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
        ))}
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
        </>
      )}
    </div>
  );
}

export default POs;
