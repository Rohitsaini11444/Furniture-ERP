import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, History, AlertCircle, Save, Calendar, Tag } from 'lucide-react';
import api from '../api/axios';

export default function StoreRateComparisonModal({ isOpen, onClose, item, onSuccess }) {
  const [newRate, setNewRate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poReference, setPoReference] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comparison'); // 'comparison' | 'revise'

  if (!isOpen || !item) return null;

  const baseRate = parseFloat(item.base_rate || 0);
  const currentRate = parseFloat(item.current_rate || item.base_rate || 0);
  const diff = currentRate - baseRate;
  const pct = baseRate > 0 ? ((diff / baseRate) * 100).toFixed(2) : '0.00';

  const handleReviseSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post(`/store/items/${item.id}/revise-rate/`, {
        new_rate: newRate,
        supplier_name: supplierName,
        po_reference: poReference,
        revision_reason: reason || 'Rate revision'
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update rate.');
    } finally {
      setLoading(false);
    }
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
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
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
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Rate Comparison & History
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Item: <strong>{item.item_code} - {item.item_name}</strong> ({item.unit})
              </p>
            </div>
          </div>
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

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: activeTab === 'comparison' ? '#ffffff' : 'transparent',
              borderBottom: activeTab === 'comparison' ? '3px solid #0284c7' : 'none',
              fontWeight: 600,
              color: activeTab === 'comparison' ? '#0284c7' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <History size={18} />
            <span>Rate Comparison & Log</span>
          </button>
          <button
            onClick={() => setActiveTab('revise')}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: activeTab === 'revise' ? '#ffffff' : 'transparent',
              borderBottom: activeTab === 'revise' ? '3px solid #0284c7' : 'none',
              fontWeight: 600,
              color: activeTab === 'revise' ? '#0284c7' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Tag size={18} />
            <span>Revise Current Rate</span>
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'comparison' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Original Master Rate
                  </span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                    ₹ {baseRate.toFixed(2)}
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', textTransform: 'uppercase' }}>
                    Current Purchase Rate
                  </span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
                    ₹ {currentRate.toFixed(2)}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  backgroundColor: diff > 0 ? '#fef2f2' : (diff < 0 ? '#f0fdf4' : '#f8fafc'),
                  borderRadius: '12px',
                  border: `1px solid ${diff > 0 ? '#fecaca' : (diff < 0 ? '#bbf7d0' : '#e2e8f0')}`
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: diff > 0 ? '#991b1b' : (diff < 0 ? '#166534' : '#64748b'), textTransform: 'uppercase' }}>
                    Price Variance
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: 700, color: diff > 0 ? '#dc2626' : (diff < 0 ? '#16a34a' : '#64748b'), marginTop: '4px' }}>
                    {diff > 0 ? <TrendingUp size={20} /> : (diff < 0 ? <TrendingDown size={20} /> : null)}
                    <span>{diff > 0 ? '+' : ''}{diff.toFixed(2)} ({pct}%)</span>
                  </div>
                </div>
              </div>

              {/* History Table */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                  Historical Rate Revisions Log
                </h4>
                {item.rate_history && item.rate_history.length > 0 ? (
                  <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.65rem', textAlign: 'left', color: '#475569' }}>Date</th>
                          <th style={{ padding: '0.65rem', textAlign: 'right', color: '#475569' }}>Old Rate</th>
                          <th style={{ padding: '0.65rem', textAlign: 'right', color: '#475569' }}>New Rate</th>
                          <th style={{ padding: '0.65rem', textAlign: 'right', color: '#475569' }}>Diff (₹)</th>
                          <th style={{ padding: '0.65rem', textAlign: 'left', color: '#475569' }}>Supplier / PO</th>
                          <th style={{ padding: '0.65rem', textAlign: 'left', color: '#475569' }}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.rate_history.map((log, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem' }}>{log.effective_date}</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right' }}>₹ {log.old_rate}</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>₹ {log.new_rate}</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right', color: parseFloat(log.rate_difference) > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                              {parseFloat(log.rate_difference) > 0 ? '+' : ''}{log.rate_difference} ({log.percentage_change}%)
                            </td>
                            <td style={{ padding: '0.65rem' }}>{log.supplier_name || log.po_reference || '-'}</td>
                            <td style={{ padding: '0.65rem', color: '#64748b' }}>{log.revision_reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem' }}>
                    No rate revisions recorded yet. Current rate matches original Master Rate.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleReviseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Current Base Rate
                  </label>
                  <input
                    type="text"
                    value={`₹ ${baseRate.toFixed(2)} per ${item.unit}`}
                    disabled
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    New Revised Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    required
                    placeholder="Enter new supplier rate"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Supplier Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Basawa Ent., Anupam Paints"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    PO / Bill Reference #
                  </label>
                  <input
                    type="text"
                    value={poReference}
                    onChange={(e) => setPoReference(e.target.value)}
                    placeholder="e.g. Bill # 2667"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Reason for Revision
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Supplier price increase notice, raw material cost hike..."
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save size={18} />
                  <span>{loading ? 'Saving...' : 'Update & Log Revision'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
