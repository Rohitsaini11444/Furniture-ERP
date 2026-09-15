import React, { useState, useEffect } from 'react';
import { X, FileText, Save, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from './SearchableSelect';

export default function StoreRequisitionModal({ isOpen, onClose, onSuccess, items = [], units = [] }) {
  const [formData, setFormData] = useState({
    requisition_no: `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    item: '',
    requested_qty: '',
    unit: 'pcs',
    production_unit: '',
    purpose: ''
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
        setFormData(prev => ({
          ...prev,
          item: first.id,
          unit: first.unit
        }));
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
    if (found) {
      setFormData(prev => ({
        ...prev,
        item: itemId,
        unit: found.unit
      }));
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
    if (formErrors.item) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated.item;
        return updated;
      });
    }
    if (error) setError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.requisition_no?.trim()) {
      errors.requisition_no = 'Requisition number is required.';
    }
    if (!formData.item) {
      errors.item = 'Please select a store item.';
    }
    const qty = parseFloat(formData.requested_qty);
    if (formData.requested_qty === '' || formData.requested_qty === null || isNaN(qty)) {
      errors.requested_qty = 'Requested quantity is required.';
    } else if (qty <= 0) {
      errors.requested_qty = 'Requested quantity must be greater than 0.';
    } else if (qty > 9999999) {
      errors.requested_qty = 'Requested quantity cannot exceed 9,999,999.';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstMsg = Object.values(clientErrors)[0];
      setError(firstMsg);
      return;
    }

    setSubmitting(true);
    api.post('/store/requisitions/', formData)
      .then(() => {
        setFormErrors({});
        setError(null);
        onSuccess();
        onClose();
      })
      .catch(err => {
        console.error('Requisition save error:', err);
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
          setError(firstMsg || 'Failed to submit Material Requisition Note.');
        } else {
          setError(serverData?.detail || 'Failed to submit Material Requisition Note.');
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
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                New Material Requisition Note (MRN)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Request store materials for assigned factory production batch
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

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Requisition No. *
            </label>
            <input
              type="text"
              value={formData.requisition_no}
              onChange={e => handleFieldChange('requisition_no', e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: formErrors.requisition_no ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: formErrors.requisition_no ? '#fff5f5' : '#ffffff',
                fontWeight: 700,
                boxSizing: 'border-box'
              }}
            />
            {formErrors.requisition_no && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                <AlertCircle size={12} /> {formErrors.requisition_no}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Requested Store Item *
            </label>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Requested Qty ({formData.unit}) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={formData.requested_qty}
                onChange={e => handleFieldChange('requested_qty', e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: formErrors.requested_qty ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.requested_qty ? '#fff5f5' : '#ffffff',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.requested_qty && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                  <AlertCircle size={12} /> {formErrors.requested_qty}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Factory Unit / Department
              </label>
              <select
                value={formData.production_unit}
                onChange={e => handleFieldChange('production_unit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: formErrors.production_unit ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.production_unit ? '#fff5f5' : '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Factory Unit (Optional)</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {formErrors.production_unit && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                  <AlertCircle size={12} /> {formErrors.production_unit}
                </span>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Purpose / Production Batch Note
            </label>
            <textarea
              rows={3}
              value={formData.purpose}
              onChange={e => handleFieldChange('purpose', e.target.value)}
              placeholder="e.g. Required for sanding batch #104 (50 pcs chairs)"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: formErrors.purpose ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: formErrors.purpose ? '#fff5f5' : '#ffffff',
                boxSizing: 'border-box'
              }}
            />
            {formErrors.purpose && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: 600 }}>
                <AlertCircle size={12} /> {formErrors.purpose}
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
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
              }}
            >
              <Save size={18} />
              <span>{submitting ? 'Submitting MRN...' : 'Submit Requisition Note'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
