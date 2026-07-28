import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, ArrowLeft, ChevronRight, ChevronLeft, Download, ImageIcon, Package, FolderTree, FileSpreadsheet, AlertCircle, CheckCircle, Layers, FileText, Eye } from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import SearchableSelect from '../components/SearchableSelect';
import MultiSearchableSelect from '../components/MultiSearchableSelect';
import CustomFileUpload from '../components/CustomFileUpload';
import { OrderBySelect, ORDER_OPTIONS_DATE_PRODUCT } from '../components/OrderBySelect';
import CustomSelect from '../components/CustomSelect';



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
  const { id, buyerId: paramBuyerId } = useParams();
  const navigate = useNavigate();

  const [buyerMasters, setBuyerMasters] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [samples, setSamples] = useState([]);
  const [finishesOptions, setFinishesOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportBuyerId, setExportBuyerId] = useState('');
  const [exportModalGroup, setExportModalGroup] = useState(null);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
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
        link.setAttribute('download', `${selectedBuyer.code || selectedBuyer.name}_Buyer_Master.xlsx`);
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

    api.get('/finishes/', { params: { nopage: true } })
      .then(res => setFinishesOptions(res.data))
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
  const [formError, setFormError] = useState('');

  // ── Multi-Style Queue (new-form mode) ──
  const [selectedStyleIds, setSelectedStyleIds] = useState([]); // selected sample ids in multi-picker
  const [globalBuyerId, setGlobalBuyerId] = useState('');       // buyer selected in top control bar
  const [styleQueue, setStyleQueue] = useState([]);              // [{ sampleId, formData, materialsList, finishesList, status: 'unsaved'|'editing'|'saved' }]
  const [activeStyleIdx, setActiveStyleIdx] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [batchSuccess, setBatchSuccess] = useState('');
  const [mobilePanelView, setMobilePanelView] = useState('list'); // 'list' | 'editor'

  // Build an empty style form data for a given sample
  const buildStyleFromSample = (sampleId, buyerId) => {
    const s = samples.find(x => x.id === sampleId);
    const buyer = buyers.find(b => b.id === buyerId);
    if (!s) return null;
    const cbmVal = parseFloat(s.cbm) || 0;
    const priceVal = parseFloat(s.usd) || 0;
    const unitsVal = 1;
    return {
      sampleId,
      formData: {
        buyer: buyerId || '',
        sample: sampleId,
        style_no: s.style_no || '',
        buyer_code: s.buyer_detail?.code || buyer?.code || '',
        product_name: s.product_name || '',
        wood_type: s.material || '',
        finish_color: s.finish_color || '',
        size_length: s.size_length || '',
        size_breadth: s.size_breadth || '',
        size_height: s.size_height || '',
        cbm: s.cbm || '',
        price_usd: s.usd || '',
        units: unitsVal,
        total_cbm: (cbmVal && unitsVal) ? (cbmVal * unitsVal).toFixed(4) : '',
        total_amount: (priceVal && unitsVal) ? (priceVal * unitsVal).toFixed(2) : '',
        remark: s.remark || '',
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
        total_cbm: '',
      },
      materialsList: parseSlashList(s.material),
      finishesList: parseSlashList(s.finish_color),
      showMoreDetails: false,
      status: 'unsaved', // 'unsaved' | 'saving' | 'saved' | 'error'
      packagingFile: null,
      finishingFiles: [],
      error: '',
    };
  };

  // When selected style IDs change, sync the queue
  useEffect(() => {
    if (!id || id === 'new') {
      setStyleQueue(prev => {
        const existingIds = prev.map(q => q.sampleId);
        // Add new ones
        const toAdd = selectedStyleIds.filter(sid => !existingIds.includes(sid));
        // Remove deselected ones (only unsaved/error, keep saved)
        const toKeep = prev.filter(q => selectedStyleIds.includes(q.sampleId) || q.status === 'saved');
        const newEntries = toAdd.map(sid => buildStyleFromSample(sid, globalBuyerId)).filter(Boolean);
        const merged = [...toKeep, ...newEntries];
        // Clamp active idx
        setActiveStyleIdx(idx => Math.min(idx, Math.max(0, merged.length - 1)));
        return merged;
      });
    }
  }, [selectedStyleIds]);

  // Update buyer_code in all unsaved queue items when global buyer changes
  const handleGlobalBuyerChange = (e) => {
    const buyerId = e.target ? e.target.value : e;
    setGlobalBuyerId(buyerId);
    const buyer = buyers.find(b => b.id === buyerId);
    setStyleQueue(prev => prev.map(q => q.status !== 'saved' ? {
      ...q,
      formData: { ...q.formData, buyer: buyerId, buyer_code: buyer?.code || q.formData.buyer_code }
    } : q));
    // Also update single-style edit mode formData
    if (formError) setFormError('');
    setFormData(prev => ({ ...prev, buyer: buyerId, buyer_code: buyer?.code || prev.buyer_code }));
  };

  // Get the active queue item's formData and helpers
  const activeItem = styleQueue[activeStyleIdx];

  const updateActiveFormData = (updater) => {
    setStyleQueue(prev => {
      const next = [...prev];
      if (!next[activeStyleIdx]) return prev;
      const item = { ...next[activeStyleIdx] };
      item.formData = typeof updater === 'function' ? updater(item.formData) : { ...item.formData, ...updater };
      if (item.status !== 'saved') item.status = 'editing';
      next[activeStyleIdx] = item;
      return next;
    });
  };

  const updateActiveField = (name, value) => {
    updateActiveFormData(prev => {
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

  const updateActiveMaterials = (list) => {
    setStyleQueue(prev => {
      const next = [...prev];
      if (!next[activeStyleIdx]) return prev;
      next[activeStyleIdx] = { ...next[activeStyleIdx], materialsList: list };
      return next;
    });
  };

  const updateActiveFinishes = (list) => {
    setStyleQueue(prev => {
      const next = [...prev];
      if (!next[activeStyleIdx]) return prev;
      next[activeStyleIdx] = { ...next[activeStyleIdx], finishesList: list };
      return next;
    });
  };

  const updateActiveMoreDetails = (val) => {
    setStyleQueue(prev => {
      const next = [...prev];
      if (!next[activeStyleIdx]) return prev;
      next[activeStyleIdx] = { ...next[activeStyleIdx], showMoreDetails: val };
      return next;
    });
  };

  // Save a single queue item to the backend
  const saveQueueItem = async (idx) => {
    const item = styleQueue[idx];
    if (!item) return false;

    // Duplicate check
    const styleNo = item.formData.style_no?.trim();
    if (styleNo) {
      const dup = buyerMasters.find(bm =>
        bm.style_no && bm.style_no.trim().toLowerCase() === styleNo.toLowerCase()
      );
      if (dup) {
        setStyleQueue(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: 'error', error: `Style No. '${styleNo}' already exists in Buyer Master.` };
          return next;
        });
        return false;
      }
    }

    const woodTypeJoined = item.materialsList.map(m => m.trim()).filter(Boolean).join('/');
    const finishJoined = item.finishesList.map(f => f.trim()).filter(Boolean).join(' / ');

    const fd = new FormData();
    Object.keys(item.formData).forEach(key => {
      let val = item.formData[key];
      if (key === 'wood_type') val = woodTypeJoined;
      if (key === 'finish_color') val = finishJoined;
      if (val === null || val === undefined) val = '';
      if (key === 'sample' && !val) return;
      fd.append(key, val);
    });

    if (item.packagingFile) fd.append('packaging_image', item.packagingFile);
    (item.finishingFiles || []).forEach(f => fd.append('finishing_images', f.file));

    const isEdit = !!item.existingId;
    const url = isEdit ? `/buyer-masters/${item.existingId}/` : '/buyer-masters/';
    const method = isEdit ? 'put' : 'post';

    try {
      await api[method](url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setStyleQueue(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: 'saved', error: '' };
        return next;
      });
      return true;
    } catch (err) {
      const errData = err.response?.data;
      const errMsg = errData?.style_no?.[0] || errData?.detail || 'Failed to save. Please check inputs.';
      setStyleQueue(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: 'error', error: errMsg };
        return next;
      });
      return false;
    }
  };

  const handleSaveCurrentStyle = async () => {
    const ok = await saveQueueItem(activeStyleIdx);
    if (ok) fetchData();
  };

  const handleSaveAllStyles = async () => {
    setBatchSaving(true);
    setBatchError('');
    setBatchSuccess('');
    let failed = 0;
    for (let i = 0; i < styleQueue.length; i++) {
      if (styleQueue[i].status !== 'saved') {
        const ok = await saveQueueItem(i);
        if (!ok) failed++;
      }
    }
    setBatchSaving(false);
    fetchData();
    if (failed > 0) {
      setBatchError(`${failed} style(s) failed to save. Please check highlighted errors.`);
    } else {
      setBatchSuccess(`All ${styleQueue.length} styles saved successfully!`);
    }
  };

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
    if (formError) setFormError('');
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

  // Load filled style queue when buyerId or id parameter is present in URL
  useEffect(() => {
    const targetBuyerId = paramBuyerId || (id && id !== 'new' ? id : null);
    if (targetBuyerId) {
      setLoading(true);
      api.get('/buyer-masters/', { params: { buyer: targetBuyerId, nopage: true } })
        .then(res => {
          const records = res.data.results || res.data;
          if (Array.isArray(records) && records.length > 0) {
            const bId = records[0].buyer || records[0].buyer_detail?.id || targetBuyerId;
            setGlobalBuyerId(bId);

            const sampleIds = records.map(s => s.sample).filter(Boolean);
            setSelectedStyleIds(sampleIds);

            const queue = records.map(s => ({
              sampleId: s.sample || s.id,
              existingId: s.id,
              formData: {
                buyer: bId,
                sample: s.sample || '',
                style_no: s.style_no || '',
                buyer_code: s.buyer_code || s.buyer_detail?.code || '',
                product_name: s.product_name || '',
                wood_type: s.wood_type || '',
                finish_color: s.finish_color || '',
                size_length: s.size_length || '',
                size_breadth: s.size_breadth || '',
                size_height: s.size_height || '',
                cbm: s.cbm || '',
                price_usd: s.price_usd || '',
                units: s.units !== undefined && s.units !== null ? s.units : 1,
                total_cbm: s.total_cbm || '',
                total_amount: s.total_amount || '',
                remark: s.remark || '',
                vendor_details: s.vendor_details || '',
                vendor_price: s.vendor_price || '',
                costing: s.costing || '',
                purchase_price: s.purchase_price || '',
                net_weight: s.net_weight || '',
                gross_weight: s.gross_weight || '',
                box_size: s.box_size || '',
                box_length: s.box_length || '',
                box_breadth: s.box_breadth || '',
                box_height: s.box_height || '',
              },
              materialsList: parseSlashList(s.wood_type),
              finishesList: parseSlashList(s.finish_color),
              showMoreDetails: !!(s.vendor_details || s.vendor_price || s.costing || s.purchase_price || s.cbm || s.net_weight || s.gross_weight || s.box_size || s.packaging_image || (s.finishing_images && s.finishing_images.length > 0)),
              status: 'saved',
              packagingFile: null,
              existingPackagingUrl: s.packaging_image_url || s.packaging_image || null,
              finishingFiles: [],
              existingFinishingImages: s.finishing_images || [],
              error: '',
            }));

            setStyleQueue(queue);
            setActiveStyleIdx(0);
            setMobilePanelView('list');
          } else {
            // Fallback for single item route lookup
            api.get(`/buyer-masters/${targetBuyerId}/`)
              .then(singleRes => {
                const bm = singleRes.data;
                setGlobalBuyerId(bm.buyer);
                setSelectedStyleIds(bm.sample ? [bm.sample] : []);
                const singleQueueItem = {
                  sampleId: bm.sample || bm.id,
                  existingId: bm.id,
                  formData: {
                    buyer: bm.buyer,
                    sample: bm.sample || '',
                    style_no: bm.style_no || '',
                    buyer_code: bm.buyer_code || '',
                    product_name: bm.product_name || '',
                    wood_type: bm.wood_type || '',
                    finish_color: bm.finish_color || '',
                    size_length: bm.size_length || '',
                    size_breadth: bm.size_breadth || '',
                    size_height: bm.size_height || '',
                    cbm: bm.cbm || '',
                    price_usd: bm.price_usd || '',
                    units: bm.units !== undefined && bm.units !== null ? bm.units : 1,
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
                  },
                  materialsList: parseSlashList(bm.wood_type),
                  finishesList: parseSlashList(bm.finish_color),
                  showMoreDetails: false,
                  status: 'saved',
                  packagingFile: null,
                  existingPackagingUrl: bm.packaging_image_url || bm.packaging_image || null,
                  finishingFiles: [],
                  existingFinishingImages: bm.finishing_images || [],
                  error: '',
                };
                setStyleQueue([singleQueueItem]);
                setActiveStyleIdx(0);
              })
              .catch(err => console.error(err));
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else if (id === 'new') {
      setFormData(emptyForm);
      setGlobalBuyerId('');
      setSelectedStyleIds([]);
      setStyleQueue([]);
      setActiveStyleIdx(0);
    }
  }, [id, paramBuyerId]);

  // Group Buyer Master records by Buyer for 1 Buyer = 1 Listing Row pattern
  const groupedMasters = React.useMemo(() => {
    const map = {};
    (buyerMasters || []).forEach(bm => {
      if (!bm) return;
      const bId = bm.buyer || bm.buyer_detail?.id || 'unknown';
      if (!map[bId]) {
        const bObj = (buyers || []).find(b => b.id === bId);
        map[bId] = {
          buyerId: bId,
          buyerName: bm.buyer_detail?.name || bObj?.name || 'Unknown Buyer',
          buyerCode: bm.buyer_detail?.code || bObj?.code || '',
          styles: [],
          totalStyles: 0,
          totalUnits: 0,
          totalAmount: 0,
          lastUpdated: bm.created_at || new Date().toISOString(),
        };
      }
      map[bId].styles.push(bm);
      map[bId].totalStyles += 1;
      map[bId].totalUnits += (parseInt(bm.units) || 0);
      map[bId].totalAmount += (parseFloat(bm.total_amount) || 0);
      if (bm.created_at && new Date(bm.created_at) > new Date(map[bId].lastUpdated)) {
        map[bId].lastUpdated = bm.created_at;
      }
    });
    return Object.values(map);
  }, [buyerMasters, buyers]);

  const filteredGroupedMasters = React.useMemo(() => {
    if (!groupedMasters) return [];
    if (!searchTerm) return groupedMasters;
    const term = searchTerm.toLowerCase();
    return groupedMasters.filter(g =>
      (g.buyerName || '').toLowerCase().includes(term) ||
      (g.buyerCode || '').toLowerCase().includes(term) ||
      (g.styles && g.styles.some(s =>
        (s.style_no || '').toLowerCase().includes(term) ||
        (s.product_name || '').toLowerCase().includes(term)
      ))
    );
  }, [groupedMasters, searchTerm]);

  const openGroupedEdit = (group) => {
    setFormError('');
    if (group && group.buyerId) {
      navigate(`/buyer-masters/buyer/${group.buyerId}`);
    }
  };

  const handleRowDownloadExcel = (buyerId, buyerName, withDetails = false) => {
    api.get(`/buyer-masters/export-excel/?buyer=${buyerId}&with_details=${withDetails}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        const safeName = (buyerName || 'Buyer').replace(/[^a-zA-Z0-9_-]/g, '_');
        link.setAttribute('download', `${safeName}_Buyer_Master_${withDetails ? 'Detailed' : 'Standard'}.xlsx`);
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

  const handleDeleteGroup = async (group, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete all ${group.totalStyles} registered style(s) for buyer "${group.buyerName}"?`)) {
      return;
    }
    try {
      await Promise.all(group.styles.map(s => api.delete(`/buyer-masters/${s.id}/`)));
      fetchData();
    } catch (err) {
      console.error('Failed to delete buyer master group', err);
      alert('Failed to delete some items. Please try again.');
    }
  };

  const openCreateModal = () => {
    setFormError('');
    navigate('/buyer-masters/new');
  };

  const openEditModal = (bm) => {
    setFormError('');
    navigate(`/buyer-masters/${bm.id}`);
  };

  const location = useLocation();
  const fromBuyer = location.state?.fromBuyer;

  const closeModal = () => {
    setFormError('');
    if (fromBuyer) {
      navigate(`/buyers/${fromBuyer}`);
    } else {
      navigate('/buyer-masters');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-check for duplicate style_no
    const styleNo = formData.style_no?.trim();
    if (styleNo) {
      const duplicate = buyerMasters.find(bm =>
        bm.style_no &&
        bm.style_no.trim().toLowerCase() === styleNo.toLowerCase() &&
        String(bm.id) !== String(editingId || '')
      );
      if (duplicate) {
        setFormError(`Style No. '${styleNo}' already exists in Buyer Master.`);
        return;
      }
    }

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
      .catch(err => {
        console.error('Submit error:', err);
        if (err.response?.data?.style_no) {
          const msg = Array.isArray(err.response.data.style_no)
            ? err.response.data.style_no[0]
            : err.response.data.style_no;
          setFormError(msg || `Style No. '${formData.style_no}' already exists in Buyer Master.`);
        } else if (err.response?.data?.detail) {
          setFormError(err.response.data.detail);
        } else {
          setFormError('Failed to save Buyer Master style. Please check your inputs.');
        }
      });
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

  const filteredMasters = (buyerMasters || []).filter(bm => {
    if (!bm) return false;
    const term = (searchTerm || '').toLowerCase();
    return (
      (bm.style_no || '').toLowerCase().includes(term) ||
      (bm.product_name || '').toLowerCase().includes(term) ||
      (bm.buyer_code || '').toLowerCase().includes(term) ||
      (bm.buyer_detail?.name || '').toLowerCase().includes(term)
    );
  });

  const isFormMode = !!(id || paramBuyerId);

  return (
    <div>
      {isFormMode ? (
        <div className="new-page-form">
          {/* Back button */}
          <button
            onClick={closeModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', color: '#8b5a2b',
              fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem',
              padding: 0, fontSize: '1rem'
            }}
          >
            <ArrowLeft size={18} /> Back to Buyer Master
          </button>

          {/* Page Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Layers size={24} color="#8b5a2b" /> {editingId ? '✏️ Edit Buyer Master Style' : '+ Register New Buyer Master Styles'}
            </h2>
          </div>

          {/* ── EDIT MODE: Single style ── */}
          {editingId ? (
            <div className="form-card-container">
              <div className="modal-body" style={{ padding: 0 }}>
                <form onSubmit={handleSubmit}>
                  {formError && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#991b1b', fontSize: '0.9rem', fontWeight: 600 }}>
                      <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}
                  <div className="form-section">
                    <h3 className="form-section-title">🔗 Linkings</h3>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Buyer *</label>
                        <CustomSelect name="buyer" value={formData.buyer} onChange={handleBuyerChange}
                          options={[{ value: '', label: 'Select Buyer...' }, ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))]}
                          placeholder="Select Buyer..." />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Style No (Autofill Source)</label>
                        <SearchableSelect options={samples} value={formData.sample} onChange={handleSampleChange}
                          placeholder="Choose Style to Autofill..." searchPlaceholder="Search style no or name..."
                          codeKey="style_no" titleKey="product_name" />
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
                      <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f9fafb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Material(s) / Wood Type *</label>
                          <button type="button" onClick={addMaterialField} className="btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', background: '#fff' }}>+ Add Material</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {materialsList.map((mat, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input required={idx === 0} type="text" className="form-input" value={mat} onChange={e => handleMaterialItemChange(idx, e.target.value)} placeholder={`Material ${idx + 1}`} />
                              {materialsList.length > 1 && (
                                <button type="button" onClick={() => removeMaterialField(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }} title="Remove"><X size={16} /></button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Finish (Catalog Reference)</label>
                        <CustomSelect name="finish_color" value={formData.finish_color || ''} onChange={handleChange}
                          options={[{ value: '', label: 'Select Registered Finish...' }, ...finishesOptions.map(f => ({ value: f.name, label: `${f.finish_code ? `[${f.finish_code}] ` : ''}${f.name} (${f.color || f.wood_type || 'Catalog'})` }))]}
                          placeholder="Select Registered Finish..." />
                      </div>
                      <div className="bm-price-units-row" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label className="form-label">Price (USD)</label>
                          <input type="number" step="0.01" name="price_usd" className="form-input" value={formData.price_usd} onChange={handleChange} placeholder="e.g. 150.00" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Units</label>
                          <input type="number" name="units" className="form-input" value={formData.units} onChange={handleChange} placeholder="e.g. 1" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total Amount ($)</label>
                        <input type="number" step="0.01" name="total_amount" className="form-input" value={formData.total_amount} onChange={handleChange} placeholder="Auto calculated" />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Remark</label>
                        <textarea name="remark" className="form-input" rows="2" value={formData.remark} onChange={handleChange} placeholder="Any specific requirements..."></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="form-section-title">📐 Product Size</h3>
                    <SizeGroup label="Dimensions (cm)" prefix="size" values={formData} onChange={handleDimChange} />
                  </div>

                  <div className="form-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 className="form-section-title" style={{ margin: 0 }}>➕ More Details (Optional)</h3>
                      <button type="button" onClick={() => setShowMoreDetails(!showMoreDetails)} style={{ background: 'none', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        {showMoreDetails ? 'Hide details' : 'Show details'}
                      </button>
                    </div>
                    {showMoreDetails && (
                      <div className="form-grid-2">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label className="form-label">Vendor Details</label>
                          <textarea name="vendor_details" className="form-input" rows="2" value={formData.vendor_details} onChange={handleChange} placeholder="Vendor name, contact, etc..."></textarea>
                        </div>
                        <div className="form-group"><label className="form-label">Vendor Price</label><input type="number" step="0.01" name="vendor_price" className="form-input" value={formData.vendor_price} onChange={handleChange} /></div>
                        <div className="form-group"><label className="form-label">Costing</label><input type="number" step="0.01" name="costing" className="form-input" value={formData.costing} onChange={handleChange} /></div>
                        <div className="form-group"><label className="form-label">Purchase Price</label><input type="number" step="0.01" name="purchase_price" className="form-input" value={formData.purchase_price} onChange={handleChange} /></div>
                        <div className="form-group"><label className="form-label">CBM</label><input type="number" step="0.0001" name="cbm" className="form-input" value={formData.cbm} onChange={handleChange} placeholder="e.g. 0.1250" /></div>
                        <div className="form-group"><label className="form-label">Total CBM</label><input type="number" step="0.0001" name="total_cbm" className="form-input" value={formData.total_cbm} onChange={handleChange} placeholder="Auto calculated" /></div>
                        <div className="form-group"><label className="form-label">Net Weight (kg)</label><input type="number" step="0.01" name="net_weight" className="form-input" value={formData.net_weight} onChange={handleChange} /></div>
                        <div className="form-group"><label className="form-label">Gross Weight (kg)</label><input type="number" step="0.01" name="gross_weight" className="form-input" value={formData.gross_weight} onChange={handleChange} /></div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <SizeGroup label="Box Size Dimensions (cm)" prefix="box" values={formData} onChange={handleDimChange} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label className="form-label">Box Size Summary</label>
                          <input type="text" name="box_size" className="form-input" value={formData.box_size} onChange={handleChange} placeholder="e.g. 100 x 50 x 50 cm" />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <label className="form-label" style={{ margin: 0, fontWeight: 650 }}>Packaging Image</label>
                            {editingId && existingPackagingUrl && (
                              <button type="button" onClick={handleDownloadPackagingImage} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', backgroundColor: '#fdf8f5', border: '1.5px solid #d6c7b2', color: '#8b5a2b', fontWeight: 650, fontSize: '0.82rem', padding: '0.4rem 0.85rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5e6d3'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fdf8f5'}>
                                <Download size={14} color="#8b5a2b" strokeWidth={2.2} /> Download Packaging Image
                              </button>
                            )}
                          </div>
                          <CustomFileUpload icon={Package} singleFile={packagingFile || existingPackagingUrl} onChange={file => { setPackagingFile(file); setClearPackagingImage(false); }} onRemoveNew={handleRemovePackagingImage} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <label className="form-label" style={{ margin: 0, fontWeight: 650 }}>Finishing Images</label>
                            {editingId && existingFinishingImages.length > 0 && (
                              <button type="button" onClick={handleDownloadFinishingImages} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', backgroundColor: '#fdf8f5', border: '1.5px solid #d6c7b2', color: '#8b5a2b', fontWeight: 650, fontSize: '0.82rem', padding: '0.4rem 0.85rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5e6d3'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fdf8f5'}>
                                <Download size={14} color="#8b5a2b" strokeWidth={2.2} /> Download Finishing Images (ZIP)
                              </button>
                            )}
                          </div>
                          <CustomFileUpload multiple icon={ImageIcon} existingFiles={existingFinishingImages} newFiles={newFinishingFiles}
                            onChange={files => { const mapped = files.map(file => ({ file, preview: URL.createObjectURL(file) })); setNewFinishingFiles(prev => [...prev, ...mapped]); }}
                            onRemoveNew={idx => handleRemoveNewFinishingFile(idx)} onRemoveExisting={id => handleRemoveExistingFinishingImage(id)} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bm-edit-form-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Style'}</button>
                  </div>
                </form>
              </div>
            </div>

          ) : (
            /* ── MULTI-STYLE CREATE MODE ── */
            <>
              {/* ── Top Control Bar ── */}
              <div className="bm-top-control-bar">
                {/* Buyer */}
                <div className="bm-top-buyer-field form-group">
                  <label className="form-label">Buyer *</label>
                  <CustomSelect
                    name="buyer"
                    value={globalBuyerId}
                    onChange={handleGlobalBuyerChange}
                    options={[{ value: '', label: 'Select Buyer...' }, ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))]}
                    placeholder="Select Buyer..."
                  />
                </div>

                {/* Style Numbers Multi-Select */}
                <div className="bm-top-style-field form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Select Style No.
                    {selectedStyleIds.length > 0 && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#8b5a2b', color: '#fff', borderRadius: '20px', padding: '1px 8px', fontWeight: 700 }}>
                        {selectedStyleIds.length} selected
                      </span>
                    )}
                  </label>
                  <MultiSearchableSelect
                    options={samples}
                    values={selectedStyleIds}
                    onChange={setSelectedStyleIds}
                    placeholder="Search & select style numbers..."
                    codeKey="style_no"
                    titleKey="product_name"
                  />
                </div>

                {/* View Summary Card — always visible in top bar */}
                <div className={`bm-summary-card${styleQueue.length === 0 ? ' bm-summary-card--empty' : ''}`}>
                  <div className="bm-summary-card-icon">
                    <Layers size={22} color={styleQueue.length === 0 ? '#c9a87a' : '#8b5a2b'} />
                  </div>
                  <div className="bm-summary-card-info">
                    <div className="bm-summary-card-label">Selected Styles</div>
                    <div className="bm-summary-card-count">{styleQueue.length}</div>
                    <div className="bm-summary-card-sub">styles selected</div>
                  </div>
                  <button
                    type="button"
                    className="bm-summary-card-btn"
                    onClick={() => setShowSummaryPanel(v => !v)}
                    disabled={styleQueue.length === 0}
                  >
                    View Summary <ChevronRight size={15} />
                  </button>
                </div>
              </div>


              {/* Batch error/success */}
              {batchError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#991b1b', fontSize: '0.88rem', fontWeight: 600 }}>
                  <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} /><span>{batchError}</span>
                </div>
              )}
              {batchSuccess && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#15803d', fontSize: '0.88rem', fontWeight: 600 }}>
                  <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }} /><span>{batchSuccess}</span>
                </div>
              )}

              {styleQueue.length === 0 ? (
                /* Empty state */
                <div style={{ backgroundColor: '#fff', border: '1.5px solid #e7e5e4', borderRadius: '16px', padding: '3.5rem 1.5rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #fdf8f5, #f5efe6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '2px solid #e9d5b8' }}>
                    <Layers size={32} color="#c9a87a" />
                  </div>
                  <h3 style={{ fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>No styles selected yet</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
                    Choose a <strong>Buyer</strong> above, then pick one or more <strong>Style Numbers</strong> from the multi-select dropdown to build your editing queue.
                  </p>
                </div>
              ) : (
                /* 2-Column Layout (desktop) / Stacked panels (mobile) */
                <div className="bm-multi-form-container">

                  {/* ── Left Sidebar ── */}
                  <div className={`bm-sidebar-panel${mobilePanelView === 'editor' ? ' bm-mobile-hidden' : ''}`}>
                    {/* Section header */}
                    <div className="bm-sidebar-header">
                      <h4>Selected Styles ({styleQueue.length})</h4>
                      <div className="bm-sidebar-search">
                        <Search size={14} color="#64748b" />
                        <input
                          type="text"
                          placeholder="Search style..."
                          value={sidebarSearch}
                          onChange={e => setSidebarSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Style list */}
                    <div className="bm-style-list">
                      {styleQueue
                        .filter(q => !sidebarSearch || q.formData.style_no?.toLowerCase().includes(sidebarSearch.toLowerCase()) || q.formData.product_name?.toLowerCase().includes(sidebarSearch.toLowerCase()))
                        .map((q, idx) => {
                          const realIdx = styleQueue.indexOf(q);
                          const isActive = realIdx === activeStyleIdx;
                          const badgeClass = q.status === 'saved' ? 'bm-badge-saved' : q.status === 'error' ? 'bm-badge-unsaved' : isActive ? 'bm-badge-editing' : 'bm-badge-unsaved';
                          const badgeLabel = q.status === 'saved' ? 'Saved' : q.status === 'error' ? 'Error' : isActive ? 'Editing' : 'Unsaved';
                          return (
                            <div
                              key={q.sampleId}
                              className={`bm-style-card ${isActive ? 'active' : ''}`}
                              onClick={() => { setActiveStyleIdx(realIdx); setMobilePanelView('editor'); }}
                            >
                              <div className="bm-style-card-num">{realIdx + 1}</div>
                              <div className="bm-style-card-info">
                                <div className="bm-style-card-code">{q.formData.style_no || `Style ${realIdx + 1}`}</div>
                                <div className="bm-style-card-name">{q.formData.product_name || '—'}</div>
                              </div>
                              <span className={`bm-badge ${badgeClass}`}>{badgeLabel}</span>
                              <ChevronRight size={16} color="#94a3b8" className="bm-mobile-chevron" />
                            </div>
                          );
                        })}
                    </div>

                    {/* Footer: progress on desktop, label + Next button on mobile */}
                    <div className="bm-sidebar-footer">
                      <div className="bm-desktop-only" style={{ flexDirection: 'column', width: '100%' }}>
                        <div className="bm-sidebar-progress-text">
                          {styleQueue.filter(q => q.status === 'saved').length} of {styleQueue.length} saved
                        </div>
                        <div className="bm-sidebar-progress-bar">
                          <div style={{ height: '100%', background: '#16a34a', borderRadius: '6px', width: `${(styleQueue.filter(q => q.status === 'saved').length / styleQueue.length) * 100}%`, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>

                      {/* Mobile Footer Row: Left Text + Right Next Button */}
                      <div className="bm-mobile-footer-row">
                        <span className="bm-mobile-footer-label">
                          Editing Style {activeStyleIdx + 1} of {styleQueue.length}
                        </span>
                        <button
                          type="button"
                          className="bm-mobile-next-btn"
                          onClick={() => setMobilePanelView('editor')}
                        >
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* ── Right Main Editor ── */}
                  <div className={`bm-main-editor${mobilePanelView === 'list' ? ' bm-mobile-hidden' : ''}`}>
                    {/* Editor Header */}
                    <div className="bm-editor-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Mobile back to list */}
                        <button
                          type="button"
                          className="bm-mobile-back-btn"
                          onClick={() => setMobilePanelView('list')}
                          title="Back to style list"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                            Style Details
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                            {activeItem?.formData.style_no || '—'} · {activeItem?.formData.product_name || '—'}
                          </div>
                        </div>
                      </div>
                      <div className="bm-editor-nav">
                        <button type="button" disabled={activeStyleIdx === 0} onClick={() => setActiveStyleIdx(i => i - 1)}>
                          <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="bm-editor-nav-counter">{activeStyleIdx + 1} / {styleQueue.length}</span>
                        <button type="button" disabled={activeStyleIdx === styleQueue.length - 1} onClick={() => setActiveStyleIdx(i => i + 1)}>
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Error for this style */}
                    {activeItem?.error && (
                      <div style={{ margin: '1rem 1.5rem 0', backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#991b1b', fontSize: '0.88rem', fontWeight: 600 }}>
                        <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                        <span>{activeItem.error}</span>
                      </div>
                    )}

                    {/* Form body */}
                    {activeItem && (
                      <div className="bm-editor-body">
                        {/* Style Information */}
                        <div className="form-section">
                          <h3 className="form-section-title">📋 Style Information</h3>
                          <div className="form-grid-2">
                            <div className="form-group">
                              <label className="form-label">Style No *</label>
                              <input required type="text" className="form-input" value={activeItem.formData.style_no} onChange={e => updateActiveField('style_no', e.target.value)} placeholder="e.g. STY-1002" />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Buyer Code</label>
                              <input type="text" className="form-input" value={activeItem.formData.buyer_code} onChange={e => updateActiveField('buyer_code', e.target.value)} placeholder="e.g. BYR-001" />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                              <label className="form-label">Product Name *</label>
                              <input required type="text" className="form-input" value={activeItem.formData.product_name} onChange={e => updateActiveField('product_name', e.target.value)} placeholder="e.g. Mango Wood Dining Table" />
                            </div>

                            {/* Materials */}
                            <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f9fafb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Material(s) / Wood Type</label>
                                <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#fff' }}
                                  onClick={() => updateActiveMaterials([...activeItem.materialsList, ''])}>+ Add</button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {activeItem.materialsList.map((mat, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input type="text" className="form-input" value={mat}
                                      onChange={e => { const l = [...activeItem.materialsList]; l[idx] = e.target.value; updateActiveMaterials(l); }}
                                      placeholder={`Material ${idx + 1}`} />
                                    {activeItem.materialsList.length > 1 && (
                                      <button type="button" onClick={() => updateActiveMaterials(activeItem.materialsList.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}><X size={16} /></button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Finish */}
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                              <label className="form-label">Finish (Catalog Reference)</label>
                              <CustomSelect name="finish_color" value={activeItem.formData.finish_color || ''} onChange={e => updateActiveField('finish_color', e.target.value)}
                                options={[{ value: '', label: 'Select Registered Finish...' }, ...finishesOptions.map(f => ({ value: f.name, label: `${f.finish_code ? `[${f.finish_code}] ` : ''}${f.name} (${f.color || f.wood_type || 'Catalog'})` }))]}
                                placeholder="Select Registered Finish..." />
                            </div>

                            <div className="bm-price-units-row" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                              <div className="form-group">
                                <label className="form-label">Price (USD)</label>
                                <input type="number" step="0.01" className="form-input" value={activeItem.formData.price_usd} onChange={e => updateActiveField('price_usd', e.target.value)} placeholder="e.g. 150.00" />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Units</label>
                                <input type="number" className="form-input" value={activeItem.formData.units} onChange={e => updateActiveField('units', e.target.value)} placeholder="e.g. 1" />
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Total Amount ($)</label>
                              <input type="number" step="0.01" className="form-input" value={activeItem.formData.total_amount} onChange={e => updateActiveField('total_amount', e.target.value)} placeholder="Auto calculated" />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                              <label className="form-label">Remark</label>
                              <textarea className="form-input" rows="2" value={activeItem.formData.remark} onChange={e => updateActiveField('remark', e.target.value)} placeholder="Any specific requirements..."></textarea>
                            </div>
                          </div>
                        </div>

                        {/* Product Size */}
                        <div className="form-section">
                          <h3 className="form-section-title">📐 Product Size</h3>
                          <SizeGroup
                            label="Dimensions (cm)"
                            prefix="size"
                            values={activeItem.formData}
                            onChange={(key, val) => updateActiveField(key, val)}
                          />
                        </div>

                        {/* More Details */}
                        <div className="form-section">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="form-section-title" style={{ margin: 0 }}>➕ More Details (Optional)</h3>
                            <button type="button" onClick={() => updateActiveMoreDetails(!activeItem.showMoreDetails)} style={{ background: 'none', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                              {activeItem.showMoreDetails ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          {activeItem.showMoreDetails && (
                            <div className="form-grid-2">
                              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Vendor Details</label><textarea className="form-input" rows="2" value={activeItem.formData.vendor_details} onChange={e => updateActiveField('vendor_details', e.target.value)} placeholder="Vendor name, contact..."></textarea></div>
                              <div className="form-group"><label className="form-label">Vendor Price</label><input type="number" step="0.01" className="form-input" value={activeItem.formData.vendor_price} onChange={e => updateActiveField('vendor_price', e.target.value)} /></div>
                              <div className="form-group"><label className="form-label">Costing</label><input type="number" step="0.01" className="form-input" value={activeItem.formData.costing} onChange={e => updateActiveField('costing', e.target.value)} /></div>
                              <div className="form-group"><label className="form-label">Purchase Price</label><input type="number" step="0.01" className="form-input" value={activeItem.formData.purchase_price} onChange={e => updateActiveField('purchase_price', e.target.value)} /></div>
                              <div className="form-group"><label className="form-label">CBM</label><input type="number" step="0.0001" className="form-input" value={activeItem.formData.cbm} onChange={e => updateActiveField('cbm', e.target.value)} placeholder="e.g. 0.1250" /></div>
                              <div className="form-group"><label className="form-label">Total CBM</label><input type="number" step="0.0001" className="form-input" value={activeItem.formData.total_cbm} onChange={e => updateActiveField('total_cbm', e.target.value)} placeholder="Auto calculated" /></div>
                              <div className="form-group"><label className="form-label">Net Weight (kg)</label><input type="number" step="0.01" className="form-input" value={activeItem.formData.net_weight} onChange={e => updateActiveField('net_weight', e.target.value)} /></div>
                              <div className="form-group"><label className="form-label">Gross Weight (kg)</label><input type="number" step="0.01" className="form-input" value={activeItem.formData.gross_weight} onChange={e => updateActiveField('gross_weight', e.target.value)} /></div>
                              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <SizeGroup label="Box Size Dimensions (cm)" prefix="box" values={activeItem.formData} onChange={(key, val) => updateActiveField(key, val)} />
                              </div>
                              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Box Size Summary</label>
                                <input type="text" className="form-input" value={activeItem.formData.box_size} onChange={e => updateActiveField('box_size', e.target.value)} placeholder="e.g. 100 x 50 x 50 cm" />
                              </div>

                              {/* Packaging Image */}
                              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ fontWeight: 650 }}>Packaging Image</label>
                                <CustomFileUpload icon={Package}
                                  singleFile={activeItem.packagingFile || null}
                                  onChange={file => setStyleQueue(prev => { const n = [...prev]; n[activeStyleIdx] = { ...n[activeStyleIdx], packagingFile: file }; return n; })}
                                  onRemoveNew={() => setStyleQueue(prev => { const n = [...prev]; n[activeStyleIdx] = { ...n[activeStyleIdx], packagingFile: null }; return n; })}
                                />
                              </div>

                              {/* Finishing Images */}
                              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ fontWeight: 650 }}>Finishing Images</label>
                                <CustomFileUpload multiple icon={ImageIcon}
                                  existingFiles={[]}
                                  newFiles={activeItem.finishingFiles || []}
                                  onChange={files => {
                                    const mapped = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
                                    setStyleQueue(prev => { const n = [...prev]; n[activeStyleIdx] = { ...n[activeStyleIdx], finishingFiles: [...(n[activeStyleIdx].finishingFiles || []), ...mapped] }; return n; });
                                  }}
                                  onRemoveNew={idx => setStyleQueue(prev => { const n = [...prev]; n[activeStyleIdx] = { ...n[activeStyleIdx], finishingFiles: n[activeStyleIdx].finishingFiles.filter((_, i) => i !== idx) }; return n; })}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer actions */}
                    <div className="bm-form-footer">
                      {/* Mobile: Prev/Next navigation row */}
                      <div className="bm-mobile-footer-nav">
                        <button
                          type="button"
                          className="bm-mobile-nav-btn"
                          disabled={activeStyleIdx === 0}
                          onClick={() => setActiveStyleIdx(i => i - 1)}
                        >
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8b5a2b' }}>
                          {activeStyleIdx + 1} / {styleQueue.length}
                        </span>
                        <button
                          type="button"
                          className="bm-mobile-nav-btn"
                          disabled={activeStyleIdx === styleQueue.length - 1}
                          onClick={() => setActiveStyleIdx(i => i + 1)}
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Desktop: Cancel + Save Current */}
                      <button type="button" className="btn-secondary bm-desktop-only" onClick={closeModal}>Cancel</button>
                      <button
                        type="button"
                        className="btn-secondary bm-desktop-only"
                        onClick={handleSaveCurrentStyle}
                        disabled={!activeItem || activeItem.status === 'saved'}
                        style={{ borderColor: '#8b5a2b', color: '#8b5a2b', opacity: (!activeItem || activeItem.status === 'saved') ? 0.5 : 1 }}
                      >
                        {activeItem?.status === 'saved' ? '✓ Saved' : 'Save Current Style'}
                      </button>
                      <button
                        type="button"
                        className="btn-primary bm-desktop-only"
                        onClick={handleSaveAllStyles}
                        disabled={batchSaving || styleQueue.every(q => q.status === 'saved')}
                        style={{ minWidth: '180px' }}
                      >
                        {batchSaving ? 'Saving...' : `Save All Styles (${styleQueue.filter(q => q.status !== 'saved').length})`}
                      </button>

                      {/* Mobile: Full-width Save buttons */}
                      <button
                        type="button"
                        className="bm-mobile-save-btn bm-mobile-save-current"
                        onClick={handleSaveCurrentStyle}
                        disabled={!activeItem || activeItem.status === 'saved'}
                      >
                        <FileText size={16} />
                        {activeItem?.status === 'saved' ? '✓ Saved' : 'Save Current Style'}
                      </button>
                      <button
                        type="button"
                        className="bm-mobile-save-btn bm-mobile-save-all"
                        onClick={handleSaveAllStyles}
                        disabled={batchSaving || styleQueue.every(q => q.status === 'saved')}
                      >
                        <Layers size={16} />
                        {batchSaving ? 'Saving...' : `Save All Styles (${styleQueue.filter(q => q.status !== 'saved').length})`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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
            <div className="bm-filter-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div className="bm-search" style={{ flex: 1, maxWidth: '400px' }}>
                <Search size={18} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search by buyer name, code, or style no..."
                  className="filter-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%' }}
                />
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

          <div className="table-container desktop-only" style={{ overflow: 'visible' }}>
            <table className="data-table table-fade-slide-up">
              <thead>
                <tr>
                  <th>Buyer Master</th>
                  <th>Styles Registered</th>
                  <th>Total Units</th>
                  <th>Total Value ($)</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} cols={6} hasImage={false} />
                ) : filteredGroupedMasters.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No Buyer Master records found.
                    </td>
                  </tr>
                ) : (
                  filteredGroupedMasters.map(group => (
                    <tr
                      key={group.buyerId}
                      onClick={() => openGroupedEdit(group)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                      className="table-fade-slide-up"
                      title="Click to view/edit multi-style buyer master"
                    >
                      <td>
                        <strong style={{ fontSize: '0.95rem' }}>{group.buyerName}</strong>
                        {group.buyerCode && (
                          <span className="navbar-role-badge admin-badge" style={{ marginLeft: '0.5rem', fontSize: '0.72rem' }}>
                            {group.buyerCode}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#8b5a2b' }}>
                          {group.totalStyles} Style{group.totalStyles > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>{group.totalUnits} Units</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          ${group.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          {new Date(group.lastUpdated).toLocaleDateString()}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                          {/* Excel Export Icon button */}
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportModalGroup(group);
                            }}
                            title="Export Excel for this Buyer"
                            style={{ padding: '0.35rem 0.65rem', color: '#16a34a', borderColor: '#86efac', backgroundColor: '#f0fdf4', cursor: 'pointer' }}
                          >
                            <FileSpreadsheet size={16} color="#16a34a" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openGroupedEdit(group); }}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                          >
                            Edit ({group.totalStyles})
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteGroup(group, e)}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            Delete
                          </button>
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
              <CardSkeleton count={4} />
            ) : filteredGroupedMasters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No Buyer Master records found.
              </div>
            ) : (
              filteredGroupedMasters.map(group => {
                const initials = group.buyerName.substring(0, 2).toUpperCase();
                return (
                  <div 
                    className="mobile-card smooth-fade-in" 
                    key={group.buyerId} 
                    onClick={() => openGroupedEdit(group)}
                    style={{ backgroundColor: '#fff', cursor: 'pointer', flexDirection: 'column', gap: '0.75rem', padding: '1rem', border: '1px solid #e7e5e4', borderRadius: '16px', marginBottom: '0.75rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ backgroundColor: '#f5efe6', color: '#8b5a2b', fontWeight: 'bold', fontSize: '1.1rem', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{group.buyerName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            Code: <strong>{group.buyerCode || '—'}</strong> · {group.totalStyles} Style{group.totalStyles > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={20} color="#94a3b8" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', width: '100%', fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Total Value: </span>
                        <strong style={{ color: '#16a34a' }}>
                          ${group.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExportModalGroup(group);
                          }}
                          style={{ padding: '0.25rem 0.5rem', color: '#16a34a', borderColor: '#86efac' }}
                        >
                          <FileSpreadsheet size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={(e) => { e.stopPropagation(); openGroupedEdit(group); }}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                        >
                          Edit
                        </button>
                      </div>
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

      {/* ── View Summary Modal Overlay ── */}
      {showSummaryPanel && (
        <div className="bm-summary-modal-overlay" onClick={() => setShowSummaryPanel(false)}>
          <div className="bm-summary-modal-card" onClick={e => e.stopPropagation()}>
            <div className="bm-summary-modal-header">
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '1.15rem' }}>Buyer Master Summary</h3>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.82rem' }}>Detailed summary of selected styles, quantities, and totals</p>
              </div>
              <button type="button" onClick={() => setShowSummaryPanel(false)} className="bm-summary-modal-close">
                <X size={20} />
              </button>
            </div>

            {/* Metric Cards */}
            <div className="bm-summary-modal-metrics">
              <div className="bm-summary-metric">
                <span className="bm-metric-label">Buyer</span>
                <span className="bm-metric-val">{buyers.find(b => b.id === globalBuyerId)?.name || 'Selected Buyer'}</span>
              </div>
              <div className="bm-summary-metric">
                <span className="bm-metric-label">Total Styles</span>
                <span className="bm-metric-val" style={{ color: '#8b5a2b' }}>{styleQueue.length}</span>
              </div>
              <div className="bm-summary-metric">
                <span className="bm-metric-label">Total Units</span>
                <span className="bm-metric-val">{styleQueue.reduce((acc, q) => acc + (parseInt(q.formData.units) || 0), 0)}</span>
              </div>
              <div className="bm-summary-metric">
                <span className="bm-metric-label">Total Value ($)</span>
                <span className="bm-metric-val" style={{ color: '#16a34a' }}>
                  ${styleQueue.reduce((acc, q) => acc + (parseFloat(q.formData.total_amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Summary Table */}
            <div className="bm-summary-modal-body">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Style No</th>
                    <th>Product Name</th>
                    <th>Finish / Wood</th>
                    <th>Price ($)</th>
                    <th>Units</th>
                    <th>Total ($)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {styleQueue.map((q, i) => (
                    <tr key={i}>
                      <td><strong>{i + 1}</strong></td>
                      <td><span className="navbar-role-badge admin-badge">{q.formData.style_no || '—'}</span></td>
                      <td>{q.formData.product_name || '—'}</td>
                      <td>{q.formData.finish_color || q.formData.wood_type || '—'}</td>
                      <td>${parseFloat(q.formData.price_usd || 0).toFixed(2)}</td>
                      <td>{q.formData.units || 1}</td>
                      <td><strong>${parseFloat(q.formData.total_amount || 0).toFixed(2)}</strong></td>
                      <td>
                        <span className={`bm-badge ${q.status === 'saved' ? 'bm-badge-saved' : q.status === 'error' ? 'bm-badge-unsaved' : 'bm-badge-editing'}`}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bm-summary-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowSummaryPanel(false)}>
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Buyer Master Modal Dialog ── */}
      {exportModalGroup && (
        <div className="bm-export-modal-overlay" onClick={() => setExportModalGroup(null)}>
          <div className="bm-export-modal-card" onClick={e => e.stopPropagation()}>
            <div className="bm-export-modal-header">
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '1.15rem' }}>
                  Export Buyer Master — {exportModalGroup.buyerName}
                </h3>
                <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                  {exportModalGroup.totalStyles} style(s) registered · Select export option
                </p>
              </div>
              <button type="button" onClick={() => setExportModalGroup(null)} className="bm-summary-modal-close">
                <X size={20} />
              </button>
            </div>

            <div className="bm-export-modal-options">
              <div
                className="bm-export-option-card"
                onClick={() => {
                  handleRowDownloadExcel(exportModalGroup.buyerId, exportModalGroup.buyerName, false);
                  setExportModalGroup(null);
                }}
              >
                <div className="bm-export-icon-box" style={{ background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0' }}>
                  <FileSpreadsheet size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Standard Excel Download</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Includes Buyer details, Style numbers, Products, Sizes, Prices, Units, CBM, and Remarks.
                  </p>
                </div>
                <ChevronRight size={20} color="#94a3b8" />
              </div>

              <div
                className="bm-export-option-card"
                onClick={() => {
                  handleRowDownloadExcel(exportModalGroup.buyerId, exportModalGroup.buyerName, true);
                  setExportModalGroup(null);
                }}
              >
                <div className="bm-export-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1.5px solid #ddd6fe' }}>
                  <FileSpreadsheet size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Detailed Excel Download (With Images)</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Includes standard columns + Vendor details, Costing, Weights, Box sizes & embedded Finishing Photos.
                  </p>
                </div>
                <ChevronRight size={20} color="#94a3b8" />
              </div>
            </div>

            <div className="bm-summary-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setExportModalGroup(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuyerMasters;
