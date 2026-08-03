import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { fmtQty } from '../utils/formatters';
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

export default function TaxInvoiceEntryModal({ isOpen, onClose, onSaved }) {
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
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.get('/suppliers/').then(res => setSuppliers(res.data.results || res.data)).catch(console.error);
    }
  }, [isOpen]);

  // When supplier changes, fetch their POs and update cartage default rate/ledger
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

  // Add line item from a PO
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

  // Totals calculation
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
      
      // Check if any rejected pieces exist -> create 2-Day Grace Period Debit Note draft
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

      onSaved();
      onClose();
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving tax invoice:', err.response?.data || err);
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: 950, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <FileText color="#8b5a2b" size={24}/> Record Supplier Tax Invoice (Multi-PO Dispatch)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Record inward truck shipments fulfilling items across multiple POs from the same supplier.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 0 0 0' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Supplier Selection */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 800, color: '#334155' }}>Select Supplier (Bill From) *</label>
            <select
              className="form-input"
              value={selectedSupplierId}
              onChange={e => handleSupplierChange(e.target.value)}
              style={{ fontWeight: 600, fontSize: '0.95rem' }}
              required
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.state_name || 'No State'})</option>
              ))}
            </select>
          </div>

          {/* Invoice Header Details */}
          <div className="form-grid-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Invoice No. *</label>
              <input required type="text" className="form-input" placeholder="e.g. 47"
                value={header.invoice_no} onChange={e => setHeader({...header, invoice_no: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Date *</label>
              <input required type="date" className="form-input"
                value={header.invoice_date} onChange={e => setHeader({...header, invoice_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Note</label>
              <input type="text" className="form-input" placeholder="e.g. 47"
                value={header.delivery_note} onChange={e => setHeader({...header, delivery_note: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Despatch Document No.</label>
              <input type="text" className="form-input" placeholder="e.g. PL/03948"
                value={header.despatch_document_no} onChange={e => setHeader({...header, despatch_document_no: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Despatched Through</label>
              <input type="text" className="form-input" placeholder="e.g. Truck RJ-14-1234"
                value={header.despatched_through} onChange={e => setHeader({...header, despatched_through: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Destination</label>
              <input type="text" className="form-input" placeholder="e.g. Sitapura Jaipur"
                value={header.destination} onChange={e => setHeader({...header, destination: e.target.value})} />
            </div>
          </div>

          {/* Available Supplier PO Items Selector */}
          {selectedSupplierId && (
            <div style={{ background: '#fcfaf6', border: '1.5px dashed #d6c7b2', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#8b5a2b', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Truck size={16}/> Select Line Items From Open POs for {suppliers.find(s => s.id === selectedSupplierId)?.name}:
              </h4>
              {loadingPOs ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading POs...</div>
              ) : supplierPOs.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No open POs found for this supplier.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {supplierPOs.map(po => (
                    <div key={po.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        📋 {po.po_number} (Dated: {po.po_date})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(po.items || []).map(it => {
                          const isAdded = items.some(i => i.po_item_id === it.id);
                          return (
                            <button
                              key={it.id}
                              type="button"
                              disabled={isAdded}
                              onClick={() => handleAddPOItem(po, it)}
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                border: isAdded ? '1px solid #cbd5e1' : '1px solid #8b5a2b',
                                background: isAdded ? '#f1f5f9' : '#fff8f0',
                                color: isAdded ? '#94a3b8' : '#8b5a2b',
                                fontWeight: 600,
                                cursor: isAdded ? 'default' : 'pointer'
                              }}
                            >
                              {isAdded ? '✓ Added' : `+ Add: ${it.description} (${fmtQty(it.quantity, it.unit)} ${it.unit})`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Invoice Items Table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              📦 Invoice Line Items ({items.length})
            </h4>
            <div className="table-container">
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>PO Ref</th>
                    <th>HSN/SAC</th>
                    <th>Description</th>
                    <th>Shipped Qty</th>
                    <th>Unit</th>
                    <th>Rate (₹)</th>
                    <th>Disc %</th>
                    <th>Taxable Amount (₹)</th>
                    <th>QC Rejected Qty</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                        Click "+ Add" on items above to include them in this Tax Invoice.
                      </td>
                    </tr>
                  ) : items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#8b5a2b' }}>{it.po_number}</td>
                      <td>
                        <input type="text" className="form-input" style={{ padding: '4px', fontSize: '0.8rem', width: '65px' }}
                          value={it.hsn_sac} onChange={e => updateItem(idx, 'hsn_sac', e.target.value)} />
                      </td>
                      <td>
                        <input type="text" className="form-input" style={{ padding: '4px', fontSize: '0.8rem', minWidth: '150px' }}
                          value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" step="any" min="0" className="form-input" style={{ padding: '4px', fontSize: '0.8rem', width: '75px', fontWeight: 700 }}
                          value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                      </td>
                      <td>
                        <select className="form-input" style={{ padding: '4px', fontSize: '0.8rem', width: '65px' }}
                          value={it.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}>
                          <option value="pcs">pcs</option>
                          <option value="ft²">ft²</option>
                          <option value="mtr">mtr</option>
                          <option value="kgs">kgs</option>
                        </select>
                      </td>
                      <td>
                        <input type="number" step="0.01" min="0" className="form-input" style={{ padding: '4px', fontSize: '0.8rem', width: '80px' }}
                          value={it.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" step="0.01" min="0" max="100" className="form-input" style={{ padding: '4px', fontSize: '0.8rem', width: '55px' }}
                          value={it.discount_pct} onChange={e => updateItem(idx, 'discount_pct', e.target.value)} />
                      </td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{parseFloat(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <input type="number" step="any" min="0" className="form-input" style={{ padding: '4px', fontSize: '0.8rem', width: '70px', borderColor: parseFloat(it.rejected_qty) > 0 ? '#dc2626' : '#cbd5e1', color: parseFloat(it.rejected_qty) > 0 ? '#dc2626' : '#334155', fontWeight: 700 }}
                          value={it.rejected_qty} onChange={e => updateItem(idx, 'rejected_qty', e.target.value)} />
                      </td>
                      <td>
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartage & Dynamic Tax Summary Box */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Cartage / Freight Ledger</label>
                <input type="text" className="form-input" style={{ fontSize: '0.85rem' }}
                  value={header.cartage_ledger_name} onChange={e => setHeader({...header, cartage_ledger_name: e.target.value})} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Cartage Amount (₹)</label>
                <input type="number" step="0.01" min="0" className="form-input" style={{ fontSize: '0.85rem' }}
                  value={header.cartage_amount} onChange={e => setHeader({...header, cartage_amount: e.target.value})} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Cartage GST Rate (%)</label>
                <input type="number" step="0.01" min="0" className="form-input" style={{ fontSize: '0.85rem' }}
                  value={header.cartage_gst_rate} onChange={e => setHeader({...header, cartage_gst_rate: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Subtotal: <strong>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> | CGST (9%): <strong>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> | SGST (9%): <strong>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#8b5a2b' }}>
                Net Total Invoice: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving Inward Shipment...' : '✓ Record Tax Invoice Inward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
