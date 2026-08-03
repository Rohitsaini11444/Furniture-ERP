import React, { useState } from 'react';
import { X, Building2, FileText, CheckCircle2, ChevronRight, Layers, ShoppingBag } from 'lucide-react';

export default function SupplierAllocationBreakdownModal({ isOpen, onClose, piData }) {
  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers' | 'items'

  if (!isOpen || !piData) return null;

  const totalUnits = piData.total_units || 0;
  const allocatedUnits = piData.allocated_units || 0;
  const remainingUnits = piData.remaining_units !== undefined ? piData.remaining_units : (totalUnits - allocatedUnits);
  const supplierAllocations = piData.supplier_allocations || [];
  const items = piData.items || [];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content" style={{ maxWidth: 850, borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', padding: 0 }} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
              <FileText size={22} color="#38bdf8"/> Supplier Allocation Breakdown: {piData.pi_no}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
              Buyer: <strong>{piData.buyer_detail?.name || piData.buyer_name || 'Nkuku'}</strong> | Total Order: <strong>{totalUnits} pcs</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}>
            <X size={20}/>
          </button>
        </div>

        {/* Top Summary Bar */}
        <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.75rem 1rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Ordered in PI</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{totalUnits} pcs</div>
          </div>

          <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '0.75rem 1rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Assigned to Suppliers</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>{allocatedUnits} pcs</div>
          </div>

          <div style={{ backgroundColor: remainingUnits <= 0 ? '#fef2f2' : '#f0fdf4', border: remainingUnits <= 0 ? '1px solid #fecaca' : '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: remainingUnits <= 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase' }}>
              {remainingUnits <= 0 ? 'Fully Allocated' : 'Unassigned Remaining'}
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: remainingUnits <= 0 ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
              {remainingUnits} pcs
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '0 1.5rem' }}>
          <button
            onClick={() => setActiveTab('suppliers')}
            style={{
              padding: '0.85rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              color: activeTab === 'suppliers' ? '#8b5a2b' : '#64748b',
              borderBottom: activeTab === 'suppliers' ? '3px solid #8b5a2b' : '3px solid transparent',
              background: 'none',
              borderLeft: 'none', borderRight: 'none', borderTop: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Building2 size={16}/> Supplier PO Assignments ({supplierAllocations.length})
          </button>

          <button
            onClick={() => setActiveTab('items')}
            style={{
              padding: '0.85rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              color: activeTab === 'items' ? '#8b5a2b' : '#64748b',
              borderBottom: activeTab === 'items' ? '3px solid #8b5a2b' : '3px solid transparent',
              background: 'none',
              borderLeft: 'none', borderRight: 'none', borderTop: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Layers size={16}/> Per-Item Remaining Balance ({items.length})
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', maxHeight: '55vh', overflowY: 'auto', backgroundColor: '#ffffff' }}>
          {activeTab === 'suppliers' ? (
            supplierAllocations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                <ShoppingBag size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem auto' }}/>
                <div style={{ fontWeight: 700, color: '#475569' }}>No Supplier POs Created Yet</div>
                <div style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>All {totalUnits} pieces remain unassigned.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {supplierAllocations.map((alloc, idx) => (
                  <div key={idx} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>🏢 {alloc.supplier_name}</span>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#8b5a2b', backgroundColor: '#fffcf7', border: '1px solid #f3e8d5', padding: '2px 8px', borderRadius: '6px' }}>
                          PO #{alloc.po_number}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#d97706' }}>
                          {alloc.total_assigned_qty} pcs Assigned
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {alloc.po_date}</div>
                      </div>
                    </div>

                    <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '4px 6px' }}>ITEM / STYLE DESCRIPTION</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>ASSIGNED QTY</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>UNIT RATE (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alloc.items.map((it, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '6px 6px', fontWeight: 600, color: '#334155' }}>{it.description}</td>
                            <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{it.quantity} {it.unit}</td>
                            <td style={{ padding: '6px 6px', textAlign: 'right', color: '#64748b' }}>₹{it.rate?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )
          ) : (
            <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>STYLE NO / ITEM</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>TOTAL ORDERED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>ASSIGNED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>REMAINING UNASSIGNED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const reqQty = parseFloat(it.units) || 0;
                  const allocQty = it.allocated_quantity !== undefined ? it.allocated_quantity : 0;
                  const remQty = it.remaining_quantity !== undefined ? it.remaining_quantity : max(0, reqQty - allocQty);

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>
                        {it.style_no}
                        {it.product_name && <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{it.product_name}</div>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{reqQty} pcs</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>{allocQty} pcs</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: remQty <= 0 ? '#dc2626' : '#16a34a' }}>
                        {remQty} pcs
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {remQty <= 0 ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '4px' }}>
                            Fully Assigned
                          </span>
                        ) : allocQty > 0 ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '2px 6px', borderRadius: '4px' }}>
                            Partial
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 6px', borderRadius: '4px' }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1.5rem', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '0.45rem 1.4rem', borderRadius: '8px', fontWeight: 600 }}>
            Close Breakdown
          </button>
        </div>

      </div>
    </div>
  );
}
