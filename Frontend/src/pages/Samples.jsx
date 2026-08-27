import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, Upload, ImageIcon, Filter, ArrowLeft, ChevronRight, Package, FileSpreadsheet, Download, AlertCircle, CheckCircle, Trash2, FileText } from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import { OrderBySelect, ORDER_OPTIONS_DATE_PRODUCT } from '../components/OrderBySelect';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useLastVisitedItem } from '../hooks/useLastVisitedItem';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesModal from '../components/UnsavedChangesModal';



// ─── Helpers ──────────────────────────────────────────────────────────────────----

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

function Samples() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [samples, setSamples] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const location = useLocation();

  const {
    isDirty,
    setIsDirty,
    showExitModal,
    confirmExit,
    handleSaveAndExit,
    handleSaveDraft,
    handleDiscardAndExit,
    handleCancelExit,
    currentDraftId,
    setCurrentDraftId,
    clearDraft
  } = useUnsavedChanges({
    formType: 'sample',
    formLabel: 'Sample',
    getFormTitle: (data) => {
      return `Sample ${data?.formData?.style_no || 'New'} - ${data?.formData?.product_name || 'Draft'}`;
    },
    getFormData: () => ({ formData, materialsList, finishesList }),
    targetPath: '/samples/new',
    onSaveForm: async () => {
      const formEl = document.getElementById('sample-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [finishesOptions, setFinishesOptions] = useState([]);

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

  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const hasVisitedItem = sessionStorage.getItem('last_visited_samples');
      const savedPage = sessionStorage.getItem('last_visited_page_samples');
      if (hasVisitedItem && savedPage) return Number(savedPage);
    } catch (e) {}
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  const { lastVisitedId, setHighlightRef } = useLastVisitedItem('samples', id, currentPage);

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

  const [debouncedSearch, setDebouncedSearch] = useState(filterSearch);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filterSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [filterSearch]);

  const fetchSamples = useCallback(() => {
    setLoading(true);
    const params = { page: currentPage, page_size: 50, ordering: ordering };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterBuyer) params.buyer = filterBuyer;
    if (filterMaterial) params.material = filterMaterial;
    api.get('/samples/', { params })
      .then(res => {
        const data = res.data.results || res.data || [];
        setSamples(data);
        setFiltered(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50) || 1);
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [debouncedSearch, filterBuyer, filterMaterial, currentPage, ordering]);

  useEffect(() => {
    fetchBuyers();
    fetchFinishesOptions();
  }, []);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const enterSelectionMode = () => setSelectionMode(true);
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedRowIds(new Set());
  };

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

  const handleBulkDeleteSamples = async () => {
    if (selectedRowIds.size === 0) return;
    setDeletingSelected(true);
    try {
      await api.post('/samples/bulk-delete/', { sample_ids: Array.from(selectedRowIds) });
      setShowBulkDeleteConfirm(false);
      exitSelectionMode();
      fetchSamples();
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(err.response?.data?.error || 'Failed to delete selected samples.');
    } finally {
      setDeletingSelected(false);
    }
  };

  const handleExportSelectedExcel = async () => {
    setExportingExcel(true);
    try {
      const payload = {
        sample_ids: Array.from(selectedRowIds),
        q: debouncedSearch,
        buyer_id: filterBuyer
      };
      const response = await api.post('/samples/export-excel/', payload, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedRowIds.size > 0 ? `Samples_Selected_${selectedRowIds.size}.xlsx` : 'Samples_Catalog.xlsx');
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export samples to Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Reset page when filters change (skip initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
    setSelectedRowIds(new Set());
  }, [debouncedSearch, filterBuyer, filterMaterial, ordering]);

  // Load sample on id change (routing edit) or restore draft
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
      if (location.state?.draftData) {
        if (location.state.draftData.formData) setFormData(location.state.draftData.formData);
        if (location.state.draftData.materialsList) setMaterialsList(location.state.draftData.materialsList);
        if (location.state.draftData.finishesList) setFinishesList(location.state.draftData.finishesList);
        setIsDirty(true);
        if (location.state.draftId) {
          setCurrentDraftId(location.state.draftId);
        }
      } else {
        setFormData(emptyForm);
        setMaterialsList(['']);
        setFinishesList(['']);
        setImages([]);
        setEditingId(null);
      }
    }
  }, [id, location.state]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (formError) setFormError('');
  };

  const handleMaterialItemChange = (idx, value) => {
    setIsDirty(true);
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

      if (currentDraftId) clearDraft(currentDraftId);
      setIsDirty(false);
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
          <div className="form-card-container">
            <div className="modal-header" style={{ padding: 0, marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingId ? '✏️ Edit Sample' : '+ Create New Sample'}</h2>
            </div>
            
            <div className="modal-body" style={{ padding: 0 }}>
              <form id="sample-form" onSubmit={handleSubmit}>
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

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        if (confirmExit('/samples')) closeModal();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ borderColor: '#8b5a2b', color: '#8b5a2b', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => handleSaveDraft()}
                    >
                      <FileText size={16} /> Save as Draft
                    </button>
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

          {/* Page Header (animated: both always in DOM, height via grid-template-rows) */}

          {/* Selection Toolbar — collapses to 0 height when not in selectionMode */}
          <div style={{
            display: 'grid',
            gridTemplateRows: selectionMode ? '1fr' : '0fr',
            transition: 'grid-template-rows 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.25rem',
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                marginBottom: '1rem',
                gap: '1rem',
                flexWrap: 'wrap',
                opacity: selectionMode ? 1 : 0,
                transform: selectionMode ? 'translateY(0)' : 'translateY(-14px)',
                transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Close button — immediate */}
                  <button
                    type="button"
                    onClick={exitSelectionMode}
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff',
                      flexShrink: 0,
                      opacity: selectionMode ? 1 : 0,
                      transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                      transitionDelay: selectionMode ? '0ms' : '0ms',
                    }}
                  >
                    <X size={18} />
                  </button>
                  {/* Count label */}
                  <span style={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    opacity: selectionMode ? 1 : 0,
                    transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDelay: selectionMode ? '20ms' : '0ms',
                  }}>
                    {selectedRowIds.size > 0 ? `${selectedRowIds.size} selected` : 'Select samples'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {/* Select All — stagger 50ms */}
                  <button
                    type="button"
                    onClick={() => setSelectedRowIds(
                      selectedRowIds.size === filtered.length && filtered.length > 0
                        ? new Set()
                        : new Set(filtered.map(s => s.id))
                    )}
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      padding: '0.45rem 1rem',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      opacity: selectionMode ? 1 : 0,
                      transform: selectionMode ? 'translateY(0)' : 'translateY(-6px)',
                      transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                      transitionDelay: selectionMode ? '50ms' : '0ms',
                    }}
                  >
                    {selectedRowIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  {/* Export — stagger 100ms */}
                  <button
                    type="button"
                    onClick={handleExportSelectedExcel}
                    disabled={selectedRowIds.size === 0 || exportingExcel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: selectedRowIds.size > 0 ? '#2563eb' : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.45rem 1.1rem',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: selectedRowIds.size > 0 ? 'pointer' : 'not-allowed',
                      opacity: selectionMode ? (selectedRowIds.size === 0 ? 0.5 : 1) : 0,
                      transform: selectionMode ? 'translateY(0)' : 'translateY(-6px)',
                      transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1), background 150ms ease',
                      transitionDelay: selectionMode ? '100ms' : '0ms',
                    }}
                  >
                    <Download size={15} />
                    {exportingExcel ? 'Exporting...' : 'Export Excel'}
                  </button>
                  {/* Delete — stagger 150ms, only when items selected */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      disabled={selectedRowIds.size === 0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: selectedRowIds.size > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
                        border: selectedRowIds.size > 0 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '0.45rem 1.1rem',
                        color: selectedRowIds.size > 0 ? '#fca5a5' : 'rgba(255,255,255,0.3)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: selectedRowIds.size > 0 ? 'pointer' : 'not-allowed',
                        opacity: selectionMode ? 1 : 0,
                        transform: selectionMode ? 'translateY(0)' : 'translateY(-6px)',
                        transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1), background 150ms ease',
                        transitionDelay: selectionMode ? '150ms' : '0ms',
                      }}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Normal Header — collapses to 0 height when selectionMode is active */}
          <div style={{
            display: 'grid',
            gridTemplateRows: selectionMode ? '0fr' : '1fr',
            transition: 'grid-template-rows 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="page-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0 0.5rem 1rem',
                opacity: selectionMode ? 0 : 1,
                transform: selectionMode ? 'translateY(-10px)' : 'translateY(0)',
                transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={28} color="#dc2626" style={{ flexShrink: 0 }} /> Samples Catalog
                </h2>
                <div className="samples-header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={enterSelectionMode}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', borderRadius: '10px', backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#334155' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-5"/></svg>
                    Select Samples
                  </button>
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
                  {selectionMode && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedRowIds.size === filtered.length}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563eb' }}
                      />
                    </th>
                  )}
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
                  <TableSkeleton rows={8} cols={12} hasImage={true} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No samples found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, idx) => {
                    const isRecentlyVisited = String(s.id) === String(lastVisitedId);
                    return (
                      <tr
                        key={s.id}
                        ref={isRecentlyVisited ? setHighlightRef : null}
                        onClick={() => selectionMode ? toggleSelectRow(s.id) : openEditModal(s)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedRowIds.has(s.id) ? '#eff6ff' : undefined,
                          transition: 'background 0.15s',
                          animationDelay: `${Math.min(idx * 30, 300)}ms`
                        }}
                        className={`table-row-stagger table-fade-slide-up ${isRecentlyVisited ? 'row-recently-visited' : ''}`}
                      >
                        {selectionMode && (
                          <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.has(s.id)}
                              onChange={e => toggleSelectRow(s.id, e)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563eb' }}
                            />
                          </td>
                        )}
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
                        <td>
                          <strong>{s.style_no || s.id}</strong>
                        </td>
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
                    );
                  })
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
              filtered.map(s => {
                const isRecentlyVisited = String(s.id) === String(lastVisitedId);
                return (
                  <div 
                    className={`mobile-card smooth-fade-in ${isRecentlyVisited ? 'card-recently-visited' : ''}`}
                    key={s.id} 
                    ref={isRecentlyVisited ? setHighlightRef : null}
                    onClick={() => openEditModal(s)}
                    style={{ backgroundColor: selectedRowIds.has(s.id) ? '#f0fdf4' : undefined }}
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
                      <div className="mobile-card-title">
                        {s.sample_id}
                      </div>
                      <div className="mobile-card-subtitle">{s.style_no || 'No Style No'}</div>
                    </div>

                    <div className="mobile-card-arrow">
                      <ChevronRight size={20} color="#94a3b8" />
                    </div>
                  </div>
                );
              })
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
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={(e) => {
                      if (!importFile) {
                        document.getElementById('excelFileInput')?.click();
                      } else {
                        handleImportSubmit(e);
                      }
                    }}
                    disabled={importing}
                  >
                    {importing ? 'Processing & Extracting Images...' : importFile ? 'Upload & Import Data' : 'Select & Upload File'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirmation Modal ── */}
      {showBulkDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            textAlign: 'center',
            animation: 'fadeInScale 200ms cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: '#fef2f2', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
            }}>
              <Trash2 size={26} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: '#1c1917' }}>
              Delete {selectedRowIds.size} Sample{selectedRowIds.size !== 1 ? 's' : ''}?
            </h3>
            <p style={{ margin: '0 0 1.75rem', color: '#78716c', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Do you really want to delete{' '}
              <strong style={{ color: '#dc2626' }}>{selectedRowIds.size} sample{selectedRowIds.size !== 1 ? 's' : ''}</strong>?
              {' '}This action <strong>cannot be undone</strong> and will permanently remove all associated images and data.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={deletingSelected}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.65rem 1.25rem', borderRadius: '12px', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteSamples}
                disabled={deletingSelected}
                style={{
                  flex: 1, padding: '0.65rem 1.25rem', borderRadius: '12px',
                  fontWeight: 700, fontSize: '0.9rem',
                  backgroundColor: deletingSelected ? '#fca5a5' : '#ef4444',
                  color: '#ffffff', border: 'none', cursor: deletingSelected ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {deletingSelected ? 'Deleting...' : `Yes, Delete ${selectedRowIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Unsaved Changes Exit Guard Modal */}
      <UnsavedChangesModal
        isOpen={showExitModal}
        title="Unsaved Sample Form Changes"
        message="You have unsaved changes in this Sample form. Would you like to save your Sample or store it as a draft before leaving?"
        onSave={handleSaveAndExit}
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />
    </div>
  );
}

export default Samples;
