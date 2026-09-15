import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Save, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from './SearchableSelect';

export default function StoreStockAdjustmentModal({ isOpen, onClose, onSuccess, items = [] }) {
  const [selectedItemObj, setSelectedItemObj] = useState(null);

  const [formData, setFormData] = useState({
    adjustment_no: `ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    item: '',
    adjustment_type: 'evaporation',
    quantity_delta: '',
    reason: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormErrors({});
      setError(null);
      if (items.length > 0 && !formData.item) {
        const first = items[0];
        setSelectedItemObj(first);
        setFormData(prev => ({ ...prev, item: first.id }));
      }
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const handleFieldChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (error) setError(null);
  };

  const handleItemChange = (val, selectedObj) => {
    const itemId = typeof val === 'object' ? val.id : val;
    const found = selectedObj || items.find(i => String(i.id) === String(itemId));
    setSelectedItemObj(found || null);
    handleFieldChange('item', itemId);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.adjustment_no?.trim()) {
      errors.adjustment_no = 'Adjustment number is required.';
    }
    if (!formData.item) {
      errors.item = 'Please select a target store item.';
    }
    const delta = parseFloat(formData.quantity_delta);
    if (formData.quantity_delta === '' || formData.quantity_delta === null || isNaN(delta)) {
      errors.quantity_delta = 'Quantity delta is required.';
    } else if (delta === 0) {
      errors.quantity_delta = 'Quantity delta cannot be 0. Enter negative (-) for loss/evaporation or positive (+) for audit gain.';
    } else if (Math.abs(delta) > 10000000) {
      errors.quantity_delta = 'Quantity variance exceeds maximum permissible limit (10,000,000).';
    }
    const trimmedReason = (formData.reason || '').trim();
    if (!trimmedReason) {
      errors.reason = 'Audit reason for variance is required.';
    } else if (trimmedReason.length < 5) {
      errors.reason = 'Audit reason must be at least 5 characters long.';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstError = Object.values(clientErrors)[0];
      setError(firstError);
      return;
    }

    setSubmitting(true);
    api.post('/store/stock-adjustments/', formData)
      .then(() => {
        setFormErrors({});
        setError(null);
        onSuccess();
        onClose();
      })
      .catch(err => {
        console.error('Stock adjustment save error:', err);
        const serverData = err.response?.data;
        if (serverData && typeof serverData === 'object') {
          const newErrors = {};
          let firstMsg = '';
          Object.keys(serverData).forEach(k => {
            const val = serverData[k];
            const msg = Array.isArray(val) ? val.join(' ') : String(val);
            newErrors[k] = msg;
            if (!firstMsg) firstMsg = msg;
          });
          setFormErrors(newErrors);
          setError(firstMsg || 'Failed to submit stock variance adjustment.');
        } else {
          setError(serverData?.detail || 'Failed to submit stock variance adjustment.');
        }
      })
      .finally(() => setSubmitting(false));
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
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Log Physical Stock Variance / Loss
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Log evaporation, wastage, damage, or stock audit count differences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              color: '#991b1b',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Adjustment No. *
              </label>
              <input
                type="text"
                value={formData.adjustment_no}
                onChange={e => handleFieldChange('adjustment_no', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: formErrors.adjustment_no ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.adjustment_no ? '#fff5f5' : '#ffffff',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.adjustment_no && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                  <AlertCircle size={12} /> {formErrors.adjustment_no}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Adjustment Type *
              </label>
              <select
                value={formData.adjustment_type}
                onChange={e => handleFieldChange('adjustment_type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: formErrors.adjustment_type ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.adjustment_type ? '#fff5f5' : '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="evaporation">Liquid Evaporation / Leakage</option>
                <option value="damage">Material Damage / Defect</option>
                <option value="wastage">Production Process Wastage</option>
                <option value="physical_audit">Physical Audit Count Difference</option>
              </select>
              {formErrors.adjustment_type && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                  <AlertCircle size={12} /> {formErrors.adjustment_type}
                </span>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                Target Store Item *
              </label>
              {selectedItemObj && (
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1' }}>
                  Current Stock: {selectedItemObj.balance_stock_qty || 0} {selectedItemObj.unit}
                </span>
              )}
            </div>
            <SearchableSelect
              options={items}
              value={formData.item}
              onChange={handleItemChange}
              placeholder="Search store item code or name..."
              idKey="id"
              codeKey="item_code"
              titleKey="item_name"
              pageSize={15}
              hasError={Boolean(formErrors.item)}
            />
            {formErrors.item && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                <AlertCircle size={12} /> {formErrors.item}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Quantity Delta ({selectedItemObj?.unit || 'units'}) *
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.quantity_delta}
              onChange={e => handleFieldChange('quantity_delta', e.target.value)}
              placeholder="Enter -2.5 for loss/evaporation, or +5.0 for audit gain"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: formErrors.quantity_delta ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: formErrors.quantity_delta ? '#fff5f5' : '#ffffff',
                fontWeight: 700,
                boxSizing: 'border-box'
              }}
            />
            {formErrors.quantity_delta ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                <AlertCircle size={12} /> {formErrors.quantity_delta}
              </span>
            ) : (
              <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Note: Negative values (-) decrease store inventory. Positive values (+) increase stock after Admin Approval.
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Audit Note / Reason for Variance *
            </label>
            <textarea
              rows={3}
              value={formData.reason}
              onChange={e => handleFieldChange('reason', e.target.value)}
              placeholder="Explain why this stock count difference or liquid evaporation occurred..."
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: formErrors.reason ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: formErrors.reason ? '#fff5f5' : '#ffffff',
                boxSizing: 'border-box'
              }}
            />
            {formErrors.reason && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                <AlertCircle size={12} /> {formErrors.reason}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#d97706',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
              }}
            >
              <Save size={18} />
              <span>{submitting ? 'Submitting Variance...' : 'Submit Stock Variance'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
