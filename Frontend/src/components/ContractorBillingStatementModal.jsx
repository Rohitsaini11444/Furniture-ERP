import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, FileText, Calendar, Building2, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

export default function ContractorBillingStatementModal({
  isOpen,
  onClose,
  contractor,
  initialMonth = 'Jul-26',
  productionUnits = [],
  initialUnitId = null
}) {
  const [month, setMonth] = useState(initialMonth);
  const [units, setUnits] = useState(productionUnits);
  const [selectedUnit, setSelectedUnit] = useState(initialUnitId || contractor?.production_unit || '');
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const printRef = useRef(null);

  // Synchronize unit list from props or fetch if missing
  useEffect(() => {
    if (productionUnits && productionUnits.length > 0) {
      setUnits(productionUnits);
    } else if (isOpen) {
      api.get('/production-units/')
        .then(res => setUnits(res.data.results || res.data || []))
        .catch(err => console.error('Failed to load production units for modal:', err));
    }
  }, [productionUnits, isOpen]);

  // Synchronize initial selections when modal opens or contractor changes
  useEffect(() => {
    if (isOpen) {
      setMonth(initialMonth || 'Jul-26');
      const defaultUnit = initialUnitId || contractor?.production_unit || (units[0]?.id || '');
      setSelectedUnit(defaultUnit);
    }
  }, [isOpen, contractor, initialMonth, initialUnitId]);

  // Fetch statement data when contractor, factory unit, or month changes
  useEffect(() => {
    if (isOpen && contractor && selectedUnit) {
      fetchContractorBill();
    } else if (isOpen && contractor && !selectedUnit) {
      setBillingData(null);
      setError('Please select a Factory Unit to view contractor statement.');
    }
  }, [isOpen, contractor, selectedUnit, month]);

  const fetchContractorBill = async () => {
    if (!contractor || !selectedUnit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/store/monthly-contractor-bill/', {
        params: {
          contractor: contractor.id,
          production_unit: selectedUnit,
          month: month || 'all'
        }
      });
      setBillingData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to load contractor billing statement.');
      setBillingData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !contractor) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const windowPrint = window.open('', '', 'width=900,height=700');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Store Billing Statement - ${contractor.full_name || contractor.username} - ${billingData?.production_unit?.name || 'Factory'}</title>
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

  const totalChargeable = billingData?.total_chargeable_amount ?? billingData?.total_chargeable_amt ?? billingData?.net_payable_amt ?? 0;

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
        maxWidth: '860px',
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
                {billingData?.production_unit?.name && (
                  <span> &bull; Factory: <strong>{billingData.production_unit.name}</strong></span>
                )}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              disabled={loading || !billingData}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: loading || !billingData ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                opacity: loading || !billingData ? 0.6 : 1
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

        {/* Filter Bar: Billing Month & Factory Unit */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}>
          {/* Factory Unit Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} color="#8b5a2b" />
              <span>Factory Unit:</span>
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#0f172a'
              }}
            >
              <option value="">-- Select Factory --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.unit_code})
                </option>
              ))}
            </select>
          </div>

          {/* Billing Month Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="#8b5a2b" />
              <span>Billing Month:</span>
            </label>
            <input
              type="text"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="e.g. Jul-26"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                fontWeight: 600,
                width: '120px'
              }}
            />
          </div>

          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Each factory unit has independent contractor billing.
          </span>
        </div>

        {/* Statement Content Printable Area */}
        <div style={{ padding: '1.5rem' }} ref={printRef}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>PINKCITY ENTERPRISES</h2>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>
              STORE MATERIAL DEDUCTION BILL STATEMENT - {billingData?.month_year?.toUpperCase() || month?.toUpperCase() || 'ALL TIME'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#8b5a2b', fontWeight: 700 }}>
              Factory Unit: {billingData?.production_unit?.name ? `${billingData.production_unit.name} (${billingData.production_unit.unit_code})` : 'Selected Factory'}
            </p>
          </div>

          {/* Unassigned Issues Warning Banner */}
          {billingData && billingData.unassigned_issues_count > 0 && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#b45309',
              fontSize: '0.85rem'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>
                <strong>Notice:</strong> Found {billingData.unassigned_issues_count} material issue transaction(s) for this contractor without an assigned factory unit. By factory billing policy, these are excluded from this statement until reassigned.
              </span>
            </div>
          )}

          {/* Contractor & Deductible Details Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f8fafc',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Contractor Details:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {contractor.full_name || contractor.username}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
                Phone: {contractor.phone || 'N/A'}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
                Factory: <strong>{billingData?.production_unit?.name || 'Selected Factory'}</strong>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Net Material Deduction Total:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#c2410c' }}>
                ₹ {totalChargeable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                (Chargeable issues for {billingData?.production_unit?.name || 'this factory'})
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading factory bill statement...</div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#dc2626' }}>
              {error}
            </div>
          ) : billingData && billingData.chargeable_items && billingData.chargeable_items.length > 0 ? (
            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                Chargeable Store Material Issues ({billingData.production_unit?.name}) &mdash; To be deducted from contractor payment
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
                        FACTORY CHARGEABLE ISSUES TOTAL:
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#c2410c', fontSize: '1rem' }}>
                        ₹ {totalChargeable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Deduction Summary Box */}
              <div style={{
                backgroundColor: '#fff7ed',
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: 0, color: '#9a3412', fontSize: '1.05rem', fontWeight: 800 }}>
                    TOTAL STORE MATERIAL DEDUCTION
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#c2410c' }}>
                    (Chargeable material issues for {billingData.production_unit?.name || 'this factory'})
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#c2410c' }}>
                  ₹ {totalChargeable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
              No chargeable store issues found for this contractor at {billingData?.production_unit?.name || 'the selected factory'} in {month || 'the selected period'}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

