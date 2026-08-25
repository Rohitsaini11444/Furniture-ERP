import React, { useEffect, useState } from 'react';
import {
  Factory, Users, ArrowRightLeft, Plus, CheckCircle2, Building2,
  Settings, RefreshCw, Layers, ShieldCheck, AlertCircle
} from 'lucide-react';
import api from '../api/axios';

export default function UnitManagement() {
  const [units, setUnits] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [reallocLogs, setReallocLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showBuyerAllocModal, setShowBuyerAllocModal] = useState(false);
  const [showReallocModal, setShowReallocModal] = useState(false);

  // Form states
  const [allocForm, setAllocForm] = useState({ buyer: '', production_unit: '', notes: '' });
  const [reallocForm, setReallocForm] = useState({ buyer_id: '', from_unit_id: '', to_unit_id: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, bRes, supRes, conRes, allocRes] = await Promise.all([
        api.get('/production-units/'),
        api.get('/buyers/?ordering=-created_at'),
        api.get('/users/?role=supervisor'),
        api.get('/users/?role=contractor'),
        api.get('/buyer-unit-allocations/')
      ]);

      setUnits(uRes.data.results || uRes.data || []);
      setBuyers((bRes.data.results || bRes.data || []).filter(b => !b.is_deleted));
      setSupervisors(supRes.data.results || supRes.data || []);
      setContractors(conRes.data.results || conRes.data || []);
      setAllocations(allocRes.data.results || allocRes.data || []);

      // Fetch reallocation logs in background (non-blocking)
      api.get('/unit-work-reallocations/').then(logsRes => {
        setReallocLogs(logsRes.data.results || logsRes.data || []);
      }).catch(err => console.error('Error fetching realloc logs:', err));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBuyerAlloc = (e) => {
    e.preventDefault();
    if (!allocForm.buyer || !allocForm.production_unit) return;

    setSubmitting(true);
    api.post('/buyer-unit-allocations/', allocForm)
      .then(() => {
        setMessage({ type: 'success', text: 'Buyer assigned to Production Unit successfully!' });
        setShowBuyerAllocModal(false);
        setAllocForm({ buyer: '', production_unit: '', notes: '' });
        fetchData();
      })
      .catch(err => {
        setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save buyer allocation.' });
      })
      .finally(() => setSubmitting(false));
  };

  const handleReallocateWork = (e) => {
    e.preventDefault();
    if (!reallocForm.to_unit_id) return;

    setSubmitting(true);
    api.post('/production-units/reallocate-work/', reallocForm)
      .then(res => {
        setMessage({ type: 'success', text: res.data.message || 'Work successfully re-allocated to new Unit!' });
        setShowReallocModal(false);
        setReallocForm({ buyer_id: '', from_unit_id: '', to_unit_id: '', reason: '' });
        fetchData();
      })
      .catch(err => {
        setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to re-allocate work.' });
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #38bdf8' }}>
              <Factory size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                Factory Units & Workload Management
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                Manage 6 Factory Units, Supervisors, Contractors, and Dynamic Buyer Work Re-allocation.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowBuyerAllocModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.6rem 1rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
          >
            <Plus size={16} /> Assign Buyer to Unit
          </button>

          <button
            type="button"
            onClick={() => setShowReallocModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
          >
            <ArrowRightLeft size={16} /> Re-allocate Workload
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#15803d' : '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* ── 6 Factory Units Grid ── */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Building2 size={20} color="#0284c7" />
        Active Factory Units (6 Units)
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {units.map((unit) => {
          const unitSupervisors = supervisors.filter(s => s.production_unit === unit.id);
          const unitContractors = contractors.filter(c => c.production_unit === unit.id);
          const unitBuyers = allocations.filter(a => a.production_unit === unit.id);

          return (
            <div key={unit.id} style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.25rem', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', fontWeight: 800, fontSize: '0.82rem', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  {unit.unit_code}
                </span>
                <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px' }}>
                  {unit.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{unit.name}</h3>
              <p style={{ margin: '4px 0 1rem', fontSize: '0.82rem', color: '#64748b' }}>📍 {unit.location}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '12px', marginBottom: '1rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>SUPERVISORS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>{unitSupervisors.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CONTRACTORS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>{unitContractors.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CAPACITY</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>{unit.capacity_pcs} pcs</div>
                </div>
              </div>

              {/* Assigned Buyers */}
              <div style={{ fontSize: '0.82rem' }}>
                <strong style={{ color: '#475569' }}>Assigned Buyers:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {unitBuyers.length === 0 ? (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None assigned</span>
                  ) : (
                    unitBuyers.map((b, i) => (
                      <span key={i} style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {b.buyer_name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Re-allocation Audit Trail ── */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ArrowRightLeft size={20} color="#0284c7" />
        Dynamic Work Re-allocation Audit Log
      </h2>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
        {reallocLogs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No work re-allocations recorded yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Buyer / PO</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>From Unit</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>To Target Unit</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Details & Reason</th>
              </tr>
            </thead>
            <tbody>
              {reallocLogs.map((log, i) => (
                <tr key={i} style={{ borderBottom: i < reallocLogs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.82rem' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                    {log.buyer_name || log.po_number || 'All Buyer Work'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 600 }}>
                    {log.from_unit_name || 'All Previous Units'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 800 }}>
                    → {log.to_unit_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.84rem' }}>
                    {log.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Assign Buyer Modal ── */}
      {showBuyerAllocModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Assign Buyer to Factory Unit</h2>
            <form onSubmit={handleCreateBuyerAlloc} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Select Buyer *</label>
                <select
                  value={allocForm.buyer}
                  onChange={e => setAllocForm({ ...allocForm, buyer: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                >
                  <option value="">-- Choose Buyer --</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Assign Factory Unit *</label>
                <select
                  value={allocForm.production_unit}
                  onChange={e => setAllocForm({ ...allocForm, production_unit: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                >
                  <option value="">-- Choose Factory Unit --</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.unit_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Notes</label>
                <textarea
                  value={allocForm.notes}
                  onChange={e => setAllocForm({ ...allocForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Primary manufacturing unit preference..."
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowBuyerAllocModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}>
                  {submitting ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dynamic Work Re-allocation Modal ── */}
      {showReallocModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>⚡ Dynamic Workload Re-allocation</h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.84rem', color: '#64748b' }}>Shift active Buyer orders and stock from one Factory Unit to another on the fly.</p>

            <form onSubmit={handleReallocateWork} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Select Buyer Order to Shift</label>
                <select
                  value={reallocForm.buyer_id}
                  onChange={e => setReallocForm({ ...reallocForm, buyer_id: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                >
                  <option value="">-- All Buyers / Specific Buyer --</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>From Unit (Current)</label>
                  <select
                    value={reallocForm.from_unit_id}
                    onChange={e => setReallocForm({ ...reallocForm, from_unit_id: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="">Any Unit</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Target Unit (Shift To) *</label>
                  <select
                    value={reallocForm.to_unit_id}
                    onChange={e => setReallocForm({ ...reallocForm, to_unit_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', borderColor: '#0284c7' }}
                  >
                    <option value="">-- Choose Target Unit --</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.unit_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Reason / Notes</label>
                <textarea
                  value={reallocForm.reason}
                  onChange={e => setReallocForm({ ...reallocForm, reason: e.target.value })}
                  rows={2}
                  placeholder="e.g. Unit 4 has available capacity, shifting workload to balance production..."
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowReallocModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}>
                  {submitting ? 'Transferring...' : 'Execute Re-allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
