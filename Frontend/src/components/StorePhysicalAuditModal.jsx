import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../api/axios';

export default function StorePhysicalAuditModal({ isOpen, onClose, items = [], onSuccess }) {
  const [auditRows, setAuditRows] = useState([]);
  const [reason, setReason] = useState('Monthly Physical Inventory Stock Audit');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (items.length > 0) {
      setAuditRows(
        items.map(item => {
          const sys = Number(item.balance_qty || item.balance_stock_qty || 0);
          return {
            id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            unit: item.unit || 'pcs',
            system_qty: sys,
            physical_qty: sys,
            delta: 0,
          };
        })
      );
    }
  }, [items]);

  if (!isOpen) return null;

  const handlePhysicalChange = (id, val) => {
    const pQty = Number(val);
    setAuditRows(prev =>
      prev.map(it => {
        if (it.id === id) {
          const delta = isNaN(pQty) ? 0 : pQty - it.system_qty;
          return { ...it, physical_qty: val, delta };
        }
        return it;
      })
    );
  };

  const variancesCount = auditRows.filter(r => r.delta !== 0).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const changedRows = auditRows.filter(r => r.delta !== 0);

    if (changedRows.length === 0) {
      alert('No physical stock variances detected. All counts match system stock!');
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const promises = changedRows.map(r => {
        const type = r.delta > 0 ? 'addition' : 'deduction';
        return api.post('/store/stock-adjustments/', {
          adjustment_no: `ADJ-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          item: r.id,
          adjustment_type: type,
          quantity_delta: Math.abs(r.delta),
          reason: `${reason} (System: ${r.system_qty} ${r.unit}, Physical: ${r.physical_qty} ${r.unit}, Variance: ${r.delta > 0 ? '+' : ''}${r.delta} ${r.unit})`,
        });
      });

      await Promise.all(promises);
      setSuccessMsg(`Physical Audit submitted! ${changedRows.length} stock variance adjustment drafts sent for Admin approval.`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1800);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit physical stock audit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#faf5ee',
            borderBottom: '1px solid #f0eae1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e5e4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b3e1f'
              }}
            >
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1c1917' }}>
                Physical Stock Verification & Audit Worksheet
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#78716c', marginTop: '2px' }}>
                Verify actual physical inventory counts against system balances.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#78716c',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {successMsg ? (
            <div
              style={{
                padding: '2.5rem',
                textAlign: 'center',
                color: '#15803d',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <CheckCircle2 size={52} color="#16a34a" />
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 750 }}>Physical Audit Submitted!</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{successMsg}</p>
            </div>
          ) : (
            <form id="physical-audit-form" onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 650, color: '#475569', marginBottom: '4px' }}>
                  Audit Purpose / Notes
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Monthly Physical Verification Audit"
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b'
                  }}
                />
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>Item Code & Name</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, textAlign: 'center' }}>System Stock</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, textAlign: 'center' }}>Physical Counted</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, textAlign: 'center' }}>Variance (Delta)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map(row => {
                      const hasVariance = row.delta !== 0;
                      return (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: hasVariance ? (row.delta < 0 ? '#fef2f2' : '#f0fdf4') : '#ffffff'
                          }}
                        >
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569', marginRight: '6px' }}>
                              [{row.item_code}]
                            </span>
                            <strong style={{ color: '#0f172a' }}>{row.item_name}</strong>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 650, color: '#334155' }}>
                            {row.system_qty} {row.unit}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            <input
                              type="number"
                              step="any"
                              value={row.physical_qty}
                              onChange={e => handlePhysicalChange(row.id, e.target.value)}
                              style={{
                                width: '100px',
                                padding: '0.35rem 0.5rem',
                                borderRadius: '8px',
                                border: hasVariance ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            {row.delta === 0 ? (
                              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>0 (Matched)</span>
                            ) : (
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: row.delta > 0 ? '#16a34a' : '#dc2626',
                                  backgroundColor: row.delta > 0 ? '#dcfce7' : '#fee2e2',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem'
                                }}
                              >
                                {row.delta > 0 ? `+${row.delta}` : row.delta} {row.unit}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!successMsg && (
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '0.82rem', color: variancesCount > 0 ? '#b45309' : '#64748b', fontWeight: 650 }}>
              {variancesCount > 0 ? `⚠️ ${variancesCount} Stock Variance(s) detected for Admin adjustment approval` : '✓ All physical counts match system stock'}
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="physical-audit-form"
                disabled={submitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#5c3a21',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(92, 58, 33, 0.2)',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                <ClipboardCheck size={16} /> {submitting ? 'Submitting...' : 'Submit Physical Audit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
