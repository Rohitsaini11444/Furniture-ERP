import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { 
  X, Upload, Sparkles, Filter, Search, ArrowLeft, Download, 
  Trash2, Edit3, Eye, CheckCircle, AlertCircle, Palette, Layers, FileSpreadsheet
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { OrderBySelect } from '../components/OrderBySelect';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';

const emptyFinishForm = {
  name: '',
  finish_code: '',
  color: '',
  wood_type: '',
};

const WOOD_TYPES = [
  'Acacia Wood',
  'Mango Wood',
  'Sheesham Wood',
  'Teak Wood',
  'Oak Wood',
  'Pine Wood',
  'Rubber Wood',
  'Reclaimed Wood',
  'MDF / Engineered Wood',
  'Plywood',
  'Other'
];

const ORDER_OPTIONS_FINISH = [
  { value: '-created_at', label: 'Latest First' },
  { value: 'created_at', label: 'Oldest First' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: '-name', label: 'Name (Z-A)' },
  { value: 'finish_code', label: 'Code (A-Z)' },
];

// Custom 3x3 Dot Grid Matrix Icon matching exact mockup image
function DotGridIcon({ color = "#9a5323", size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="3" cy="3" r="1.5" fill={color} />
      <circle cx="8" cy="3" r="1.5" fill={color} />
      <circle cx="13" cy="3" r="1.5" fill={color} />
      <circle cx="3" cy="8" r="1.5" fill={color} />
      <circle cx="8" cy="8" r="1.5" fill={color} />
      <circle cx="13" cy="8" r="1.5" fill={color} />
      <circle cx="3" cy="13" r="1.5" fill={color} />
      <circle cx="8" cy="13" r="1.5" fill={color} />
      <circle cx="13" cy="13" r="1.5" fill={color} />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="finish-card-skeleton" style={{
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      border: '1px solid #f1f5f9',
      padding: '1.15rem 1.25rem',
      display: 'flex',
      gap: '1.15rem',
      alignItems: 'center',
      boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
    }}>
      {/* Left Skeleton Image */}
      <div className="finish-skeleton-pulse finish-swatch-box" style={{ width: '135px', height: '135px', borderRadius: '18px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
      
      {/* Right Skeleton Lines */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div className="finish-skeleton-pulse" style={{ width: '75px', height: '22px', borderRadius: '8px', backgroundColor: '#e2e8f0' }} />
        <div className="finish-skeleton-pulse" style={{ width: '85%', height: '24px', borderRadius: '6px', backgroundColor: '#e2e8f0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem' }}>
          <div className="finish-skeleton-pulse finish-icon-circle" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e2e8f0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            <div className="finish-skeleton-pulse" style={{ width: '40px', height: '11px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
            <div className="finish-skeleton-pulse" style={{ width: '85px', height: '15px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
          </div>
        </div>
        <div style={{ borderTop: '1px solid #f1f5f9' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="finish-skeleton-pulse finish-icon-circle" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e2e8f0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            <div className="finish-skeleton-pulse" style={{ width: '45px', height: '11px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
            <div className="finish-skeleton-pulse" style={{ width: '70px', height: '15px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Finishing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [finishes, setFinishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyFinishForm);

  // Image handling
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWoodType, setFilterWoodType] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Prompt confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Multi-Selection, Excel Export & Import states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFinishIds, setSelectedFinishIds] = useState(new Set());
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const finishFileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const [importError, setImportError] = useState('');

  const enterSelectionMode = () => setSelectionMode(true);
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedFinishIds(new Set());
  };

  const handleBulkDeleteFinishes = async () => {
    if (selectedFinishIds.size === 0) return;
    setDeletingSelected(true);
    try {
      await api.post('/finishes/bulk-delete/', { finish_ids: Array.from(selectedFinishIds) });
      setShowBulkDeleteConfirm(false);
      exitSelectionMode();
      fetchFinishes();
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(err.response?.data?.error || 'Failed to delete selected finishes.');
    } finally {
      setDeletingSelected(false);
    }
  };

  const toggleSelectFinish = (finishId, e) => {
    if (e) e.stopPropagation();
    setSelectedFinishIds(prev => {
      const next = new Set(prev);
      if (next.has(finishId)) next.delete(finishId);
      else next.add(finishId);
      return next;
    });
  };

  const toggleSelectAllFinishes = () => {
    if (selectedFinishIds.size === finishes.length && finishes.length > 0) {
      setSelectedFinishIds(new Set());
    } else {
      setSelectedFinishIds(new Set(finishes.map(f => f.id)));
    }
  };

  const handleExportSelectedExcel = async () => {
    setExportingExcel(true);
    try {
      const payload = {
        finish_ids: Array.from(selectedFinishIds),
        q: searchTerm
      };
      const response = await api.post('/finishes/export-excel/', payload, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedFinishIds.size > 0 ? `Finishes_Selected_${selectedFinishIds.size}.xlsx` : 'Finishing_Catalog.xlsx');
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Finish export error:', err);
      alert('Failed to export finishes to Excel.');
    } finally {
      setExportingExcel(false);
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
      const res = await api.post('/finishes/import-excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSuccess(res.data.message || 'Finishes imported successfully!');
      setImportFile(null);
      fetchFinishes();
    } catch (err) {
      console.error('Import error:', err);
      setImportError(err.response?.data?.error || 'Failed to import finishes file.');
    } finally {
      setImporting(false);
    }
  };

  const isDetailPage = Boolean(id);

  // ── Fetch Finishes ─────────────────────────────────────────────────────────

  const fetchFinishes = useCallback(() => {
    setLoading(true);
    const params = { page: currentPage, ordering };
    if (searchTerm) params.search = searchTerm;
    if (filterWoodType) params.wood_type = filterWoodType;

    api.get('/finishes/', { params })
      .then(res => {
        const data = res.data.results || res.data;
        setFinishes(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 20));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Error fetching finishes:', err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering, searchTerm, filterWoodType]);

  useEffect(() => {
    fetchFinishes();
  }, [fetchFinishes]);

  // Handle URL parameter for detail/edit page
  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/finishes/${id}/`)
        .then(res => {
          const f = res.data;
          setEditingId(f.id);
          setFormData({
            name: f.name || '',
            finish_code: f.finish_code || '',
            color: f.color || '',
            wood_type: f.wood_type || '',
          });
          setImagePreview(f.image_url || f.image);
        })
        .catch(err => {
          console.error('Error loading finish detail:', err);
          navigate('/finishing');
        });
    } else if (id === 'new') {
      setEditingId(null);
      setFormData(emptyFinishForm);
      setImageFile(null);
      setImagePreview(null);
    }
  }, [id, navigate]);

  // ── Form Handlers ──────────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-check for duplicate finish code
    const code = formData.finish_code?.trim();
    if (code) {
      const duplicate = finishes.find(f =>
        f.finish_code &&
        f.finish_code.trim().toLowerCase() === code.toLowerCase() &&
        String(f.id) !== String(editingId || '')
      );
      if (duplicate) {
        setFormError('Finish Code of this finish is already present.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          submitData.append(key, val);
        }
      });

      if (imageFile) {
        submitData.append('image', imageFile);
      }

      if (editingId) {
        await api.patch(`/finishes/${editingId}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/finishes/', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate('/finishing');
      fetchFinishes();
    } catch (err) {
      console.error('Failed to save finish:', err);
      if (err.response?.data?.finish_code) {
        const msg = Array.isArray(err.response.data.finish_code)
          ? err.response.data.finish_code[0]
          : err.response.data.finish_code;
        setFormError(msg || 'Finish Code of this finish is already present.');
      } else if (err.response?.data?.detail) {
        setFormError(err.response.data.detail);
      } else {
        setFormError('Failed to save finish. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!editingId) return;
    setSubmitting(true);
    try {
      await api.delete(`/finishes/${editingId}/`);
      setShowDeleteConfirm(false);
      navigate('/finishing');
      fetchFinishes();
    } catch (err) {
      console.error('Failed to delete finish:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render Detail / Edit View Page ─────────────────────────────────────────

  if (isDetailPage) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '3rem', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes finishPageFade {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .finish-detail-page {
            animation: finishPageFade 0.25s ease-out forwards;
          }

          @media (max-width: 640px) {
            .finish-detail-card {
              padding: 1.15rem !important;
              border-radius: 16px !important;
            }
            .finish-upload-container {
              flex-direction: column !important;
              align-items: center !important;
              text-align: center !important;
            }
            .finish-action-bar {
              flex-direction: column-reverse !important;
              align-items: stretch !important;
              gap: 0.75rem !important;
            }
            .finish-action-bar > div {
              width: 100% !important;
              display: flex !important;
            }
            .finish-action-bar button {
              flex: 1 !important;
              justify-content: center !important;
            }
          }
        `}</style>

        <div className="finish-detail-page">
          {/* Form Card */}
          <div className="finish-detail-card" style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #f1f5f9',
            padding: '1.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1c1917', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={22} color="#9a5323" />
                {editingId ? `Edit Finish (${formData.finish_code || 'Details'})` : 'Add New Finish'}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Error Alert Banner */}
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

              {/* Image Upload Box */}
              <div className="form-group" style={{ marginBottom: '1.35rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#1c1917' }}>Finish Image / Swatch</label>
                <div className="finish-upload-container" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{
                    width: '130px',
                    height: '130px',
                    borderRadius: '18px',
                    backgroundColor: '#faf6f0',
                    border: '2px dashed #e6ded3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Palette size={34} color="#9a5323" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.55rem 1rem', fontSize: '0.85rem', borderRadius: '10px' }}>
                      <Upload size={15} /> Choose Swatch Photo
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                    </label>
                    <div style={{ fontSize: '0.78rem', color: '#78716c', marginTop: '6px', lineHeight: 1.4 }}>
                      High resolution PNG, JPG or WEBP image demonstrating wood texture and grain.
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.15rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 650 }}>Finish Name *</label>
                  <input
                    required
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g. Smokey Grey PU"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 650 }}>Finish Code *</label>
                  <input
                    required
                    type="text"
                    name="finish_code"
                    className="form-input"
                    placeholder="e.g. FIN-109"
                    value={formData.finish_code}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 650 }}>Color</label>
                  <input
                    type="text"
                    name="color"
                    className="form-input"
                    placeholder="e.g. Smokey Grey"
                    value={formData.color}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 650 }}>Wood Type</label>
                  <CustomSelect
                    name="wood_type"
                    value={formData.wood_type}
                    onChange={handleInputChange}
                    options={[
                      { value: '', label: 'Select Wood Type...' },
                      ...WOOD_TYPES.map(w => ({ value: w, label: w }))
                    ]}
                    placeholder="Select Wood Type..."
                  />
                </div>
              </div>

              {/* Action Bar: Delete (Left) | Cancel & Save (Right) */}
              <div className="finish-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.15rem', borderTop: '1px solid #f1f5f9', gap: '1rem' }}>
                <div>
                  {editingId && isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        borderRadius: '10px',
                        padding: '0.55rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    >
                      <Trash2 size={16} /> Delete Finish
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate('/finishing')}
                    style={{ padding: '0.55rem 1.15rem', borderRadius: '10px', fontWeight: 650 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting}
                    style={{ padding: '0.55rem 1.35rem', borderRadius: '10px', fontWeight: 700, backgroundColor: '#9a5323' }}
                  >
                    {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Finish'}
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
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
            padding: '1rem'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '430px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <AlertCircle size={26} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800, color: '#1c1917' }}>
                Are you sure wants to delete this finishing?
              </h3>
              <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#78716c', lineHeight: 1.4 }}>
                This action cannot be undone. All linked samples will clear their finish catalog reference.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', fontWeight: 650 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
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
    );
  }

  // ── Render Finishing Catalog Main List ─────────────────────────────────────

  return (
    <div style={{ paddingBottom: '2.5rem', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Import Google Font & User-Requested Staggered Fade Up Keyframe Animation */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        @keyframes finishSkeletonShimmer {
          0% { opacity: 0.45; }
          50% { opacity: 0.9; }
          100% { opacity: 0.45; }
        }
        .finish-skeleton-pulse {
          animation: finishSkeletonShimmer 1.4s ease-in-out infinite;
        }

        /* ── Staggered Fade Up Animation ── */
        @keyframes staggeredFadeUp {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .finish-card-animated {
          opacity: 0;
          animation: staggeredFadeUp 350ms ease-out forwards;
        }

        /* Responsive Grid: Exactly 3 cards per row on desktop */
        .finishing-grid-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-top: 0.6rem;
        }

        @media (max-width: 1200px) {
          .finishing-grid-container {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }

        @media (max-width: 768px) {
          .finishing-grid-container {
            grid-template-columns: 1fr;
            gap: 0.9rem;
          }

          .finish-card-animated, .finish-card-skeleton {
            padding: 0.95rem 1rem !important;
            gap: 0.85rem !important;
            border-radius: 20px !important;
          }

          .finish-swatch-box {
            width: 105px !important;
            height: 105px !important;
            border-radius: 16px !important;
          }

          .finish-card-title {
            font-size: 1.18rem !important;
          }

          .filter-bar-inner {
            flex-direction: column;
            align-items: stretch !important;
            gap: 0.5rem !important;
          }

          .filter-search-wrap {
            max-width: 100% !important;
            width: 100% !important;
            height: 42px !important;
            max-height: 42px !important;
            flex: none !important;
          }

          .filter-dropdowns-wrap {
            width: 100% !important;
            display: flex;
            gap: 0.5rem;
          }

          .filter-dropdowns-wrap select {
            flex: 1;
            min-width: 0 !important;
          }

          .orderby-wrap {
            width: 100% !important;
            margin-left: 0 !important;
          }

          .orderby-wrap > div {
            width: 100% !important;
          }
        }

        @media (max-width: 480px) {
          .finish-card-animated, .finish-card-skeleton {
            padding: 0.85rem 0.9rem !important;
            gap: 0.75rem !important;
          }

          .finish-swatch-box {
            width: 95px !important;
            height: 95px !important;
            border-radius: 14px !important;
          }

          .finish-card-title {
            font-size: 1.08rem !important;
          }

          .finish-icon-circle {
            width: 30px !important;
            height: 30px !important;
          }

          .finish-row-val {
            font-size: 0.82rem !important;
          }

          .finish-row-lbl {
            font-size: 0.68rem !important;
          }
        }
      `}</style>
      <style>{`
        @keyframes checkboxFadeIn {
          from { opacity: 0; transform: scale(0.55); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Page Header (animated: both always in DOM, height via grid-template-rows) ── */}

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
              {/* Close button — appears immediately */}
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
                {selectedFinishIds.size > 0 ? `${selectedFinishIds.size} selected` : 'Select finishes'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Select All — stagger 50ms */}
              <button
                type="button"
                onClick={toggleSelectAllFinishes}
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
                {selectedFinishIds.size === finishes.length && finishes.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              {/* Export — stagger 100ms */}
              <button
                type="button"
                onClick={handleExportSelectedExcel}
                disabled={selectedFinishIds.size === 0 || exportingExcel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: selectedFinishIds.size > 0 ? '#b45309' : 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.45rem 1.1rem',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: selectedFinishIds.size > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectionMode ? (selectedFinishIds.size === 0 ? 0.5 : 1) : 0,
                  transform: selectionMode ? 'translateY(0)' : 'translateY(-6px)',
                  transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1), background 150ms ease',
                  transitionDelay: selectionMode ? '100ms' : '0ms',
                }}
              >
                <Download size={15} />
                {exportingExcel ? 'Exporting...' : 'Export Excel'}
              </button>
              {/* Delete — stagger 150ms */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={selectedFinishIds.size === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: selectedFinishIds.size > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
                    border: selectedFinishIds.size > 0 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '0.45rem 1.1rem',
                    color: selectedFinishIds.size > 0 ? '#fca5a5' : 'rgba(255,255,255,0.3)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: selectedFinishIds.size > 0 ? 'pointer' : 'not-allowed',
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
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.45rem', fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>
              <Sparkles size={26} color="#9a5323" style={{ flexShrink: 0 }} /> Finishing Catalog
              <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fff2e2', color: '#9a5323', padding: '2px 10px', borderRadius: '999px', marginLeft: '0.25rem' }}>
                {finishes.length} Finishes
              </span>
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={enterSelectionMode}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', borderRadius: '10px', backgroundColor: '#fdf4e7', borderColor: '#d6c7b2', color: '#8b5a2b' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-5"/></svg>
                Select Finishes
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => { setIsImportModalOpen(true); setImportError(''); setImportSuccess(''); setImportFile(null); }}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fdf4e7', borderColor: '#d6c7b2', color: '#8b5a2b', fontWeight: 600, cursor: 'pointer', borderRadius: '10px' }}
                  >
                    <FileSpreadsheet size={16} color="#8b5a2b" /> Import Excel
                  </button>
                  <button onClick={() => navigate('/finishing/new')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px', fontWeight: 700, backgroundColor: '#9a5323' }}>
                    + Add New Finish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* ── Filter / Search Bar ── */}
      <div className="filter-bar">
        <div className="filter-bar-inner" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Search Box */}
          <div className="filter-search-wrap" style={{ display: 'flex', alignItems: 'center', border: '1px solid #e6ded3', borderRadius: '10px', padding: '0 0.75rem', backgroundColor: '#ffffff', flex: '1 1 240px', maxWidth: '380px', height: '42px', boxSizing: 'border-box' }}>
            <Search size={16} style={{ color: '#a8a29e', marginRight: '0.4rem', flexShrink: 0 }} />
            <input
              type="text"
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem' }}
              placeholder="Search finish name, code, color..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="filter-dropdowns-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Filter size={15} className="filter-icon" style={{ color: '#78716c' }} />
            <CustomSelect
              value={filterWoodType}
              onChange={e => {
                const val = e.target ? e.target.value : e;
                setFilterWoodType(val);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: 'All Wood Types' },
                ...WOOD_TYPES.map(w => ({ value: w, label: w }))
              ]}
              placeholder="All Wood Types"
              style={{ minWidth: '160px' }}
            />

            {(searchTerm || filterWoodType) && (
              <button
                className="filter-clear-btn"
                onClick={() => { setSearchTerm(''); setFilterWoodType(''); setCurrentPage(1); }}
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* Order By */}
          <div className="orderby-wrap" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <OrderBySelect
              options={ORDER_OPTIONS_FINISH}
              value={ordering}
              onChange={setOrdering}
              width="180px"
            />
          </div>
        </div>
      </div>

      {/* ── Hollow Skeleton Loading State (3 cards per row) ── */}
      {loading ? (
        <div className="finishing-grid-container">
          {[0, 1, 2, 3, 4, 5].map(idx => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : finishes.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '3.5rem 1.5rem', textAlign: 'center', border: '1px solid #e6ded3' }}>
          <Palette size={40} color="#a8a29e" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: '0 0 0.4rem', color: '#1c1917', fontSize: '1.1rem', fontWeight: 800 }}>No Finishes Found</h3>
          <p style={{ margin: 0, color: '#78716c', fontSize: '0.88rem' }}>Create a new finish record to get started with the catalog.</p>
          {isAdmin && (
            <button onClick={() => navigate('/finishing/new')} className="btn-primary" style={{ marginTop: '1.25rem', borderRadius: '10px', backgroundColor: '#9a5323' }}>
              + Add First Finish
            </button>
          )}
        </div>
      ) : (
        /* ── Finish Cards Grid ── */
        <div className="finishing-grid-container">
          {finishes.map((finish, index) => {
            const imgSrc = finish.image_url || finish.image;
            const isSelected = selectedFinishIds.has(finish.id);

            return (
              <div
                key={finish.id}
                className="finish-card-animated"
                style={{
                  animationDelay: `${index * 50}ms`,
                  backgroundColor: isSelected ? '#fffbeb' : '#ffffff',
                  borderRadius: '24px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                  padding: '1.25rem 1.35rem',
                  display: 'flex',
                  gap: '1.25rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(0,0,0,0.04)'
                }}
                onClick={() => selectionMode ? toggleSelectFinish(finish.id) : navigate(`/finishing/${finish.id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.04)';
                }}
              >
                {/* Selection Checkbox – only in selectionMode, staggered fade-in */}
                {selectionMode && (
                  <div
                    style={{
                      position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                      animation: `checkboxFadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(index * 18, 200)}ms both`,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => toggleSelectFinish(finish.id, e)}
                      style={{ cursor: 'pointer', width: '20px', height: '20px', accentColor: '#b45309' }}
                    />
                  </div>
                )}
                {/* ── Left Swatch Image ── */}
                <div className="finish-swatch-box" style={{
                  width: '135px',
                  height: '135px',
                  borderRadius: '20px',
                  backgroundColor: '#faf6f0',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={finish.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.35s ease'
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9a5323' }}>
                      <Palette size={30} strokeWidth={1.5} />
                      <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 650, marginTop: '3px' }}>No Swatch</span>
                    </div>
                  )}
                </div>

                {/* ── Right Content Block ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.3rem', minWidth: 0 }}>
                  
                  {/* Finish Code Pill Badge */}
                  {finish.finish_code && (
                    <span style={{
                      backgroundColor: '#fff2e2',
                      color: '#9a5323',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      padding: '3px 12px',
                      borderRadius: '8px',
                      alignSelf: 'flex-start',
                      letterSpacing: '0.01em',
                      lineHeight: 1.25
                    }}>
                      {finish.finish_code}
                    </span>
                  )}

                  {/* Main Finish Title */}
                  <h3 className="finish-card-title" style={{
                    margin: '0.2rem 0 0.3rem 0',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#1a1a1a',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25
                  }}>
                    {finish.name}
                  </h3>

                  {/* Color Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.1rem' }}>
                    <div className="finish-icon-circle" style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#f7f1ea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Palette size={17} color="#9a5323" strokeWidth={1.5} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span className="finish-row-lbl" style={{ display: 'block', fontSize: '0.75rem', color: '#737373', fontWeight: 400, lineHeight: 1.15 }}>Color</span>
                      <strong className="finish-row-val" style={{ display: 'block', fontSize: '0.92rem', color: '#1a1a1a', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}>
                        {finish.color || '—'}
                      </strong>
                    </div>
                  </div>

                  {/* Thin Horizontal Divider Line */}
                  <div style={{ borderTop: '1px solid #f0f0f0', margin: '0.25rem 0' }} />

                  {/* Wood Type Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="finish-icon-circle" style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#f7f1ea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <DotGridIcon size={16} color="#9a5323" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span className="finish-row-lbl" style={{ display: 'block', fontSize: '0.75rem', color: '#737373', fontWeight: 400, lineHeight: 1.15 }}>Wood Type</span>
                      <strong className="finish-row-val" style={{ display: 'block', fontSize: '0.92rem', color: '#1a1a1a', fontWeight: 700, lineHeight: 1.2 }}>
                        {finish.wood_type || '—'}
                      </strong>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: '1.75rem' }}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* ── Import Finishes Excel Modal ── */}
      {isImportModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '1.75rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1c1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet color="#9a5323" size={22} /> Import Finishes Excel
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716c' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.86rem', color: '#78716c', lineHeight: 1.5 }}>
              Upload an Excel (.xlsx) or CSV (.csv) file containing finish details (`Finish Code`, `Finish Name`, `Color`, `Wood Type`).
            </p>

            {importSuccess && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem' }}>
                ✓ {importSuccess}
              </div>
            )}

            {importError && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.88rem', fontWeight: 600, marginBottom: '1rem' }}>
                ⚠ {importError}
              </div>
            )}

            <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  border: '2px dashed #9a5323',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#fffcf7',
                  cursor: 'pointer'
                }}
                onClick={() => finishFileInputRef.current?.click()}
              >
                <Upload size={32} color="#9a5323" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 700, color: '#1c1917', fontSize: '0.9rem' }}>
                  {importFile ? importFile.name : 'Click to select Excel / CSV file'}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#78716c', display: 'block', marginTop: '4px' }}>
                  Supported formats: .xlsx, .xls, .csv (with embedded swatch picture extraction)
                </span>
                <input
                  ref={finishFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setImportFile(e.target.files[0]);
                      setImportError('');
                      setImportSuccess('');
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    if (!importFile) {
                      finishFileInputRef.current?.click();
                    } else {
                      handleImportSubmit(e);
                    }
                  }}
                  disabled={importing}
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', backgroundColor: '#9a5323', fontWeight: 700, cursor: 'pointer' }}
                >
                  {importing ? 'Importing...' : importFile ? 'Upload & Import' : 'Select & Upload File'}
                </button>
              </div>
            </form>

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
              Delete {selectedFinishIds.size} Finish{selectedFinishIds.size !== 1 ? 'es' : ''}?
            </h3>
            <p style={{ margin: '0 0 1.75rem', color: '#78716c', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Do you really want to delete{' '}
              <strong style={{ color: '#dc2626' }}>{selectedFinishIds.size} finish{selectedFinishIds.size !== 1 ? 'es' : ''}</strong>?
              {' '}This action <strong>cannot be undone</strong> and will permanently remove all associated swatches and data.
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
                onClick={handleBulkDeleteFinishes}
                disabled={deletingSelected}
                style={{
                  flex: 1, padding: '0.65rem 1.25rem', borderRadius: '12px',
                  fontWeight: 700, fontSize: '0.9rem',
                  backgroundColor: deletingSelected ? '#fca5a5' : '#ef4444',
                  color: '#ffffff', border: 'none', cursor: deletingSelected ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {deletingSelected ? 'Deleting...' : `Yes, Delete ${selectedFinishIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finishing;
