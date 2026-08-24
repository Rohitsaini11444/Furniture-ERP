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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && items.length > 0 && !formData.item) {
      const first = items[0];
      setFormData(prev => ({
        ...prev,
        item: first.id,
        unit: first.unit
      }));
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.item) {
      setError('STORE ITEM: Please select a store item.');
      return;
    }
    if (!formData.requested_qty || parseFloat(formData.requested_qty) <= 0) {
      setError('REQUESTED QTY: Requested quantity must be greater than 0.');
      return;
    }

    setSubmitting(true);
    api.post('/store/requisitions/', formData)
      .then(() => {
        onSuccess();
        onClose();
      })
      .catch(err => {
        console.error('Requisition save error:', err);
        setError(err.response?.data?.detail || 'Failed to submit Material Requisition Note.');
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
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
              onChange={e => setFormData({ ...formData, requisition_no: e.target.value })}
              required
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
            />
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
            />
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
                onChange={e => setFormData({ ...formData, requested_qty: e.target.value })}
                placeholder="0.00"
                required
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Factory Unit / Department
              </label>
              <select
                value={formData.production_unit}
                onChange={e => setFormData({ ...formData, production_unit: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="">Select Factory Unit (Optional)</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Purpose / Production Batch Note
            </label>
            <textarea
              rows={3}
              value={formData.purpose}
              onChange={e => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g. Required for sanding batch #104 (50 pcs chairs)"
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
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
