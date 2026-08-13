import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Save, AlertCircle, CheckCircle, UserCheck, ShieldAlert } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';

export default function StoreDailyIssuePage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [persons, setPersons] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedItemObj, setSelectedItemObj] = useState(null);
  const [contractorPersonsList, setContractorPersonsList] = useState([]);

  const [formData, setFormData] = useState({
    voucher_no: `VCH-${Math.floor(100 + Math.random() * 900)}`,
    issue_date: new Date().toISOString().split('T')[0],
    month_year: 'Jul-26',
    contractor: '',
    contractor_person: '',
    contractor_person_name: '',
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
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.get('/store/items/'),
      api.get('/users/', { params: { role: 'contractor' } }),
      api.get('/store/contractor-persons/'),
      api.get('/production-units/')
    ])
      .then(([itemsRes, contrRes, persRes, unitRes]) => {
        const itemData = itemsRes.status === 'fulfilled' ? (itemsRes.value.data.results || itemsRes.value.data || []) : [];
        const contrData = contrRes.status === 'fulfilled' ? (contrRes.value.data.results || contrRes.value.data || []) : [];
        const persData = persRes.status === 'fulfilled' ? (persRes.value.data.results || persRes.value.data || []) : [];
        const unitData = unitRes.status === 'fulfilled' ? (unitRes.value.data.results || unitRes.value.data || []) : [];

        setItems(itemData);
        setContractors(contrData);
        setPersons(persData);
        setUnits(unitData);

        if (contrData.length > 0) {
          const firstC = contrData[0];
          setFormData(prev => ({
            ...prev,
            contractor: firstC.id,
            contractor_person_name: firstC.full_name || firstC.username
          }));
        }

        if (itemData.length > 0) {
          const firstI = itemData[0];
          setSelectedItemObj(firstI);
          setFormData(prev => ({
            ...prev,
            item: firstI.id,
            unit: firstI.unit,
            rate: firstI.current_rate || firstI.base_rate || '',
            status: firstI.default_status || 'charge'
          }));
        }

        if (unitData.length > 0) {
          setFormData(prev => ({ ...prev, production_unit: unitData[0].id }));
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

  const handleContractorChange = (val) => {
    const cId = typeof val === 'object' ? val.id : val;
    const selectedContractor = contractors.find(c => String(c.id) === String(cId));
    const cName = selectedContractor ? (selectedContractor.full_name || selectedContractor.username) : '';

    setFormData(prev => ({
      ...prev,
      contractor: cId,
      contractor_person: '',
      contractor_person_name: cName
    }));
  };

  const handlePersonSelectChange = (val) => {
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
  };

  const handleItemChange = (val, selectedObj) => {
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Live Stock Check
    if (selectedItemObj && parseFloat(formData.qty || 0) > parseFloat(selectedItemObj.balance_stock_qty || 0)) {
      setError(`Warning: Insufficient store balance for ${selectedItemObj.item_name}. Available: ${selectedItemObj.balance_stock_qty} ${selectedItemObj.unit}, Required: ${formData.qty} ${formData.unit}.`);
      setSubmitting(false);
      return;
    }

    api.post('/store/daily-issues/', formData)
      .then(() => {
        setSuccessMsg('Daily Outward Issue saved successfully! Stock balance updated.');
        setTimeout(() => navigate('/store-management'), 1200);
      })
      .catch(err => {
        console.error('Daily issue save failed:', err);
        setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to record store issue.');
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
            onClick={() => navigate('/store-management')}
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
              📤 Daily Issue Entry (Outward Stock)
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
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '1.75rem'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Row 1: Voucher & Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Voucher No *
              </label>
              <input
                type="text"
                value={formData.voucher_no}
                onChange={(e) => setFormData({ ...formData, voucher_no: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Issue Date *
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Billing Month / Year
              </label>
              <select
                value={formData.month_year}
                onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="Jul-26">Jul-26</option>
                <option value="Aug-26">Aug-26</option>
                <option value="Sep-26">Sep-26</option>
                <option value="Oct-26">Oct-26</option>
              </select>
            </div>
          </div>

          {/* Row 2: Contractor & Receiving Worker */}
          <div className="issue-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
              />
            </div>
          </div>

          {/* Row 3: Store Item & Live Stock Badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Store Item *
              </label>
              {selectedItemObj && (
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: selectedItemObj.balance_stock_qty > selectedItemObj.reorder_level ? '#166534' : '#991b1b',
                  backgroundColor: selectedItemObj.balance_stock_qty > selectedItemObj.reorder_level ? '#f0fdf4' : '#fef2f2',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${selectedItemObj.balance_stock_qty > selectedItemObj.reorder_level ? '#bbf7d0' : '#fecaca'}`
                }}>
                  Available Stock: {selectedItemObj.balance_stock_qty || 0} {selectedItemObj.unit}
                </span>
              )}
            </div>

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

          {/* Row 4: Quantity, Rate & Debit Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Quantity Issued *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                placeholder="0.00"
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Effective Rate (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="0.00"
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Contractor Debit Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="charge">Chargeable (Debit Contractor Bill)</option>
                <option value="free">Free (Company Store Expense)</option>
              </select>
            </div>
          </div>

          {/* Row 5: Factory Unit & Remarks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Factory Unit / Department
              </label>
              <select
                value={formData.production_unit}
                onChange={(e) => setFormData({ ...formData, production_unit: e.target.value })}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="">Select Factory Unit</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Issue Purpose / Note
              </label>
              <input
                type="text"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="e.g. Issued for sanding batch #102"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
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
              onClick={() => navigate('/store-management')}
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
    </div>
  );
}
