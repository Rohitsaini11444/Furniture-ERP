import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, ArrowLeft, ChevronRight, Download, Upload, ImageIcon, Package, Clock, History, ArrowDownAZ, ArrowUpZA, FolderTree, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import SearchableSelect from '../components/SearchableSelect';
import CustomFileUpload from '../components/CustomFileUpload';
import { OrderBySelect, ORDER_OPTIONS_DATE_PRODUCT } from '../components/OrderBySelect';




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
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportBuyerId, setExportBuyerId] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [packagingImage, setPackagingImage] = useState(null);
  const [finishingImages, setFinishingImages] = useState([]);
  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  const handleDownloadExcel = (withDetails = false) => {
    if (!exportBuyerId) return;
    const selectedBuyer = buyers.find(b => b.id === exportBuyerId);
    if (!selectedBuyer) return;

    setShowExportOptions(false);

    api.get(`/buyer-masters/export-excel/?buyer=${exportBuyerId}&with_details=${withDetails}`, { responseType: 'blob' })
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
    price_usd: '',
    units: 1,
    cbm: '',
    total_cbm: '',
    total_amount: '',
    remark: '',
    vendor_details: '',
    vendor_price: '',
    costing: '',
    purchase_price: '',
    net_weight: '',
    gross_weight: '',
    box_size: '',
    box_length: '',
    box_breadth: '',
    box_height: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  // Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importWithDetails, setImportWithDetails] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importErrorType, setImportErrorType] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const handleDownloadTemplate = async (withDetailsOpt) => {
    const isDetailed = typeof withDetailsOpt === 'boolean' ? withDetailsOpt : Boolean(importWithDetails);
    try {
      const response = await api.get('/buyer-masters/download-template/', {
        params: { with_details: isDetailed ? 'true' : 'false' },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = isDetailed ? 'Buyer_Master_Detailed_Template.xlsx' : 'Buyer_Master_Standard_Template.xlsx';
      link.setAttribute('download', filename);
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
    setImportErrorType('');
    setImportSuccess('');

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('with_details', importWithDetails);

    try {
      const res = await api.post('/buyer-masters/import-excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSuccess(res.data.detail || 'Buyer Master data imported successfully!');
      setImportFile(null);
      fetchData();
    } catch (err) {
      console.error('Buyer Master import error:', err);
      const errData = err.response?.data;
      const errMsg = errData?.detail || 'Invalid file format or missing required column headers. Please download the expected template below.';
      const errType = errData?.error_type || 'Schema Error';
      setImportError(errMsg);
      setImportErrorType(errType);
    } finally {
      setImporting(false);
    }
  };

  const fetchData = () => {
    setLoading(true);
    api.get('/buyer-masters/', { params: { page: currentPage, ordering: ordering } })
      .then(res => {
        const data = res.data.results || res.data;
        setBuyerMasters(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    api.get('/buyers/', { params: { nopage: true } })
      .then(res => setBuyers(res.data))
      .catch(err => console.error(err));

    api.get('/samples/', { params: { nopage: true } })
      .then(res => setSamples(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, ordering]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ordering]);

  const [materialsList, setMaterialsList] = useState(['']);
  const [finishesList, setFinishesList] = useState(['']);

  const parseSlashList = (str) => {
    if (!str || typeof str !== 'string') return [''];
    const parts = str.split(/\s*\/\s*/).map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [''];
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'units' || name === 'cbm' || name === 'price_usd') {
        const u = parseInt(next.units) || 0;
        const c = parseFloat(next.cbm) || 0;
        const p = parseFloat(next.price_usd) || 0;
        if (u && c) next.total_cbm = (u * c).toFixed(4);
        if (u && p) next.total_amount = (u * p).toFixed(2);
      }
      return next;
    });
  };

  const handleBuyerChange = (e) => {
    const buyerId = e.target.value;
    const selectedBuyer = buyers.find(b => b.id === buyerId);
    setFormData(prev => ({
      ...prev,
      buyer: buyerId,
      buyer_code: selectedBuyer ? selectedBuyer.code : prev.buyer_code,
    }));
  };

  const handleDimChange = (key, val) => {
    setFormData(prev => {
      const next = { ...prev, [key]: val };
      if (key.startsWith('box_')) {
        const l = next.box_length || '';
        const b = next.box_breadth || '';
        const h = next.box_height || '';
        if (l || b || h) {
          next.box_size = `${l} x ${b} x ${h} cm`;
        }
      }
      return next;
    });
  };

  const handleSampleChange = (eOrVal) => {
    const sampleId = (typeof eOrVal === 'object' && eOrVal?.target) ? eOrVal.target.value : eOrVal;
    if (!sampleId) {
      setFormData(prev => ({ ...prev, sample: '' }));
      return;
    }


    const selectedSample = samples.find(s => s.id === sampleId);
    if (selectedSample) {
      const cbmVal = parseFloat(selectedSample.cbm) || 0;
      const priceVal = parseFloat(selectedSample.usd) || 0;
      const unitsVal = parseInt(formData.units) || 1;

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
        cbm: selectedSample.cbm || '',
        price_usd: selectedSample.usd || '',
        units: unitsVal,
        total_cbm: (cbmVal && unitsVal) ? (cbmVal * unitsVal).toFixed(4) : '',
        total_amount: (priceVal && unitsVal) ? (priceVal * unitsVal).toFixed(2) : '',
        remark: selectedSample.remark || ''
      }));
      setMaterialsList(parseSlashList(selectedSample.material));
      setFinishesList(parseSlashList(selectedSample.finish_color));
    }
  };

  // Image Management States
  const [existingPackagingUrl, setExistingPackagingUrl] = useState(null);
  const [packagingFile, setPackagingFile] = useState(null);
  const [clearPackagingImage, setClearPackagingImage] = useState(false);

  const [existingFinishingImages, setExistingFinishingImages] = useState([]);
  const [newFinishingFiles, setNewFinishingFiles] = useState([]);

  const handleRemovePackagingImage = () => {
    if (existingPackagingUrl) {
      setClearPackagingImage(true);
      setExistingPackagingUrl(null);
    }
    setPackagingFile(null);
  };

  const handleRemoveExistingFinishingImage = async (imgId) => {
    try {
      await api.delete(`/buyer-master-finishing-images/${imgId}/`);
      setExistingFinishingImages(prev => prev.filter(img => img.id !== imgId));
    } catch (err) {
      console.error('Failed to delete finishing image', err);
    }
  };

  const handleRemoveNewFinishingFile = (index) => {
    setNewFinishingFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDownloadPackagingImage = async () => {
    if (!editingId) return;
    try {
      const res = await api.get(`/buyer-masters/${editingId}/download-packaging-image/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `${formData.style_no || 'Style'}_Packaging_Image.png`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download packaging image', err);
    }
  };

  const handleDownloadFinishingImages = async () => {
    if (!editingId) return;
    try {
      const res = await api.get(`/buyer-masters/${editingId}/download-finishing-images/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      const filename = `${formData.style_no || 'Style'}_Finishing_images.zip`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download finishing images', err);
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
            price_usd: bm.price_usd || '',
            units: bm.units !== undefined && bm.units !== null ? bm.units : 1,
            cbm: bm.cbm || '',
            total_cbm: bm.total_cbm || '',
            total_amount: bm.total_amount || '',
            remark: bm.remark || '',
            vendor_details: bm.vendor_details || '',
            vendor_price: bm.vendor_price || '',
            costing: bm.costing || '',
            purchase_price: bm.purchase_price || '',
            net_weight: bm.net_weight || '',
            gross_weight: bm.gross_weight || '',
            box_size: bm.box_size || '',
            box_length: bm.box_length || '',
            box_breadth: bm.box_breadth || '',
            box_height: bm.box_height || '',
          });
          setMaterialsList(parseSlashList(bm.wood_type));
          setFinishesList(parseSlashList(bm.finish_color));
          setExistingPackagingUrl(bm.packaging_image_url || bm.packaging_image || null);
          setPackagingFile(null);
          setClearPackagingImage(false);
          setExistingFinishingImages(bm.finishing_images || []);
          setNewFinishingFiles([]);
          setEditingId(bm.id);
          setShowMoreDetails(
            !!bm.vendor_details || !!bm.vendor_price || !!bm.costing || 
            !!bm.purchase_price || !!bm.cbm || !!bm.net_weight || 
            !!bm.gross_weight || !!bm.box_size || !!bm.box_length || !!bm.packaging_image || 
            (bm.finishing_images && bm.finishing_images.length > 0)
          );
        })
        .catch(err => console.error(err));
    } else {
      setFormData(emptyForm);
      setMaterialsList(['']);
      setFinishesList(['']);
      setExistingPackagingUrl(null);
      setPackagingFile(null);
      setClearPackagingImage(false);
      setExistingFinishingImages([]);
      setNewFinishingFiles([]);
      setEditingId(null);
      setShowMoreDetails(false);
    }
  }, [id]);

  const openCreateModal = () => {
    navigate('/buyer-masters/new');
  };

  const openEditModal = (bm) => {
    navigate(`/buyer-masters/${bm.id}`);
  };

  const location = useLocation();
  const fromBuyer = location.state?.fromBuyer;

  const closeModal = () => {
    if (fromBuyer) {
      navigate(`/buyers/${fromBuyer}`);
    } else {
      navigate('/buyer-masters');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const woodTypeJoined = materialsList.map(m => m.trim()).filter(Boolean).join('/');
    const finishJoined = finishesList.map(f => f.trim()).filter(Boolean).join(' / ');
    
    const formDataPayload = new FormData();
    Object.keys(formData).forEach(key => {
      let val = formData[key];
      if (key === 'wood_type') val = woodTypeJoined;
      if (key === 'finish_color') val = finishJoined;
      if (val === null || val === undefined) val = '';
      if (key === 'sample' && !val) return; // Skip empty foreign keys
      formDataPayload.append(key, val);
    });

    if (clearPackagingImage) {
      formDataPayload.append('clear_packaging_image', 'true');
    } else if (packagingFile) {
      formDataPayload.append('packaging_image', packagingFile);
    }
    
    newFinishingFiles.forEach(item => {
      formDataPayload.append('finishing_images', item.file);
    });

    const config = { headers: { 'Content-Type': 'multipart/form-data' } };

    const request = editingId
      ? api.put(`/buyer-masters/${editingId}/`, formDataPayload, config)
      : api.post('/buyer-masters/', formDataPayload, config);

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
      setSelectedRowIds(new Set(filteredMasters.map(bm => bm.id)));
    } else {
      setSelectedRowIds(new Set());
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

          <div className="form-card-container">
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
                      <select required name="buyer" className="form-input" value={formData.buyer} onChange={handleBuyerChange}>
                        <option value="">Select Buyer...</option>
                        {buyers.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Style No (Autofill Source)</label>
                      <SearchableSelect
                        options={samples}
                        value={formData.sample}
                        onChange={handleSampleChange}
                        placeholder="Choose Style to Autofill..."
                        searchPlaceholder="Search style no or name..."
                        codeKey="style_no"
                        titleKey="product_name"
                      />
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

                    {/* ── Material(s) (Wood Type) ── */}
                    <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f9fafb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Material(s) / Wood Type *</label>
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
                    {/* ── Pricing & Quantity Details ── */}
                    <div className="form-group">
                      <label className="form-label">Price (USD)</label>
                      <input type="number" step="0.01" name="price_usd" className="form-input" value={formData.price_usd} onChange={handleChange} placeholder="e.g. 150.00" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Units</label>
                      <input type="number" name="units" className="form-input" value={formData.units} onChange={handleChange} placeholder="e.g. 1" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Amount ($)</label>
                      <input type="number" step="0.01" name="total_amount" className="form-input" value={formData.total_amount} onChange={handleChange} placeholder="Auto calculated (Units × Price)" />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
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

                <div className="form-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="form-section-title" style={{ margin: 0 }}>➕ More Details (Optional)</h3>
                    <button 
                      type="button" 
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      style={{ background: 'none', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {showMoreDetails ? 'Hide details' : 'Show details'}
                    </button>
                  </div>

                  {showMoreDetails && (
                    <div className="form-grid-2">
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Vendor Details</label>
                        <textarea name="vendor_details" className="form-input" rows="2" value={formData.vendor_details} onChange={handleChange} placeholder="Vendor name, contact, etc..."></textarea>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Vendor Price</label>
                        <input type="number" step="0.01" name="vendor_price" className="form-input" value={formData.vendor_price} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costing</label>
                        <input type="number" step="0.01" name="costing" className="form-input" value={formData.costing} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Purchase Price</label>
                        <input type="number" step="0.01" name="purchase_price" className="form-input" value={formData.purchase_price} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CBM</label>
                        <input type="number" step="0.0001" name="cbm" className="form-input" value={formData.cbm} onChange={handleChange} placeholder="e.g. 0.1250" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total CBM</label>
                        <input type="number" step="0.0001" name="total_cbm" className="form-input" value={formData.total_cbm} onChange={handleChange} placeholder="Auto calculated (Units × CBM)" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Net Weight (kg)</label>
                        <input type="number" step="0.01" name="net_weight" className="form-input" value={formData.net_weight} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Gross Weight (kg)</label>
                        <input type="number" step="0.01" name="gross_weight" className="form-input" value={formData.gross_weight} onChange={handleChange} />
                      </div>

                      {/* ── Box Size (L, B, H) ── */}
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <SizeGroup
                          label="Box Size Dimensions (cm)"
                          prefix="box"
                          values={formData}
                          onChange={handleDimChange}
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Box Size Summary</label>
                        <input type="text" name="box_size" className="form-input" value={formData.box_size} onChange={handleChange} placeholder="e.g. 100 x 50 x 50 cm" />
                      </div>

                      {/* ── Packaging Image ── */}
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <CustomFileUpload
                          label="Packaging Image"
                          icon={Package}
                          singleFile={packagingFile || existingPackagingUrl}
                          onChange={file => {
                            setPackagingFile(file);
                            setClearPackagingImage(false);
                          }}
                          onRemoveNew={handleRemovePackagingImage}
                        />
                        {editingId && existingPackagingUrl && (
                          <button
                            type="button"
                            onClick={handleDownloadPackagingImage}
                            className="btn-secondary"
                            style={{ marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                          >
                            <Download size={15} /> Download Packaging Image
                          </button>
                        )}
                      </div>

                      {/* ── Finishing Images ── */}
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                          {editingId && existingFinishingImages.length > 0 && (
                            <button
                              type="button"
                              onClick={handleDownloadFinishingImages}
                              className="btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem', marginLeft: 'auto' }}
                            >
                              <Download size={15} /> Download Finishing Images (ZIP)
                            </button>
                          )}
                        </div>

                        <CustomFileUpload
                          label="Finishing Images"
                          multiple
                          icon={ImageIcon}
                          existingFiles={existingFinishingImages}
                          newFiles={newFinishingFiles}
                          onChange={files => {
                            const mapped = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                            setNewFinishingFiles(prev => [...prev, ...mapped]);
                          }}
                          onRemoveNew={idx => handleRemoveNewFinishingFile(idx)}
                          onRemoveExisting={id => handleRemoveExistingFinishingImage(id)}
                        />
                      </div>


                    </div>
                  )}
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
          <style>{`
            @media (max-width: 768px) {
              .bm-header-actions {
                width: 100% !important;
                display: flex !important;
                gap: 0.5rem !important;
              }
              .bm-header-actions button {
                flex: 1 !important;
                justify-content: center !important;
              }
              .bm-filter-container {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 0.65rem !important;
              }
              .bm-search {
                width: 100% !important;
                max-width: 100% !important;
              }
              .bm-search input {
                height: 42px !important;
                max-height: 42px !important;
                box-sizing: border-box !important;
                border-radius: 10px !important;
              }
              .bm-export {
                width: 100% !important;
                flex-wrap: wrap !important;
                gap: 0.5rem !important;
              }
              .bm-export select {
                flex: 1 !important;
                min-width: 0 !important;
                border-radius: 10px !important;
              }
              .bm-export button {
                border-radius: 10px !important;
                padding: 0.55rem 1rem !important;
              }
              .bm-order {
                width: 100% !important;
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 0.25rem !important;
              }
              .bm-order > div {
                width: 100% !important;
              }
            }
          `}</style>

          <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '0 0.5rem 1rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderTree size={28} color="#7c3aed" style={{ flexShrink: 0 }} /> Buyer Master Style Registry
            </h2>
            <div className="bm-header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={() => { setIsImportModalOpen(true); setImportError(''); setImportErrorType(''); setImportSuccess(''); setImportFile(null); }} 
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}
              >
                <FileSpreadsheet size={16} color="#7c3aed" /> Import Excel
              </button>
              <button onClick={openCreateModal} className="btn-primary">+ Register New Style</button>
            </div>
          </div>

          <div className="filter-bar">
            <div className="bm-filter-container">
              <div className="bm-search">
                <Search size={18} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search styles, products, buyers..."
                  className="filter-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="bm-export">
                <span className="filter-label" style={{ fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', fontSize: '0.78rem' }}>EXPORT BUYER MASTER:</span>
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
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => exportBuyerId && setShowExportOptions(!showExportOptions)}
                    className="btn-primary"
                    disabled={!exportBuyerId}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', opacity: exportBuyerId ? 1 : 0.6 }}
                  >
                    Download Excel
                  </button>
                  {showExportOptions && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, minWidth: '200px' }}>
                      <button 
                        onClick={() => handleDownloadExcel(false)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #f1f5f9' }}
                      >
                        Standard Download
                      </button>
                      <button 
                        onClick={() => handleDownloadExcel(true)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}
                      >
                        Download With More Details
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bm-order" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="filter-label" style={{ fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', fontSize: '0.78rem' }}>ORDER BY:</span>
                <OrderBySelect
                  options={ORDER_OPTIONS_DATE_PRODUCT}
                  value={ordering}
                  onChange={setOrdering}
                />
              </div>

            </div>
          </div>

          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredMasters.length > 0 && selectedRowIds.size === filteredMasters.length}
                      onChange={toggleSelectAll}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                  </th>
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
                {loading ? (
                  <TableSkeleton rows={8} cols={8} hasImage={false} />
                ) : filteredMasters.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No styles found in Buyer Master.
                    </td>
                  </tr>
                ) : (
                  filteredMasters.map(bm => (
                    <tr
                      key={bm.id}
                      onClick={() => openEditModal(bm)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedRowIds.has(bm.id) ? '#dcfce7' : undefined,
                        transition: 'background-color 0.2s ease',
                      }}
                      className="smooth-fade-in"
                      title="Click to view/edit detail"
                    >
                      <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(bm.id)}
                          onChange={e => toggleSelectRow(bm.id, e)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                        />
                      </td>
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
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(bm); }} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginRight: 0 }}>Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(bm.id, bm.style_no); }} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
                        </div>
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
            ) : filteredMasters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No styles found in Buyer Master.
              </div>
            ) : (
              filteredMasters.map(bm => {
                const buyerName = bm.buyer_detail?.name || 'Unknown Buyer';
                const initials = buyerName.substring(0, 2).toUpperCase();
                return (
                  <div 
                    className="mobile-card smooth-fade-in" 
                    key={bm.id} 
                    onClick={() => openEditModal(bm)}
                    style={{ backgroundColor: selectedRowIds.has(bm.id) ? '#f0fdf4' : '#fff' }}
                  >
                    <div onClick={e => e.stopPropagation()} className="mobile-card-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(bm.id)}
                        onChange={e => toggleSelectRow(bm.id, e)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                      />
                    </div>
                    
                    <div className="mobile-card-img" style={{ backgroundColor: '#f5efe6', color: '#8b5a2b', fontWeight: 'bold', fontSize: '1.2rem', borderRadius: '12px', width: '56px', height: '56px' }}>
                      {initials}
                    </div>
                    
                    <div className="mobile-card-content" style={{ paddingLeft: '0.5rem' }}>
                      <div className="mobile-card-title">{buyerName}</div>
                      <div className="mobile-card-subtitle" style={{ marginTop: '0.25rem' }}>
                        <span className="navbar-role-badge admin-badge" style={{ backgroundColor: '#f5efe6', color: '#8b5a2b', padding: '2px 8px' }}>{bm.style_no}</span>
                      </div>
                      <div className="mobile-card-subtitle" style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {bm.product_name}
                      </div>
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
      {/* ── Buyer Master Excel Import Modal ── */}
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
              maxWidth: '560px', 
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
                <FileSpreadsheet size={22} color="#7c3aed" /> Import Buyer Master Excel
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

              {/* Import Option Switcher */}
              <div style={{ marginBottom: '1.25rem', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                  Select Import Option:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setImportWithDetails(false); setImportError(''); setImportErrorType(''); }}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: importWithDetails ? '1px solid #cbd5e1' : '2px solid #7c3aed',
                      backgroundColor: importWithDetails ? '#ffffff' : '#f5f3ff',
                      color: importWithDetails ? '#475569' : '#7c3aed',
                      fontWeight: importWithDetails ? 500 : 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    📄 Standard Import
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImportWithDetails(true); setImportError(''); setImportErrorType(''); }}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: importWithDetails ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      backgroundColor: importWithDetails ? '#f5f3ff' : '#ffffff',
                      color: importWithDetails ? '#7c3aed' : '#475569',
                      fontWeight: importWithDetails ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    📊 Import with Details
                  </button>
                </div>
              </div>

              {/* Template Download Alert (ONLY shown when there is NO error) */}
              {!importError && !importSuccess && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>
                      Need expected {importWithDetails ? 'Detailed' : 'Standard'} format?
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      Auto-creates missing Buyers in Buyer table & updates Master registry.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(importWithDetails)}
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, backgroundColor: '#ffffff', whiteSpace: 'nowrap' }}
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
                          onClick={() => handleDownloadTemplate(importWithDetails)}
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
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.75rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                  onClick={() => document.getElementById('bmExcelFileInput').click()}
                >
                  <FileSpreadsheet size={36} color="#7c3aed" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                    {importFile ? importFile.name : `Click to upload ${importWithDetails ? 'Detailed' : 'Standard'} Excel file (.xlsx)`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Auto-creates missing Buyers in Buyer table + extracts cell photos
                  </div>
                  <input
                    id="bmExcelFileInput"
                    type="file"
                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setImportFile(e.target.files[0]);
                        setImportError('');
                        setImportErrorType('');
                        setImportSuccess('');
                      }
                    }}
                  />
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsImportModalOpen(false)}>Close</button>
                  <button type="submit" className="btn-primary" disabled={!importFile || importing} style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}>
                    {importing ? 'Processing & Importing...' : 'Upload & Import Data'}
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

export default BuyerMasters;
