import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import pinkcityLogo from '../assets/pinkcity_logo.png';

export default function DebitNotePrintout({ debitNote, onClose }) {
  if (!debitNote) return null;

  const handlePrint = () => {
    window.print();
  };

  const qtyVal = parseFloat(debitNote.rejected_qty || 0);
  const rateVal = parseFloat(debitNote.rate || 0);
  const subtotalVal = parseFloat(debitNote.subtotal_amount || (qtyVal * rateVal));
  
  const cartageVal = parseFloat(debitNote.cartage_gst_amount || (subtotalVal * 0.18));
  const cgstVal = parseFloat(debitNote.cgst_amount || (subtotalVal * 0.09));
  const sgstVal = parseFloat(debitNote.sgst_amount || (subtotalVal * 0.09));
  const roundOffVal = parseFloat(debitNote.round_off || 0);
  const totalVal = parseFloat(debitNote.total_amount || (subtotalVal + cartageVal + cgstVal + sgstVal));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(4px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #debit-note-printable, #debit-note-printable * {
            visibility: visible;
          }
          #debit-note-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        padding: '1.5rem',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Action Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
            📄 Tally Debit Note Print Preview
          </h3>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.1rem',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={16} /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.55rem', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Debit Note Document Box (Matches Attached Reference Image) ── */}
        <div id="debit-note-printable" style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #1e293b',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: 1.4,
          padding: '0',
          boxSizing: 'border-box'
        }}>
          {/* Header Row */}
          <div style={{ textAlign: 'center', position: 'relative', borderBottom: '1px solid #000', padding: '6px 12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Debit Note</span>
            <span style={{ position: 'absolute', right: '12px', top: '6px', fontSize: '11px', fontStyle: 'italic', fontWeight: 'bold' }}>
              (ORIGINAL FOR RECIPIENT)
            </span>
          </div>

          {/* Company Info & Document Info Top Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000' }}>
            {/* Left: Pinkcity Company Box */}
            <div style={{ padding: '8px', borderRight: '1px solid #000' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <img src={pinkcityLogo} alt="Pinkcity Logo" style={{ height: '36px', objectFit: 'contain' }} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
                    PINKCITY ENTERPRISES
                  </div>
                  <div style={{ fontSize: '11px' }}>G-78, EPIP, Indl. Area Sitapura, JAIPUR</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.3 }}>
                <div>IEC CODE : 1397002620</div>
                <div>GSTIN/UIN: 08ABXPS4077R1Z8</div>
                <div>State Name : Rajasthan, Code : 08</div>
                <div>E-Mail : raju@pinkcityfurniture.com</div>
              </div>
            </div>

            {/* Right: Voucher Info Box */}
            <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#444' }}>Debit Note No.</div>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{debitNote.vch_no || 'DN/26-27/0114'}</div>
                <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>Original Invoice No. & Date</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                  {debitNote.original_inv_no || '163'} dt. {debitNote.original_inv_date || '10-Jun-26'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#444' }}>Dated</div>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{debitNote.vch_date || '18-Jul-26'}</div>
                <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>Other References</div>
              </div>
            </div>
          </div>

          {/* Buyer (Bill to) Box */}
          <div style={{ padding: '8px', borderBottom: '1px solid #000' }}>
            <div style={{ fontSize: '10px', color: '#444' }}>Buyer (Bill to)</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', marginBottom: '2px' }}>
              {debitNote.supplier_name_str || (debitNote.supplier ? debitNote.supplier.name : 'RUNDLA INDUSTRIES')}
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.3 }}>
              <div>H-1012 Road No. 14, V.K.I. Area, Jaipur</div>
              <div>GSTIN/UIN : {debitNote.supplier_gstin_str || '08DNKPK3004E1ZB'}</div>
              <div>State Name : Rajasthan, Code : 08</div>
            </div>
          </div>

          {/* Line Items & Tax Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#fafafa' }}>
                <th style={{ padding: '6px 4px', borderRight: '1px solid #000', width: '35px', textAlign: 'center' }}>Sl No.</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'left' }}>Description of Goods and Services</th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', width: '85px', textAlign: 'center' }}>HSN/SAC</th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', width: '65px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', width: '75px', textAlign: 'right' }}>Rate</th>
                <th style={{ padding: '6px 4px', borderRight: '1px solid #000', width: '40px', textAlign: 'center' }}>per</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: '90px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ minHeight: '180px', verticalAlign: 'top' }}>
                <td style={{ padding: '8px 4px', borderRight: '1px solid #000', textAlign: 'center' }}>1</td>
                <td style={{ padding: '8px 8px', borderRight: '1px solid #000' }}>
                  <div style={{ fontWeight: 'bold' }}>{debitNote.item_description || '2504-129-62 - Walnut Small Mirror, 51x76x6cm, Mango / MDF / Mirror'}</div>
                  
                  <div style={{ marginTop: '20px', paddingLeft: '40px', fontSize: '10.5px', fontStyle: 'italic' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>PUR. CARTAGE GST @ 18%</span>
                      <span>3 %</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>INPUT CGST 9%</span>
                      <span>9 %</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>INPUT SGST 9%</span>
                      <span>9 %</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Less : ROUND OFF</span>
                      <span></span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #000', textAlign: 'center' }}>{debitNote.hsn_sac || '70099200'}</td>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>{qtyVal} {debitNote.unit || 'No.'}</td>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #000', textAlign: 'right' }}>{rateVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '8px 4px', borderRight: '1px solid #000', textAlign: 'center' }}>{debitNote.unit || 'No.'}</td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>{subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: '10.5px', lineHeight: 1.4, fontStyle: 'italic' }}>
                    <div>{cartageVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div>{cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div>{sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div>({roundOffVal >= 0 ? '-' : '+'}){Math.abs(roundOffVal).toFixed(2)}</div>
                  </div>
                </td>
              </tr>

              {/* Subtotal Row */}
              <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                <td colSpan="3" style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>Total</td>
                <td style={{ padding: '6px 6px', borderRight: '1px solid #000', textAlign: 'right' }}>{qtyVal} {debitNote.unit || 'No.'}</td>
                <td colSpan="2" style={{ padding: '6px 6px', borderRight: '1px solid #000' }}></td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: '12px' }}>₹ {totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount In Words & Remarks Footer */}
          <div style={{ padding: '8px', borderBottom: '1px solid #000' }}>
            <div style={{ fontSize: '10px', color: '#444' }}>Amount Chargeable (in words)</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '8px' }}>
              {debitNote.amount_in_words || 'INR Four Thousand Three Hundred Seventy Five Only'}
            </div>

            <div style={{ fontSize: '10px', color: '#444' }}>Remarks:</div>
            <div style={{ fontStyle: 'italic', fontSize: '10.5px', fontWeight: 'bold' }}>
              {debitNote.remarks || `BEING AMOUNT DEBITED GOODS RETURN FURNITURE ITEM AS PER BILL NO. ${debitNote.original_inv_no || '163'} DATE 10-06-2026`}
            </div>
          </div>

          {/* PAN & Signatory Bottom Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '65px' }}>
            <div style={{ padding: '8px', borderRight: '1px solid #000', fontSize: '11px' }}>
              <span style={{ color: '#444' }}>Company's PAN : </span>
              <strong style={{ marginLeft: '10px' }}>{debitNote.company_pan || 'ABXPS4077R'}</strong>
            </div>

            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>for PINKCITY ENTERPRISES</div>
              <div style={{ fontSize: '10.5px', color: '#444' }}>Authorised Signatory</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', borderTop: '1px solid #000', padding: '4px', fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
            This is a Computer Generated Document
          </div>
        </div>

      </div>
    </div>
  );
}
