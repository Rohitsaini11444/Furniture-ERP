import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  X, User, Users, Briefcase, Hammer, Phone, Mail, Factory,
  CheckCircle, AlertCircle, Shield, Sparkles
} from 'lucide-react';

const BATCH_CATEGORIES = [
  { value: 'sanding', label: 'Sanding' },
  { value: 'polish', label: 'Polish' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'packaging', label: 'Packaging' },
];

export default function StorePersonnelModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  defaultRole = 'contractor',
  supervisorsList = [],
  unitsList = []
}) {
  const isEdit = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: defaultRole,
    production_unit: '',
    supervisor: '',
    batch_category: '',
    worker_person: '',
    password: '',
    is_active: true
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [existingWorkerPersonId, setExistingWorkerPersonId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          username: initialData.username || '',
          first_name: initialData.first_name || '',
          last_name: initialData.last_name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          role: initialData.role || defaultRole,
          production_unit: initialData.production_unit || '',
          supervisor: initialData.supervisor || '',
          batch_category: initialData.batch_category || '',
          worker_person: initialData.worker_person || initialData.workerPersonName || '',
          password: '',
          is_active: initialData.is_active !== undefined ? initialData.is_active : true
        });
        setExistingWorkerPersonId(initialData.worker_person_id || null);
      } else {
        const genUser = `staff_${Date.now().toString().slice(-5)}`;
        setFormData({
          username: genUser,
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          role: defaultRole,
          production_unit: unitsList.length > 0 ? unitsList[0].id : '',
          supervisor: supervisorsList.length > 0 ? supervisorsList[0].id : '',
          batch_category: 'sanding',
          worker_person: '',
          password: 'Password@123',
          is_active: true
        });
        setExistingWorkerPersonId(null);
      }
      setError(null);
    }
  }, [isOpen, initialData, defaultRole, unitsList, supervisorsList]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: val };
      // Auto generate username from name if new
      if (!isEdit && (field === 'first_name' || field === 'last_name')) {
        const fn = field === 'first_name' ? val : prev.first_name;
        const ln = field === 'last_name' ? val : prev.last_name;
        const combined = `${fn}_${ln}`.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (combined) {
          updated.username = combined;
        }
      }
      return updated;
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      setError('First name is required.');
      return;
    }
    if (!formData.username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!isEdit && !formData.password) {
      setError('Password is required for new staff accounts.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        username: formData.username.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        role: formData.role,
        production_unit: formData.production_unit || null,
        is_active: formData.is_active
      };

      if (formData.role === 'contractor') {
        payload.supervisor = formData.supervisor || null;
        payload.batch_category = null;
      } else if (formData.role === 'supervisor') {
        payload.supervisor = null;
        payload.batch_category = formData.batch_category || 'sanding';
      }

      if (formData.password) {
        payload.password = formData.password;
      }

      let savedUser = null;
      if (isEdit) {
        const res = await api.patch(`/users/${initialData.id}/`, payload);
        savedUser = res.data;
      } else {
        const res = await api.post('/users/', payload);
        savedUser = res.data;
      }

      // If contractor and worker_person delegate name is filled, create or update ContractorPerson
      if (formData.role === 'contractor' && formData.worker_person.trim() && savedUser?.id) {
        try {
          if (existingWorkerPersonId) {
            await api.patch(`/store/contractor-persons/${existingWorkerPersonId}/`, {
              contractor: savedUser.id,
              person_name: formData.worker_person.trim(),
              phone: formData.phone.trim()
            });
          } else {
            await api.post('/store/contractor-persons/', {
              contractor: savedUser.id,
              person_name: formData.worker_person.trim(),
              phone: formData.phone.trim()
            });
          }
        } catch (wpErr) {
          console.warn('Worker delegate sync notice:', wpErr);
        }
      }

      if (onSuccess) onSuccess(savedUser);
      onClose();
    } catch (err) {
      console.error('Failed to save staff:', err);
      const resData = err.response?.data;
      if (resData && typeof resData === 'object') {
        const firstVal = Object.values(resData)[0];
        setError(Array.isArray(firstVal) ? firstVal.join(' ') : String(firstVal));
      } else {
        setError(err.message || 'Server error while saving personnel details.');
      }
    } finally {
      setSaving(false);
    }
  };

  const isContractor = formData.role === 'contractor';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isContractor ? '#f0fdf4' : '#faf5ff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: isContractor ? '#22c55e' : '#a855f7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isContractor ? <Hammer size={22} /> : <Briefcase size={22} />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {isEdit ? `Edit ${isContractor ? 'Contractor' : 'Supervisor'}` : `Add New ${isContractor ? 'Contractor' : 'Supervisor'}`}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Store personnel directory & manufacturing unit assignment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#991b1b',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Role Segment Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Designation / Role *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleChange('role', 'contractor')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: isContractor ? '2px solid #22c55e' : '1px solid #cbd5e1',
                  backgroundColor: isContractor ? '#f0fdf4' : '#ffffff',
                  color: isContractor ? '#15803d' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Hammer size={16} /> Contractor
              </button>
              <button
                type="button"
                onClick={() => handleChange('role', 'supervisor')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: !isContractor ? '2px solid #a855f7' : '1px solid #cbd5e1',
                  backgroundColor: !isContractor ? '#faf5ff' : '#ffffff',
                  color: !isContractor ? '#7e22ce' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Briefcase size={16} /> Supervisor
              </button>
            </div>
          </div>

          {/* Names Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={e => handleChange('first_name', e.target.value)}
                placeholder="e.g. Ramesh"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => handleChange('last_name', e.target.value)}
                placeholder="e.g. Sharma"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Contact Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="e.g. 9876543210"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Email (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="e.g. ramesh@example.com"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Unit & Role Specific Assignment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Assigned Factory / Unit
              </label>
              <select
                value={formData.production_unit}
                onChange={e => handleChange('production_unit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">Select Factory Unit...</option>
                {unitsList.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.unit_code})</option>
                ))}
              </select>
            </div>

            {isContractor ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Reporting Supervisor
                </label>
                <select
                  value={formData.supervisor}
                  onChange={e => handleChange('supervisor', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">Unassigned</option>
                  {supervisorsList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username} ({s.batch_category || 'Supervisor'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Stage / Batch Category *
                </label>
                <select
                  value={formData.batch_category}
                  onChange={e => handleChange('batch_category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {BATCH_CATEGORIES.map(b => (
                    <option key={b.value} value={b.value}>{b.label} Stage</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Contractor Worker Delegate */}
          {isContractor && (
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Worker Person Delegate (Receiver at Store)
              </label>
              <input
                type="text"
                value={formData.worker_person}
                onChange={e => handleChange('worker_person', e.target.value)}
                placeholder="e.g. Raju (Authorized worker for material issue collection)"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Used in Daily Issue entry when this contractor sends a worker delegate to collect raw materials.
              </span>
            </div>
          )}

          {/* Account Credentials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Username *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={e => handleChange('username', e.target.value)}
                placeholder="e.g. ramesh_sharma"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {isEdit ? 'Change Password (Leave blank to keep)' : 'Initial Password *'}
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Password@123'}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="person-is-active"
              checked={formData.is_active}
              onChange={e => handleChange('is_active', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="person-is-active" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              Active Account (Able to login and receive materials)
            </label>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isContractor ? '#16a34a' : '#9333ea',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isContractor ? '0 2px 6px rgba(22, 163, 74, 0.3)' : '0 2px 6px rgba(147, 51, 234, 0.3)'
              }}
            >
              <CheckCircle size={16} />
              <span>{saving ? 'Saving...' : isEdit ? 'Save Changes' : `Create ${isContractor ? 'Contractor' : 'Supervisor'}`}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
