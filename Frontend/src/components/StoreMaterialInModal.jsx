import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, Save, AlertCircle, FileText } from 'lucide-react';
import api from '../api/axios';
import { useDrafts } from '../context/DraftsContext';
import { UnsavedChangesModal } from './UnsavedChangesModal';

export default function StoreMaterialInModal({ isOpen, onClose, items, suppliers, units, onSuccess, draftData, draftId }) {
  const { saveDraft, clearDraft } = useDrafts();
  const [isDirty, setIsDirty] = useState(false);
  const [showExitReminder, setShowExitReminder] = useState(false);

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
      setIsDirty(false);
      setShowExitReminder(false);

      if (draftData) {
        setFormData(draftData);
        setIsDirty(true);
      } else {
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
      }
      setError(null);
    }
  }, [isOpen, items, suppliers, units, draftData]);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowExitReminder(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleItemChange = (val, selectedObj) => {
    setIsDirty(true);
    const itemId = typeof val === 'object' && val?.target ? val.target.value : (typeof val === 'object' ? val?.id : val);
    const selectedItem = selectedObj || items.find(i => String(i.id) === String(itemId));
    if (selectedItem) {
      setFormData(prev => ({
        ...prev,
        item: selectedItem.id,
        unit: selectedItem.unit,
        bill_rate: selectedItem.current_rate || selectedItem.base_rate || '',
        total_amount: prev.qty ? (parseFloat(prev.qty) * parseFloat(selectedItem.current_rate || selectedItem.base_rate || 0)).toFixed(2) : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
  };

  const handleQtyRateChange = (name, val) => {
    setIsDirty(true);
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
      if (draftId) clearDraft(draftId);
      setIsDirty(false);
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
            onClick={handleAttemptClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Inward Voucher # (Auto)
              </label>
              <input
                type="text"
                disabled
                value={formData.voucher_no}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Inward Date
              </label>
              <input
                type="date"
                required
                value={formData.inward_date}
                onChange={(e) => { setIsDirty(true); setFormData({ ...formData, inward_date: e.target.value }); }}
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
                required
                value={formData.supplier}
                onChange={(e) => { setIsDirty(true); setFormData({ ...formData, supplier: e.target.value }); }}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUP'})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Supplier Bill / Invoice # *
              </label>
              <input
                type="text"
                required
                value={formData.bill_no}
                onChange={(e) => { setIsDirty(true); setFormData({ ...formData, bill_no: e.target.value }); }}
                placeholder="e.g. INV-9901"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Select Item Master *
            </label>
            <select
              required
              value={formData.item}
              onChange={handleItemChange}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: 600 }}
            >
              <option value="">Select Item</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>[{i.item_code}] {i.item_name} ({i.category_name || 'General'})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Inward Qty *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.qty}
                onChange={(e) => handleQtyRateChange('qty', e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Unit
              </label>
              <input
                type="text"
                disabled
                value={formData.unit}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Bill Rate (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bill_rate}
                onChange={(e) => handleQtyRateChange('bill_rate', e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Total Amount (₹)
              </label>
              <input
                type="text"
                disabled
                value={formData.total_amount ? `₹ ${formData.total_amount}` : '₹ 0.00'}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: 800, color: '#16a34a' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Target Factory / Unit #
              </label>
              <select
                value={formData.production_unit}
                onChange={(e) => { setIsDirty(true); setFormData({ ...formData, production_unit: e.target.value }); }}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="">Select Production Unit</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Remarks / Vehicle Note
            </label>
            <textarea
              rows={2}
              value={formData.remark}
              onChange={(e) => { setIsDirty(true); setFormData({ ...formData, remark: e.target.value }); }}
              placeholder="e.g. Received via Tempo, bill checked..."
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={handleAttemptClose}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                saveDraft({
                  formType: 'store_in',
                  formLabel: 'Store Material In',
                  title: `Material In - Inv ${formData.bill_no || formData.voucher_no}`,
                  data: formData,
                  targetPath: '/store-management'
                });
                alert('Draft saved to Saved Drafts!');
                setIsDirty(false);
                onClose();
              }}
              style={{ padding: '0.65rem 1.1rem', borderRadius: '8px', border: '1px solid #16a34a', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={16} />
              <span>Save Draft</span>
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

      <UnsavedChangesModal
        isOpen={showExitReminder}
        title="Unsaved Store Material In Voucher"
        message="You have unsaved changes in this Material Inward form. Would you like to save it as a draft before leaving?"
        onSaveDraft={() => {
          saveDraft({
            formType: 'store_in',
            formLabel: 'Store Material In',
            title: `Material In - Inv ${formData.bill_no || formData.voucher_no}`,
            data: formData,
            targetPath: '/store-management'
          });
          setShowExitReminder(false);
          setIsDirty(false);
          onClose();
        }}
        onDiscard={() => {
          setShowExitReminder(false);
          setIsDirty(false);
          onClose();
        }}
        onCancel={() => {
          setShowExitReminder(false);
        }}
      />
    </div>
  );
}
