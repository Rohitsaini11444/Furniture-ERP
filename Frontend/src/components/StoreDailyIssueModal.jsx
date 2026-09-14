import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, Save, AlertCircle, UserCheck, ShieldAlert } from 'lucide-react';
import api from '../api/axios';

export default function StoreDailyIssueModal({ isOpen, onClose, items, contractors, persons, units, onSuccess }) {
  const [formData, setFormData] = useState({
    voucher_no: '',
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

  const [unitItems, setUnitItems] = useState([]);
  const [loadingUnitItems, setLoadingUnitItems] = useState(false);
  const [selectedItemObj, setSelectedItemObj] = useState(null);
  const [contractorPersonsList, setContractorPersonsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUnitItems = async (unitId) => {
    if (!unitId) {
      setUnitItems([]);
      setSelectedItemObj(null);
      return;
    }
    setLoadingUnitItems(true);
    try {
      const res = await api.get('/store/items/', {
        params: {
          production_unit: unitId,
          available_for_unit: true,
          nopage: true
        }
      });
      const list = res.data.results || res.data || [];
      setUnitItems(list);
      if (list.length > 0) {
        setSelectedItemObj(list[0]);
        setFormData(prev => ({
          ...prev,
          item: list[0].id,
          unit: list[0].unit,
          rate: list[0].current_rate || list[0].base_rate || '',
          status: list[0].default_status || 'charge'
        }));
      } else {
        setSelectedItemObj(null);
        setFormData(prev => ({
          ...prev,
          item: '',
          qty: '',
          rate: ''
        }));
      }
    } catch (err) {
      console.error('Failed to load unit items:', err);
      setUnitItems([]);
    } finally {
      setLoadingUnitItems(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const vno = `VCH-${Math.floor(100 + Math.random() * 900)}`;
      const defaultUnit = units && units.length > 0 ? units[0].id : '';
      const defaultContractor = contractors && contractors.length > 0 ? contractors[0] : null;

      setFormData({
        voucher_no: vno,
        issue_date: new Date().toISOString().split('T')[0],
        month_year: 'Jul-26',
        contractor: defaultContractor ? defaultContractor.id : '',
        contractor_person: '',
        contractor_person_name: defaultContractor ? (defaultContractor.full_name || defaultContractor.username) : '',
        item: '',
        qty: '',
        unit: 'pcs',
        rate: '',
        status: 'charge',
        production_unit: defaultUnit,
        remark: ''
      });

      if (defaultUnit) {
        fetchUnitItems(defaultUnit);
      }
      setError(null);
    }
  }, [isOpen, units, contractors]);

  useEffect(() => {
    if (formData.contractor) {
      const filtered = persons.filter(p => String(p.contractor) === String(formData.contractor));
      setContractorPersonsList(filtered);
    } else {
      setContractorPersonsList([]);
    }
  }, [formData.contractor, persons]);

  if (!isOpen) return null;

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    setFormData(prev => ({ ...prev, production_unit: newUnit }));
    fetchUnitItems(newUnit);
  };

  const handleContractorChange = (e) => {
    const cId = e.target.value;
    const selectedContractor = contractors.find(c => String(c.id) === String(cId));
    const cName = selectedContractor ? (selectedContractor.full_name || selectedContractor.username) : '';

    setFormData(prev => ({
      ...prev,
      contractor: cId,
      contractor_person: '',
      contractor_person_name: cName
    }));
  };

  const handlePersonSelectChange = (e) => {
    const pId = e.target.value;
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
    const itemId = typeof val === 'object' && val?.target ? val.target.value : (typeof val === 'object' ? val?.id : val);
    const found = selectedObj || unitItems.find(i => String(i.id) === String(itemId));
    setSelectedItemObj(found || null);

    if (found) {
      setFormData(prev => ({
        ...prev,
        item: found.id,
        unit: found.unit,
        rate: found.current_rate || found.base_rate || '',
        status: found.default_status || 'charge'
      }));
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.production_unit) {
      setError('Please select a Factory Unit.');
      setLoading(false);
      return;
    }

    const selectedUnitObj = units.find(u => String(u.id) === String(formData.production_unit));
    const unitBal = parseFloat(selectedItemObj?.unit_balance_stock_qty !== undefined ? selectedItemObj.unit_balance_stock_qty : (selectedItemObj?.balance_stock_qty || 0));
    const enteredQty = parseFloat(formData.qty || 0);

    if (enteredQty <= 0) {
      setError('Issued quantity must be greater than zero.');
      setLoading(false);
      return;
    }

    // Live Unit Stock Check
    if (selectedItemObj && enteredQty > unitBal) {
      setError(`Warning: Available stock balance for ${selectedItemObj.item_name} in ${selectedUnitObj?.name || 'this unit'} is ${unitBal} ${selectedItemObj.unit}. Required ${formData.qty} ${formData.unit}.`);
      setLoading(false);
      return;
    }

    try {
      await api.post('/store/daily-issues/', formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const resErr = err.response?.data;
      const detailMsg = resErr?.detail || resErr?.error || (resErr?.qty ? resErr.qty[0] : null) || (resErr?.item ? resErr.item[0] : null) || 'Failed to record store issue.';
      setError(detailMsg);
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
        maxWidth: '720px',
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
          background: 'linear-gradient(to right, #fff7ed, #ffedd5)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ArrowUpRight size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Store Daily Issue Entry (Outward Issue Slip)
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#c2410c' }}>
                Debit store stock issued to Contractor, Worker, or Supervisor
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
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.875rem' }}>
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
                Issue Date *
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#ea580c', marginBottom: '6px' }}>
                Target Factory / Unit # * (Stock Source)
              </label>
              <select
                value={formData.production_unit}
                onChange={handleUnitChange}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #fdba74', backgroundColor: '#fffaf5', color: '#9a3412', fontWeight: 700 }}
              >
                <option value="">Select Unit #</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contractor & Worker Selection Section */}
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5a2b', fontWeight: 700, fontSize: '0.9rem' }}>
              <UserCheck size={18} />
              <span>Contractor & Worker Person Selection</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Select Contractor / Supervisor *
                </label>
                <select
                  value={formData.contractor}
                  onChange={handleContractorChange}
                  required
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                >
                  <option value="">Select Contractor</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name || c.username} ({c.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Contractor's Worker / Delegate Person
                </label>
                <select
                  value={formData.contractor_person}
                  onChange={handlePersonSelectChange}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                >
                  <option value="">Self (Contractor Him/Herself)</option>
                  {contractorPersonsList.map(p => (
                    <option key={p.id} value={p.id}>Worker: {p.person_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Issued To Name Format (e.g., xyz-contractor's person abc)
              </label>
              <input
                type="text"
                value={formData.contractor_person_name}
                onChange={(e) => setFormData({ ...formData, contractor_person_name: e.target.value })}
                placeholder="e.g. Pappu 4.NO - worker Raju"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: 600, color: '#0f172a' }}
              />
            </div>
          </div>

          {/* Item & Available Stock Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                Select Store Item * {formData.production_unit && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    (Filtered for {units.find(u => String(u.id) === String(formData.production_unit))?.name})
                  </span>
                )}
              </label>
              {selectedItemObj && (
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: (selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty) > 0 ? '#16a34a' : '#dc2626'
                }}>
                  Available in Unit: <strong>{(selectedItemObj.unit_balance_stock_qty ?? selectedItemObj.balance_stock_qty) || 0} {selectedItemObj.unit}</strong>
                </span>
              )}
            </div>
            <select
              value={formData.item}
              onChange={handleItemChange}
              required
              disabled={loadingUnitItems}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
            >
              {loadingUnitItems ? (
                <option value="">Loading items for this unit...</option>
              ) : unitItems.length === 0 ? (
                <option value="">No items with available stock in this unit</option>
              ) : (
                <>
                  <option value="">Select Store Item in Unit</option>
                  {unitItems.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.item_code} - {i.item_name} (Unit Stock: {i.unit_balance_stock_qty ?? i.balance_stock_qty} {i.unit} @ ₹{i.current_rate || i.base_rate})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Issue Qty *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
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
                Rate (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="0.00"
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Chargeability Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: formData.status === 'charge' ? '#fff7ed' : '#f0fdf4',
                  fontWeight: 600,
                  color: formData.status === 'charge' ? '#c2410c' : '#16a34a'
                }}
              >
                <option value="charge">Chargeable (Billed to Contractor)</option>
                <option value="non-charge">Non-Chargeable (Shop floor consumable)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Remark / Issue Purpose
            </label>
            <textarea
              rows={2}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="e.g. Issued for Sample Polish / Fitting Unit 5..."
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
                backgroundColor: '#ea580c',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Save size={18} />
              <span>{loading ? 'Saving...' : 'Record Issue Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
