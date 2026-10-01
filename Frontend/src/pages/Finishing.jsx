import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  Palette, X, Search, Filter, ArrowLeft, ChevronRight, Upload, Plus, Download,
  FileSpreadsheet, Trash2, Edit2, CheckSquare, Square, FileEdit, Sparkles, AlertCircle,
  Shield, Gem, Scissors, Layers, Check
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { OrderBySelect } from '../components/OrderBySelect';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useLastVisitedItem } from '../hooks/useLastVisitedItem';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesModal from '../components/UnsavedChangesModal';
import { useDrafts } from '../context/DraftsContext';

const FINISH_CATEGORIES = [
  { id: 'wood', label: 'Wood Finish', shortLabel: 'Wood', icon: Palette, color: '#9a5323', bg: '#fff2e2', border: '#e6ded3', placeholder: 'e.g. Smokey Grey PU' },
  { id: 'metal', label: 'Metal Finish', shortLabel: 'Metal', icon: Shield, color: '#334155', bg: '#f1f5f9', border: '#cbd5e1', placeholder: 'e.g. Antique Brass Matte' },
  { id: 'marble', label: 'Marble Finish', shortLabel: 'Marble', icon: Gem, color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', placeholder: 'e.g. Italian Carrara Polished' },
  { id: 'fabric', label: 'Fabric Type', shortLabel: 'Fabric', icon: Scissors, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', placeholder: 'e.g. Royal Velvet Navy' },
];

const emptyFinishForm = {
  category: 'wood',
  name: '',
  finish_code: '',
  color: '',
  wood_type: '',
  metal_type: '',
  coating_type: '',
  marble_type: '',
  surface_treatment: '',
  material_type: '',
  pattern: '',
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

const METAL_TYPES = [
  'Mild Steel (MS)',
  'Stainless Steel (SS 304)',
  'Brass',
  'Copper',
  'Aluminium',
  'Cast Iron',
  'Wrought Iron',
  'Other'
];

const COATING_TYPES = [
  'Powder Coated',
  'Electroplated',
  'PVD Coated',
  'Brushed / Satin',
  'Antique Patina',
  'Clear Lacquer',
  'Matte Finish',
  'Chrome Plated',
  'Other'
];

const MARBLE_TYPES = [
  'Makrana White Marble',
  'Italian Carrara Marble',
  'Black Marquina Marble',
  'Green Marble (Udaipur)',
  'Banswara Purple Marble',
  'Travertine Stone',
  'Granite',
  'Sandstone',
  'Onyx Stone',
  'Other'
];

const SURFACE_TREATMENTS = [
  'High Gloss Polished',
  'Honed / Matte',
  'Leather Finish',
  'Flamed',
  'Bush Hammered',
  'Antique Tumbled',
  'Other'
];

const FABRIC_MATERIALS = [
  'Velvet',
  'Linen',
  'Cotton Canvas',
  'Bouclé',
  'Leatherette / Faux Leather',
  'Jute / Hemp',
  'Polyester Blend',
  'Chenille',
  'Jacquard',
  'Silk / Satin',
  'Other'
];

const FABRIC_PATTERNS = [
  'Plain / Solid',
  'Textured Weave',
  'Printed',
  'Geometric',
  'Striped',
  'Tufted / Quilted',
  'Floral',
  'Abstract',
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const isDetailPage = !!id;

  const currentTab = searchParams.get('tab') || 'wood';
  const [activeTab, setActiveTabState] = useState(currentTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTabState(tabId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
    setCurrentPage(1);
    setSelectedFinishIds(new Set());
    setSearchTerm('');
    setFilterSpecificType('');
  };

  const activeCategory = FINISH_CATEGORIES.find(c => c.id === activeTab) || FINISH_CATEGORIES[0];
  const ActiveCatIcon = activeCategory.icon;

  const [categoryCounts, setCategoryCounts] = useState({ wood: 0, metal: 0, marble: 0, fabric: 0, total: 0 });
  const fetchCounts = useCallback(() => {
    api.get('/finishes/counts/')
      .then(res => setCategoryCounts(res.data))
      .catch(err => console.error('Error fetching finish counts:', err));
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const [finishes, setFinishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyFinishForm);

  // Image handling
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // ── Unsaved Changes / Draft hook ───────────────────────────────────────────
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
    formType: 'finishing',
    formLabel: 'Finishing',
    getFormTitle: (data) => data?.name ? `${FINISH_CATEGORIES.find(c => c.id === data.category)?.label || 'Finish'}: ${data.name}${data.finish_code ? ' (' + data.finish_code + ')' : ''}` : 'New Finish',
    getFormData: () => ({ ...formData }),
    targetPath: `/finishing/new?tab=${activeTab}`,
    onSaveForm: async () => {
      const formEl = document.getElementById('finish-detail-form');
      if (formEl) { formEl.requestSubmit(); return true; }
      return false;
    }
  });

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecificType, setFilterSpecificType] = useState('');
  const [ordering, setOrdering] = useState('-created_at');

  const { drafts, deleteDraft } = useDrafts();

  const orderOptions = useMemo(() => {
    const draftCount = drafts.filter(d => d.formType === 'finishing' && (d.data?.category || 'wood') === activeTab).length;
    return [
      ...ORDER_OPTIONS_FINISH,
      {
        value: 'draft',
        label: 'Drafts',
        badge: draftCount > 0 ? draftCount : null,
        icon: FileEdit,
        isDividerBefore: true
      }
    ];
  }, [drafts, activeTab]);

  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const hasVisitedItem = sessionStorage.getItem('last_visited_finishes');
      const savedPage = sessionStorage.getItem('last_visited_page_finishes');
      if (hasVisitedItem && savedPage) return Number(savedPage);
    } catch (e) {}
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);

  const { lastVisitedId, setHighlightRef } = useLastVisitedItem('finishes', id, currentPage);

  // Modal / Prompt confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Multi-Selection, Excel Export & Import states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFinishIds, setSelectedFinishIds] = useState(new Set());
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importCategory, setImportCategory] = useState(activeTab);
  const finishFileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    setImportCategory(activeTab);
  }, [activeTab]);

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
      fetchCounts();
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
        category: activeTab,
        q: searchTerm
      };
      const response = await api.post('/finishes/export-excel/', payload, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedFinishIds.size > 0 ? `Finishes_${activeTab}_Selected_${selectedFinishIds.size}.xlsx` : `Finishing_${activeTab}_Catalog.xlsx`);
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

    const formDataUpload = new FormData();
    formDataUpload.append('file', importFile);
    formDataUpload.append('category', importCategory);

    try {
      const res = await api.post('/finishes/import-excel/', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSuccess(res.data.message || 'Finishes imported successfully!');
      setImportFile(null);
      fetchCounts();
      fetchFinishes();
    } catch (err) {
      console.error('Import error:', err);
      setImportError(err.response?.data?.error || 'Failed to import finishes file.');
    } finally {
      setImporting(false);
    }
  };

  // ── Fetch Finishes ─────────────────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchFinishes = useCallback(() => {
    if (ordering === 'draft') {
      setLoading(true);
      const currentDrafts = drafts.filter(d => d.formType === 'finishing' && (d.data?.category || 'wood') === activeTab);
      const mapped = currentDrafts.map(d => {
        const data = d.data || {};
        return {
          id: d.id,
          category: data.category || activeTab,
          name: data.name || 'Draft Finish',
          finish_code: data.finish_code || '',
          color: data.color || '',
          wood_type: data.wood_type || '',
          metal_type: data.metal_type || '',
          coating_type: data.coating_type || '',
          marble_type: data.marble_type || '',
          surface_treatment: data.surface_treatment || '',
          material_type: data.material_type || '',
          pattern: data.pattern || '',
          image: null,
          image_url: null,
          isDraft: true,
          rawDraft: d,
          updatedAt: d.updatedAt
        };
      });

      let resList = mapped;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        resList = resList.filter(f =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.finish_code && f.finish_code.toLowerCase().includes(q)) ||
          (f.color && f.color.toLowerCase().includes(q))
        );
      }
      if (filterSpecificType) {
        resList = resList.filter(f =>
          f.wood_type === filterSpecificType ||
          f.metal_type === filterSpecificType ||
          f.marble_type === filterSpecificType ||
          f.material_type === filterSpecificType
        );
      }

      resList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

      setTotalPages(Math.max(1, Math.ceil(resList.length / 20)));
      const paginated = resList.slice((currentPage - 1) * 20, currentPage * 20);
      setFinishes(paginated);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = { page: currentPage, page_size: 20, ordering, category: activeTab };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterSpecificType) {
      if (activeTab === 'wood') params.wood_type = filterSpecificType;
      else if (activeTab === 'metal') params.metal_type = filterSpecificType;
      else if (activeTab === 'marble') params.marble_type = filterSpecificType;
      else if (activeTab === 'fabric') params.material_type = filterSpecificType;
    }

    api.get('/finishes/', { params })
      .then(res => {
        const data = res.data.results || res.data || [];
        const mapped = data.map(item => ({ ...item, isDraft: false }));
        setFinishes(mapped);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 20) || 1);
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Error fetching finishes:', err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering, debouncedSearch, filterSpecificType, drafts, activeTab]);

  useEffect(() => {
    fetchFinishes();
  }, [fetchFinishes]);

  // Reset page when filters or tab change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
    setSelectedFinishIds(new Set());
  }, [debouncedSearch, filterSpecificType, ordering, activeTab]);

  // Handle URL parameter for detail/edit page or restore draft
  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/finishes/${id}/`)
        .then(res => {
          const f = res.data;
          setEditingId(f.id);
          setFormData({
            category: f.category || 'wood',
            name: f.name || '',
            finish_code: f.finish_code || '',
            color: f.color || '',
            wood_type: f.wood_type || '',
            metal_type: f.metal_type || '',
            coating_type: f.coating_type || '',
            marble_type: f.marble_type || '',
            surface_treatment: f.surface_treatment || '',
            material_type: f.material_type || '',
            pattern: f.pattern || '',
          });
          setImagePreview(f.image_url || f.image);
        })
        .catch(err => {
          console.error('Error loading finish detail:', err);
          navigate(`/finishing?tab=${activeTab}`);
        });
    } else if (id === 'new') {
      setEditingId(null);
      if (location.state?.draftData) {
        const d = location.state.draftData;
        setFormData(prev => ({ ...prev, ...d }));
        setIsDirty(true);
        if (location.state.draftId) setCurrentDraftId(location.state.draftId);
      } else {
        const initialCat = location.state?.category || searchParams.get('tab') || activeTab || 'wood';
        setFormData({
          ...emptyFinishForm,
          category: initialCat,
        });
        setImageFile(null);
        setImagePreview(null);
      }
    }
  }, [id, location.state, navigate, searchParams, activeTab]);

  // ── Form Validation & Handlers ──────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    const name = (formData.name || '').trim();
    const finish_code = (formData.finish_code || '').trim();
    const color = (formData.color || '').trim();
    const isFabric = formData.category === 'fabric';

    // 1. Finish / Fabric Name
    if (!name) {
      errors.name = isFabric ? 'Fabric name is required.' : 'Finish name is required.';
    } else if (name.length < 2) {
      errors.name = isFabric ? 'Fabric name must be at least 2 characters.' : 'Finish name must be at least 2 characters.';
    } else if (name.length > 100) {
      errors.name = 'Name cannot exceed 100 characters.';
    } else {
      const alphaCount = (name.match(/[a-zA-Z]/g) || []).length;
      if (alphaCount < 2) {
        errors.name = 'Name must contain at least 2 letters.';
      } else if (!/^[A-Za-z0-9\s&.,'\-/( )]+$/.test(name)) {
        errors.name = 'Name contains invalid characters. Use letters, numbers, spaces, and standard symbols (&, ., ,, -, \', /, (, )).';
      } else if (/(.)\1{3,}/.test(name)) {
        errors.name = 'Name cannot contain repetitive characters (e.g. 4 or more identical letters in a row).';
      } else if (name.split(/\s+/).some(w => w.length > 30)) {
        errors.name = 'Name contains an excessively long continuous word.';
      } else if (/([A-Za-z0-9]{2,3})\1{3,}/.test(name)) {
        errors.name = 'Name appears to be repetitive gibberish.';
      }
    }

    // 2. Finish / Fabric Code
    if (!finish_code) {
      errors.finish_code = isFabric ? 'Fabric code is required.' : 'Finish code is required.';
    } else if (finish_code.length < 2) {
      errors.finish_code = 'Code must be at least 2 characters.';
    } else if (finish_code.length > 30) {
      errors.finish_code = 'Code cannot exceed 30 characters.';
    } else if (!/^[A-Za-z0-9\-_/]+$/.test(finish_code)) {
      errors.finish_code = 'Code can only contain letters, numbers, hyphens (-), underscores (_), and slashes (/).';
    } else if (/(.)\1{3,}/.test(finish_code)) {
      errors.finish_code = 'Code cannot contain repetitive characters (e.g. 4 identical characters in a row).';
    }

    // 3. Color (optional)
    if (color) {
      if (color.length < 2) {
        errors.color = 'Color must be at least 2 characters.';
      } else if (color.length > 50) {
        errors.color = 'Color cannot exceed 50 characters.';
      } else {
        const alphaCount = (color.match(/[a-zA-Z]/g) || []).length;
        if (alphaCount < 2) {
          errors.color = 'Color must contain at least 2 letters.';
        } else if (!/^[A-Za-z\s\-/,'()]+$/.test(color)) {
          errors.color = "Color can only contain letters, spaces, and hyphens (e.g. 'Walnut', 'Smokey Grey', 'Antique White'). Digits are not allowed.";
        } else if (/(.)\1{3,}/.test(color)) {
          errors.color = 'Color cannot contain repetitive characters.';
        }
      }
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name] || formErrors.general) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[name];
        delete next.general;
        return next;
      });
    }
    if (!editingId) setIsDirty(true); // mark dirty on new forms
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      if (!editingId) setIsDirty(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Client-side pre-validation
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      return;
    }

    // Pre-check for duplicate code
    const code = formData.finish_code?.trim();
    if (code) {
      const duplicate = finishes.find(f =>
        f.finish_code &&
        f.finish_code.trim().toLowerCase() === code.toLowerCase() &&
        String(f.id) !== String(editingId || '')
      );
      if (duplicate) {
        setFormErrors({ finish_code: `Code '${code}' is already present.` });
        return;
      }
    }

    setSubmitting(true);

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          submitData.append(key, typeof val === 'string' ? val.trim() : val);
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

      if (currentDraftId) clearDraft(currentDraftId);
      setIsDirty(false);
      fetchCounts();
      navigate(`/finishing?tab=${formData.category || activeTab}`);
      fetchFinishes();
    } catch (err) {
      console.error('Failed to save finish:', err);
      const serverData = err.response?.data;
      const newErrors = {};

      if (serverData && typeof serverData === 'object') {
        [
          'name', 'finish_code', 'color', 'wood_type', 'metal_type',
          'coating_type', 'marble_type', 'surface_treatment',
          'material_type', 'pattern', 'image', 'category'
        ].forEach(field => {
          if (serverData[field]) {
            newErrors[field] = Array.isArray(serverData[field])
              ? serverData[field].join(' ')
              : String(serverData[field]);
          }
        });

        if (serverData.non_field_errors) {
          newErrors.general = Array.isArray(serverData.non_field_errors)
            ? serverData.non_field_errors.join(' ')
            : String(serverData.non_field_errors);
        } else if (serverData.detail) {
          newErrors.general = String(serverData.detail);
        } else if (serverData.error) {
          newErrors.general = String(serverData.error);
        } else if (Object.keys(newErrors).length === 0) {
          newErrors.general = 'Failed to save. Please check the entered data.';
        }
      } else {
        newErrors.general = 'Failed to save. Please try again.';
      }

      setFormErrors(newErrors);
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
      fetchCounts();
      navigate(`/finishing?tab=${formData.category || activeTab}`);
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
            {/* Form Header */}
            {(() => {
              const currentCatObj = FINISH_CATEGORIES.find(c => c.id === (formData.category || 'wood')) || FINISH_CATEGORIES[0];
              const CurrentIcon = currentCatObj.icon;
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1c1917', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CurrentIcon size={22} color={currentCatObj.color} />
                    {editingId ? `Edit ${currentCatObj.shortLabel} Finish (${formData.finish_code || 'Details'})` : `Add New ${currentCatObj.label}`}
                  </h2>
                </div>
              );
            })()}

            {/* Category Switcher Tabs */}
            <div style={{ marginBottom: '1.35rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#1c1917', marginBottom: '0.45rem', display: 'block', fontSize: '0.85rem' }}>
                Finish Category *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
                {FINISH_CATEGORIES.map(cat => {
                  const isSelected = (formData.category || 'wood') === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, category: cat.id }));
                        if (!editingId) setIsDirty(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${cat.color}` : '1.5px solid #e2e8f0',
                        backgroundColor: isSelected ? cat.bg : '#ffffff',
                        color: isSelected ? cat.color : '#64748b',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <Icon size={17} color={isSelected ? cat.color : '#94a3b8'} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form id="finish-detail-form" onSubmit={handleSubmit} noValidate>
              {/* Error Alert Banner */}
              {formErrors.general && (
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
                  <span>{formErrors.general}</span>
                </div>
              )}

              {/* Image Upload Box */}
              <div className="form-group" style={{ marginBottom: '1.35rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#1c1917' }}>Swatch / Texture Image</label>
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
                    ) : (() => {
                      const CatIcon = FINISH_CATEGORIES.find(c => c.id === formData.category)?.icon || Palette;
                      return <CatIcon size={34} color="#9a5323" />;
                    })()}
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.55rem 1rem', fontSize: '0.85rem', borderRadius: '10px' }}>
                      <Upload size={15} /> Choose Swatch Photo
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                    </label>
                    <div style={{ fontSize: '0.78rem', color: '#78716c', marginTop: '6px', lineHeight: 1.4 }}>
                      {formData.category === 'wood' && 'High resolution PNG, JPG or WEBP image demonstrating wood texture and grain.'}
                      {formData.category === 'metal' && 'High resolution PNG, JPG or WEBP image demonstrating metal finish, patina or coating.'}
                      {formData.category === 'marble' && 'High resolution PNG, JPG or WEBP image demonstrating marble veining, texture or polish.'}
                      {formData.category === 'fabric' && 'High resolution PNG, JPG or WEBP image demonstrating fabric weave, texture or pattern.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.15rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 650 }}>
                    {formData.category === 'fabric' ? 'Fabric Name *' : 'Finish Name *'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder={FINISH_CATEGORIES.find(c => c.id === formData.category)?.placeholder || 'e.g. Smokey Grey PU'}
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      borderColor: formErrors.name ? '#dc2626' : undefined,
                      backgroundColor: formErrors.name ? '#fff5f5' : undefined
                    }}
                  />
                  {formErrors.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{formErrors.name}</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 650 }}>
                    {formData.category === 'fabric' ? 'Fabric Code *' : 'Finish Code *'}
                  </label>
                  <input
                    type="text"
                    name="finish_code"
                    className="form-input"
                    placeholder={
                      formData.category === 'wood' ? 'e.g. FIN-109' :
                      formData.category === 'metal' ? 'e.g. MF-01' :
                      formData.category === 'marble' ? 'e.g. MRB-01' : 'e.g. FAB-01'
                    }
                    value={formData.finish_code}
                    onChange={handleInputChange}
                    style={{
                      borderColor: formErrors.finish_code ? '#dc2626' : undefined,
                      backgroundColor: formErrors.finish_code ? '#fff5f5' : undefined
                    }}
                  />
                  {formErrors.finish_code && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{formErrors.finish_code}</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 650 }}>Color / Shade</label>
                  <input
                    type="text"
                    name="color"
                    className="form-input"
                    placeholder="e.g. Walnut / Antique Brass / Pure White"
                    value={formData.color}
                    onChange={handleInputChange}
                    style={{
                      borderColor: formErrors.color ? '#dc2626' : undefined,
                      backgroundColor: formErrors.color ? '#fff5f5' : undefined
                    }}
                  />
                  {formErrors.color && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{formErrors.color}</span>
                    </div>
                  )}
                </div>

                {/* ── Category Specific Dynamic Fields ── */}
                {formData.category === 'wood' && (
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
                    {formErrors.wood_type && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{formErrors.wood_type}</span>
                      </div>
                    )}
                  </div>
                )}

                {formData.category === 'metal' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 650 }}>Metal Type</label>
                      <CustomSelect
                        name="metal_type"
                        value={formData.metal_type}
                        onChange={handleInputChange}
                        options={[
                          { value: '', label: 'Select Metal Type...' },
                          ...METAL_TYPES.map(m => ({ value: m, label: m }))
                        ]}
                        placeholder="Select Metal Type..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 650 }}>Coating / Process</label>
                      <CustomSelect
                        name="coating_type"
                        value={formData.coating_type}
                        onChange={handleInputChange}
                        options={[
                          { value: '', label: 'Select Coating / Process...' },
                          ...COATING_TYPES.map(c => ({ value: c, label: c }))
                        ]}
                        placeholder="Select Coating / Process..."
                      />
                    </div>
                  </>
                )}

                {formData.category === 'marble' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 650 }}>Marble / Stone Type</label>
                      <CustomSelect
                        name="marble_type"
                        value={formData.marble_type}
                        onChange={handleInputChange}
                        options={[
                          { value: '', label: 'Select Marble / Stone Type...' },
                          ...MARBLE_TYPES.map(m => ({ value: m, label: m }))
                        ]}
                        placeholder="Select Marble / Stone Type..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 650 }}>Surface Treatment</label>
                      <CustomSelect
                        name="surface_treatment"
                        value={formData.surface_treatment}
                        onChange={handleInputChange}
                        options={[
                          { value: '', label: 'Select Surface Treatment...' },
                          ...SURFACE_TREATMENTS.map(s => ({ value: s, label: s }))
                        ]}
                        placeholder="Select Surface Treatment..."
                      />
                    </div>
                  </>
                )}

                {formData.category === 'fabric' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 650 }}>Fabric Material</label>
                      <CustomSelect
                        name="material_type"
                        value={formData.material_type}
                        onChange={handleInputChange}
                        options={[
                          { value: '', label: 'Select Fabric Material...' },
                          ...FABRIC_MATERIALS.map(f => ({ value: f, label: f }))
                        ]}
                        placeholder="Select Fabric Material..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 650 }}>Pattern / Texture</label>
                      <CustomSelect
                        name="pattern"
                        value={formData.pattern}
                        onChange={handleInputChange}
                        options={[
                          { value: '', label: 'Select Pattern / Texture...' },
                          ...FABRIC_PATTERNS.map(p => ({ value: p, label: p }))
                        ]}
                        placeholder="Select Pattern / Texture..."
                      />
                    </div>
                  </>
                )}
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
                  {!editingId && (
                    <button
                      type="button"
                      onClick={() => handleSaveDraft()}
                      style={{
                        padding: '0.55rem 1rem',
                        borderRadius: '10px',
                        fontWeight: 650,
                        fontSize: '0.85rem',
                        border: '1.5px solid #d6c7b2',
                        backgroundColor: '#fdf8f5',
                        color: '#8b5a2b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      Save Draft
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (!editingId && isDirty) {
                        confirmExit(`/finishing?tab=${formData.category || activeTab}`);
                      } else {
                        navigate(`/finishing?tab=${formData.category || activeTab}`);
                      }
                    }}
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
                    {submitting ? 'Saving...' : editingId ? 'Save Changes' : `Create ${FINISH_CATEGORIES.find(c => c.id === formData.category)?.shortLabel || ''} Finish`}
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

        {/* Unsaved Changes Modal */}
        <UnsavedChangesModal
          isOpen={showExitModal}
          title="Unsaved Finish Changes"
          message="You have unsaved changes in this finish form. Would you like to save as a draft so you can continue later?"
          onSave={handleSaveAndExit}
          onSaveDraft={() => handleSaveDraft(true)}
          onDiscard={handleDiscardAndExit}
          onCancel={handleCancelExit}
        />
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
                {selectedFinishIds.size > 0 ? `${selectedFinishIds.size} selected` : 'Select items'}
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
            padding: '0 0.5rem 0.65rem',
            opacity: selectionMode ? 0 : 1,
            transform: selectionMode ? 'translateY(-10px)' : 'translateY(0)',
            transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.45rem', fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>
              <Sparkles size={26} color="#9a5323" style={{ flexShrink: 0 }} /> Finishing Catalog
              <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#fff2e2', color: '#9a5323', border: '1px solid #fed7aa', padding: '2px 10px', borderRadius: '999px', marginLeft: '0.25rem' }}>
                {categoryCounts.total || finishes.length} Total
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
                  <button onClick={() => navigate('/finishing/new', { state: { category: activeTab } })} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px', fontWeight: 700, backgroundColor: '#9a5323' }}>
                    + Add New {activeCategory.shortLabel === 'Fabric' ? 'Fabric' : `${activeCategory.shortLabel} Finish`}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Sleek Underline Tabs Bar (Linear / GitHub style) ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            borderBottom: '2px solid #eee8df',
            marginBottom: '1rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            padding: '0 0.5rem',
            opacity: selectionMode ? 0 : 1,
            transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            {FINISH_CATEGORIES.map(cat => {
              const isActive = activeTab === cat.id;
              const Icon = cat.icon;
              const count = categoryCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleTabChange(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.65rem 1.15rem',
                    border: 'none',
                    borderBottom: isActive ? '2.5px solid #9a5323' : '2.5px solid transparent',
                    marginBottom: '-2px',
                    backgroundColor: 'transparent',
                    color: isActive ? '#9a5323' : '#64748b',
                    fontWeight: isActive ? 750 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.16s ease',
                    whiteSpace: 'nowrap',
                    borderRadius: '6px 6px 0 0',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#1c1917';
                      e.currentTarget.style.backgroundColor = 'rgba(154, 83, 35, 0.04)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#64748b';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={16} color={isActive ? '#9a5323' : '#78716c'} strokeWidth={isActive ? 2.2 : 1.7} />
                  <span>{cat.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '1.5px 7.5px',
                    borderRadius: '999px',
                    backgroundColor: isActive ? '#fff2e2' : '#f1f5f9',
                    color: isActive ? '#9a5323' : '#64748b',
                    border: isActive ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                    minWidth: '20px',
                    textAlign: 'center',
                    lineHeight: 1.25
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
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
              placeholder={`Search ${activeCategory.shortLabel.toLowerCase()} name, code, color...`}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="filter-dropdowns-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Filter size={15} className="filter-icon" style={{ color: '#78716c' }} />
            {activeTab === 'wood' && (
              <CustomSelect
                value={filterSpecificType}
                onChange={e => {
                  const val = e.target ? e.target.value : e;
                  setFilterSpecificType(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Wood Types' },
                  ...WOOD_TYPES.map(w => ({ value: w, label: w }))
                ]}
                placeholder="All Wood Types"
                style={{ minWidth: '160px' }}
              />
            )}
            {activeTab === 'metal' && (
              <CustomSelect
                value={filterSpecificType}
                onChange={e => {
                  const val = e.target ? e.target.value : e;
                  setFilterSpecificType(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Metal Types' },
                  ...METAL_TYPES.map(m => ({ value: m, label: m }))
                ]}
                placeholder="All Metal Types"
                style={{ minWidth: '160px' }}
              />
            )}
            {activeTab === 'marble' && (
              <CustomSelect
                value={filterSpecificType}
                onChange={e => {
                  const val = e.target ? e.target.value : e;
                  setFilterSpecificType(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Marble Types' },
                  ...MARBLE_TYPES.map(m => ({ value: m, label: m }))
                ]}
                placeholder="All Marble Types"
                style={{ minWidth: '160px' }}
              />
            )}
            {activeTab === 'fabric' && (
              <CustomSelect
                value={filterSpecificType}
                onChange={e => {
                  const val = e.target ? e.target.value : e;
                  setFilterSpecificType(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Fabric Materials' },
                  ...FABRIC_MATERIALS.map(f => ({ value: f, label: f }))
                ]}
                placeholder="All Fabric Materials"
                style={{ minWidth: '160px' }}
              />
            )}

            {(searchTerm || filterSpecificType) && (
              <button
                className="filter-clear-btn"
                onClick={() => { setSearchTerm(''); setFilterSpecificType(''); setCurrentPage(1); }}
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* Order By */}
          <div className="orderby-wrap" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <OrderBySelect
              options={orderOptions}
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
          {ordering === 'draft' ? (
            <FileEdit size={40} color="#d97706" style={{ margin: '0 auto 0.75rem' }} />
          ) : (
            <ActiveCatIcon size={40} color={activeCategory.color} style={{ margin: '0 auto 0.75rem', opacity: 0.7 }} />
          )}
          <h3 style={{ margin: '0 0 0.4rem', color: '#1c1917', fontSize: '1.1rem', fontWeight: 800 }}>
            {ordering === 'draft' ? `No Draft ${activeCategory.label} Items Found` : `No ${activeCategory.label} Items Found`}
          </h3>
          <p style={{ margin: 0, color: '#78716c', fontSize: '0.88rem' }}>
            {ordering === 'draft'
              ? `When you save a ${activeCategory.shortLabel} draft, it will appear here.`
              : `Create a new ${activeCategory.shortLabel.toLowerCase()} record to get started with the catalog.`}
          </p>
          {isAdmin && ordering !== 'draft' && (
            <button onClick={() => navigate('/finishing/new', { state: { category: activeTab } })} className="btn-primary" style={{ marginTop: '1.25rem', borderRadius: '10px', backgroundColor: '#9a5323' }}>
              + Add First {activeCategory.shortLabel === 'Fabric' ? 'Fabric' : `${activeCategory.shortLabel} Finish`}
            </button>
          )}
        </div>
      ) : (
        /* ── Finish Cards Grid ── */
        <div className="finishing-grid-container">
          {finishes.map((finish, index) => {
            const imgSrc = finish.image_url || finish.image;
            const isSelected = selectedFinishIds.has(finish.id);
            const isRecentlyVisited = String(finish.id) === String(lastVisitedId);
            const itemCatObj = FINISH_CATEGORIES.find(c => c.id === (finish.category || activeTab)) || activeCategory;
            const ItemCatIcon = itemCatObj.icon;

            return (
              <div
                key={finish.id}
                ref={isRecentlyVisited ? setHighlightRef : null}
                className={`finish-card-animated ${isRecentlyVisited ? 'card-recently-visited' : ''}`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  backgroundColor: finish.isDraft ? '#fffdf7' : isSelected ? '#fffbeb' : undefined,
                  borderRadius: '24px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                  padding: '1.25rem 1.35rem',
                  display: 'flex',
                  gap: '1.25rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  border: finish.isDraft ? '1.5px solid #fde68a' : isSelected ? '2px solid #f59e0b' : undefined
                }}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelectFinish(finish.id);
                  } else if (finish.isDraft) {
                    navigate('/finishing/new', {
                      state: { draftId: finish.rawDraft.id, draftData: finish.rawDraft.data }
                    });
                  } else {
                    navigate(`/finishing/${finish.id}`);
                  }
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.04)';
                }}
                title={finish.isDraft ? "Click to resume draft" : undefined}
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
                    <div style={{ textAlign: 'center', color: itemCatObj.color || '#9a5323' }}>
                      <ItemCatIcon size={30} strokeWidth={1.5} />
                      <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 650, marginTop: '3px' }}>No Swatch</span>
                    </div>
                  )}
                </div>

                {/* ── Right Content Block ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.3rem', minWidth: 0 }}>
                  
                  {/* Finish Code Pill Badge & Category Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {finish.finish_code && (
                      <span style={{
                        backgroundColor: '#fff2e2',
                        color: '#9a5323',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        padding: '3px 12px',
                        borderRadius: '8px',
                        letterSpacing: '0.01em',
                        lineHeight: 1.25
                      }}>
                        {finish.finish_code}
                      </span>
                    )}
                    <span style={{
                      backgroundColor: itemCatObj.bg || '#f7f1ea',
                      color: itemCatObj.color || '#78716c',
                      border: `1px solid ${itemCatObj.border || '#e5e7eb'}`,
                      fontWeight: 650,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <ItemCatIcon size={11} />
                      {itemCatObj.shortLabel}
                    </span>
                    {finish.isDraft && (
                      <span style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        border: '1px solid #fde68a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Main Finish Title */}
                  <h3 className="finish-card-title" style={{
                    margin: '0.2rem 0 0.3rem 0',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#1a1a1a',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flexWrap: 'wrap'
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

                  {/* Category-Specific Row */}
                  {(() => {
                    const cat = finish.category || activeTab || 'wood';
                    let label = 'Wood Type';
                    let icon = <DotGridIcon size={16} color="#9a5323" />;
                    let val = finish.wood_type || '—';

                    if (cat === 'metal') {
                      label = 'Metal & Coating';
                      icon = <Shield size={16} color="#334155" />;
                      val = [finish.metal_type, finish.coating_type].filter(Boolean).join(' • ') || '—';
                    } else if (cat === 'marble') {
                      label = 'Marble & Treatment';
                      icon = <Gem size={16} color="#047857" />;
                      val = [finish.marble_type, finish.surface_treatment].filter(Boolean).join(' • ') || '—';
                    } else if (cat === 'fabric') {
                      label = 'Material & Pattern';
                      icon = <Scissors size={16} color="#7c3aed" />;
                      val = [finish.material_type, finish.pattern].filter(Boolean).join(' • ') || '—';
                    }

                    return (
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
                          {icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span className="finish-row-lbl" style={{ display: 'block', fontSize: '0.75rem', color: '#737373', fontWeight: 400, lineHeight: 1.15 }}>{label}</span>
                          <strong className="finish-row-val" style={{ display: 'block', fontSize: '0.92rem', color: '#1a1a1a', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {val}
                          </strong>
                        </div>
                      </div>
                    );
                  })()}

                  {finish.isDraft && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate('/finishing/new', {
                          state: { draftId: finish.rawDraft.id, draftData: finish.rawDraft.data }
                        })}
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: '#fef3c7',
                          borderColor: '#fde68a',
                          color: '#92400e',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileEdit size={13} /> Resume
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Discard draft for "${finish.name}"?`)) {
                            deleteDraft(finish.id);
                          }
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        <Trash2 size={13} /> Discard
                      </button>
                    </div>
                  )}

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

            <p style={{ margin: '0 0 1rem', fontSize: '0.86rem', color: '#78716c', lineHeight: 1.5 }}>
              Upload an Excel (.xlsx) or CSV (.csv) file containing finish or fabric records. The system will automatically map the appropriate columns.
            </p>

            {/* Target Category Selector */}
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Target Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
                {FINISH_CATEGORIES.map(c => {
                  const isTarget = importCategory === c.id;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setImportCategory(c.id)}
                      style={{
                        padding: '0.55rem 0.4rem',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: isTarget ? 700 : 500,
                        border: isTarget ? `1.5px solid ${c.color}` : '1px solid #e2e8f0',
                        backgroundColor: isTarget ? c.bg : '#ffffff',
                        color: isTarget ? c.color : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} color={isTarget ? c.color : '#64748b'} />
                      <span>{c.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
