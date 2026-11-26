import React, { useState } from 'react';
import {
  X, ArrowRight, ArrowRightCircle, CheckCircle, Package, Zap,
  AlertCircle, ShieldCheck, Factory, Warehouse, Sparkles
} from 'lucide-react';
import api from '../api/axios';

const STAGE_CONFIG = [
  {
    key: 'raw',
    stepNumber: 1,
    title: 'Raw Stock',
    storeName: 'Main Gate Raw Store',
    description: 'Initial received material from Supplier PO',
    color: '#8b5a2b',
    bg: '#fdf8f5',
    border: '#fed7aa',
  },
  {
    key: 'sanded',
    stepNumber: 2,
    title: 'Sanding Stage',
    storeName: 'Sanded Store',
    description: 'Wood surface smoothed and calibrated',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  {
    key: 'polished',
    stepNumber: 3,
    title: 'Polishing Stage',
    storeName: 'Polishing Store',
    description: 'Stain, sealer, and protective finish applied',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
  },
  {
    key: 'packaged',
    stepNumber: 4,
    title: 'Packaged (Finished)',
    storeName: 'Finished Goods Store',
    description: 'Ready for container dispatch & delivery',
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#ddd6fe',
  },
];

export default function DirectStageTransferModal({ stockItem, onClose, onTransferred }) {
  if (!stockItem) return null;

  const currentStageKey = stockItem.stock_type || 'raw';
  const currentStageIndex = STAGE_CONFIG.findIndex(s => s.key === currentStageKey);
  const currentStage = STAGE_CONFIG[currentStageIndex] || STAGE_CONFIG[0];

  // Available forward stages only
  const forwardStages = STAGE_CONFIG.filter((_, idx) => idx > currentStageIndex);

  const [selectedTargetStage, setSelectedTargetStage] = useState(
    forwardStages.length > 0 ? forwardStages[0].key : ''
  );
  const [quantity, setQuantity] = useState('');
  const [isMoveAll, setIsMoveAll] = useState(false);
  const [transferNotes, setTransferNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const maxAvailable = parseFloat(stockItem.quantity || 0);

  const handleSelectAll = () => {
    setIsMoveAll(true);
    setQuantity(String(maxAvailable));
    setErrorMsg('');
  };

  const handleQuantityChange = (val) => {
    setIsMoveAll(false);
    setQuantity(val);
    setErrorMsg('');
  };

  const selectedTargetConfig = STAGE_CONFIG.find(s => s.key === selectedTargetStage);
  const numQty = parseFloat(quantity) || 0;
  const remainingInCurrent = Math.max(0, maxAvailable - numQty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTargetStage) {
      setErrorMsg('Please select a target forward stage.');
      return;
    }

    if (numQty <= 0) {
      setErrorMsg('Transfer quantity must be greater than 0.');
      return;
    }

    if (numQty > maxAvailable) {
      setErrorMsg(`Insufficient stock. Maximum available: ${maxAvailable} ${stockItem.unit || 'pcs'}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        to_stage: selectedTargetStage,
        quantity: numQty,
        move_all: isMoveAll || numQty === maxAvailable,
        transfer_notes: transferNotes.trim()
      };

      const resp = await api.post(`/stock/${stockItem.id}/transfer-stage/`, payload);
      if (onTransferred) {
        onTransferred(resp.data);
      }
      onClose();
    } catch (err) {
      console.error('Transfer stage error:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || 'Transfer failed. Please try again.';
      setErrorMsg(detail);
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
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5c3a21 0%, #8b5a2b 100%)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ArrowRightCircle size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Direct Stage Transfer
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#f5ede3', fontWeight: 500 }}>
                Move product forward across production stages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '0.65rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Stock Item Summary Card */}
          <div
            style={{
              backgroundColor: '#faf8f5',
              border: '1px solid #e7e5e4',
              borderRadius: '12px',
              padding: '0.9rem 1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: '5px',
                    backgroundColor: '#f5ede3',
                    color: '#5c3a21',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    marginBottom: '4px'
                  }}
                >
                  {stockItem.style_no}
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1c1917' }}>
                  {stockItem.item_name}
                </div>
              </div>

              {stockItem.po_number_str && (
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}
                >
                  PO #{stockItem.po_number_str}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.6rem', borderTop: '1px dashed #e7e5e4', paddingTop: '0.6rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>Current Stage</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: currentStage.color, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                  <Factory size={13} />
                  <span>Stage {currentStage.stepNumber}: {currentStage.title}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>Available Stock</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#047857', marginTop: '1px' }}>
                  {maxAvailable} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{stockItem.unit || 'pcs'}</span>
                </div>
              </div>

              {stockItem.supervisor_name && (
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#78716c', fontWeight: 600, textTransform: 'uppercase' }}>Supervised By</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1c1917', marginTop: '1px' }}>
                    {stockItem.supervisor_name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Forward Target Stage Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem' }}>
              Select Destination Stage * <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#78716c' }}>(Forward only)</span>
            </label>

            {forwardStages.length === 0 ? (
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontSize: '0.85rem', fontWeight: 600 }}>
                ✓ This item is already at the final stage ({currentStage.title}). No further forward transitions needed.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
                {forwardStages.map((stage) => {
                  const isSelected = selectedTargetStage === stage.key;
                  return (
                    <div
                      key={stage.key}
                      onClick={() => setSelectedTargetStage(stage.key)}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${stage.color}` : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? stage.bg : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 4px 12px ${stage.border}` : '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.4rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#ffffff' : '#f1f5f9',
                            color: stage.color
                          }}
                        >
                          Stage {stage.stepNumber}
                        </span>
                        {isSelected && <CheckCircle size={15} color={stage.color} />}
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? stage.color : '#1e293b' }}>
                          {stage.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          {stage.storeName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transfer Quantity & Move All Shortcut */}
          {forwardStages.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1c1917', margin: 0 }}>
                  Quantity to Push *
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    backgroundColor: isMoveAll ? '#ecfdf5' : '#f5eee6',
                    color: isMoveAll ? '#047857' : '#8b5a2b',
                    border: `1px solid ${isMoveAll ? '#a7f3d0' : '#e7d8c7'}`,
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap size={12} />
                  <span>Move Whole PO ({maxAvailable} {stockItem.unit || 'pcs'})</span>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxAvailable}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder={`Enter qty up to ${maxAvailable}...`}
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 3.5rem 0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#8b5a2b'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#64748b'
                  }}
                >
                  {stockItem.unit || 'pcs'}
                </span>
              </div>

              {numQty > 0 && numQty <= maxAvailable && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Moving: <strong style={{ color: '#047857' }}>{numQty} {stockItem.unit}</strong> to {selectedTargetConfig?.title}</span>
                  <span>Remaining: <strong>{remainingInCurrent.toFixed(2)} {stockItem.unit}</strong> in {currentStage.title}</span>
                </div>
              )}
            </div>
          )}

          {/* Supervisor Notes */}
          {forwardStages.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Transfer Remarks / Instructions <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</span>
              </label>
              <textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. Directly transferred by Supervisor for batch processing..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />
            </div>
          )}

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1rem'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '0.65rem 1.2rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {forwardStages.length > 0 && (
              <button
                type="submit"
                disabled={submitting || numQty <= 0 || numQty > maxAvailable}
                style={{
                  backgroundColor: submitting || numQty <= 0 || numQty > maxAvailable ? '#94a3b8' : '#8b5a2b',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: submitting || numQty <= 0 || numQty > maxAvailable ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: submitting || numQty <= 0 ? 'none' : '0 4px 12px rgba(139, 90, 43, 0.25)',
                  transition: 'background 0.15s ease'
                }}
              >
                {submitting ? (
                  <span>Transferring...</span>
                ) : (
                  <>
                    <ArrowRight size={17} />
                    <span>Confirm & Push to {selectedTargetConfig?.title || 'Next Stage'}</span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
