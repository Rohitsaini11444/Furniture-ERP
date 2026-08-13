import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownRight, Save, AlertCircle, CheckCircle, Warehouse } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';

export default function StoreMaterialInPage() {
  const navigate = useNavigate();

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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

  const handleItemChange = (e) => {
    const itemId = e.target.value;
    const selectedItem = items.find(i => String(i.id) === String(itemId));
    if (selectedItem) {
      setFormData(prev => {
        const rate = selectedItem.current_rate || selectedItem.base_rate || 0;
        const q = parseFloat(prev.qty || 0);
        return {
          ...prev,
          item: itemId,
          unit: selectedItem.unit,
          bill_rate: rate,
          total_amount: q ? (q * parseFloat(rate)).toFixed(2) : ''
        };
      });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    api.post('/store/material-in/', formData)
      .then(() => {
        setSuccessMsg('Material Inward record saved successfully! Stock balance credited.');
        setTimeout(() => navigate('/store-management'), 1200);
      })
      .catch(err => {
        console.error('Material inward save failed:', err);
        setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to record store material inward.');
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
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Stock Credit (Inward)
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              📥 Material In (Credit Stock) Entry
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
                Inward Date *
              </label>
              <input
                type="date"
                value={formData.inward_date}
                onChange={(e) => setFormData({ ...formData, inward_date: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Supplier Bill / Invoice # *
              </label>
              <input
                type="text"
                value={formData.bill_no}
                onChange={(e) => setFormData({ ...formData, bill_no: e.target.value })}
                placeholder="e.g. Bill # 2667"
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Row 2: Supplier & Store Item */}
          <div className="mat-in-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Supplier Name *
              </label>
              <SearchableSelect
                options={suppliers}
                value={formData.supplier}
                onChange={(val) => setFormData(prev => ({ ...prev, supplier: val }))}
                placeholder="Select Supplier..."
                searchPlaceholder="Search supplier name..."
                idKey="id"
                titleKey="name"
                pageSize={15}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Store Item *
              </label>
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
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
              />
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
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
              />
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
                Destination Factory / Unit #
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
                Storage / Receipt Remarks
              </label>
              <input
                type="text"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
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
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
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
    </div>
  );
}
