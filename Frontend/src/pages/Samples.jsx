import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { X, Upload, ImageIcon, Filter } from 'lucide-react';


// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm = {
  sample_id: '',
  style_no: '',
  buyer_code: '',
  product_name: '',
  wood_type: '',
  finish_color: '',
  remark: '',
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
  const [samples, setSamples] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // Images: [{id, image_url, preview, file, isNew}]
  const [images, setImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Filters
  const [filterBuyer, setFilterBuyer] = useState('');
  const [filterWood, setFilterWood] = useState('');
  const [filtered, setFiltered] = useState([]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSamples = useCallback(() => {
    const params = {};
    if (filterBuyer) params.buyer_code = filterBuyer;
    if (filterWood) params.wood_type = filterWood;
    api.get('/samples/', { params })
      .then(res => {
        setSamples(res.data);
        setFiltered(res.data);
      })
      .catch(err => console.error(err));
  }, [filterBuyer, filterWood]);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  // Local filter (instant feedback while typing)
  useEffect(() => {
    let f = samples;
    if (filterBuyer) f = f.filter(s => s.buyer_code.toLowerCase().includes(filterBuyer.toLowerCase()));
    if (filterWood)  f = f.filter(s => s.wood_type.toLowerCase().includes(filterWood.toLowerCase()));
    setFiltered(f);
  }, [filterBuyer, filterWood, samples]);

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

  const openCreateModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (sample) => {
    setFormData({
      sample_id: sample.sample_id ?? '',
      style_no: sample.style_no ?? '',
      buyer_code: sample.buyer_code ?? '',
      product_name: sample.product_name ?? '',
      wood_type: sample.wood_type ?? '',
      finish_color: sample.finish_color ?? '',
      remark: sample.remark ?? '',
      size_length: sample.size_length ?? '',
      size_breadth: sample.size_breadth ?? '',
      size_height: sample.size_height ?? '',
    });
    setEditingId(sample.id);
    // Load existing server images
    const existingImgs = (sample.images || []).map(img => ({
      id: img.id,
      image_url: img.image_url,
      preview: null,
      file: null,
      isNew: false,
    }));
    setImages(existingImgs);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setImages([]);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
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
      {/* Page Header */}
      <div className="page-header">
        <h2>Samples</h2>
        <button onClick={openCreateModal} className="btn-primary">+ Create New</button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-bar-inner">
          <Filter size={16} className="filter-icon" />
          <span className="filter-label">Filter:</span>
          <input
            type="text"
            className="filter-input"
            placeholder="Buyer Code..."
            value={filterBuyer}
            onChange={e => setFilterBuyer(e.target.value)}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="Wood Type..."
            value={filterWood}
            onChange={e => setFilterWood(e.target.value)}
          />
          {(filterBuyer || filterWood) && (
            <button
              className="filter-clear-btn"
              onClick={() => { setFilterBuyer(''); setFilterWood(''); }}
            >
              <X size={14} /> Clear
            </button>
          )}
          <span className="filter-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Images</th>
              <th>Sample ID</th>
              <th>Style No.</th>
              <th>Product Name</th>
              <th>Buyer Code</th>
              <th>Wood Type</th>
              <th>Finish/Color</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr
                key={s.id}
                onClick={() => openEditModal(s)}
                style={{ cursor: 'pointer' }}
                title="Click to edit"
              >
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
                <td>{s.buyer_code}</td>
                <td>{s.wood_type}</td>
                <td>{s.finish_color}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No samples found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ Edit Sample' : '+ Create New Sample'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>

            <div className="modal-body">
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
                      <label className="form-label">Buyer Code *</label>
                      <input required type="text" name="buyer_code" className="form-input" value={formData.buyer_code} onChange={handleChange} placeholder="e.g. BYR-001" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input required type="text" name="product_name" className="form-input" value={formData.product_name} onChange={handleChange} placeholder="e.g. Walnut Dining Table" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Wood Type *</label>
                      <input required type="text" name="wood_type" className="form-input" value={formData.wood_type} onChange={handleChange} placeholder="e.g. Teak, Walnut, Oak" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Finish / Color *</label>
                      <input required type="text" name="finish_color" className="form-input" value={formData.finish_color} onChange={handleChange} placeholder="e.g. Matte Natural" />
                    </div>
                    <div className="form-group">
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
