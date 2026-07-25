import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { 
  X, Upload, Sparkles, Filter, Search, ArrowLeft, Download, 
  Trash2, Edit3, Eye, CheckCircle, AlertCircle, Palette, Layers
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { OrderBySelect } from '../components/OrderBySelect';
import { useAuth } from '../context/AuthContext';

const emptyFinishForm = {
  name: '',
  finish_code: '',
  color: '',
  finish_type: '',
  texture: '',
  description: '',
};

const FINISH_TYPES = [
  'Stain', 'PU (Polyurethane)', 'NC (Nitrocellulose)', 
  'Wax Finish', 'Oil Finish', 'Melamine', 'Lacquer', 'Raw / Natural'
];

const TEXTURE_TYPES = [
  'Smooth', 'Grainy', 'Rustic', 'Distressed', 
  'Hand-Scraped', 'Matte', 'Semi-Gloss', 'High Gloss'
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
  const [filterType, setFilterType] = useState('');
  const [filterTexture, setFilterTexture] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Prompt confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isDetailPage = Boolean(id);

  // ── Fetch Finishes ─────────────────────────────────────────────────────────

  const fetchFinishes = useCallback(() => {
    setLoading(true);
    const params = { page: currentPage, ordering };
    if (searchTerm) params.search = searchTerm;
    if (filterType) params.finish_type = filterType;
    if (filterTexture) params.texture = filterTexture;

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
  }, [currentPage, ordering, searchTerm, filterType, filterTexture]);

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
            finish_type: f.finish_type || '',
            texture: f.texture || '',
            description: f.description || '',
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
          {/* Back Navigation Bar */}
          <button
            onClick={() => navigate('/finishing')}
            style={{
              background: 'none',
              border: 'none',
              color: '#9a5323',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '1.15rem',
              padding: '0.4rem 0.6rem',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff2e2'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={18} /> Back to Finishing Catalog
          </button>

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
                  <label className="form-label" style={{ fontWeight: 650 }}>Finish Type</label>
                  <select
                    name="finish_type"
                    className="form-input"
                    value={formData.finish_type}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Finish Type...</option>
                    {FINISH_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 650 }}>Texture</label>
                  <select
                    name="texture"
                    className="form-input"
                    value={formData.texture}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Texture...</option>
                    {TEXTURE_TYPES.map(txt => (
                      <option key={txt} value={txt}>{txt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label" style={{ fontWeight: 650 }}>Description / Notes</label>
                <textarea
                  name="description"
                  className="form-input"
                  rows="3"
                  placeholder="Additional specifications about polish coats, base timber suitability..."
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{ resize: 'vertical' }}
                />
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

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '0 0.5rem 1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.45rem', fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>
          <Sparkles size={26} color="#9a5323" style={{ flexShrink: 0 }} /> Finishing Catalog
          <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fff2e2', color: '#9a5323', padding: '2px 10px', borderRadius: '999px', marginLeft: '0.25rem' }}>
            {finishes.length} Finishes
          </span>
        </h2>
        {isAdmin && (
          <button onClick={() => navigate('/finishing/new')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px', fontWeight: 700, backgroundColor: '#9a5323' }}>
            + Add New Finish
          </button>
        )}
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
            <select
              className="filter-input"
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
              style={{ minWidth: '125px', borderRadius: '10px' }}
            >
              <option value="">All Types</option>
              {FINISH_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              className="filter-input"
              value={filterTexture}
              onChange={e => { setFilterTexture(e.target.value); setCurrentPage(1); }}
              style={{ minWidth: '125px', borderRadius: '10px' }}
            >
              <option value="">All Textures</option>
              {TEXTURE_TYPES.map(txt => (
                <option key={txt} value={txt}>{txt}</option>
              ))}
            </select>

            {(searchTerm || filterType || filterTexture) && (
              <button
                className="filter-clear-btn"
                onClick={() => { setSearchTerm(''); setFilterType(''); setFilterTexture(''); setCurrentPage(1); }}
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
            return (
              <div
                key={finish.id}
                className="finish-card-animated"
                style={{
                  animationDelay: `${index * 50}ms`,
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                  padding: '1.25rem 1.35rem',
                  display: 'flex',
                  gap: '1.25rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  border: '1px solid rgba(0,0,0,0.02)'
                }}
                onClick={() => navigate(`/finishing/${finish.id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.04)';
                }}
              >
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

                  {/* Texture Row */}
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
                      <span className="finish-row-lbl" style={{ display: 'block', fontSize: '0.75rem', color: '#737373', fontWeight: 400, lineHeight: 1.15 }}>Texture</span>
                      <strong className="finish-row-val" style={{ display: 'block', fontSize: '0.92rem', color: '#1a1a1a', fontWeight: 700, lineHeight: 1.2 }}>
                        {finish.texture || '—'}
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
    </div>
  );
}

export default Finishing;
