import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { fmtQty } from '../utils/formatters';
import {
  FileText, ArrowLeft, Plus, Trash2, CheckCircle2, Truck,
  Calculator, ChevronRight, X, Building2, Download
} from 'lucide-react';

function extractErrorMessage(err, defaultMsg = 'Failed to save Supplier Tax Invoice.') {
  if (!err.response || !err.response.data) {
    return err.message || defaultMsg;
  }
  const data = err.response.data;
  if (typeof data === 'string') {
    if (data.trim().startsWith('<')) {
      return `${defaultMsg} (Server Error ${err.response.status || 500})`;
    }
    return data;
  }
  if (data.detail) return data.detail;

  const messages = [];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      value.forEach((v, idx) => {
        if (typeof v === 'string') {
          messages.push(`${key}: ${v}`);
        } else if (typeof v === 'object' && v !== null) {
          for (const [subKey, subVal] of Object.entries(v)) {
            const subMsg = Array.isArray(subVal) ? subVal.join(', ') : String(subVal);
            messages.push(`${key} (Item ${idx + 1}) -> ${subKey}: ${subMsg}`);
          }
        }
      });
    } else if (typeof value === 'string') {
      messages.push(`${key}: ${value}`);
    }
  }

  return messages.length > 0 ? messages.join(' | ') : defaultMsg;
}

export default function RecordTaxInvoice() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [supplierPOs, setSupplierPOs] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  
  const [header, setHeader] = useState({
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    delivery_note: '',
    despatch_document_no: '',
    despatched_through: '',
    destination: '',
    cartage_ledger_name: 'PUR. CARTAGE GST @ 18% -  3 %',
    cartage_gst_rate: 18.00,
    cartage_amount: '0.00',
    remarks: '',
  });

  const [items, setItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/suppliers/').then(res => setSuppliers(res.data.results || res.data)).catch(console.error);
  }, []);

  const handleSupplierChange = (supId) => {
    setSelectedSupplierId(supId);
    setItems([]);
    if (!supId) {
      setSupplierPOs([]);
      return;
    }

    const supObj = suppliers.find(s => s.id === supId);
    if (supObj) {
      setHeader(prev => ({
        ...prev,
        cartage_gst_rate: supObj.cartage_gst_rate || 18.00,
        cartage_ledger_name: supObj.cartage_ledger_name || 'PUR. CARTAGE GST @ 18% -  3 %',
      }));
    }

    setLoadingPOs(true);
    api.get(`/supplier-pos/?supplier=${supId}&nopage=true`)
      .then(res => {
        const posData = res.data.results || res.data || [];
        setSupplierPOs(posData.filter(p => p.status !== 'Cancelled'));
      })
      .catch(console.error)
      .finally(() => setLoadingPOs(false));
  };

  const handleAddPOItem = (po, poItem) => {
    const exists = items.some(it => it.po_item_id === poItem.id);
    if (exists) return;

    setItems(prev => [
      ...prev,
      {
        supplier_po: po.id,
        po_number: po.po_number,
        po_item_id: poItem.id,
        hsn_sac: '9403',
        description: poItem.description || `Item from ${po.po_number}`,
        quantity: String(poItem.quantity || '1'),
        unit: poItem.unit || 'pcs',
        rate: String(poItem.rate || '0.00'),
        discount_pct: '0.00',
        amount: String(poItem.amount || '0.00'),
        rejected_qty: '0',
      }
    ]);
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };

      const q = parseFloat(next[idx].quantity) || 0;
      const r = parseFloat(next[idx].rate) || 0;
      const disc = parseFloat(next[idx].discount_pct) || 0;
      const sub = q * r;
      next[idx].amount = (sub - (sub * disc / 100)).toFixed(2);

      return next;
    });
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  // Tax calculations
  const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
  const cartageVal = parseFloat(header.cartage_amount) || 0;
  const cartageGstPct = parseFloat(header.cartage_gst_rate) || 18.0;

  const totalTaxable = subtotal + cartageVal;
  const cgst = (totalTaxable * 0.09);
  const sgst = (totalTaxable * 0.09);
  const totalAmount = totalTaxable + cgst + sgst;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setError('Please select a Supplier.');
      return;
    }
    if (!header.invoice_no) {
      setError('Please enter Supplier Invoice Number.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least 1 PO line item to this Tax Invoice.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      ...header,
      supplier: selectedSupplierId,
      subtotal_amount: subtotal.toFixed(2),
      cgst_amount: cgst.toFixed(2),
      sgst_amount: sgst.toFixed(2),
      total_amount: totalAmount.toFixed(2),
      items: items.map(it => ({
        supplier_po: it.supplier_po,
        po_item: it.po_item_id,
        hsn_sac: it.hsn_sac,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        rate: it.rate,
        discount_pct: it.discount_pct,
        amount: it.amount,
        rejected_quantity: it.rejected_qty || 0,
        passed_quantity: Math.max(0, (parseFloat(it.quantity) || 0) - (parseFloat(it.rejected_qty) || 0)),
      }))
    };

    try {
      const res = await api.post('/supplier-tax-invoices/', payload);

      // Handle rejections 2-day repair grace period
      const hasRejections = items.some(it => parseFloat(it.rejected_qty) > 0);
      if (hasRejections) {
        const rejectedItems = items.filter(it => parseFloat(it.rejected_qty) > 0);
        const dnNo = `DN-${header.invoice_no}-${Date.now().toString().slice(-4)}`;
        const graceEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

        await api.post('/supplier-debit-notes/', {
          vch_no: dnNo,
          supplier: selectedSupplierId,
          tax_invoice: res.data.id,
          original_inv_no: header.invoice_no,
          original_inv_date: header.invoice_date,
          status: 'Grace Period',
          holding_until: graceEnd,
          item_description: rejectedItems.map(it => `${it.description} (${fmtQty(it.rejected_qty, it.unit)} ${it.unit} rejected)`).join(', '),
          rejected_qty: rejectedItems.reduce((acc, it) => acc + (parseFloat(it.rejected_qty) || 0), 0),
          unit: rejectedItems[0]?.unit || 'pcs',
          rate: rejectedItems[0]?.rate || 0,
          total_amount: rejectedItems.reduce((acc, it) => acc + ((parseFloat(it.rejected_qty) || 0) * (parseFloat(it.rate) || 0)), 0).toFixed(2),
          remarks: 'Automated 2-Day Supplier Repair Grace Period created from Tax Invoice QC rejections.'
        });
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/vendor-management');
      }, 1200);
    } catch (err) {
      console.error('Error saving tax invoice:', err.response?.data || err);
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddItemModal = () => {
    if (!selectedSupplierId) {
      setError('Please select a Supplier (Bill From) first to view open PO line items.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    setShowAddItemModal(true);
  };

  const selectedSupplierObj = suppliers.find(s => s.id === selectedSupplierId);

  return (
    <div className="page-container" style={{ padding: '1.5rem 2rem', backgroundColor: '#fcfaf7', minHeight: '100vh' }}>
      {/* ── Top Navigation & Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/vendor-management')}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#ffffff',
            color: '#475569',
            borderColor: '#cbd5e1',
            fontWeight: 600,
            padding: '0.45rem 0.9rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16}/> Back to Vendor Management
        </button>

        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <FileText color="#8b5a2b" size={30}/> Record Supplier Tax Invoice (Multi-PO Dispatch)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Record inward truck shipments fulfilling items across multiple POs from the same supplier.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.85rem 1.2rem', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '1.25rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.85rem 1.2rem', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={20}/> Tax Invoice Inward recorded successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── CARD 1: Invoice & Dispatch Details ── */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1.25rem 0' }}>
            Invoice & Dispatch Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Select Supplier (Bill From) *</label>
              <select
                className="form-input"
                value={selectedSupplierId}
                onChange={e => handleSupplierChange(e.target.value)}
                style={{ fontWeight: 600, height: '42px', borderColor: !selectedSupplierId && error ? '#dc2626' : undefined }}
                required
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.state_name || 'No State'})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Invoice No. *</label>
              <input required type="text" className="form-input" placeholder="e.g. 47" style={{ height: '42px' }}
                value={header.invoice_no} onChange={e => setHeader({...header, invoice_no: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Invoice Date *</label>
              <input required type="date" className="form-input" style={{ height: '42px' }}
                value={header.invoice_date} onChange={e => setHeader({...header, invoice_date: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Delivery Note</label>
              <input type="text" className="form-input" placeholder="e.g. 47" style={{ height: '42px' }}
                value={header.delivery_note} onChange={e => setHeader({...header, delivery_note: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Dispatch Document No.</label>
              <input type="text" className="form-input" placeholder="e.g. PL/03948" style={{ height: '42px' }}
                value={header.despatch_document_no} onChange={e => setHeader({...header, despatch_document_no: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Despatched Through</label>
              <input type="text" className="form-input" placeholder="e.g. Truck RJ-14-1234" style={{ height: '42px' }}
                value={header.despatched_through} onChange={e => setHeader({...header, despatched_through: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Destination</label>
              <input type="text" className="form-input" placeholder="e.g. Sitapura Jaipur" style={{ height: '42px' }}
                value={header.destination} onChange={e => setHeader({...header, destination: e.target.value})} />
            </div>
          </div>
        </div>

        {/* ── CARD 2: Invoice Line Items ── */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📦 Invoice Line Items ({items.length})
            </h3>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleOpenAddItemModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #8b5a2b', color: '#8b5a2b', backgroundColor: '#fffcf7', fontWeight: 700, padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <Plus size={16}/> Add Item
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleOpenAddItemModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #d6c7b2', color: '#78350f', backgroundColor: '#ffffff', fontWeight: 700, padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <Download size={16}/> Import Items
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table" style={{ fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#faf6f0' }}>
                  <th style={{ width: '35px' }}>#</th>
                  <th>PO REF</th>
                  <th>HSN / SAC</th>
                  <th>DESCRIPTION</th>
                  <th>SHIPPED QTY</th>
                  <th>UNIT</th>
                  <th>RATE (₹)</th>
                  <th>DISC %</th>
                  <th>TAXABLE AMOUNT (₹)</th>
                  <th>QC REJECTED QTY</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                        <Truck size={28} color="#cbd5e1"/>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#475569' }}>No items added yet</div>
                      <div style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                        Click <strong>"+ Add Item"</strong> to include items from open POs of this supplier.
                      </div>
                    </td>
                  </tr>
                ) : items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#8b5a2b' }}>{it.po_number}</td>
                    <td>
                      <input type="text" className="form-input" style={{ padding: '4px 6px', fontSize: '0.8rem', width: '70px' }}
                        value={it.hsn_sac} onChange={e => updateItem(idx, 'hsn_sac', e.target.value)} />
                    </td>
                    <td>
                      <input type="text" className="form-input" style={{ padding: '4px 6px', fontSize: '0.8rem', minWidth: '160px' }}
                        value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" step="any" min="0" className="form-input" style={{ padding: '4px 6px', fontSize: '0.82rem', width: '80px', fontWeight: 700 }}
                        value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </td>
                    <td>
                      <select className="form-input" style={{ padding: '4px 6px', fontSize: '0.8rem', width: '70px' }}
                        value={it.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}>
                        <option value="pcs">pcs</option>
                        <option value="ft²">ft²</option>
                        <option value="mtr">mtr</option>
                        <option value="kgs">kgs</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" step="0.01" min="0" className="form-input" style={{ padding: '4px 6px', fontSize: '0.8rem', width: '85px' }}
                        value={it.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" step="0.01" min="0" max="100" className="form-input" style={{ padding: '4px 6px', fontSize: '0.8rem', width: '60px' }}
                        value={it.discount_pct} onChange={e => updateItem(idx, 'discount_pct', e.target.value)} />
                    </td>
                    <td style={{ fontWeight: 800, color: '#16a34a' }}>₹{parseFloat(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <input type="number" step="any" min="0" className="form-input" style={{ padding: '4px 6px', fontSize: '0.82rem', width: '75px', borderColor: parseFloat(it.rejected_qty) > 0 ? '#dc2626' : '#cbd5e1', color: parseFloat(it.rejected_qty) > 0 ? '#dc2626' : '#334155', fontWeight: 700 }}
                        value={it.rejected_qty} onChange={e => updateItem(idx, 'rejected_qty', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CARD 3: Cartage / Freight & Taxes ── */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1.25rem 0' }}>
            Cartage / Freight & Taxes
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Cartage / Freight Ledger</label>
                  <input type="text" className="form-input" style={{ height: '42px' }}
                    value={header.cartage_ledger_name} onChange={e => setHeader({...header, cartage_ledger_name: e.target.value})} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Cartage Amount (₹)</label>
                  <input type="number" step="0.01" min="0" className="form-input" style={{ height: '42px' }}
                    value={header.cartage_amount} onChange={e => setHeader({...header, cartage_amount: e.target.value})} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Cartage GST Rate (%)</label>
                  <input type="number" step="0.01" min="0" className="form-input" style={{ height: '42px' }}
                    value={header.cartage_gst_rate} onChange={e => setHeader({...header, cartage_gst_rate: e.target.value})} />
                </div>
              </div>

              {/* Tax Subtotal Summary Bar */}
              <div style={{ backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '0.75rem 1.25rem', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                Subtotal: <strong>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> &nbsp;|&nbsp; CGST (9%): <strong>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> &nbsp;|&nbsp; SGST (9%): <strong>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            {/* Warm Net Total Box */}
            <div style={{ backgroundColor: '#fbf5eb', borderRadius: '16px', border: '1px solid #f3e8d5', padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#8b5a2b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net Total Invoice</div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#78350f', marginTop: '0.2rem' }}>
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Page Footer Actions ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingBottom: '3rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/vendor-management')}
            style={{ padding: '0.65rem 1.8rem', borderRadius: '10px', fontWeight: 700, backgroundColor: '#ffffff', color: '#475569', borderColor: '#cbd5e1' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ padding: '0.65rem 2rem', borderRadius: '10px', fontWeight: 800, backgroundColor: '#8b5a2b', borderColor: '#8b5a2b', fontSize: '0.95rem' }}
          >
            {saving ? 'Recording Inward...' : '✓ Record Tax Invoice Inward'}
          </button>
        </div>
      </form>

      {/* ── Add PO Items Selection Modal Drawer ── */}
      {showAddItemModal && (
        <div className="modal-overlay" onClick={() => setShowAddItemModal(false)}>
          <div className="modal-content" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Select Line Items from Open POs ({selectedSupplierObj?.name})
              </h3>
              <button className="modal-close" onClick={() => setShowAddItemModal(false)}><X size={20}/></button>
            </div>

            <div className="modal-body" style={{ padding: '1rem 0' }}>
              {loadingPOs ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading PO items...</div>
              ) : supplierPOs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No open POs found for this supplier.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {supplierPOs.map(po => (
                    <div key={po.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#8b5a2b', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📋 {po.po_number}</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Dated: {po.po_date}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {(po.items || []).map(it => {
                          const isAdded = items.some(i => i.po_item_id === it.id);
                          return (
                            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                              <div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{it.description}</span>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '8px' }}>
                                  ({fmtQty(it.quantity, it.unit)} {it.unit} @ ₹{it.rate})
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={isAdded}
                                onClick={() => handleAddPOItem(po, it)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  borderRadius: '6px',
                                  border: isAdded ? '1px solid #cbd5e1' : '1px solid #8b5a2b',
                                  background: isAdded ? '#f1f5f9' : '#8b5a2b',
                                  color: isAdded ? '#94a3b8' : '#ffffff',
                                  fontWeight: 700,
                                  cursor: isAdded ? 'default' : 'pointer'
                                }}
                              >
                                {isAdded ? '✓ Added' : '+ Add to Invoice'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn-primary" onClick={() => setShowAddItemModal(false)}>
                Done Selecting Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
