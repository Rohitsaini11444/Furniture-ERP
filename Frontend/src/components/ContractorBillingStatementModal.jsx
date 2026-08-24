import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, FileText, User, Calendar, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';

export default function ContractorBillingStatementModal({ isOpen, onClose, contractor, initialMonth = 'Jul-26' }) {
  const [month, setMonth] = useState(initialMonth);
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const printRef = useRef(null);

  useEffect(() => {
    if (isOpen && contractor) {
      fetchContractorBill();
    }
  }, [isOpen, contractor, month]);

  const fetchContractorBill = async () => {
    if (!contractor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/store/monthly-contractor-bill/', {
        params: { contractor: contractor.id, month: month }
      });
      setBillingData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load contractor billing statement.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !contractor) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowPrint = window.open('', '', 'width=900,height=700');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Store Billing Statement - ${contractor.full_name || contractor.username}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; margin-bottom: 4px; }
            h4 { text-align: center; color: #64748b; font-weight: normal; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background-color: #f1f5f9; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #fff7ed; }
            .badge-charge { color: #c2410c; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#8b5a2b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Monthly Contractor Store Bill Statement
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Contractor: <strong>{contractor.full_name || contractor.username}</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={16} />
              <span>Print Statement</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Month */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} />
            <span>Select Billing Month:</span>
          </label>
          <input
            type="text"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="e.g. Jul-26"
            style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 600 }}
          />
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Enter month code like <strong>Jul-26</strong> or leave blank for all time.
          </span>
        </div>

        {/* Statement Content Printable Area */}
        <div style={{ padding: '1.5rem' }} ref={printRef}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>PINKCITY ENTERPRISES</h2>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>
              STORE MATERIAL DEDUCTION BILL STATEMENT - {month || 'ALL TIME'}
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Contractor Details:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {contractor.full_name || contractor.username}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
                Phone: {contractor.phone || 'N/A'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Net Payable / Deductible Amount:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#c2410c' }}>
                ₹ {billingData ? (billingData.net_payable_amt || billingData.total_chargeable_amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
              {billingData && billingData.total_returned_amt > 0 && (
                <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                  (Includes ₹{billingData.total_returned_amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Material Return Credit)
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading bill statement...</div>
          ) : billingData && (billingData.chargeable_items.length > 0 || (billingData.returned_items && billingData.returned_items.length > 0)) ? (
            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                Chargeable Store Material Issues List (To be deducted from contractor payment)
              </h4>
              <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                    <tr>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#9a3412' }}>Voucher No</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#9a3412' }}>Date</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#9a3412' }}>Issued To (Worker)</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#9a3412' }}>Store Item</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#9a3412' }}>Qty</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#9a3412' }}>Unit</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#9a3412' }}>Rate (₹)</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#9a3412' }}>Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.chargeable_items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{item.voucher_no}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{item.issue_date}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{item.contractor_person_name || 'Self'}</td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{item.item_name}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{parseFloat(item.qty).toFixed(2)}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{item.unit}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>₹ {parseFloat(item.rate).toFixed(2)}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#c2410c' }}>
                          ₹ {parseFloat(item.chargeable_total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#fff7ed', fontWeight: 800, borderTop: '2px solid #fed7aa' }}>
                      <td colSpan={7} style={{ padding: '0.75rem', textAlign: 'right', color: '#9a3412', fontSize: '0.95rem' }}>
                        GROSS CHARGEABLE ISSUES TOTAL:
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#c2410c', fontSize: '1rem' }}>
                        ₹ {(billingData.total_chargeable_amt || billingData.total_chargeable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Material Returns Section */}
              {billingData.returned_items && billingData.returned_items.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#15803d' }}>
                    Material Return Credits (Credited back to contractor statement)
                  </h4>
                  <div style={{ borderRadius: '8px', border: '1px solid #dcfce7', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                        <tr>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#15803d' }}>Return Voucher</th>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#15803d' }}>Date</th>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#15803d' }}>Store Item</th>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#15803d' }}>Returned Qty</th>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#15803d' }}>Unit</th>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#15803d' }}>Rate (₹)</th>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#15803d' }}>Credit Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingData.returned_items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#15803d' }}>{item.voucher_no}</td>
                            <td style={{ padding: '0.65rem 0.75rem' }}>{item.return_date}</td>
                            <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{item.item_name}</td>
                            <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>+{parseFloat(item.qty).toFixed(2)}</td>
                            <td style={{ padding: '0.65rem 0.75rem' }}>{item.unit}</td>
                            <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>₹ {parseFloat(item.rate).toFixed(2)}</td>
                            <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              - ₹ {parseFloat(item.chargeable_total).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: '#f0fdf4', fontWeight: 800, borderTop: '2px solid #bbf7d0' }}>
                          <td colSpan={6} style={{ padding: '0.75rem', textAlign: 'right', color: '#15803d', fontSize: '0.95rem' }}>
                            TOTAL MATERIAL RETURNS CREDIT:
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#15803d', fontSize: '1rem' }}>
                            - ₹ {(billingData.total_returned_amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Net Payable Summary Box */}
              <div style={{ backgroundColor: '#fef3c7', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#92400e', fontSize: '1.05rem', fontWeight: 800 }}>NET PAYABLE DEDUCTION TOTAL</h4>
                  <span style={{ fontSize: '0.8rem', color: '#78350f' }}>(Gross Chargeable Issues - Material Returns Credit)</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#92400e' }}>
                  ₹ {(billingData.net_payable_amt || billingData.total_chargeable_amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
              No store issues or returns found for this contractor in {month || 'the selected period'}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
