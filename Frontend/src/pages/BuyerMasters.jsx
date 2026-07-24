import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, ArrowLeft, ChevronRight, Download, Upload, ImageIcon } from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';


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

  const handleSampleChange = (e) => {
    const sampleId = e.target.value;
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
                      <select required name="buyer" className="form-input" value={formData.buyer} onChange={handleBuyerChange}>
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

                      {/* ── Packaging Image Preview, Red Cross & Download ── */}
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Packaging Image</label>
                        {(existingPackagingUrl || packagingFile) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.4rem' }}>
                            <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2px', background: '#fff' }}>
                              <img
                                src={packagingFile ? URL.createObjectURL(packagingFile) : existingPackagingUrl}
                                alt="Packaging Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                              />
                              <button
                                type="button"
                                onClick={handleRemovePackagingImage}
                                style={{
                                  position: 'absolute',
                                  top: '-8px',
                                  right: '-8px',
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: '#ef4444',
                                  color: '#ffffff',
                                  border: '2px solid #ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  zIndex: 10
                                }}
                                title="Remove Packaging Image"
                              >
                                <X size={12} strokeWidth={3} />
                              </button>
                            </div>
                            {editingId && existingPackagingUrl && (
                              <button
                                type="button"
                                onClick={handleDownloadPackagingImage}
                                className="btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.85rem', height: 'fit-content' }}
                              >
                                <Download size={15} /> Download Packaging Image
                              </button>
                            )}
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="image/*"
                            className="form-input"
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                setPackagingFile(e.target.files[0]);
                                setClearPackagingImage(false);
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* ── Finishing Images Gallery Preview, Red Cross & Single ZIP Download ── */}
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Finishing Images</label>
                          {editingId && existingFinishingImages.length > 0 && (
                            <button
                              type="button"
                              onClick={handleDownloadFinishingImages}
                              className="btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                            >
                              <Download size={15} /> Download Finishing Images (ZIP)
                            </button>
                          )}
                        </div>

                        {(existingFinishingImages.length > 0 || newFinishingFiles.length > 0) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem', padding: '0.65rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {/* Existing Backend Finishing Images */}
                            {existingFinishingImages.map(img => (
                              <div key={img.id} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2px', background: '#fff' }}>
                                <img
                                  src={img.image_url || img.image}
                                  alt="Finishing"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingFinishingImage(img.id)}
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    border: '2px solid #ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    zIndex: 10
                                  }}
                                  title="Remove Image"
                                >
                                  <X size={12} strokeWidth={3} />
                                </button>
                              </div>
                            ))}

                            {/* New Finishing Image Files */}
                            {newFinishingFiles.map((item, idx) => (
                              <div key={idx} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2px', background: '#fff' }}>
                                <img
                                  src={item.preview}
                                  alt="New Finishing"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewFinishingFile(idx)}
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    border: '2px solid #ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    zIndex: 10
                                  }}
                                  title="Remove Image"
                                >
                                  <X size={12} strokeWidth={3} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="form-input"
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            const mapped = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                            setNewFinishingFiles(prev => [...prev, ...mapped]);
                            e.target.value = '';
                          }}
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
          <div className="page-header">
            <h2>Buyer Master Style Registry</h2>
            <button onClick={openCreateModal} className="btn-primary">+ Register New Style</button>
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

              <div className="bm-order">
                <span className="filter-label">Order By:</span>
                <select
                  className="filter-input"
                  value={ordering}
                  onChange={e => setOrdering(e.target.value)}
                  style={{ minWidth: '130px', marginLeft: '0.5rem' }}
                >
                  <option value="-created_at">Latest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="product_name">Name (A-Z)</option>
                  <option value="-product_name">Name (Z-A)</option>
                </select>
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
    </div>
  );
}

export default BuyerMasters;
