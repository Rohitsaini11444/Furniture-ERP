import React, { useState, useEffect } from 'react';
import { X, Factory, CheckCircle, AlertCircle, Save, MapPin, Gauge } from 'lucide-react';
import api from '../api/axios';

export default function StoreFactoryUnitModal({ isOpen, onClose, unit = null, onSuccess }) {
  const isEditing = Boolean(unit?.id);

  const [formData, setFormData] = useState({
    name: '',
    unit_code: '',
    location: '',
    capacity_pcs: 1000,
    is_active: true,
  });

  const [isCodeTouched, setIsCodeTouched] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (unit) {
        setFormData({
          name: unit.name || '',
          unit_code: unit.unit_code || '',
          location: unit.location || '',
          capacity_pcs: unit.capacity_pcs ?? 1000,
          is_active: unit.is_active ?? true,
        });
        setIsCodeTouched(true);
      } else {
        setFormData({
          name: '',
          unit_code: '',
          location: '',
          capacity_pcs: 1000,
          is_active: true,
        });
        setIsCodeTouched(false);
      }
      setFormErrors({});
      setError(null);
    }
  }, [isOpen, unit]);

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData(prev => {
      const next = { ...prev, name: val };
      if (!isCodeTouched && !isEditing) {
        // Auto-generate suggested code e.g. "Unit 4" -> "UNIT_4"
        next.unit_code = val
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 20);
      }
      return next;
    });

    if (formErrors.name) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.name;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleCodeChange = (e) => {
    setIsCodeTouched(true);
    const val = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, unit_code: val }));
    if (formErrors.unit_code) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.unit_code;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Factory / Unit Name is required.';
    } else if (formData.name.trim().length > 150) {
      errors.name = 'Name cannot exceed 150 characters.';
    }

    if (!formData.unit_code.trim()) {
      errors.unit_code = 'Unit Code is required.';
    } else if (formData.unit_code.trim().length > 50) {
      errors.unit_code = 'Unit Code cannot exceed 50 characters.';
    }

    if (formData.capacity_pcs !== '' && (isNaN(formData.capacity_pcs) || Number(formData.capacity_pcs) < 0)) {
      errors.capacity_pcs = 'Capacity must be a valid positive number.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstMsg = Object.values(clientErrors)[0];
      setError(firstMsg || 'Please fix the highlighted errors.');
      return;
    }

    setLoading(true);
    setError(null);
    setFormErrors({});

    const payload = {
      name: formData.name.trim(),
      unit_code: formData.unit_code.trim().toUpperCase(),
      location: formData.location.trim() || null,
      capacity_pcs: parseInt(formData.capacity_pcs, 10) || 0,
      is_active: formData.is_active,
    };

    try {
      let res;
      if (isEditing) {
        res = await api.patch(`/production-units/${unit.id}/`, payload);
      } else {
        res = await api.post('/production-units/', payload);
      }
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to save factory unit:', err);
      const resData = err.response?.data;
      if (resData && typeof resData === 'object') {
        const backendErrors = {};
        Object.entries(resData).forEach(([k, v]) => {
          backendErrors[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setFormErrors(backendErrors);
        const firstErr = Object.values(backendErrors)[0];
        setError(firstErr || 'Failed to save factory unit.');
      } else {
        setError(err.message || 'Failed to save factory unit.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .sfum-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .sfum-modal-card {
          background-color: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          animation: sfumFadeIn 0.2s ease-out;
        }
        @keyframes sfumFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="sfum-modal-overlay" onClick={onClose}>
        <div className="sfum-modal-card" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#e0f2fe',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7'
              }}>
                <Factory size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isEditing ? `Edit Factory Unit: ${unit?.unit_code}` : 'Add New Factory Unit'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {isEditing ? 'Update factory unit specifications' : 'Create production & storage unit for Store Management'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Unit / Factory Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.name ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Factory / Unit Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g. Unit 1 - Sanding & Finishing, Main Workshop"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: formErrors.name ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.name ? '#fff5f5' : '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {formErrors.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{formErrors.name}</span>
                </div>
              )}
            </div>

            {/* Unit Code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.unit_code ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Unit Code *
              </label>
              <input
                type="text"
                value={formData.unit_code}
                onChange={handleCodeChange}
                placeholder="e.g. UNIT-1, FAC-A, WH-02"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: formErrors.unit_code ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.unit_code ? '#fff5f5' : '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {formErrors.unit_code && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{formErrors.unit_code}</span>
                </div>
              )}
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Unique identifier code used on store vouchers, daily issues, and inward receipts.
              </span>
            </div>

            {/* Location / Address */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <MapPin size={14} color="#64748b" /> Location / Address
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Plot 42, Sitapura Industrial Area, Jaipur"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Capacity & Status Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, color: formErrors.capacity_pcs ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  <Gauge size={14} color="#64748b" /> Monthly Capacity (pcs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity_pcs}
                  onChange={e => setFormData({ ...formData, capacity_pcs: e.target.value })}
                  placeholder="1000"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: formErrors.capacity_pcs ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Operational Status
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: formData.is_active ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: formData.is_active ? '#16a34a' : '#64748b' }}>
                    {formData.is_active ? 'Active Unit' : 'Inactive'}
                  </span>
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
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
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <Save size={16} />
                {loading ? 'Saving...' : isEditing ? 'Update Factory Unit' : 'Save Factory Unit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
