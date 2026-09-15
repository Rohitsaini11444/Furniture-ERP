import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Save, AlertCircle, CheckCircle, UserCheck, ShieldAlert, FileText, Building2, Info, X } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';
import { FormSkeleton } from '../components/TableSkeleton';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';

export default function StoreDailyIssuePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const urlUnit = queryParams.get('unit') || '';
  const urlItem = queryParams.get('item') || '';
  const urlQty = queryParams.get('qty') || '';

  const [items, setItems] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [persons, setPersons] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [unitNotice, setUnitNotice] = useState(null);

  const [selectedItemObj, setSelectedItemObj] = useState(null);
  const [contractorPersonsList, setContractorPersonsList] = useState([]);

  // Auto-calculate month_year string (e.g. "Aug-26") from date string
  const getMonthYearFromDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = String(d.getFullYear()).slice(-2);
      return `${month}-${year}`;
    } catch (e) {
      return '';
    }
  };

  const initialIssueDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    voucher_no: `VCH-${Math.floor(100 + Math.random() * 900)}`,
    issue_date: initialIssueDate,
    month_year: getMonthYearFromDate(initialIssueDate),
    contractor: '',
    contractor_person: '',
    contractor_person_name: '',
    item: '',
    qty: urlQty || '',
    unit: 'pcs',
    rate: '',
    status: 'charge',
    production_unit: urlUnit || '',
    remark: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

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
    formType: 'store_issue',
    formLabel: 'Daily Issue',
    getFormTitle: (data) => `Daily Issue - Vch ${data?.voucher_no || 'New'}`,
    getFormData: () => formData,
    targetPath: '/store-management/daily-issue',
    onSaveForm: async () => {
      const formEl = document.getElementById('store-daily-issue-form');
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

  // Fetch items strictly for the selected unit where material in occurred and balance > 0
  const fetchItemsForUnit = useCallback(async (unitId, targetItemId = null) => {
    if (!unitId) {
      setItems([]);
      setSelectedItemObj(null);
      return;
    }
    setLoadingItems(true);
    try {
      const res = await api.get('/store/items/', {
        params: {
          production_unit: unitId,
          available_for_unit: true,
          nopage: true
        }
      });
      const unitItems = res.data.results || res.data || [];
      setItems(unitItems);

      const findId = targetItemId || formData.item;
      const matched = unitItems.find(i => String(i.id) === String(findId));
      if (matched) {
        setSelectedItemObj(matched);
        setFormData(prev => ({
          ...prev,
          item: matched.id,
          unit: matched.unit,
          rate: matched.current_rate || matched.base_rate || '',
          status: matched.default_status || 'charge'
        }));
      } else {
        if (formData.item && selectedItemObj) {
          const uObj = units.find(u => String(u.id) === String(unitId));
          setUnitNotice(`Note: "${selectedItemObj.item_name}" was not received in ${uObj?.name || 'this unit'}. Please select from items received in this unit.`);
        }
        setSelectedItemObj(null);
        setFormData(prev => ({
          ...prev,
          item: '',
          qty: '',
          rate: '',
          unit: 'pcs'
        }));
      }
    } catch (err) {
      console.error('Failed to load items for unit:', err);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [formData.item, selectedItemObj, units]);

  // Initial mount: load contractors, workers, units
  useEffect(() => {
    Promise.allSettled([
      api.get('/users/', { params: { role: 'contractor' } }),
      api.get('/store/contractor-persons/'),
      api.get('/production-units/')
    ])
      .then(([contrRes, persRes, unitRes]) => {
        const contrData = contrRes.status === 'fulfilled' ? (contrRes.value.data.results || contrRes.value.data || []) : [];
        const persData = persRes.status === 'fulfilled' ? (persRes.value.data.results || persRes.value.data || []) : [];
        const unitData = unitRes.status === 'fulfilled' ? (unitRes.value.data.results || unitRes.value.data || []) : [];

        setContractors(contrData);
        setPersons(persData);
        setUnits(unitData);

        const activeUnit = urlUnit || (unitData.length > 0 ? unitData[0].id : '');
        const defaultContractor = contrData.length > 0 ? contrData[0] : null;

        setFormData(prev => ({
          ...prev,
          production_unit: activeUnit,
          contractor: defaultContractor ? defaultContractor.id : prev.contractor,
          contractor_person_name: defaultContractor ? (defaultContractor.full_name || defaultContractor.username) : prev.contractor_person_name,
          qty: urlQty || prev.qty
        }));

        if (activeUnit) {
          fetchItemsForUnit(activeUnit, urlItem);
        }
      })
      .catch(err => console.error('Failed to load daily issue initial data:', err))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (formData.contractor) {
      const filtered = persons.filter(p => String(p.contractor) === String(formData.contractor));
      setContractorPersonsList(filtered);
    } else {
      setContractorPersonsList([]);
    }
  }, [formData.contractor, persons]);

  const handleFieldChange = (field, val) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleDateChange = (e) => {
    setIsDirty(true);
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      issue_date: val,
      month_year: getMonthYearFromDate(val)
    }));
    if (formErrors.issue_date) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.issue_date;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleUnitChange = (e) => {
    setIsDirty(true);
    setUnitNotice(null);
    const newUnitId = e.target.value;
    setFormData(prev => ({ ...prev, production_unit: newUnitId }));
    fetchItemsForUnit(newUnitId);
    if (formErrors.production_unit) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.production_unit;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleContractorChange = (val) => {
    setIsDirty(true);
    const cId = typeof val === 'object' ? val.id : val;
    const selectedContractor = contractors.find(c => String(c.id) === String(cId));
    const cName = selectedContractor ? (selectedContractor.full_name || selectedContractor.username) : '';

    setFormData(prev => ({
      ...prev,
      contractor: cId,
      contractor_person: '',
      contractor_person_name: cName
    }));
    if (formErrors.contractor) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.contractor;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handlePersonSelectChange = (val) => {
    setIsDirty(true);
    const pId = typeof val === 'object' ? val.id : val;
    const selectedP = contractorPersonsList.find(p => String(p.id) === String(pId));
    const contractorObj = contractors.find(c => String(c.id) === String(formData.contractor));
    const cName = contractorObj ? (contractorObj.full_name || contractorObj.username) : '';

    if (selectedP) {
      setFormData(prev => ({
        ...prev,
        contractor_person: pId,
        contractor_person_name: `${cName} - Worker ${selectedP.person_name}`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        contractor_person: '',
        contractor_person_name: cName
      }));
    }
    if (formErrors.contractor_person) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.contractor_person;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleItemChange = (val, selectedObj) => {
    setIsDirty(true);
    setUnitNotice(null);
    const itemId = typeof val === 'object' ? val.id : val;
    const found = selectedObj || items.find(i => String(i.id) === String(itemId));
    setSelectedItemObj(found || null);

    if (found) {
      setFormData(prev => ({
        ...prev,
        item: itemId,
        unit: found.unit,
        rate: found.current_rate || found.base_rate || '',
        status: found.default_status || 'charge'
      }));
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
    if (formErrors.item) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.item;
        return copy;
      });
    }
    if (formErrors.qty) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.qty;
        return copy;
      });
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

    if (!formData.issue_date) {
      errors.issue_date = 'Issue date is required.';
    }

    if (!formData.production_unit) {
      errors.production_unit = 'Please select a Factory Unit to issue material from.';
    }

    if (!formData.contractor) {
      errors.contractor = 'Target contractor / supervisor is required.';
    }

    if (!formData.item) {
      errors.item = 'Store Item to issue is required.';
    }

    const q = parseFloat(formData.qty);
    if (formData.qty === '' || formData.qty === null || formData.qty === undefined || isNaN(q)) {
      errors.qty = 'Quantity issued is required.';
    } else if (q <= 0) {
      errors.qty = 'Issued quantity must be greater than zero.';
    } else if (q > 10000000) {
      errors.qty = 'Quantity exceeds maximum limit (10,000,000).';
    } else if (selectedItemObj) {
      const unitBal = parseFloat(selectedItemObj.unit_balance_stock_qty !== undefined ? selectedItemObj.unit_balance_stock_qty : (selectedItemObj.balance_stock_qty || 0));
      if (q > unitBal) {
        errors.qty = `Insufficient store balance in this unit. Available: ${unitBal} ${selectedItemObj.unit || formData.unit}`;
      }
    }

    if (formData.rate !== '' && formData.rate !== null && formData.rate !== undefined) {
      const r = parseFloat(formData.rate);
      if (isNaN(r) || r < 0) {
        errors.rate = 'Effective rate cannot be negative.';
      }
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstMsg = Object.values(clientErrors)[0];
      setError(firstMsg || 'Please resolve the highlighted field errors below.');
      setToastNotification({
        type: 'error',
        message: firstMsg || 'Please resolve highlighted errors before confirming.'
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    setFormErrors({});

    const selectedUnitObj = units.find(u => String(u.id) === String(formData.production_unit));

    api.post('/store/daily-issues/', formData)
      .then(() => {
        if (currentDraftId) clearDraft(currentDraftId);
        setIsDirty(false);
        setSuccessMsg(`Daily Outward Issue saved successfully! Stock balance for ${selectedUnitObj?.name || 'unit'} updated.`);
        setToastNotification({
          type: 'success',
          message: 'Daily Outward Issue saved successfully!'
        });
        setTimeout(() => navigate('/store-management'), 1200);
      })
      .catch(err => {
        console.error('Daily issue save failed:', err);
        const data = err.response?.data;
        if (data && typeof data === 'object') {
          const backendErrors = {};
          Object.entries(data).forEach(([key, val]) => {
            backendErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
          });
          setFormErrors(backendErrors);
          const firstErr = Object.values(backendErrors)[0];
          setError(firstErr || 'Failed to record store issue.');
          setToastNotification({
            type: 'error',
            message: firstErr || 'Validation failed. Check highlighted fields.'
          });
        } else {
          setError(err.message || 'Server error while recording outward issue.');
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
          .issue-form-grid {
            grid-template-columns: 1fr !important;
          }
          .issue-action-btns {
            flex-direction: column-reverse !important;
            width: 100% !important;
          }
          .issue-action-btns button {
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
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Stock Outward Issue
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            Daily Issue Entry (Outward Stock)
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
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Row 1: Voucher, Dates & Factory Unit Source */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.voucher_no ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Voucher No *
              </label>
              <input
                type="text"
                value={formData.voucher_no}
                onChange={(e) => handleFieldChange('voucher_no', e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: formErrors.voucher_no ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.voucher_no ? '#fff5f5' : '#ffffff',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.voucher_no && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{formErrors.voucher_no}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.issue_date ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Issue Date *
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={handleDateChange}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: formErrors.issue_date ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.issue_date ? '#fff5f5' : '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.issue_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{formErrors.issue_date}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: formErrors.production_unit ? '#dc2626' : '#ea580c', marginBottom: '6px' }}>
                <span>Factory Unit / Workshop *</span>
                <span style={{ fontSize: '0.72rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '1px 6px', borderRadius: '4px' }}>
                  Stock Source
                </span>
              </label>
              <select
                value={formData.production_unit}
                onChange={handleUnitChange}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: formErrors.production_unit ? '2px solid #dc2626' : '2px solid #fdba74',
                  backgroundColor: formErrors.production_unit ? '#fff5f5' : '#fffaf5',
                  color: formErrors.production_unit ? '#dc2626' : '#9a3412',
                  fontWeight: 700,
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
                  <AlertCircle size={13} />
                  <span>{formErrors.production_unit}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Billing Month / Year
              </label>
              <input
                type="text"
                value={formData.month_year}
                readOnly
                disabled
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontWeight: 700,
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Row 2: Contractor & Receiving Worker */}
          <div className="issue-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.contractor ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Target Contractor / Supervisor *
              </label>
              <SearchableSelect
                options={contractors.map(c => ({ ...c, name: c.full_name || c.username }))}
                value={formData.contractor}
                onChange={handleContractorChange}
                placeholder="Select Contractor..."
                searchPlaceholder="Search contractor name..."
                idKey="id"
                titleKey="name"
                pageSize={15}
                hasError={Boolean(formErrors.contractor)}
              />
              {formErrors.contractor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{formErrors.contractor}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.contractor_person ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Authorized Worker / Delegate (Optional)
              </label>
              <SearchableSelect
                options={contractorPersonsList.map(p => ({ ...p, name: `${p.person_name} (${p.role || 'Worker'})` }))}
                value={formData.contractor_person}
                onChange={handlePersonSelectChange}
                placeholder="Issued Directly to Contractor"
                searchPlaceholder="Search worker name..."
                idKey="id"
                titleKey="name"
                pageSize={15}
                disabled={!formData.contractor}
                hasError={Boolean(formErrors.contractor_person)}
              />
              {formErrors.contractor_person && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{formErrors.contractor_person}</span>
                </div>
              )}
            </div>
          </div>

          {/* Unit Switching Notice */}
          {unitNotice && (
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#1e40af',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>{unitNotice}</span>
            </div>
          )}

          {/* Row 3: Store Item & Live Unit Stock Badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: formErrors.item ? '#dc2626' : '#334155' }}>
                Store Item * {formData.production_unit && (
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                    (Showing items with stock received in {units.find(u => String(u.id) === String(formData.production_unit))?.name || 'selected unit'})
                  </span>
                )}
              </label>
              {selectedItemObj && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: (selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty) > selectedItemObj.reorder_level ? '#166534' : '#991b1b',
                    backgroundColor: (selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty) > selectedItemObj.reorder_level ? '#f0fdf4' : '#fef2f2',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${(selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty) > selectedItemObj.reorder_level ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    Available in {units.find(u => String(u.id) === String(formData.production_unit))?.name || 'Unit'}: {selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty ?? 0} {selectedItemObj.unit}
                  </span>
                  {selectedItemObj.balance_stock_qty !== undefined && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      [All Units: {selectedItemObj.balance_stock_qty} {selectedItemObj.unit}]
                    </span>
                  )}
                </div>
              )}
            </div>

            {!formData.production_unit ? (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fffbeb',
                border: '1px dashed #f59e0b',
                borderRadius: '8px',
                color: '#b45309',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>Please select a Factory Unit above to view and select available store items.</span>
              </div>
            ) : items.length === 0 && !loadingItems ? (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                color: '#64748b',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={16} />
                <span>No store items with available stock have been received (Material In) in <strong>{units.find(u => String(u.id) === String(formData.production_unit))?.name}</strong>. Please record a Material In for this unit first.</span>
              </div>
            ) : (
              <SearchableSelect
                options={items}
                value={formData.item}
                onChange={handleItemChange}
                placeholder={loadingItems ? "Loading items for this unit..." : "Select Store Item in Unit..."}
                searchPlaceholder="Search item code, name, category in this unit..."
                idKey="id"
                codeKey="item_code"
                titleKey="item_name"
                pageSize={15}
                disabled={loadingItems}
                hasError={Boolean(formErrors.item)}
              />
            )}
            {formErrors.item && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                <AlertCircle size={13} />
                <span>{formErrors.item}</span>
              </div>
            )}
          </div>

          {/* Row 4: Quantity, Rate & Debit Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.qty ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Quantity Issued ({formData.unit}) * {selectedItemObj && (
                  <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.8rem' }}>
                    (Unit Stock: {selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty ?? 0} {selectedItemObj.unit})
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.qty}
                onChange={(e) => handleFieldChange('qty', e.target.value)}
                placeholder={selectedItemObj ? `Max available: ${selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty ?? 0}` : "0.00"}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: formErrors.qty ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: formErrors.qty ? '#fff5f5' : '#ffffff',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.qty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{formErrors.qty}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.rate ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                Effective Rate (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                readOnly
                disabled
                placeholder="0.00"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: formErrors.rate ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              />
              {formErrors.rate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{formErrors.rate}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Contractor Debit Status *
              </label>
              <select
                value={formData.status}
                disabled
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              >
                <option value="charge">Chargeable (Debit Contractor Bill)</option>
                <option value="free">Free (Company Store Expense)</option>
              </select>
            </div>
          </div>

          {/* Row 5: Issue Purpose / Note */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Issue Purpose / Production Note
            </label>
            <input
              type="text"
              value={formData.remark}
              onChange={(e) => handleFieldChange('remark', e.target.value)}
              placeholder="e.g. Issued for production batch #102 / project requirement"
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          {/* Buttons */}
          <div className="issue-action-btns" style={{
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
                border: '1px solid #ea580c',
                backgroundColor: '#fff7ed',
                color: '#c2410c',
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
                backgroundColor: '#ea580c',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
              }}
            >
              <Save size={18} />
              <span>{submitting ? 'Recording Outward Issue...' : 'Confirm Daily Issue Entry'}</span>
            </button>
          </div>

        </form>
      </div>
      )}

      <UnsavedChangesModal
        isOpen={showExitModal}
        formLabel="Daily Issue"
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toastNotification.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toastNotification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: toastNotification.type === 'error' ? '#991b1b' : '#166534',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          zIndex: 9999,
          maxWidth: '420px',
          fontSize: '0.9rem'
        }}>
          {toastNotification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span style={{ flex: 1 }}>{toastNotification.message}</span>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
