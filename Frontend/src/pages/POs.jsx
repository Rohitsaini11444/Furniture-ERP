import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { X, Search } from 'lucide-react';

function SizeGroup({ label, prefix, values, onChange }) {
  return (
    <div className="size-group">
      <label className="form-label">{label}</label>
      <div className="size-inputs">
        {['length', 'breadth', 'height'].map(dim => (
          <div key={dim} className="size-field">
            <span className="size-dim-label">{dim[0].toUpperCase()}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              placeholder={`${dim.charAt(0).toUpperCase() + dim.slice(1)} cm`}
              value={values[`${prefix}_${dim}`] || ''}
              onChange={e => onChange(`${prefix}_${dim}`, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function calcBoxCbm(l, b, h) {
  const fl = parseFloat(l), fb = parseFloat(b), fh = parseFloat(h);
  if (fl > 0 && fb > 0 && fh > 0) {
    return ((fl * fb * fh) / 1_000_000).toFixed(6);
  }
  return '';
}

function POs() {
  const [pos, setPos] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [buyerMasters, setBuyerMasters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportBuyerId, setExportBuyerId] = useState('');

  const handleDownloadExcel = () => {
    if (!exportBuyerId) return;
    const selectedBuyer = buyers.find(b => b.id === exportBuyerId);
    if (!selectedBuyer) return;

    api.get(`/pos/export-excel/?buyer=${exportBuyerId}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${selectedBuyer.code}_POs.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Failed to export excel', err);
        alert('Failed to download Excel. Please try again.');
      });
  };

  const emptyForm = {
    buyer: '',
    buyer_master: '',
    po: '',
    units: '',
    remark: '',
    cbm: '',
    price_usd: '',
    total_cbm: '',
    total_amount: '',
    box_length: '',
    box_breadth: '',
    box_height: '',
    net_weight: '',
    gross_weight: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = () => {
    api.get('/pos/')
      .then(res => setPos(res.data))
      .catch(err => console.error(err));

    api.get('/buyers/')
      .then(res => setBuyers(res.data))
      .catch(err => console.error(err));

    api.get('/buyer-masters/')
      .then(res => setBuyerMasters(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDimChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setFormData({
      buyer: p.buyer,
      buyer_master: p.buyer_master,
      po: p.po || '',
      units: p.units || '',
      remark: p.remark || '',
      cbm: p.cbm || '',
      price_usd: p.price_usd || '',
      total_cbm: p.total_cbm || '',
      total_amount: p.total_amount || '',
      box_length: p.box_length || '',
      box_breadth: p.box_breadth || '',
      box_height: p.box_height || '',
      net_weight: p.net_weight || '',
      gross_weight: p.gross_weight || ''
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const request = editingId
      ? api.put(`/pos/${editingId}/`, formData)
      : api.post('/pos/', formData);

    request
      .then(() => {
        setIsModalOpen(false);
        setEditingId(null);
        fetchData();
      })
      .catch(err => console.error(err));
  };

  const handleDelete = (id, poNum) => {
    if (window.confirm(`Are you sure you want to delete PO "${poNum}"?`)) {
      api.delete(`/pos/${id}/`)
        .then(() => fetchData())
        .catch(err => console.error(err));
    }
  };

  // Filter buyer masters based on selected buyer in form
  const availableStyles = buyerMasters.filter(bm => bm.buyer === formData.buyer);

  const filteredPOs = pos.filter(p => 
    (p.po && p.po.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.buyer_detail && p.buyer_detail.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.buyer_master_detail && p.buyer_master_detail.style_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const autoBoxCbm = calcBoxCbm(formData.box_length, formData.box_breadth, formData.box_height);

  return (
    <div>
      <div className="page-header">
        <h2>Purchase Orders (PO)</h2>
        <button onClick={openCreateModal} className="btn-primary">+ Create New PO</button>
      </div>

      {/* Filter / Search & Export Bar */}
      <div className="filter-bar">
        <div className="filter-bar-inner" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexGrow: 1, minWidth: '240px' }}>
            <Search size={16} className="filter-icon" />
            <span className="filter-label">Search:</span>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by PO No, Style No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flexGrow: 1 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="filter-label">Export POs:</span>
            <select
              className="filter-input"
              value={exportBuyerId}
              onChange={e => setExportBuyerId(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="">Select Buyer...</option>
              {buyers.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
            <button
              onClick={handleDownloadExcel}
              className="btn-primary"
              disabled={!exportBuyerId}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', opacity: exportBuyerId ? 1 : 0.6 }}
            >
              Download Excel
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Buyer</th>
              <th>Style No</th>
              <th>Product Name</th>
              <th>CBM</th>
              <th>Price (USD)</th>
              <th>Total CBM</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map(p => (
              <tr key={p.id}>
                <td><strong>{p.po || '—'}</strong></td>
                <td>
                  <strong>{p.buyer_detail?.name}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {p.buyer_detail?.code}</div>
                </td>
                <td><span className="navbar-role-badge admin-badge">{p.buyer_master_detail?.style_no}</span></td>
                <td>{p.buyer_master_detail?.product_name}</td>
                <td>{p.cbm}</td>
                <td>${p.price_usd}</td>
                <td>{p.total_cbm}</td>
                <td>${p.total_amount}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEditModal(p)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginRight: 0 }}>Edit</button>
                    <button onClick={() => handleDelete(p.id, p.po)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPOs.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No POs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ Edit PO' : '+ Create New PO'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                
                <div className="form-section">
                  <h3 className="form-section-title">🔗 Linkings</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Buyer *</label>
                      <select required name="buyer" className="form-input" value={formData.buyer} onChange={e => {
                        setFormData({ ...formData, buyer: e.target.value, buyer_master: '' });
                      }}>
                        <option value="">Select Buyer...</option>
                        {buyers.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Style No *</label>
                      <select required name="buyer_master" className="form-input" value={formData.buyer_master} onChange={handleChange} disabled={!formData.buyer}>
                        <option value="">{formData.buyer ? 'Select Style No...' : 'Please select Buyer first'}</option>
                        {availableStyles.map(bm => (
                          <option key={bm.id} value={bm.id}>{bm.style_no} — {bm.product_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">💼 Order Details</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">PO No *</label>
                      <input required type="text" name="po" className="form-input" value={formData.po} onChange={handleChange} placeholder="e.g. PO-8902" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CBM</label>
                      <input type="number" step="0.0001" name="cbm" className="form-input" value={formData.cbm} onChange={handleChange} placeholder="0.0000" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (USD)</label>
                      <input type="number" step="0.01" name="price_usd" className="form-input" value={formData.price_usd} onChange={handleChange} placeholder="0.00" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total CBM</label>
                      <input type="number" step="0.0001" name="total_cbm" className="form-input" value={formData.total_cbm} onChange={handleChange} placeholder="0.0000" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Amount</label>
                      <input type="number" step="0.01" name="total_amount" className="form-input" value={formData.total_amount} onChange={handleChange} placeholder="0.00" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Units</label>
                      <input type="number" name="units" className="form-input" value={formData.units} onChange={handleChange} placeholder="e.g. 20" />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Remarks</label>
                      <textarea name="remark" className="form-input" rows="2" value={formData.remark} onChange={handleChange} placeholder="Any specific requirements..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">📦 Packing & Weight</h3>
                  <div className="form-grid-2">
                    <SizeGroup
                      label="Box Size (cm)"
                      prefix="box"
                      values={formData}
                      onChange={handleDimChange}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Net Weight (kg)</label>
                        <input type="number" step="0.01" name="net_weight" className="form-input" value={formData.net_weight} onChange={handleChange} placeholder="0.00" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Gross Weight (kg)</label>
                        <input type="number" step="0.01" name="gross_weight" className="form-input" value={formData.gross_weight} onChange={handleChange} placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  {autoBoxCbm && (
                    <div className="cbm-auto-display">
                      <span>Calculated Box CBM:</span>
                      <strong>{autoBoxCbm} m³</strong>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create PO'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POs;
