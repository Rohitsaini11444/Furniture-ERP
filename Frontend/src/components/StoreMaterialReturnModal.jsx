import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Save, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from './SearchableSelect';

export default function StoreMaterialReturnModal({ isOpen, onClose, onSuccess, initialContractors = [], initialItems = [], initialUnits = [] }) {
  const [contractors, setContractors] = useState(initialContractors);
  const [items, setItems] = useState(initialItems);
  const [units, setUnits] = useState(initialUnits);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [formData, setFormData] = useState({
    voucher_no: `ST-RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    return_date: new Date().toISOString().split('T')[0],
    month_year: 'Jul-26',
    contractor: '',
    item: '',
    qty: '',
    unit: 'pcs',
    rate: '',
    status: 'charge',
    production_unit: '',
    remark: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && (initialContractors.length === 0 || initialItems.length === 0)) {
      setLoadingOptions(true);
      Promise.allSettled([
        api.get('/store/items/'),
        api.get('/users/', { params: { role: 'contractor' } }),
        api.get('/production-units/')
      ]).then(([itemsRes, contrRes, unitRes]) => {
        const itemData = itemsRes.status === 'fulfilled' ? (itemsRes.value.data.results || itemsRes.value.data || []) : [];
        const contrData = contrRes.status === 'fulfilled' ? (contrRes.value.data.results || contrRes.value.data || []) : [];
        const unitData = unitRes.status === 'fulfilled' ? (unitRes.value.data.results || unitRes.value.data || []) : [];

        setItems(itemData);
        setContractors(contrData);
        setUnits(unitData);

        if (contrData.length > 0) setFormData(prev => ({ ...prev, contractor: contrData[0].id }));
        if (itemData.length > 0) {
          const first = itemData[0];
          setFormData(prev => ({
            ...prev,
            item: first.id,
            unit: first.unit,
            rate: first.current_rate || first.base_rate || ''
          }));
        }
        if (unitData.length > 0) setFormData(prev => ({ ...prev, production_unit: unitData[0].id }));
      }).finally(() => setLoadingOptions(false));
    }
  }, [isOpen, initialContractors, initialItems]);

  if (!isOpen) return null;

  const parseFieldErrors = (err) => {
    const data = err.response?.data;
    if (!data) return 'Network error or server unavailable.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;

    if (typeof data === 'object') {
      const errorMsgs = [];
      Object.keys(data).forEach(field => {
        const errs = Array.isArray(data[field]) ? data[field] : [data[field]];
        const fieldName = field.replace('_', ' ').toUpperCase();
        errorMsgs.push(`${fieldName}: ${errs.join(' ')}`);
      });
      if (errorMsgs.length > 0) return errorMsgs.join(' | ');
    }
    return 'Failed to save material return. Please check all fields.';
  };

  const handleItemChange = (val, selectedObj) => {
    const itemId = typeof val === 'object' ? val.id : val;
    const found = selectedObj || items.find(i => String(i.id) === String(itemId));

    if (found) {
      setFormData(prev => ({
        ...prev,
        item: itemId,
        unit: found.unit,
        rate: found.current_rate || found.base_rate || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Front-end Required Field Validation
    if (!formData.contractor) {
      setError('CONTRACTOR: Please select a target contractor returning the material.');
      return;
    }
    if (!formData.item) {
      setError('STORE ITEM: Please select an item to return.');
      return;
    }
    if (!formData.qty || parseFloat(formData.qty) <= 0) {
      setError('RETURNED QTY: Returned quantity must be greater than 0.');
      return;
    }
    if (formData.rate === '' || parseFloat(formData.rate) < 0) {
      setError('RETURN RATE: Return rate cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/store/material-returns/', formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Material return submission failed:', err);
      setError(parseFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
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
        maxWidth: '650px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Modal Header */}
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
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Record Store Material Return
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Credit unused contractor material back to Store Inventory
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              color: '#991b1b',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {/* Voucher No */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Return Voucher No <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.voucher_no}
                onChange={(e) => setFormData(prev => ({ ...prev, voucher_no: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
              />
            </div>

            {/* Return Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Return Date <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                required
                value={formData.return_date}
                onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
              />
            </div>

            {/* Contractor */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Target Contractor / Supervisor <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <SearchableSelect
                options={contractors.map(c => ({ id: c.id, name: `${c.full_name || c.username} (@${c.username})` }))}
                value={formData.contractor}
                onChange={(val) => setFormData(prev => ({ ...prev, contractor: typeof val === 'object' ? val.id : val }))}
                placeholder="Search contractor returning material..."
              />
            </div>

            {/* Store Item */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Returned Store Item <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <SearchableSelect
                options={items.map(i => ({ id: i.id, name: `[${i.item_code}] ${i.item_name} (Avail: ${i.balance_stock_qty || 0} ${i.unit})`, ...i }))}
                value={formData.item}
                onChange={handleItemChange}
                placeholder="Search item code or name..."
              />
            </div>

            {/* Qty */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Returned Qty ({formData.unit}) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                placeholder="e.g. 5"
                value={formData.qty}
                onChange={(e) => setFormData(prev => ({ ...prev, qty: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
              />
            </div>

            {/* Rate */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Return Rate (₹) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formData.rate}
                onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
              />
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Chargeability Credit Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
              >
                <option value="charge">Chargeable (Deduct from Contractor Bill)</option>
                <option value="non_charge">Non-Chargeable Return</option>
              </select>
            </div>

            {/* Production Unit */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Factory / Production Unit
              </label>
              <select
                value={formData.production_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, production_unit: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
              >
                <option value="">-- Optional Unit --</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Remark */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Return Remark / Reason
              </label>
              <input
                type="text"
                placeholder="Reason for return (e.g. Unused stock returned after batch completion)"
                value={formData.remark}
                onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
              }}
            >
              <Save size={18} />
              <span>{submitting ? 'Saving Return...' : 'Confirm Material Return'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
