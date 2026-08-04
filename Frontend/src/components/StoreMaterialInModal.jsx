import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, Save, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function StoreMaterialInModal({ isOpen, onClose, items, suppliers, units, onSuccess }) {
  const [formData, setFormData] = useState({
    voucher_no: '',
    inward_date: new Date().toISOString().split('T')[0],
    month_year: 'Jul-26',
    bill_no: '',
    supplier: '',
    item: '',
    qty: '',
    unit: 'pcs',
    bill_rate: '',
    total_amount: '',
    production_unit: '',
    remark: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const vno = `ST-IN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setFormData({
        voucher_no: vno,
        inward_date: new Date().toISOString().split('T')[0],
        month_year: 'Jul-26',
        bill_no: '',
        supplier: suppliers && suppliers.length > 0 ? suppliers[0].id : '',
        item: items && items.length > 0 ? items[0].id : '',
        qty: '',
        unit: items && items.length > 0 ? items[0].unit : 'pcs',
        bill_rate: items && items.length > 0 ? (items[0].current_rate || items[0].base_rate) : '',
        total_amount: '',
        production_unit: units && units.length > 0 ? units[0].id : '',
        remark: ''
      });
      setError(null);
    }
  }, [isOpen, items, suppliers, units]);

  if (!isOpen) return null;

  const handleItemChange = (e) => {
    const itemId = e.target.value;
    const selectedItem = items.find(i => String(i.id) === String(itemId));
    if (selectedItem) {
      setFormData(prev => ({
        ...prev,
        item: itemId,
        unit: selectedItem.unit,
        bill_rate: selectedItem.current_rate || selectedItem.base_rate || '',
        total_amount: prev.qty ? (parseFloat(prev.qty) * parseFloat(selectedItem.current_rate || selectedItem.base_rate || 0)).toFixed(2) : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
  };

  const handleQtyRateChange = (name, val) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      const q = parseFloat(updated.qty || 0);
      const r = parseFloat(updated.bill_rate || 0);
      updated.total_amount = (q * r).toFixed(2);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/store/material-in/', formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to record store material inward.');
    } finally {
      setLoading(false);
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
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #f0fdf4, #dcfce7)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ArrowDownRight size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Store Material In (Inward Stock Receipt)
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                Credit material into store stock from supplier invoice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.875rem' }}>
              <AlertCircle size={18} style={{ display: 'inline', marginRight: '6px' }} />
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Voucher No *
              </label>
              <input
                type="text"
                value={formData.voucher_no}
                onChange={(e) => setFormData({ ...formData, voucher_no: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Inward Date *
              </label>
              <input
                type="date"
                value={formData.inward_date}
                onChange={(e) => setFormData({ ...formData, inward_date: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Supplier Bill / Invoice # *
              </label>
              <input
                type="text"
                value={formData.bill_no}
                onChange={(e) => setFormData({ ...formData, bill_no: e.target.value })}
                placeholder="e.g. Bill # 2667"
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Supplier Name *
              </label>
              <select
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Store Item *
              </label>
              <select
                value={formData.item}
                onChange={handleItemChange}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="">Select Store Item</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.item_code} - {i.item_name} ({i.unit})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Received Qty *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.qty}
                onChange={(e) => handleQtyRateChange('qty', e.target.value)}
                placeholder="0"
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                readOnly
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Bill Rate (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bill_rate}
                onChange={(e) => handleQtyRateChange('bill_rate', e.target.value)}
                placeholder="0.00"
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Total Amount (₹)
              </label>
              <input
                type="text"
                value={formData.total_amount ? `₹ ${formData.total_amount}` : '₹ 0.00'}
                readOnly
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f0fdf4', fontWeight: 700, color: '#16a34a' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Target Factory / Unit #
            </label>
            <select
              value={formData.production_unit}
              onChange={(e) => setFormData({ ...formData, production_unit: e.target.value })}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
            >
              <option value="">Select Production Unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Remarks / Vehicle Note
            </label>
            <textarea
              rows={2}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="e.g. Received via Tempo, bill checked..."
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
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
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Save size={18} />
              <span>{loading ? 'Saving...' : 'Record Inward Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
