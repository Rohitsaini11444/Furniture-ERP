import React, { useEffect, useState } from 'react';
import { Package, X, Layers, FileText, Calendar, UserCheck, Building2, CheckCircle2, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import api from '../api/axios';

export default function StockOriginModal({ isOpen, onClose, stockType = 'raw', stageTitle = 'Raw Stock' }) {
  const [loading, setLoading] = useState(true);
  const [breakdownData, setBreakdownData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPoCount, setTotalPoCount] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setExpandedIndex(null);
    api.get(`/stock/origin-breakdown/?stock_type=${stockType}`)
      .then(res => {
        setBreakdownData(res.data.po_breakdown || []);
        setTotalCount(res.data.total_stock_count || 0);
        setTotalPoCount(res.data.total_po_count || (res.data.po_breakdown ? res.data.po_breakdown.length : 0));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen, stockType]);

  if (!isOpen) return null;

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.82)',
      backdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Top Header Banner */}
        <div style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              backgroundColor: '#38bdf820',
              border: '1px solid #38bdf840',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                {stageTitle} — Stage Breakdown
              </h3>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>PO Origin Summary</span>
                <span>•</span>
                <span>Stage Clearance Audit</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              color: '#cbd5e1',
              cursor: 'pointer',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Summary Bar */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem'
        }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Stage Stock</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0369a1', marginTop: '2px' }}>
              {totalCount} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>pcs</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>PO Batches</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {totalPoCount} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Batches</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Stage Status</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} /> Verified Active Stock
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#f1f5f9' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              Loading stage summary breakdown...
            </div>
          ) : breakdownData.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Package size={42} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#334155' }}>No Inventory Records Found</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>No pieces currently registered in {stageTitle}.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {breakdownData.map((batch, idx) => {
                const isExpanded = expandedIndex === idx || breakdownData.length === 1;
                return (
                  <div key={idx} style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '18px',
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                    overflow: 'hidden'
                  }}>
                    {/* PO Card Header */}
                    <div style={{
                      padding: '1.25rem',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: 800,
                            fontSize: '1rem',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            border: '1px solid #bae6fd'
                          }}>
                            <FileText size={16} />
                            {batch.po_number}
                          </span>

                          <span style={{
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            padding: '4px 14px',
                            borderRadius: '999px'
                          }}>
                            {batch.total_qty} {batch.unit}
                          </span>
                        </div>

                        {/* Metadata badges: Clearance Date & Supervisor */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginTop: '4px', fontSize: '0.83rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                            <Building2 size={14} color="#64748b" />
                            <span>Supplier: <strong style={{ color: '#0f172a' }}>{batch.supplier_name}</strong></span>
                          </div>

                          <span style={{ color: '#cbd5e1' }}>|</span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7' }}>
                            <Calendar size={14} />
                            <span>Cleared: <strong style={{ color: '#0f172a' }}>{batch.clearance_date}</strong></span>
                          </div>

                          <span style={{ color: '#cbd5e1' }}>|</span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7c3aed' }}>
                            <UserCheck size={14} />
                            <span>Supervisor: <strong style={{ color: '#5b21b6' }}>{batch.supervisor}</strong></span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(idx)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '6px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: '#334155'
                        }}
                      >
                        {isExpanded ? <>Hide Details <ChevronUp size={14}/></> : <>View Details ({batch.items_list.length}) <ChevronDown size={14}/></>}
                      </button>
                    </div>

                    {/* Expandable Line Items Table */}
                    {isExpanded && (
                      <div style={{ padding: '1rem 1.25rem 1.25rem', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Itemized Stock Items ({batch.items_list.length} records)
                        </div>

                        <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Style No</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Item Name</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Buyer</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Location</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batch.items_list.map((it, i) => (
                                <tr key={i} style={{ borderBottom: i < batch.items_list.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0284c7' }}>{it.style_no}</td>
                                  <td style={{ padding: '10px 12px', color: '#1e293b', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.item_name}>
                                    {it.item_name}
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#475569' }}>{it.buyer_name}</td>
                                  <td style={{ padding: '10px 12px', color: '#64748b' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <MapPin size={12} color="#94a3b8" />
                                      {it.location}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                                    {it.quantity} {batch.unit}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.5rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
