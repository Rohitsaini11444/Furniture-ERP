import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, ArrowLeft } from 'lucide-react';

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

function BuyerMasters() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [buyerMasters, setBuyerMasters] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [samples, setSamples] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportBuyerId, setExportBuyerId] = useState('');

  const handleDownloadExcel = () => {
    if (!exportBuyerId) return;
    const selectedBuyer = buyers.find(b => b.id === exportBuyerId);
    if (!selectedBuyer) return;

    api.get(`/buyer-masters/export-excel/?buyer=${exportBuyerId}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${selectedBuyer.code}_Buyer_Master.xlsx`);
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
    sample: '',
    style_no: '',
    buyer_code: '',
    product_name: '',
    wood_type: '',
    finish_color: '',
    size_length: '',
    size_breadth: '',
    size_height: '',
    remark: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = () => {
    api.get('/buyer-masters/')
      .then(res => setBuyerMasters(res.data))
      .catch(err => console.error(err));

    api.get('/buyers/')
      .then(res => setBuyers(res.data))
      .catch(err => console.error(err));

    api.get('/samples/')
      .then(res => setSamples(res.data))
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

  const handleSampleChange = (e) => {
    const sampleId = e.target.value;
    if (!sampleId) {
      setFormData(prev => ({ ...prev, sample: '' }));
      return;
    }

    const selectedSample = samples.find(s => s.id === sampleId);
    if (selectedSample) {
      setFormData(prev => ({
        ...prev,
        sample: sampleId,
        style_no: selectedSample.style_no || '',
        buyer_code: selectedSample.buyer_detail?.code || '',
        product_name: selectedSample.product_name || '',
        wood_type: selectedSample.material || '',
        finish_color: selectedSample.finish_color || '',
        size_length: selectedSample.size_length || '',
        size_breadth: selectedSample.size_breadth || '',
        size_height: selectedSample.size_height || '',
        remark: selectedSample.remark || ''
      }));
    }
  };

  // Load style on id change (routing edit)
  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/buyer-masters/${id}/`)
        .then(res => {
          const bm = res.data;
          setFormData({
            buyer: bm.buyer,
            sample: bm.sample || '',
            style_no: bm.style_no,
            buyer_code: bm.buyer_code,
            product_name: bm.product_name,
            wood_type: bm.wood_type,
            finish_color: bm.finish_color,
            size_length: bm.size_length || '',
            size_breadth: bm.size_breadth || '',
            size_height: bm.size_height || '',
            remark: bm.remark || ''
          });
          setEditingId(bm.id);
        })
        .catch(err => console.error(err));
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
  }, [id]);

  const openCreateModal = () => {
    navigate('/buyer-masters/new');
  };

  const openEditModal = (bm) => {
    navigate(`/buyer-masters/${bm.id}`);
  };

  const closeModal = () => {
    navigate('/buyer-masters');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // For Django foreign keys, empty string sample must be null
    const payload = { ...formData };
    if (!payload.sample) payload.sample = null;

    const request = editingId
      ? api.put(`/buyer-masters/${editingId}/`, payload)
      : api.post('/buyer-masters/', payload);

    request
      .then(() => {
        closeModal();
        fetchData();
      })
      .catch(err => console.error(err));
  };

  const handleDelete = (id, style) => {
    if (window.confirm(`Are you sure you want to delete buyer master style "${style}"?`)) {
      api.delete(`/buyer-masters/${id}/`)
        .then(() => fetchData())
        .catch(err => console.error(err));
    }
  };

  const filteredMasters = buyerMasters.filter(bm => 
    bm.style_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bm.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bm.buyer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bm.buyer_detail && bm.buyer_detail.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {id ? (
        <div className="new-page-form" style={{ padding: '1rem 0' }}>
          <button 
            onClick={closeModal} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'none', 
              border: 'none', 
              color: '#8b5a2b', 
              fontWeight: 600, 
              cursor: 'pointer',
              marginBottom: '1.5rem',
              padding: 0,
              fontSize: '1rem'
            }}
          >
            <ArrowLeft size={18} /> Back to Buyer Master
          </button>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingId ? '✏️ Edit Buyer Master Style' : '+ Create Buyer Master Style'}</h2>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h3 className="form-section-title">🔗 Linkings</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Buyer *</label>
                      <select required name="buyer" className="form-input" value={formData.buyer} onChange={handleChange}>
                        <option value="">Select Buyer...</option>
                        {buyers.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Sample ID (Autofill Source)</label>
                      <select name="sample" className="form-input" value={formData.sample} onChange={handleSampleChange}>
                        <option value="">Choose Sample to Autofill...</option>
                        {samples.map(s => (
                          <option key={s.id} value={s.id}>{s.sample_id} — {s.product_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">📋 Style Information</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Style No *</label>
                      <input required type="text" name="style_no" className="form-input" value={formData.style_no} onChange={handleChange} placeholder="e.g. STY-1002" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Buyer Code *</label>
                      <input required type="text" name="buyer_code" className="form-input" value={formData.buyer_code} onChange={handleChange} placeholder="e.g. BYR-001" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input required type="text" name="product_name" className="form-input" value={formData.product_name} onChange={handleChange} placeholder="e.g. Mango Wood Dining Table" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Wood Type *</label>
                      <input required type="text" name="wood_type" className="form-input" value={formData.wood_type} onChange={handleChange} placeholder="e.g. Mango Wood" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Finish / Color *</label>
                      <input required type="text" name="finish_color" className="form-input" value={formData.finish_color} onChange={handleChange} placeholder="e.g. Natural Wash" />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Remark</label>
                      <textarea name="remark" className="form-input" rows="2" value={formData.remark} onChange={handleChange} placeholder="Any specific requirements..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">📐 Product Size</h3>
                  <SizeGroup
                    label="Dimensions (cm)"
                    prefix="size"
                    values={formData}
                    onChange={handleDimChange}
                  />
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Style'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <h2>Buyer Master Style Registry</h2>
            <button onClick={openCreateModal} className="btn-primary">+ Register New Style</button>
          </div>

          <div className="filter-bar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}>
                <Search size={18} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search styles, products, buyers..."
                  className="filter-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span className="filter-label">Export Buyer Master:</span>
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
                  <th>Buyer</th>
                  <th>Style No</th>
                  <th>Product Name</th>
                  <th>Wood Type</th>
                  <th>Finish/Color</th>
                  <th>Dimensions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMasters.map(bm => (
                  <tr key={bm.id}>
                    <td>
                      <strong>{bm.buyer_detail?.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {bm.buyer_detail?.code}</div>
                    </td>
                    <td><span className="navbar-role-badge admin-badge">{bm.style_no}</span></td>
                    <td>{bm.product_name}</td>
                    <td>{bm.wood_type}</td>
                    <td>{bm.finish_color}</td>
                    <td>
                      {bm.size_length && bm.size_breadth && bm.size_height ? (
                        <span style={{ fontSize: '0.85rem' }}>
                          {bm.size_length} × {bm.size_breadth} × {bm.size_height} cm
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEditModal(bm)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginRight: 0 }}>Edit</button>
                        <button onClick={() => handleDelete(bm.id, bm.style_no)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMasters.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No styles found in Buyer Master.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default BuyerMasters;
