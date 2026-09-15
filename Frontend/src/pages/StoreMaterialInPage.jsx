import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowDownRight, Save, AlertCircle, CheckCircle, Warehouse, FileText, X } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';
import { FormSkeleton } from '../components/TableSkeleton';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';

export default function StoreMaterialInPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    voucher_no: `ST-IN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
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

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  const {
    setIsDirty,
    showExitModal,
    confirmExit,
    handleSaveDraft,
    handleDiscardAndExit,
    handleCancelExit,
    currentDraftId,
    setCurrentDraftId,
    clearDraft
  } = useUnsavedChanges({
    formType: 'store_in',
    formLabel: 'Store Material In',
    getFormTitle: (data) => `Material In - Inv ${data?.bill_no || data?.voucher_no || 'New'}`,
    getFormData: () => formData,
    targetPath: '/store-management/material-in',
    onSaveForm: async () => {
      const formEl = document.getElementById('store-material-in-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  useEffect(() => {
    if (location.state?.draftData) {
      setFormData(location.state.draftData);
      setIsDirty(true);
      if (location.state.draftId) {
        setCurrentDraftId(location.state.draftId);
      }
    }
  }, [location.state]);

  useEffect(() => {
    Promise.allSettled([
      api.get('/store/items/'),
      api.get('/suppliers/', { params: { nopage: true } }),
      api.get('/production-units/')
    ])
      .then(([itemsRes, suppRes, unitRes]) => {
        const itemData = itemsRes.status === 'fulfilled' ? (itemsRes.value.data.results || itemsRes.value.data || []) : [];
        const suppData = suppRes.status === 'fulfilled' ? (suppRes.value.data.results || suppRes.value.data || []) : [];
        const unitData = unitRes.status === 'fulfilled' ? (unitRes.value.data.results || unitRes.value.data || []) : [];

        setItems(itemData);
        setSuppliers(suppData);
        setUnits(unitData);

        if (suppData.length > 0) {
          setFormData(prev => ({ ...prev, supplier: suppData[0].id }));
        }
        if (itemData.length > 0) {
          const first = itemData[0];
          setFormData(prev => ({
            ...prev,
            item: first.id,
            unit: first.unit,
            bill_rate: first.current_rate || first.base_rate || ''
          }));
        }
        if (unitData.length > 0) {
          setFormData(prev => ({ ...prev, production_unit: unitData[0].id }));
        }
      })
      .catch(err => console.error('Failed to load material in initial data:', err))
      .finally(() => setLoadingData(false));
  }, []);

  const handleFieldChange = (field, value) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
    if (error) setError(null);
  };

  const handleItemChange = (val, selectedObj) => {
    setIsDirty(true);
    const itemId = typeof val === 'object' && val?.target ? val.target.value : (typeof val === 'object' ? val?.id : val);
    const selectedItem = selectedObj || items.find(i => String(i.id) === String(itemId));
    if (selectedItem) {
      setFormData(prev => {
        const rate = selectedItem.current_rate || selectedItem.base_rate || 0;
        const q = parseFloat(prev.qty || 0);
        return {
          ...prev,
          item: selectedItem.id,
          unit: selectedItem.unit,
          bill_rate: rate,
          total_amount: q ? (q * parseFloat(rate)).toFixed(2) : ''
        };
      });
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
    if (formErrors.item) {
      setFormErrors(prev => ({ ...prev, item: null }));
    }
    if (error) setError(null);
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
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
    if (error) setError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.voucher_no || !formData.voucher_no.trim()) {
      errors.voucher_no = 'Voucher number is required.';
    } else if (formData.voucher_no.trim().length > 100) {
      errors.voucher_no = 'Voucher number cannot exceed 100 characters.';
    }

    if (!formData.inward_date) {
      errors.inward_date = 'Inward date is required.';
    }

    if (!formData.bill_no || !formData.bill_no.trim()) {
      errors.bill_no = 'Supplier Bill / Invoice # is required.';
    } else if (formData.bill_no.trim().length > 100) {
      errors.bill_no = 'Bill number cannot exceed 100 characters.';
    }

    if (!formData.supplier) {
      errors.supplier = 'Supplier is required.';
    }

    if (!formData.item) {
      errors.item = 'Store Item is required.';
    }

    const q = parseFloat(formData.qty);
    if (formData.qty === '' || formData.qty === null || formData.qty === undefined || isNaN(q)) {
      errors.qty = 'Quantity inward is required.';
    } else if (q <= 0) {
      errors.qty = 'Quantity must be greater than 0.';
    } else if (q > 10000000) {
      errors.qty = 'Quantity exceeds maximum limit (10,000,000).';
    }

    const r = parseFloat(formData.bill_rate);
    if (formData.bill_rate === '' || formData.bill_rate === null || formData.bill_rate === undefined || isNaN(r)) {
      errors.bill_rate = 'Bill rate is required.';
    } else if (r < 0) {
      errors.bill_rate = 'Bill rate cannot be negative.';
    }

    if (!formData.production_unit) {
      errors.production_unit = 'Destination Factory Unit is required.';
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      setError('Please resolve the highlighted field errors below.');
      setToastNotification({
        type: 'error',
        message: 'Please resolve highlighted errors before confirming.'
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    setFormErrors({});

    api.post('/store/material-in/', formData)
      .then(() => {
        if (currentDraftId) clearDraft(currentDraftId);
        setIsDirty(false);
        setSuccessMsg('Material Inward record saved successfully! Stock balance credited.');
        setToastNotification({
          type: 'success',
          message: 'Material Inward recorded and stock credited!'
        });
        setTimeout(() => navigate('/store-management'), 1200);
      })
      .catch(err => {
        console.error('Material inward save failed:', err);
        const data = err.response?.data;
        if (data && typeof data === 'object') {
          const backendErrors = {};
          Object.entries(data).forEach(([key, val]) => {
            backendErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
          });
          setFormErrors(backendErrors);
          const firstErr = Object.values(backendErrors)[0];
          setError(firstErr || 'Failed to record store material inward.');
          setToastNotification({
            type: 'error',
            message: firstErr || 'Validation failed. Check highlighted fields.'
          });
        } else {
          setError(err.message || 'Server error while recording inward.');
          setToastNotification({
            type: 'error',
            message: err.message || 'Server error occurred.'
          });
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        @media (max-width: 768px) {
          .mat-in-form-grid {
            grid-template-columns: 1fr !important;
          }
          .mat-in-action-btns {
            flex-direction: column-reverse !important;
            width: 100% !important;
          }
          .mat-in-action-btns button {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.8rem 1rem !important;
          }
        }
      `}</style>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={() => {
              if (confirmExit('/store-management')) navigate('/store-management');
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Stock Credit (Inward)
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            Material In (Credit Stock) Entry
            </h1>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#991b1b',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#166534',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Container */}
      {loadingData ? (
        <FormSkeleton fields={8} />
      ) : (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '1.75rem'
      }}>
        <form id="store-material-in-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Row 1: Voucher & Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Voucher No *
              </label>
              <input
                type="text"
                value={formData.voucher_no}
                onChange={(e) => handleFieldChange('voucher_no', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${formErrors.voucher_no ? '#dc2626' : '#cbd5e1'}`,
                  backgroundColor: formErrors.voucher_no ? '#fff5f5' : '#ffffff',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.voucher_no && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.voucher_no}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Inward Date *
              </label>
              <input
                type="date"
                value={formData.inward_date}
                onChange={(e) => handleFieldChange('inward_date', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${formErrors.inward_date ? '#dc2626' : '#cbd5e1'}`,
                  backgroundColor: formErrors.inward_date ? '#fff5f5' : '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.inward_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.inward_date}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Supplier Bill / Invoice # *
              </label>
              <input
                type="text"
                value={formData.bill_no}
                onChange={(e) => handleFieldChange('bill_no', e.target.value)}
                placeholder="e.g. Bill # 2667"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${formErrors.bill_no ? '#dc2626' : '#cbd5e1'}`,
                  backgroundColor: formErrors.bill_no ? '#fff5f5' : '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.bill_no && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.bill_no}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Supplier & Store Item */}
          <div className="mat-in-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Supplier Name *
              </label>
              <div style={{ borderRadius: '8px', border: formErrors.supplier ? '1.5px solid #dc2626' : 'none' }}>
                <SearchableSelect
                  options={suppliers}
                  value={formData.supplier}
                  onChange={(val) => handleFieldChange('supplier', val)}
                  placeholder="Select Supplier..."
                  searchPlaceholder="Search supplier name..."
                  idKey="id"
                  titleKey="name"
                  pageSize={15}
                />
              </div>
              {formErrors.supplier && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.supplier}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Store Item *
              </label>
              <div style={{ borderRadius: '8px', border: formErrors.item ? '1.5px solid #dc2626' : 'none' }}>
                <SearchableSelect
                  options={items}
                  value={formData.item}
                  onChange={handleItemChange}
                  placeholder="Select Store Item..."
                  searchPlaceholder="Search item code, name, category..."
                  idKey="id"
                  codeKey="item_code"
                  titleKey="item_name"
                  pageSize={15}
                />
              </div>
              {formErrors.item && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.item}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Quantities & Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Quantity Inward *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.qty}
                onChange={(e) => handleQtyRateChange('qty', e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${formErrors.qty ? '#dc2626' : '#cbd5e1'}`,
                  backgroundColor: formErrors.qty ? '#fff5f5' : '#ffffff',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.qty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.qty}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                readOnly
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', fontWeight: 600, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Bill Unit Rate (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bill_rate}
                onChange={(e) => handleQtyRateChange('bill_rate', e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${formErrors.bill_rate ? '#dc2626' : '#cbd5e1'}`,
                  backgroundColor: formErrors.bill_rate ? '#fff5f5' : '#ffffff',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.bill_rate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.bill_rate}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Total Bill Amount (₹)
              </label>
              <input
                type="text"
                value={formData.total_amount ? `₹ ${formData.total_amount}` : ''}
                readOnly
                placeholder="₹ 0.00"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 800, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Row 4: Factory Unit & Remarks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Destination Factory / Unit # *
              </label>
              <select
                value={formData.production_unit}
                onChange={(e) => handleFieldChange('production_unit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${formErrors.production_unit ? '#dc2626' : '#cbd5e1'}`,
                  backgroundColor: formErrors.production_unit ? '#fff5f5' : '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Factory Unit</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {formErrors.production_unit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} /> <span>{formErrors.production_unit}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Storage / Receipt Remarks
              </label>
              <input
                type="text"
                value={formData.remark}
                onChange={(e) => handleFieldChange('remark', e.target.value)}
                placeholder="e.g. Received in main store bin A2"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mat-in-action-btns" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="button"
              onClick={() => {
                if (confirmExit('/store-management')) navigate('/store-management');
              }}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveDraft()}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #16a34a',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                fontWeight: 650,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <FileText size={16} /> Save as Draft
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.65rem 1.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
              }}
            >
              <Save size={18} />
              <span>{submitting ? 'Recording Inward...' : 'Confirm Material Inward'}</span>
            </button>
          </div>

        </form>
      </div>
      )}

      <UnsavedChangesModal
        isOpen={showExitModal}
        formLabel="Store Material In"
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastNotification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastNotification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toastNotification.message}</span>
          <button
            onClick={() => setToastNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
