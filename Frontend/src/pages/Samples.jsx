import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { X, Upload, ImageIcon, Filter, ArrowLeft, ChevronRight } from 'lucide-react';
import Pagination from '../components/Pagination';



// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm = {
  sample_id: '',
  style_no: '',
  buyer: '',
  product_name: '',
  material: '',
  finish_color: '',
  remark: '',
  cbm: '',
  usd: '',
  vendor_name: '',
  size_length: '',
  size_breadth: '',
  size_height: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ImageGrid({ images, onRemove, onPreview }) {
  if (!images.length) return null;
  return (
    <div className="image-grid">
      {images.map((img, idx) => (
        <div key={img.id ?? idx} className="image-thumb-wrap">
          <img
            src={img.preview ?? img.image_url}
            alt={`img-${idx}`}
            className="image-thumb image-thumb-clickable"
            onClick={() => onPreview(idx)}
            title="Click to view full image"
          />
          <button
            type="button"
            className="image-remove-btn"
            onClick={() => onRemove(img)}
            title="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = React.useState(startIndex);

  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft')  setCurrent(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  const src = images[current]?.preview ?? images[current]?.image_url;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-box" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} title="Close (Esc)">
          <X size={22} />
        </button>

        {images.length > 1 && (
          <button
            className="lightbox-arrow lightbox-arrow-left"
            onClick={() => setCurrent(i => Math.max(i - 1, 0))}
            disabled={current === 0}
          >&#8592;</button>
        )}

        <img src={src} alt={`preview-${current}`} className="lightbox-img" />

        {images.length > 1 && (
          <button
            className="lightbox-arrow lightbox-arrow-right"
            onClick={() => setCurrent(i => Math.min(i + 1, images.length - 1))}
            disabled={current === images.length - 1}
          >&#8594;</button>
        )}

        {images.length > 1 && (
          <div className="lightbox-counter">{current + 1} / {images.length}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Samples() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [samples, setSamples] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // Images: [{id, image_url, preview, file, isNew}]
  const [images, setImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Filters
  const [filterBuyer, setFilterBuyer] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-id');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchBuyers = () => {
    api.get('/buyers/', { params: { nopage: true } })
      .then(res => setBuyers(res.data))
      .catch(err => console.error(err));
  };

  const fetchSamples = useCallback(() => {
    const params = { page: currentPage, ordering: ordering };
    if (filterBuyer) params.buyer = filterBuyer;
    if (filterMaterial) params.material = filterMaterial;
    api.get('/samples/', { params })
      .then(res => {
        const data = res.data.results || res.data;
        setSamples(data);
        setFiltered(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error(err));
  }, [filterBuyer, filterMaterial, currentPage, ordering]);

  useEffect(() => {
    fetchBuyers();
  }, []);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterBuyer, filterMaterial, ordering]);

  // Local filter (instant feedback while typing)
  useEffect(() => {
    let f = samples;
    if (filterBuyer) f = f.filter(s => s.buyer === filterBuyer);
    if (filterMaterial) f = f.filter(s => s.material?.toLowerCase().includes(filterMaterial.toLowerCase()));
    setFiltered(f);
  }, [filterBuyer, filterMaterial, samples]);

  const toggleSelectRow = (rowId, e) => {
    if (e) e.stopPropagation();
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(new Set(filtered.map(s => s.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  // Load sample on id change (routing edit)
  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/samples/${id}/`)
        .then(res => {
          const sample = res.data;
          setFormData({
            sample_id: sample.sample_id ?? '',
            style_no: sample.style_no ?? '',
            buyer: sample.buyer ?? '',
            product_name: sample.product_name ?? '',
            material: sample.material ?? '',
            finish_color: sample.finish_color ?? '',
            remark: sample.remark ?? '',
            cbm: sample.cbm ?? '',
            usd: sample.usd ?? '',
            vendor_name: sample.vendor_name ?? '',
            size_length: sample.size_length ?? '',
            size_breadth: sample.size_breadth ?? '',
            size_height: sample.size_height ?? '',
          });
          const existingImgs = (sample.images || []).map(img => ({
            id: img.id,
            image_url: img.image_url,
            preview: null,
            file: null,
            isNew: false,
          }));
          setImages(existingImgs);
          setEditingId(sample.id);
        })
        .catch(err => console.error(err));
    } else {
      setFormData(emptyForm);
      setImages([]);
      setEditingId(null);
    }
  }, [id]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDimChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files || []);
    const newImgs = files.map(file => ({
      id: null,
      file,
      preview: URL.createObjectURL(file),
      image_url: null,
      isNew: true,
    }));
    setImages(prev => [...prev, ...newImgs]);
    e.target.value = '';
  };

  const handleImageRemove = async (img) => {
    if (img.id) {
      try {
        await api.delete(`/sample-images/${img.id}/`);
      } catch (err) {
        console.error('Failed to delete image', err);
      }
    }
    setImages(prev => prev.filter(i => i !== img));
  };

  // ── Modal open/close ───────────────────────────────────────────────────────
  // (Now mapping to routing paths)

  const openCreateModal = () => {
    navigate('/samples/new');
  };

  const openEditModal = (sample) => {
    navigate(`/samples/${sample.id}`);
  };

  const closeModal = () => {
    navigate('/samples');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'buyer' && v === '') {
          submitData.append(k, '');
        } else if (v !== '' && v !== null && v !== undefined) {
          submitData.append(k, v);
        }
      });

      let sampleId = editingId;
      if (editingId) {
        await api.patch(`/samples/${editingId}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const res = await api.post('/samples/', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        sampleId = res.data.id;
      }

      // Upload any new images
      const newImages = images.filter(i => i.isNew && i.file);
      for (const img of newImages) {
        const imgData = new FormData();
        imgData.append('sample', sampleId);
        imgData.append('image', img.file);
        await api.post('/sample-images/', imgData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      closeModal();
      fetchSamples();
    } catch (err) {
      console.error('Submit error', err);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
            <ArrowLeft size={18} /> Back to Samples
          </button>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingId ? '✏️ Edit Sample' : '+ Create New Sample'}</h2>
            </div>
            
            <div className="modal-body" style={{ padding: 0 }}>
              <form onSubmit={handleSubmit}>
                {/* ── Images ──────────────────────────────────────────── */}
                <div className="form-section">
                  <h3 className="form-section-title">📷 Images</h3>
                  <ImageGrid
                    images={images}
                    onRemove={handleImageRemove}
                    onPreview={(idx) => setLightboxIndex(idx)}
                  />
                  <label className="image-upload-zone">
                    <Upload size={20} />
                    <span>Click or drag to add images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleImageAdd}
                    />
                  </label>
                </div>

                {/* ── Basic Info ───────────────────────────────────────── */}
                <div className="form-section">
                  <h3 className="form-section-title">📋 Basic Info</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Sample ID *</label>
                      <input required type="text" name="sample_id" className="form-input" value={formData.sample_id} onChange={handleChange} placeholder="e.g. SMP-1021" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Style No.</label>
                      <input type="text" name="style_no" className="form-input" value={formData.style_no} onChange={handleChange} placeholder="e.g. STY-204" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Buyer</label>
                      <select name="buyer" className="form-input" value={formData.buyer} onChange={handleChange}>
                        <option value="">Select Buyer...</option>
                        {buyers.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input required type="text" name="product_name" className="form-input" value={formData.product_name} onChange={handleChange} placeholder="e.g. Walnut Dining Table" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Material *</label>
                      <input required type="text" name="material" className="form-input" value={formData.material} onChange={handleChange} placeholder="e.g. Teak, Walnut, Oak" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Finish / Color *</label>
                      <input required type="text" name="finish_color" className="form-input" value={formData.finish_color} onChange={handleChange} placeholder="e.g. Matte Natural" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CBM</label>
                      <input type="number" step="0.0001" name="cbm" className="form-input" value={formData.cbm} onChange={handleChange} placeholder="e.g. 0.1250" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (USD)</label>
                      <input type="number" step="0.01" name="usd" className="form-input" value={formData.usd} onChange={handleChange} placeholder="e.g. 150.00" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vendor Name</label>
                      <input type="text" name="vendor_name" className="form-input" value={formData.vendor_name} onChange={handleChange} placeholder="e.g. Raj Artisans" />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Remark</label>
                      <textarea name="remark" className="form-input" rows="2" value={formData.remark} onChange={handleChange} placeholder="Any additional notes..." />
                    </div>
                  </div>
                </div>

                {/* ── Dimensions ───────────────────────────────────────── */}
                <div className="form-section">
                  <h3 className="form-section-title">📐 Dimensions</h3>

                  <SizeGroup
                    label="Size (cm)"
                    prefix="size"
                    values={formData}
                    onChange={handleDimChange}
                  />

                  {/* Auto-calculate inches display */}
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', fontSize: '0.9rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Size Length (in)</span>
                      <strong style={{ color: 'var(--text-color)' }}>
                        {formData.size_length ? (parseFloat(formData.size_length) / 2.54).toFixed(2) + ' in' : '—'}
                      </strong>
                    </div>
                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Size Breadth (in)</span>
                      <strong style={{ color: 'var(--text-color)' }}>
                        {formData.size_breadth ? (parseFloat(formData.size_breadth) / 2.54).toFixed(2) + ' in' : '—'}
                      </strong>
                    </div>
                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Size Height (in)</span>
                      <strong style={{ color: 'var(--text-color)' }}>
                        {formData.size_height ? (parseFloat(formData.size_height) / 2.54).toFixed(2) + ' in' : '—'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* ── Actions ──────────────────────────────────────────── */}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Sample'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Bar (Top on Mobile) */}
          <div className="filter-bar">
            <div className="filter-bar-inner">
              <Filter size={16} className="filter-icon" />
              <span className="filter-label">Filter</span>
              <select
                className="filter-input desktop-only"
                value={filterBuyer}
                onChange={e => setFilterBuyer(e.target.value)}
                style={{ minWidth: '150px' }}
              >
                <option value="">All Buyers...</option>
                {buyers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <input
                type="text"
                className="filter-input desktop-only"
                placeholder="Material..."
                value={filterMaterial}
                onChange={e => setFilterMaterial(e.target.value)}
              />
              {(filterBuyer || filterMaterial) && (
                <button
                  className="filter-clear-btn desktop-only"
                  onClick={() => { setFilterBuyer(''); setFilterMaterial(''); }}
                >
                  <X size={14} /> Clear
                </button>
              )}
              
              <select
                className="filter-input"
                value={ordering}
                onChange={e => setOrdering(e.target.value)}
                style={{ minWidth: '130px', marginLeft: 'auto' }}
              >
                <option value="-id">Latest First</option>
                <option value="id">Oldest First</option>
                <option value="product_name">Name (A-Z)</option>
                <option value="-product_name">Name (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Page Header (Contains + Create New) */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0.5rem 1rem' }}>
            <h2 className="desktop-only" style={{ marginRight: 'auto' }}>Samples</h2>
            <button onClick={openCreateModal} className="btn-primary">+ Create New</button>
          </div>

          {/* Table (Desktop) */}
          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedRowIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                  </th>
                  <th>Images</th>
                  <th>Sample ID</th>
                  <th>Style No.</th>
                  <th>Product Name</th>
                  <th>Buyer</th>
                  <th>Material</th>
                  <th>Finish/Color</th>
                  <th>CBM</th>
                  <th>USD ($)</th>
                  <th>Vendor</th>
                  <th>Size (cm)</th>
                  <th>Size (in)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => openEditModal(s)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedRowIds.has(s.id) ? '#dcfce7' : undefined,
                      transition: 'background-color 0.2s ease',
                    }}
                    title="Click to edit"
                  >
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(s.id)}
                        onChange={e => toggleSelectRow(s.id, e)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                      />
                    </td>
                    <td>
                      <div className="table-image-stack">
                        {(s.images || []).slice(0, 3).map((img, idx) => (
                          <img
                            key={img.id}
                            src={img.image_url}
                            alt={s.product_name}
                            className="table-thumb"
                            style={{ zIndex: 3 - idx, marginLeft: idx ? '-10px' : 0 }}
                          />
                        ))}
                        {(s.images || []).length === 0 && (
                          <div className="table-no-img"><ImageIcon size={14} /></div>
                        )}
                        {(s.images || []).length > 3 && (
                          <div className="table-more-imgs">+{s.images.length - 3}</div>
                        )}
                      </div>
                    </td>
                    <td>{s.sample_id}</td>
                    <td>{s.style_no || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td><strong>{s.product_name}</strong></td>
                    <td>{s.buyer_detail?.name || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td>{s.material || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td>{s.finish_color}</td>
                    <td>{s.cbm || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td>{s.usd ? `$${s.usd}` : <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td>{s.vendor_name || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td>
                      {s.size_length && s.size_breadth && s.size_height
                        ? `${s.size_length} × ${s.size_breadth} × ${s.size_height}`
                        : <span style={{color:'var(--text-muted)'}}>—</span>
                      }
                    </td>
                    <td>
                      {s.size_length_inch && s.size_breadth_inch && s.size_height_inch
                        ? `${s.size_length_inch} × ${s.size_breadth_inch} × ${s.size_height_inch}`
                        : <span style={{color:'var(--text-muted)'}}>—</span>
                      }
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="13" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No samples found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="mobile-only mobile-card-list">
            {filtered.map(s => (
              <div 
                className="mobile-card" 
                key={s.id} 
                onClick={() => openEditModal(s)}
                style={{ backgroundColor: selectedRowIds.has(s.id) ? '#f0fdf4' : '#fff' }}
              >
                <div onClick={e => e.stopPropagation()} className="mobile-card-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRowIds.has(s.id)}
                    onChange={e => toggleSelectRow(s.id, e)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                  />
                </div>
                
                <div className="mobile-card-img">
                  {s.images && s.images.length > 0 ? (
                    <img src={s.images[0].image_url} alt="sample" />
                  ) : (
                    <div className="mobile-card-no-img"><ImageIcon size={20} color="#a8a29e" /></div>
                  )}
                </div>
                
                <div className="mobile-card-content">
                  <div className="mobile-card-title">{s.sample_id}</div>
                  <div className="mobile-card-subtitle">{s.style_no || 'No Style No'}</div>
                </div>

                <div className="mobile-card-arrow">
                  <ChevronRight size={20} color="#94a3b8" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No samples found.
              </div>
            )}
          </div>
          
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

export default Samples;
