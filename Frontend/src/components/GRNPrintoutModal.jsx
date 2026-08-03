import React, { useRef } from 'react';
import { Printer, X, FileText, CheckCircle2, AlertTriangle, Truck, Clock, ShieldCheck } from 'lucide-react';
import pinkcityLogo from "../assets/pinkcity_logo.png";
import { fmtQty } from '../utils/formatters';

export default function GRNPrintoutModal({ receipt, onClose }) {
  const printRef = useRef();

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const po = receipt.supplier_po || {};
  const supplier = po.supplier_detail || po.supplier || {};
  const item = receipt.po_item || {};

  const totalOrdered = parseFloat(receipt.item_progress?.ordered_qty || item.quantity || 0);
  const prevReceived = parseFloat(receipt.item_progress?.prev_received_qty || 0);
  const currBatch = parseFloat(receipt.received_qty || (receipt.passed_qty + receipt.rejected_qty) || 0);
  const passedQty = parseFloat(receipt.passed_qty || 0);
  const rejectedQty = parseFloat(receipt.rejected_qty || 0);
  const cumReceived = prevReceived + currBatch;
  const remBalance = Math.max(0, totalOrdered - cumReceived);
  const completionPct = totalOrdered > 0 ? Math.round((cumReceived / totalOrdered) * 100) : 0;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content printable-modal-content"
        style={{ 
          maxWidth: '900px', 
          width: '95%', 
          maxHeight: '92vh', 
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '0',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
        }}
      >
        {/* Top Screen Toolbar (Hidden during print) */}
        <div 
          className="no-print"
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            backgroundColor: '#059669',
            color: '#ffffff',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={22} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Goods Received Note (GRN) — {receipt.grn_number || 'Voucher'}
              </h3>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Delivery Round #{receipt.round_number || 1} • {receipt.receipt_date || 'N/A'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#ffffff',
                color: '#059669',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.88rem'
              }}
            >
              <Printer size={16} />
              <span>Print GRN</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div ref={printRef} className="printable-grn-document" style={{ padding: '2rem 2.5rem', backgroundColor: '#ffffff', color: '#1e293b' }}>
          
          {/* Header Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #059669', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src={pinkcityLogo} alt="Pinkcity Logo" style={{ height: '54px', objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
                  PINKCITY ENTERPRISES
                </h1>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                  G-78, EPIP, Sitapura Industrial Area, Tonk Road, Jaipur-302022 Rajasthan, India
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  GSTIN/UIN: 08ABXPS4077R1Z8 | Email: info@pinkcity.com
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                display: 'inline-block', 
                backgroundColor: '#ecfdf5', 
                color: '#059669', 
                border: '1.5px solid #a7f3d0', 
                padding: '0.35rem 0.85rem', 
                borderRadius: '8px', 
                fontWeight: 800, 
                fontSize: '0.95rem' 
              }}>
                GOODS RECEIVED NOTE (GRN)
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
                {receipt.grn_number || `GRN-${po.po_number || '001'}-R${receipt.round_number || 1}`}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                Delivery Round #{receipt.round_number || 1}
              </div>
            </div>
          </div>

          {/* Info Grid (Supplier vs PO & Shipment details) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Supplier Box */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                SUPPLIER DETAILS
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                {supplier.name || receipt.supplier_name_str || 'N/A'}
              </div>
              {supplier.address && (
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px', lineHeight: 1.3 }}>
                  {supplier.address}
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                <strong>GSTIN:</strong> {supplier.gstin || 'N/A'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                <strong>Phone:</strong> {supplier.phone || 'N/A'}
              </div>
            </div>

            {/* PO & Inward Truck Details */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                PURCHASE ORDER & SHIPMENT DETAILS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>PO Number:</span>
                  <div style={{ fontWeight: 800, color: '#059669' }}>{po.po_number || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>GRN Date:</span>
                  <div style={{ fontWeight: 700 }}>{receipt.receipt_date || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Supplier Inv / Challan #:</span>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{receipt.supplier_invoice_no || receipt.challan_no || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Inv Date:</span>
                  <div style={{ fontWeight: 700 }}>{receipt.supplier_invoice_date || receipt.receipt_date || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Vehicle / Truck #:</span>
                  <div style={{ fontWeight: 700 }}>{receipt.vehicle_no || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Inspected By:</span>
                  <div style={{ fontWeight: 700 }}>{receipt.inspected_by_name || 'QC Supervisor'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Line Item Receiving & Progress Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>BATCH RECEIVING & OUTSTANDING PROGRESS</span>
              <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                GRN Delivery Round #{receipt.round_number || 1}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#059669', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>DESCRIPTION OF GOODS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>ORDERED QTY</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', backgroundColor: '#047857' }}>THIS BATCH</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', backgroundColor: '#16a34a' }}>PASSED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', backgroundColor: '#dc2626' }}>REJECTED</th>
                </tr>
              </thead>
              <tbody>
                {(receipt.batch_items || [receipt]).map((rcptItem, idx) => {
                  const itDesc = rcptItem.po_item_description || rcptItem.po_item?.description || 'Raw Material Item';
                  const unitStr = rcptItem.po_item_unit || rcptItem.po_item?.unit || 'pcs';
                  const totOrd = parseFloat(rcptItem.item_progress?.ordered_qty || rcptItem.po_item?.quantity || 0);
                  const pQty = parseFloat(rcptItem.passed_qty || 0);
                  const rQty = parseFloat(rcptItem.rejected_qty || 0);
                  const cBatch = parseFloat(rcptItem.received_qty || (pQty + rQty) || 0);

                  return (
                    <tr key={rcptItem.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b' }}>
                          {itDesc}
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                        {totOrd > 0 ? `${fmtQty(totOrd)} ${unitStr}` : '—'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, backgroundColor: '#ecfdf5', color: '#047857' }}>
                        {fmtQty(cBatch)} {unitStr}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4' }}>
                        {fmtQty(pQty)} {unitStr}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#dc2626', backgroundColor: '#fef2f2' }}>
                        {fmtQty(rQty)} {unitStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rejection / Notes Alert Box (If any) */}
          {rejectedQty > 0 && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontWeight: 800, fontSize: '0.85rem', marginBottom: '4px' }}>
                <AlertTriangle size={16} />
                <span>REJECTED GOODS NOTICE ({fmtQty(rejectedQty)} pcs)</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#991b1b', lineHeight: 1.4 }}>
                A GST Debit Note has been automatically generated for {fmtQty(rejectedQty)} rejected piece(s) in this batch as per E-Way Bill limit regulations. Returned items are held for supplier repair or replacement.
              </div>
            </div>
          )}

          {receipt.notes && (
            <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
              <strong>Quality Inspection Notes:</strong> {receipt.notes}
            </div>
          )}

          {/* Signature Footer Block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '3rem', paddingTop: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px dashed #94a3b8', height: '40px', marginBottom: '6px' }} />
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Inspected By (QC)</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{receipt.inspected_by_name || 'QC Inspector'}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px dashed #94a3b8', height: '40px', marginBottom: '6px' }} />
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Received By (Store Keeper)</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Main Store Raw Yard</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px dashed #94a3b8', height: '40px', marginBottom: '6px' }} />
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669' }}>For Pinkcity Enterprises</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Authorized Signatory</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
