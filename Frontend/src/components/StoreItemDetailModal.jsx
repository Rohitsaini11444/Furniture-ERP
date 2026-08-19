import React, { useState } from 'react';
import {
  X, Warehouse, DollarSign, Tag, Weight, AlertTriangle, CheckCircle,
  Package, Edit3, Image as ImageIcon, Maximize2, ShieldAlert
} from 'lucide-react';

export default function StoreItemDetailModal({ isOpen, onClose, item, onEdit }) {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !item) return null;

  const imageUrl = item.image || item.image_url || null;
  const balanceQty = Number(item.balance_stock_qty || item.total_stock_qty || 0);
  const reorderLevel = Number(item.reorder_level || 0);
  const isLowStock = balanceQty <= reorderLevel;

  return (
    <>
      <style>{`
        .sid-container {
          width: 100%;
          max-width: 720px;
          max-height: 90vh;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.2s ease-out;
        }
        .sid-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 1.5rem;
        }
        .sid-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }
        .sid-rates-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .sid-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        @media (max-width: 640px) {
          .sid-container {
            max-height: 94vh;
            border-radius: 12px;
          }
          .sid-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
          .sid-img-box {
            height: 200px !important;
          }
        }
        @media (max-width: 480px) {
          .sid-stats-grid,
          .sid-rates-grid,
          .sid-info-grid {
            grid-template-columns: 1fr !important;
          }
          .sid-header {
            padding: 1rem !important;
          }
          .sid-body {
            padding: 1rem !important;
          }
          .sid-footer {
            padding: 0.85rem 1rem !important;
            flex-direction: column-reverse;
            gap: 0.75rem;
            align-items: stretch !important;
          }
          .sid-footer-btns {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
        }}
        onClick={onClose}
      >
        <div className="sid-container" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div
            className="sid-header"
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#faf8f5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#f5efe6',
                  border: '1px solid #e7d8c4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Warehouse size={22} color="#8b5a2b" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {item.item_code}
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.item_name}
                  >
                    {item.item_name}
                  </h3>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                  Category: {item.category_name || item.category || 'Unassigned'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="sid-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            <div className="sid-grid">
              {/* Image Box */}
              <div>
                <div
                  className="sid-img-box"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '240px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={item.item_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: '6px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsZoomed(true)}
                        title="Click to zoom image"
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          backgroundColor: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backdropFilter: 'blur(2px)',
                        }}
                      >
                        <Maximize2 size={13} />
                        Zoom
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#94a3b8',
                      }}
                    >
                      <ImageIcon size={44} strokeWidth={1.5} color="#cbd5e1" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>No Image Uploaded</span>
                    </div>
                  )}
                </div>

                {/* Chargeability & Low Stock Badges */}
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: item.default_status === 'charge' ? '#fefce8' : '#f0fdf4',
                      color: item.default_status === 'charge' ? '#a16207' : '#15803d',
                      border: `1px solid ${item.default_status === 'charge' ? '#fef08a' : '#bbf7d0'}`,
                    }}
                  >
                    <CheckCircle size={15} style={{ flexShrink: 0 }} />
                    <span>
                      Issue Type: {item.default_status === 'charge' ? 'Chargeable (Contractor Debit)' : 'Free (Company Expense)'}
                    </span>
                  </div>

                  {isLowStock && (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#fff1f2',
                        color: '#be123c',
                        border: '1px solid #fecdd3',
                      }}
                    >
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      <span>Low Stock Alert (Under {reorderLevel} {item.unit})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Financial Rates Section */}
                <div
                  className="sid-rates-grid"
                  style={{
                    backgroundColor: '#faf8f5',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #f1ece5',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>
                      Master Base Rate
                    </span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                      ₹{Number(item.base_rate || 0).toFixed(2)}
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}> / {item.unit}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>
                      Current Effective Rate
                    </span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b5a2b', marginTop: '2px' }}>
                      ₹{Number(item.current_rate || item.base_rate || 0).toFixed(2)}
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}> / {item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Inventory Balances */}
                <div className="sid-stats-grid">
                  <div
                    style={{
                      padding: '0.85rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Inward</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                      {Number(item.total_stock_qty || 0)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.unit}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.85rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Issued</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                      {Number(item.total_issued_qty || 0)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.unit}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.85rem',
                      backgroundColor: isLowStock ? '#fff1f2' : '#f0fdf4',
                      borderRadius: '10px',
                      border: `1px solid ${isLowStock ? '#fecdd3' : '#bbf7d0'}`,
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: isLowStock ? '#9f1239' : '#166534', fontWeight: 600 }}>
                      Current Stock
                    </span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isLowStock ? '#be123c' : '#15803d', marginTop: '3px' }}>
                      {balanceQty} <span style={{ fontSize: '0.75rem' }}>{item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info Grid */}
                <div className="sid-info-grid">
                  <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Unit Weight</span>
                    <strong style={{ color: '#1e293b' }}>{item.weight ? `${item.weight} kg` : 'N/A'}</strong>
                  </div>

                  <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Reorder Threshold</span>
                    <strong style={{ color: '#1e293b' }}>{reorderLevel} {item.unit}</strong>
                  </div>
                </div>

                {/* Remarks & Description */}
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Remarks / Specifications
                  </span>
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.85rem',
                      color: item.remark ? '#334155' : '#94a3b8',
                      fontStyle: item.remark ? 'normal' : 'italic',
                      minHeight: '48px',
                    }}
                  >
                    {item.remark || 'No extra remarks or specifications entered.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="sid-footer"
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#faf8f5',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
            </div>

            <div className="sid-footer-btns" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Close
              </button>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(item);
                  }}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#8b5a2b',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 4px rgba(139, 90, 43, 0.2)',
                    flex: 1,
                  }}
                >
                  <Edit3 size={15} />
                  Edit Item
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* High-res Image Zoom Lightbox */}
      {isZoomed && imageUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} />
          </button>

          <img
            src={imageUrl}
            alt={item.item_name}
            style={{
              maxWidth: '95vw',
              maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
