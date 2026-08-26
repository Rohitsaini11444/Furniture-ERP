import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Send, CheckCircle2, Sparkles } from 'lucide-react';
import api from '../api/axios';

export default function StoreReorderIndentModal({ isOpen, onClose, lowStockItems = [], onSuccess }) {
  const [itemsToReorder, setItemsToReorder] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (lowStockItems.length > 0) {
      setItemsToReorder(
        lowStockItems.map(item => {
          const bal = Number(item.balance_qty || item.balance_stock_qty || 0);
          const reorder = Number(item.reorder_level || 10);
          const suggested = Math.max(1, Math.ceil((reorder * 2) - bal));
          return {
            id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            unit: item.unit || 'pcs',
            balance_qty: bal,
            reorder_level: reorder,
            requested_qty: suggested,
            urgency: bal <= 0 ? 'urgent' : 'high',
          };
        })
      );
    }
  }, [lowStockItems]);

  if (!isOpen) return null;

  const handleQtyChange = (id, val) => {
    setItemsToReorder(prev =>
      prev.map(it => (it.id === id ? { ...it, requested_qty: Math.max(1, Number(val) || 1) } : it))
    );
  };

  const handleUrgencyChange = (id, val) => {
    setItemsToReorder(prev =>
      prev.map(it => (it.id === id ? { ...it, urgency: val } : it))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (itemsToReorder.length === 0) return;

    setSubmitting(true);
    try {
      const promises = itemsToReorder.map(it =>
        api.post('/store/requisitions/', {
          requisition_no: `MRN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          item: it.id,
          requested_qty: it.requested_qty,
          unit: it.unit,
          purpose: `[Urgency: ${(it.urgency || 'high').toUpperCase()}] Auto Low Stock Reorder Indent (Balance: ${it.balance_qty} ${it.unit}, Reorder Threshold: ${it.reorder_level} ${it.unit})`,
        })
      );

      await Promise.all(promises);
      setSuccessMsg(`Successfully generated ${itemsToReorder.length} Store Purchase Requisitions!`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Requisition creation error:", err.response?.data);
      const detail = err.response?.data
        ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : err.response.data)
        : 'Failed to generate store requisitions.';
      alert(`Failed to generate store requisitions: ${detail}`);
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
          maxWidth: '750px',
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
            backgroundColor: '#fffbeb',
            borderBottom: '1px solid #fef3c7',
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
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b45309'
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#78350f' }}>
                Batch Low-Stock Purchase Reorder Indent
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', marginTop: '2px' }}>
                Quickly submit purchase requisitions to Admin for items below threshold.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#92400e',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {successMsg ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#15803d',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <CheckCircle2 size={48} color="#16a34a" />
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 750 }}>Requisitions Submitted!</h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>{successMsg}</p>
            </div>
          ) : (
            <form id="reorder-indent-form" onSubmit={handleSubmit}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                  color: '#854d0e'
                }}
              >
                <Sparkles size={16} color="#a16207" />
                <span>
                  Suggested reorder quantities calculated based on 2× Reorder Threshold minus Current Balance.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {itemsToReorder.map(it => (
                  <div
                    key={it.id}
                    style={{
                      padding: '0.9rem 1.1rem',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#475569'
                          }}
                        >
                          {it.item_code}
                        </span>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{it.item_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Current Stock: <span style={{ color: it.balance_qty <= 0 ? '#dc2626' : '#d97706', fontWeight: 700 }}>{it.balance_qty} {it.unit}</span> | Reorder Level: {it.reorder_level} {it.unit}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                          Urgency
                        </label>
                        <select
                          value={it.urgency}
                          onChange={e => handleUrgencyChange(it.id, e.target.value)}
                          style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            color: '#334155'
                          }}
                        >
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                          <option value="medium">Medium</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                          Reorder Qty ({it.unit})
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={it.requested_qty}
                          onChange={e => handleQtyChange(it.id, e.target.value)}
                          style={{
                            width: '90px',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {itemsToReorder.length} Low-stock items selected for reorder
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
                form="reorder-indent-form"
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
                <Send size={15} /> {submitting ? 'Submitting...' : 'Generate Purchase Requisitions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
