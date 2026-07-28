import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, Upload, ImageIcon, Filter, ArrowLeft, ChevronRight, Package, FileSpreadsheet, Download, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import { OrderBySelect, ORDER_OPTIONS_DATE_PRODUCT } from '../components/OrderBySelect';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';



// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm = {
  sample_id: '',
  style_no: '',
  buyer: '',
  finish: '',
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
  const { user, isAdmin } = useAuth();

  const [samples, setSamples] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [finishesOptions, setFinishesOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [formError, setFormError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Multi-item materials and finishes
  const [materialsList, setMaterialsList] = useState(['']);
  const [finishesList, setFinishesList] = useState(['']);

  const parseSlashList = (str) => {
    if (!str || typeof str !== 'string') return [''];
    const parts = str.split(/\s*\/\s*/).map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [''];
  };

  // Images: [{id, image_url, preview, file, isNew}]
  const [images, setImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  // Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importErrorType, setImportErrorType] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/samples/download-template/', { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Samples_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 200);
    } catch (err) {
      console.error('Template download error:', err);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    setImportSuccess('');

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await api.post('/samples/import-excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSuccess(res.data.detail || 'Samples imported successfully!');
      setImportFile(null);
      fetchSamples();
    } catch (err) {
      console.error('Import error:', err);
      const errData = err.response?.data;
      const errMsg = errData?.detail || 'Invalid file format or missing required column headers. Please download expected template below.';
      const errType = errData?.error_type || 'Format Error';
      setImportError(errMsg);
      setImportErrorType(errType);
    } finally {
      setImporting(false);
    }
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchBuyers = () => {
    api.get('/buyers/', { params: { nopage: true } })
      .then(res => setBuyers(res.data))
      .catch(err => console.error(err));
  };

  const fetchFinishesOptions = () => {
    api.get('/finishes/', { params: { nopage: true } })
      .then(res => setFinishesOptions(res.data.results || res.data))
      .catch(err => console.error(err));
  };

  const fetchSamples = useCallback(() => {
    setLoading(true);
    const params = { page: currentPage, ordering: ordering };
    if (filterSearch) params.search = filterSearch;
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
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [filterSearch, filterBuyer, filterMaterial, currentPage, ordering]);

  useEffect(() => {
    fetchBuyers();
    fetchFinishesOptions();
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
          setMaterialsList(parseSlashList(sample.material));
          setFinishesList(parseSlashList(sample.finish_color));
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
      setMaterialsList(['']);
      setFinishesList(['']);
      setImages([]);
      setEditingId(null);
    }
  }, [id]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (formError) setFormError('');
  };

  const handleMaterialItemChange = (idx, value) => {
    const next = [...materialsList];
    next[idx] = value;
    setMaterialsList(next);
  };
  const addMaterialField = () => setMaterialsList(prev => [...prev, '']);
  const removeMaterialField = (idx) => setMaterialsList(prev => prev.filter((_, i) => i !== idx));

  const handleFinishItemChange = (idx, value) => {
    const next = [...finishesList];
    next[idx] = value;
    setFinishesList(next);
  };
  const addFinishField = () => setFinishesList(prev => [...prev, '']);
  const removeFinishField = (idx) => setFinishesList(prev => prev.filter((_, i) => i !== idx));

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

  const confirmDelete = async () => {
    if (!editingId) return;
    setSubmitting(true);
    try {
      await api.delete(`/samples/${editingId}/`);
      setShowDeleteConfirm(false);
      closeModal();
      fetchSamples();
    } catch (err) {
      console.error('Failed to delete sample:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Modal open/close ───────────────────────────────────────────────────────
  // (Now mapping to routing paths)

  const openCreateModal = () => {
    setFormError('');
    navigate('/samples/new');
  };

  const openEditModal = (sample) => {
    setFormError('');
    navigate(`/samples/${sample.id}`);
  };

  const closeModal = () => {
    setFormError('');
    setShowDeleteConfirm(false);
    navigate('/samples');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-check for duplicate style_no
    const styleNo = formData.style_no?.trim();
    if (styleNo) {
      const duplicate = samples.find(s =>
        s.style_no &&
        s.style_no.trim().toLowerCase() === styleNo.toLowerCase() &&
        String(s.id) !== String(editingId || '')
      );
      if (duplicate) {
        setFormError(`Style No. '${styleNo}' already exists in Samples Catalog.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const materialJoined = materialsList.map(m => m.trim()).filter(Boolean).join('/');
      const finishJoined = finishesList.map(f => f.trim()).filter(Boolean).join(' / ');

      const updatedFormData = {
        ...formData,
        sample_id: formData.style_no || formData.sample_id || `SMP-${Date.now()}`,
        material: materialJoined,
        finish_color: finishJoined,
      };

      const submitData = new FormData();
      Object.entries(updatedFormData).forEach(([k, v]) => {
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
      if (err.response?.data?.style_no) {
        const msg = Array.isArray(err.response.data.style_no)
          ? err.response.data.style_no[0]
          : err.response.data.style_no;
        setFormError(msg || `Style No. '${formData.style_no}' already exists in Samples Catalog.`);
      } else if (err.response?.data?.detail) {
        setFormError(err.response.data.detail);
      } else {
        setFormError('Failed to save sample. Please check your inputs.');
      }
    } finally {
      setSubmitting(false);
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

          <div className="form-card-container">
            <div className="modal-header" style={{ padding: 0, marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingId ? '✏️ Edit Sample' : '+ Create New Sample'}</h2>
            </div>
            
            <div className="modal-body" style={{ padding: 0 }}>
              <form onSubmit={handleSubmit}>
                {formError && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    color: '#991b1b',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}
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
                      <label className="form-label">Style No. *</label>
                      <input required type="text" name="style_no" className="form-input" value={formData.style_no} onChange={handleChange} placeholder="e.g. STY-204" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Buyer</label>
                      <CustomSelect
                        name="buyer"
                        value={formData.buyer}
                        onChange={handleChange}
                        options={[
                          { value: '', label: 'Select Buyer...' },
                          ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                        ]}
                        placeholder="Select Buyer..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input required type="text" name="product_name" className="form-input" value={formData.product_name} onChange={handleChange} placeholder="e.g. Walnut Dining Table" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Finish (Catalog Reference)</label>
                      <CustomSelect
                        name="finish"
                        value={formData.finish || ''}
                        onChange={handleChange}
                        options={[
                          { value: '', label: 'Select Registered Finish...' },
                          ...finishesOptions.map(f => ({
                            value: f.id,
                            label: `${f.finish_code ? `[${f.finish_code}] ` : ''}${f.name} (${f.color || f.wood_type || 'Catalog'})`
                          }))
                        ]}
                        placeholder="Select Registered Finish..."
                      />
                    </div>

                    {/* ── Material(s) ── */}
                    <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f9fafb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Material(s) *</label>
                        <button
                          type="button"
                          onClick={addMaterialField}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', background: '#fff' }}
                        >
                          + Add Material
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {materialsList.map((mat, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              required={idx === 0}
                              type="text"
                              className="form-input"
                              value={mat}
                              onChange={e => handleMaterialItemChange(idx, e.target.value)}
                              placeholder={`Material ${idx + 1} (e.g. ${idx === 0 ? 'Mango' : 'Silk'})`}
                            />
                            {materialsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMaterialField(idx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                title="Remove Material"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Finish / Color(s) ── */}
                    <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f9fafb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Finish / Color(s) *</label>
                        <button
                          type="button"
                          onClick={addFinishField}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', background: '#fff' }}
                        >
                          + Add Finish
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {finishesList.map((fin, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              required={idx === 0}
                              type="text"
                              className="form-input"
                              value={fin}
                              onChange={e => handleFinishItemChange(idx, e.target.value)}
                              placeholder={`Finish ${idx + 1} (e.g. ${idx === 0 ? 'Sand Blast Natural' : 'Fabric 1557 Linen'})`}
                            />
                            {finishesList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFinishField(idx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                title="Remove Finish"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
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
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.15rem', borderTop: '1px solid #f1f5f9', gap: '1rem' }}>
                  <div>
                    {editingId && isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          backgroundColor: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fca5a5',
                          padding: '0.55rem 1.1rem',
                          borderRadius: '10px',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      >
                        <Trash2 size={16} /> Delete Sample
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={submitting}>
                      {submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Sample')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '1.75rem',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  backgroundColor: '#fee2e2', color: '#dc2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}>
                  <Trash2 size={26} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#1c1917' }}>Delete Sample?</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#78716c', lineHeight: 1.5 }}>
                  Are you sure you want to delete <strong>{formData.style_no || formData.product_name}</strong>? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.65rem 1rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    style={{
                      flex: 1,
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.65rem 1rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {submitting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <style>{`
            @media (max-width: 768px) {
              .samples-header-actions {
                width: 100% !important;
                display: flex !important;
                gap: 0.5rem !important;
              }

              .samples-header-actions button {
                flex: 1 !important;
                justify-content: center !important;
              }

              .samples-filter-bar-inner {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 0.5rem !important;
              }

              .samples-filter-search-wrap {
                max-width: 100% !important;
                width: 100% !important;
                height: 42px !important;
                max-height: 42px !important;
                flex: none !important;
                box-sizing: border-box !important;
              }

              .samples-filter-dropdowns-wrap {
                width: 100% !important;
                display: flex !important;
                gap: 0.5rem !important;
              }

              .samples-filter-dropdowns-wrap select,
              .samples-filter-dropdowns-wrap input {
                flex: 1 !important;
                min-width: 0 !important;
                width: 100% !important;
              }

              .samples-orderby-wrap {
                width: 100% !important;
                margin-left: 0 !important;
              }

              .samples-orderby-wrap > div {
                width: 100% !important;
              }
            }
          `}</style>

          {/* Page Header (Contains Import Excel & + Create New) */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '0 0.5rem 1rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={28} color="#dc2626" style={{ flexShrink: 0 }} /> Samples Catalog
            </h2>
            <div className="samples-header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsImportModalOpen(true); setImportError(''); setImportSuccess(''); setImportFile(null); }} 
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fdf4e7', borderColor: '#d6c7b2', color: '#8b5a2b', fontWeight: 600, cursor: 'pointer' }}
              >
                <FileSpreadsheet size={16} color="#8b5a2b" /> Import Excel
              </button>
              <button onClick={openCreateModal} className="btn-primary">+ Create New</button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="filter-bar-inner samples-filter-bar-inner" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div className="samples-filter-search-wrap" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0 0.75rem', backgroundColor: '#ffffff', flex: '1 1 240px', maxWidth: '380px', height: '42px', boxSizing: 'border-box' }}>
                <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '0.4rem', flexShrink: 0 }} />
                <input
                  type="text"
                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.875rem' }}
                  placeholder="Search by style or product..."
                  value={filterSearch}
                  onChange={e => { setFilterSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <div className="samples-filter-dropdowns-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Filter size={16} className="filter-icon" />
                <span className="filter-label">Filter</span>
                <CustomSelect
                  value={filterBuyer}
                  onChange={e => {
                    const val = e.target ? e.target.value : e;
                    setFilterBuyer(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '', label: 'All Buyers...' },
                    ...buyers.map(b => ({ value: b.id, label: b.name }))
                  ]}
                  placeholder="All Buyers..."
                  style={{ minWidth: '160px' }}
                />
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Material..."
                  value={filterMaterial}
                  onChange={e => { setFilterMaterial(e.target.value); setCurrentPage(1); }}
                  style={{ minWidth: '110px', width: '130px', borderRadius: '10px' }}
                />
                {(filterBuyer || filterMaterial || filterSearch) && (
                  <button
                    className="filter-clear-btn"
                    onClick={() => { setFilterBuyer(''); setFilterMaterial(''); setFilterSearch(''); setCurrentPage(1); }}
                  >
                    <X size={14} /> Clear
                  </button>
                )}
              </div>
              
              <div className="samples-orderby-wrap" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <OrderBySelect
                  options={ORDER_OPTIONS_DATE_PRODUCT}
                  value={ordering}
                  onChange={setOrdering}
                  width="200px"
                />
              </div>
            </div>
          </div>

          {/* Table (Desktop) */}
          <div className="table-container desktop-only">
            <table className="data-table table-fade-slide-up">
              <thead>
                <tr>
                  <th>Images</th>
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
                {loading ? (
                  <TableSkeleton rows={8} cols={11} hasImage={true} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No samples found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <tr 
                      key={s.id} 
                      onClick={() => openEditModal(s)} 
                      style={{ cursor: 'pointer' }}
                      className="table-fade-slide-up"
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
                      <td><strong>{s.style_no || s.id}</strong></td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="mobile-only mobile-card-list">
            {loading ? (
              <CardSkeleton count={5} />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No samples found.
              </div>
            ) : (
              filtered.map(s => (
                <div 
                  className="mobile-card smooth-fade-in" 
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
              ))
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
      {/* ── Excel Import Modal ── */}
      {isImportModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsImportModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '540px', 
              width: '95vw',
              backgroundColor: '#ffffff', 
              borderRadius: '16px',
              padding: '1.25rem 1rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <FileSpreadsheet size={22} color="#8b5a2b" /> Import Samples via Excel
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: '1.25rem' }}>
              <style>{`
                @keyframes errorShakeSlide {
                  0% { opacity: 0; transform: translateY(-12px) scale(0.97); }
                  30% { opacity: 1; transform: translateY(0) scale(1); }
                  45% { transform: translateX(-6px); }
                  60% { transform: translateX(6px); }
                  75% { transform: translateX(-3px); }
                  90% { transform: translateX(3px); }
                  100% { transform: translateX(0); }
                }
              `}</style>

              {/* Template Download Alert (ONLY shown when there is NO error) */}
              {!importError && !importSuccess && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Need the expected Excel format?</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Download pre-formatted template with headers & examples.</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    <Download size={14} /> Download Template
                  </button>
                </div>
              )}

              {/* Error Alert Box with Motion & Shake Animation */}
              {importError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  marginBottom: '1.25rem',
                  animation: 'errorShakeSlide 0.45s ease-in-out forwards',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.14)'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.95rem' }}>Invalid File or Format</span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {importErrorType || 'Schema Error'}
                        </span>
                      </div>
                      <div style={{ color: '#7f1d1d', fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.45, fontWeight: 500 }}>
                        {importError}
                      </div>
                      <div style={{ marginTop: '0.9rem' }}>
                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#b91c1c'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc2626'}
                        >
                          <Download size={15} /> Download Expected Excel Template
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Alert Box */}
              {importSuccess && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', color: '#166534', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} color="#16a34a" /> {importSuccess}
                </div>
              )}

              {/* Upload Form */}
              <form onSubmit={handleImportSubmit}>
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.75rem 1rem', textAlign: 'center', backgroundColor: '#faf6f0', cursor: 'pointer' }}
                  onClick={() => document.getElementById('excelFileInput').click()}
                >
                  <FileSpreadsheet size={36} color="#8b5a2b" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                    {importFile ? importFile.name : 'Click to upload or drag & drop Excel file (.xlsx)'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Includes automatic high-quality cell image extraction
                  </div>
                  <input
                    id="excelFileInput"
                    type="file"
                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setImportFile(e.target.files[0]);
                        setImportError('');
                        setImportSuccess('');
                      }
                    }}
                  />
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsImportModalOpen(false)}>Close</button>
                  <button type="submit" className="btn-primary" disabled={!importFile || importing}>
                    {importing ? 'Processing & Extracting Images...' : 'Upload & Import Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Samples;
