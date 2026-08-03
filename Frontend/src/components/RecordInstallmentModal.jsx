import React, { useState } from 'react';
import { Truck, ArrowLeft, FileText, CheckCircle2, AlertTriangle, Package, Calendar, Camera } from 'lucide-react';
import api from '../api/axios';
import { fmtQty } from '../utils/formatters';

export default function RecordInstallmentModal({ po, onClose, onSaved }) {
  const items = po?.items || [];
  
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Track passed_qty, rejected_qty, remark, defect_file for each line item by item id
  const [itemQuantities, setItemQuantities] = useState(() => {
    const init = {};
    items.forEach(it => {
      init[it.id] = { passed: '', rejected: '', remark: '', defect_file: null };
    });
    return init;
  });

  const handleQtyChange = (itemId, field, val) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: val
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!invoiceNo.trim()) {
      setErrorMsg('Please enter Supplier Invoice / Delivery Challan Number.');
      return;
    }

    // Build payload array for items with > 0 quantity
    const payloadItems = [];
    let totalBatchPcs = 0;

    for (const it of items) {
      const qState = itemQuantities[it.id] || {};
      const passed = parseFloat(qState.passed || 0);
      const rejected = parseFloat(qState.rejected || 0);
      const ordered = parseFloat(it.quantity || 0);
      const prevPassed = parseFloat(it.passed_quantity || 0);
      const remaining = Math.max(0, ordered - prevPassed);

      if (passed < 0 || rejected < 0) {
        setErrorMsg(`Quantities cannot be negative for ${it.description}.`);
        return;
      }

      if (passed + rejected > remaining + 0.001) {
        setErrorMsg(`Total received pcs (${passed + rejected}) exceeds outstanding balance (${remaining}) for ${it.description}.`);
        return;
      }

      if (passed > 0 || rejected > 0) {
        payloadItems.push({
          po_item: it.id,
          passed_qty: passed,
          rejected_qty: rejected,
          remark: qState.remark || ''
        });
        totalBatchPcs += (passed + rejected);
      }
    }

    if (payloadItems.length === 0 || totalBatchPcs <= 0) {
      setErrorMsg('Please enter passed or rejected quantities for at least one item.');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('supplier_invoice_no', invoiceNo.trim());
      formData.append('supplier_invoice_date', invoiceDate);
      formData.append('vehicle_no', vehicleNo.trim());
      formData.append('driver_contact', driverContact.trim());
      formData.append('receipt_date', invoiceDate);
      formData.append('notes', notes.trim());
      formData.append('items', JSON.stringify(payloadItems));

      payloadItems.forEach((pItem, idx) => {
        const qState = itemQuantities[pItem.po_item];
        if (qState && qState.defect_file) {
          formData.append(`defect_image_${pItem.po_item}`, qState.defect_file);
          formData.append(`defect_image_${idx}`, qState.defect_file);
        }
      });

      const res = await api.post(`/supplier-pos/${po.id}/receive-installment/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onSaved(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to save delivery installment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="new-page-form" style={{ padding: '0.5rem 0 2rem' }}>
      
      {/* Top Back Navigation Link */}
      <button 
        type="button"
        onClick={onClose}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          background: 'none', 
          border: 'none', 
          color: '#059669', 
          fontWeight: 700, 
          cursor: 'pointer', 
          marginBottom: '1.25rem', 
          padding: 0, 
          fontSize: '0.95rem' 
        }}
      >
        <ArrowLeft size={18} strokeWidth={2.5} />
        <span>Back to Gate Entry (PO #{po?.po_number})</span>
      </button>

      {/* Main Page Header Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669',
            flexShrink: 0
          }}>
            <Truck size={28} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: '0 0 0.35rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
              Record Delivery Installment / Inward Shipment
            </h1>
            <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
              PO Number: <strong style={{ color: '#059669' }}>{po?.po_number}</strong> • Supplier: <strong style={{ color: '#1e293b' }}>{po?.supplier_detail?.name || 'Supplier'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: '999px', fontWeight: 800, fontSize: '0.85rem' }}>
            Total Items: {items.length}
          </span>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit}>
        
        {errorMsg && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            color: '#991b1b',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Shipment & Invoice Header Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem 1.75rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={18} />
            <span>1. SHIPMENT & INVOICE DETAILS</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                Supplier Invoice / Delivery Challan No. *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. INV-2026-101"
                className="form-input"
                style={{ padding: '0.65rem 0.85rem', fontSize: '0.92rem' }}
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                Invoice / Gate Receipt Date *
              </label>
              <input
                required
                type="date"
                className="form-input"
                style={{ padding: '0.65rem 0.85rem', fontSize: '0.92rem' }}
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                Truck / Vehicle No. (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. RJ-14-GB-9900"
                className="form-input"
                style={{ padding: '0.65rem 0.85rem', fontSize: '0.92rem' }}
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                Driver Contact No. (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                className="form-input"
                style={{ padding: '0.65rem 0.85rem', fontSize: '0.92rem' }}
                value={driverContact}
                onChange={e => setDriverContact(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                QC Notes / Delivery Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Round 1 partial delivery received at Sitapura Main Yard"
                className="form-input"
                style={{ padding: '0.65rem 0.85rem', fontSize: '0.92rem' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Line Items Batch Inspection Table */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem 1.75rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={18} color="#059669" />
              <span>2. PO LINE ITEMS (ENTER RECEIVED PCS FOR THIS SHIPMENT)</span>
            </span>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              Enter passed or rejected quantity per item
            </span>
          </h3>

          <div className="table-responsive" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', width: '50px' }}>#</th>
                  <th style={{ padding: '12px 14px' }}>DESCRIPTION OF GOODS</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>ORDERED</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>PREV PASSED</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>OUTSTANDING</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', width: '160px', backgroundColor: '#ecfdf5', color: '#047857' }}>
                    PASSED (THIS SHIPMENT)
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', width: '160px', backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                    REJECTED (THIS SHIPMENT)
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const ordered = parseFloat(it.quantity || 0);
                  const prevPassed = parseFloat(it.passed_quantity || 0);
                  const remaining = Math.max(0, ordered - prevPassed);
                  const isCompleted = remaining <= 0;
                  const qState = itemQuantities[it.id] || { passed: '', rejected: '', remark: '', defect_file: null };
                  const isRejected = parseFloat(qState.rejected || 0) > 0;

                  return (
                    <React.Fragment key={it.id || idx}>
                      <tr 
                        style={{ 
                          borderBottom: isRejected ? 'none' : '1px solid #f1f5f9', 
                          backgroundColor: isCompleted ? '#f8fafc' : '#ffffff',
                          opacity: isCompleted ? 0.6 : 1
                        }}
                      >
                        <td style={{ padding: '14px', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>{it.description}</div>
                          {it.unit && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Unit: {it.unit}</div>}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>
                          {fmtQty(ordered)} {it.unit || 'pcs'}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                          {fmtQty(prevPassed)} {it.unit || 'pcs'}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: remaining > 0 ? '#ea580c' : '#16a34a' }}>
                          {fmtQty(remaining)} {it.unit || 'pcs'}
                        </td>

                        {/* Passed Input */}
                        <td style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={remaining}
                            disabled={isCompleted}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '2px solid #86efac',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: '#15803d',
                              fontSize: '0.95rem',
                              backgroundColor: '#ffffff'
                            }}
                            value={qState.passed}
                            onChange={e => handleQtyChange(it.id, 'passed', e.target.value)}
                          />
                        </td>

                        {/* Rejected Input */}
                        <td style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: '#fef2f2' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={remaining}
                            disabled={isCompleted}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '2px solid #fca5a5',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: '#b91c1c',
                              fontSize: '0.95rem',
                              backgroundColor: '#ffffff'
                            }}
                            value={qState.rejected}
                            onChange={e => handleQtyChange(it.id, 'rejected', e.target.value)}
                          />
                        </td>
                      </tr>

                      {/* Expandable Defect Remark & Photo Upload Section when Rejected > 0 */}
                      {isRejected && (
                        <tr style={{ backgroundColor: '#fef2f2', borderBottom: '1.5px solid #fca5a5' }}>
                          <td colSpan={7} style={{ padding: '0.85rem 1.25rem 1rem 1.25rem' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <div style={{ flex: 2, minWidth: '240px' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <AlertTriangle size={14} />
                                  <span>DEFECT REASON / REMARK FOR REJECTED PIECES</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Leg hairline crack, polish shade mismatch..."
                                  className="form-input"
                                  style={{ fontSize: '0.88rem', padding: '7px 10px', borderColor: '#fca5a5', backgroundColor: '#ffffff' }}
                                  value={qState.remark || ''}
                                  onChange={e => handleQtyChange(it.id, 'remark', e.target.value)}
                                />
                              </div>

                              <div style={{ flex: 1, minWidth: '220px' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Camera size={14} />
                                  <span>UPLOAD DEFECT PHOTO EVIDENCE</span>
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ fontSize: '0.82rem', padding: '4px 0' }}
                                  onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) handleQtyChange(it.id, 'defect_file', file);
                                  }}
                                />
                                {qState.defect_file && (
                                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
                                    ✓ Selected: {qState.defect_file.name}
                                  </div>
                                )}
                              </div>
                            </div>
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

        {/* Section 3: Bottom Footer Action Bar */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justify: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
        }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '0.65rem 1.5rem', fontWeight: 700, fontSize: '0.9rem' }}
          >
            Cancel & Return
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{
              backgroundColor: '#059669',
              borderColor: '#059669',
              padding: '0.65rem 1.75rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
            }}
          >
            <CheckCircle2 size={20} />
            <span>{saving ? 'Saving Installment…' : 'Save Delivery Round & Generate GRN'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
