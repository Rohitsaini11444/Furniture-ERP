import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { Search, ArrowLeft, Trash2, Download, Layers, ShoppingBag, Plus, ChevronRight, FileText, Box, Check, Users, Clock, History, ArrowDownAZ, ArrowUpZA, FileSpreadsheet, Building2 } from 'lucide-react';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { OrderBySelect, ORDER_OPTIONS_DATE_PINO } from '../components/OrderBySelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import SupplierAllocationBreakdownModal from '../components/SupplierAllocationBreakdownModal';
import { useLastVisitedItem } from '../hooks/useLastVisitedItem';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesModal from '../components/UnsavedChangesModal';




function num2words(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  const val = parseFloat(num);
  if (val === 0) return 'In Words : Zero Only.';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(n) {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertBelowThousand(n % 100) : '');
  }

  let intPart = Math.floor(val);
  const cents = Math.round((val - intPart) * 100);

  let parts = [];
  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000);
    parts.push(convertBelowThousand(millions) + ' Million');
    intPart %= 1000000;
  }
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    parts.push(convertBelowThousand(thousands) + ' Thousand');
    intPart %= 1000;
  }
  if (intPart > 0) {
    parts.push(convertBelowThousand(intPart));
  }

  let words = parts.join(' ');
  let res = `In Words : ${words}`;
  if (cents > 0) {
    res += ` and Cents ${convertBelowThousand(cents)}`;
  }
  res += ' Only.';
  return res;
}

function BuyerPIs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pis, setPis] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [buyerMasters, setBuyerMasters] = useState([]);
  const [selectedMasterIds, setSelectedMasterIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuyerId, setFilterBuyerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [styleSearchTerm, setStyleSearchTerm] = useState('');
  const [breakdownModalPi, setBreakdownModalPi] = useState(null);
  const [piSubTab, setPiSubTab] = useState('directory');
  const [filterAllocationStatus, setFilterAllocationStatus] = useState('ALL');
  const [expandedPiIds, setExpandedPiIds] = useState(new Set());
  const [expandedInnerTab, setExpandedInnerTab] = useState({});

  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const hasVisitedItem = sessionStorage.getItem('last_visited_buyer_pis');
      const savedPage = sessionStorage.getItem('last_visited_page_buyer_pis');
      if (hasVisitedItem && savedPage) return Number(savedPage);
    } catch (e) {}
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  const { lastVisitedId, setHighlightRef } = useLastVisitedItem('buyer_pis', id, currentPage);
  

  const emptyForm = {
    pi_no: '',
    pi_date: new Date().toISOString().split('T')[0],
    ex_factory_date: '',
    payment_terms: '100% TT 30 Days from BL',
    buyer: '',
    delivered_to_name: '',
    delivered_to_company: '',
    delivered_to_address: '',
    remarks: '',
    items: [],
  };
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
    formType: 'pi',
    formLabel: 'Performa Invoice',
    getFormTitle: (data) => {
      const bObj = buyers.find(b => b.id === data?.buyer);
      return `PI ${data?.pi_no || 'New'} - ${bObj?.name || 'Draft'} (${data?.items?.length || 0} items)`;
    },
    getFormData: () => formData,
    targetPath: '/performa-invoices/new',
    onSaveForm: async () => {
      const formEl = document.getElementById('pi-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/buyer-pis/${id}/`)
        .then(res => {
          const p = res.data;
          setFormData({
            pi_no: p.pi_no || '',
            pi_date: p.pi_date || '',
            ex_factory_date: p.ex_factory_date || '',
            payment_terms: p.payment_terms || '100% TT 30 Days from BL',
            buyer: p.buyer || '',
            delivered_to_name: p.delivered_to_name || '',
            delivered_to_company: p.delivered_to_company || '',
            delivered_to_address: p.delivered_to_address || '',
            remarks: p.remarks || '',
            items: p.items || [],
          });
          setEditingId(p.id);
          if (p.buyer) {
            fetchBuyerMasters(p.buyer);
          }
        })
        .catch(err => console.error('Failed to fetch Buyer PI detail', err));
    } else if (id === 'new') {
      if (location.state?.draftData) {
        setFormData(location.state.draftData);
        setIsDirty(true);
        if (location.state.draftId) {
          setCurrentDraftId(location.state.draftId);
        }
        if (location.state.draftData.buyer) {
          fetchBuyerMasters(location.state.draftData.buyer);
        }
      } else {
        const randomNum = Math.floor(1000000 + Math.random() * 9000000);
        setFormData({
          ...emptyForm,
          pi_no: `P${randomNum}`,
        });
        setEditingId(null);
      }
    }
  }, [id, location.state]);

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchPIs = useCallback(() => {
    setLoading(true);
    const params = { page: currentPage, page_size: 50, ordering: ordering };
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (filterBuyerId) {
      params.buyer = filterBuyerId;
    }
    api.get('/buyer-pis/', { params })
      .then(res => {
        const data = res.data.results || res.data || [];
        setPis(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50) || 1);
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Failed to fetch Buyer PIs', err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering, debouncedSearch, filterBuyerId]);

  const fetchBuyers = () => {
    api.get('/buyers/', { params: { nopage: true } })
      .then(res => setBuyers(res.data))
      .catch(err => console.error('Failed to fetch buyers', err));
  };

  const fetchBuyerMasters = (buyerId) => {
    if (!buyerId) {
      setBuyerMasters([]);
      return;
    }
    api.get('/buyer-masters/', { params: { buyer: buyerId, nopage: true } })
      .then(res => setBuyerMasters(res.data))
      .catch(err => console.error('Failed to fetch Buyer Masters for buyer', err));
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearch, filterBuyerId, filterAllocationStatus, ordering]);

  useEffect(() => {
    fetchPIs();
  }, [fetchPIs]);

  const handleBuyerChange = (eOrVal) => {
    const buyerId = (typeof eOrVal === 'object' && eOrVal?.target) ? eOrVal.target.value : eOrVal;
    const bObj = buyers.find(b => b.id === buyerId);
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      buyer: buyerId,
      delivered_to_company: bObj ? bObj.name : prev.delivered_to_company,
      delivered_to_address: bObj ? (bObj.address || '') : prev.delivered_to_address,
    }));
    if (buyerId) {
      fetchBuyerMasters(buyerId);
    } else {
      setBuyerMasters([]);
    }
  };


  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualItem = () => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          barcode: '',
          buyer_no: '',
          style_no: '',
          product_name: '',
          size_length: '',
          size_breadth: '',
          size_height: '',
          material: '',
          finish_color: '',
          cbm: '',
          price_usd: '',
          units: 1,
          total_cbm: '',
          total_amount: '',
          remarks: '',
        }
      ]
    }));
  };

  const handleImportBuyerMasters = () => {
    if (selectedMasterIds.length === 0) return;
    const selectedMasters = buyerMasters.filter(bm => selectedMasterIds.includes(bm.id));

    const newItems = selectedMasters.map(bm => {
      const sample = bm.sample_detail || {};
      const cbmVal = parseFloat(bm.cbm) || parseFloat(sample.cbm) || 0.15;
      const priceVal = parseFloat(bm.price_usd) || parseFloat(sample.usd) || 0;
      const qty = (bm.units !== undefined && bm.units !== null) ? parseInt(bm.units) : 1;
      const totCbm = bm.total_cbm ? parseFloat(bm.total_cbm) : (qty * cbmVal);
      const totAmt = bm.total_amount ? parseFloat(bm.total_amount) : (qty * priceVal);

      return {
        buyer_master: bm.id,
        barcode: sample.sample_id || '',
        buyer_no: bm.buyer_code || '',
        style_no: bm.style_no || '',
        product_name: bm.product_name || '',
        size_length: bm.size_length || sample.size_length || '',
        size_breadth: bm.size_breadth || sample.size_breadth || '',
        size_height: bm.size_height || sample.size_height || '',
        material: bm.wood_type || sample.material || '',
        finish_color: bm.finish_color || sample.finish_color || '',
        cbm: cbmVal,
        price_usd: priceVal,
        units: qty,
        total_cbm: totCbm.toFixed(4),
        total_amount: totAmt.toFixed(2),
        remarks: bm.remark || '',
        image_url: sample.images && sample.images.length > 0 ? sample.images[0].image_url : '',
      };
    });

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }));
    setSelectedMasterIds([]);
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      const units = parseInt(item.units, 10) || 0;
      const cbm = parseFloat(item.cbm) || 0;
      const price = parseFloat(item.price_usd) || 0;

      if (field === 'units' || field === 'cbm') {
        item.total_cbm = (units * cbm).toFixed(4);
      }
      if (field === 'units' || field === 'price_usd') {
        item.total_amount = (units * price).toFixed(2);
      }

      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.buyer) {
      alert('Please select a Buyer');
      return;
    }

    const payload = {
      ...formData,
      pi_date: formData.pi_date || null,
      ex_factory_date: formData.ex_factory_date || null,
      items: formData.items.map(item => ({
        ...item,
        buyer_master: item.buyer_master || null,
        units: parseInt(item.units, 10) || 0,
        size_length: item.size_length !== '' && item.size_length !== null ? parseFloat(item.size_length) : null,
        size_breadth: item.size_breadth !== '' && item.size_breadth !== null ? parseFloat(item.size_breadth) : null,
        size_height: item.size_height !== '' && item.size_height !== null ? parseFloat(item.size_height) : null,
        cbm: item.cbm !== '' && item.cbm !== null ? parseFloat(item.cbm) : null,
        price_usd: item.price_usd !== '' && item.price_usd !== null ? parseFloat(item.price_usd) : null,
        total_cbm: item.total_cbm !== '' && item.total_cbm !== null ? parseFloat(item.total_cbm) : null,
        total_amount: item.total_amount !== '' && item.total_amount !== null ? parseFloat(item.total_amount) : null,
      }))
    };

    const req = editingId
      ? api.put(`/buyer-pis/${editingId}/`, payload)
      : api.post('/buyer-pis/', payload);

    req.then(() => {
      if (currentDraftId) clearDraft(currentDraftId);
      setIsDirty(false);
      navigate('/performa-invoices');
      fetchPIs();
    }).catch(err => {
      console.error('Failed to save Performa Invoice', err.response?.data || err);
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      alert(`Failed to save Performa Invoice:\n${errMsg}`);
    });
  };

  const handleDelete = (piId, piNo) => {
    if (window.confirm(`Are you sure you want to delete Performa Invoice "${piNo}"?`)) {
      api.delete(`/buyer-pis/${piId}/`)
        .then(() => fetchPIs())
        .catch(err => console.error('Failed to delete Performa Invoice', err));
    }
  };

  const handleDownloadExcel = (piId, piNo) => {
    api.get(`/buyer-pis/${piId}/export-excel/`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `PI_${piNo}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Failed to download PI Excel', err);
        alert('Failed to download PI Excel. Please try again.');
      });
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
      setSelectedRowIds(new Set(filteredPIs.map(p => p.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const totalUnits = formData.items.reduce((acc, item) => acc + (parseInt(item.units, 10) || 0), 0);
  const totalCbm = formData.items.reduce((acc, item) => acc + (parseFloat(item.total_cbm) || 0), 0);
  const totalAmt = formData.items.reduce((acc, item) => acc + (parseFloat(item.total_amount) || 0), 0);
  const wordsRepresentation = num2words(totalAmt);

  const filteredPIs = pis.filter(p => {
    if (filterAllocationStatus && filterAllocationStatus !== 'ALL') {
      const pItems = p.items || [];
      const pUnits = p.total_units !== undefined ? p.total_units : pItems.reduce((acc, it) => acc + (parseInt(it.units) || 0), 0);
      const pAlloc = p.allocated_units !== undefined ? p.allocated_units : 0;
      const pRem = p.remaining_units !== undefined ? p.remaining_units : Math.max(0, pUnits - pAlloc);

      if (filterAllocationStatus === 'UNALLOCATED' && (pAlloc > 0 || pRem < pUnits)) return false;
      if (filterAllocationStatus === 'PARTIAL' && (pAlloc === 0 || pRem <= 0)) return false;
      if (filterAllocationStatus === 'FULLY_ALLOCATED' && pRem > 0) return false;
    }
    return true;
  });

  return (
    <div>
      {id ? (
        <div className="new-page-form" style={{ padding: '1rem 0' }}>
          <div className="pi-form-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 className="pi-form-title" style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, paddingRight: '1rem' }}>
                {editingId ? `✏️ Edit Performa Invoice (${formData.pi_no})` : '+ Create New Performa Invoice (PI)'}
              </h2>
              {editingId && (
                <div className="pi-header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/pos/new?pi=${editingId}`)}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#14b8a6', color: '#0d9488' }}
                  >
                    <ShoppingBag size={16} /> <span>Create PO from PI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadExcel(editingId, formData.pi_no)}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#16a34a' }}
                  >
                    <Download size={16} /> <span>Download PI Excel</span>
                  </button>
                </div>
              )}
            </div>

            <form id="pi-form" onSubmit={handleSubmit}>
              {/* Header Info */}
              <div className="form-section">
                <h3 className="form-section-title">🏢 Buyer & Exporter Info</h3>
                <div className="pi-info-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Buyer *</label>
                    <SearchableSelect
                      options={buyers}
                      value={formData.buyer}
                      onChange={handleBuyerChange}
                      placeholder="Select Buyer..."
                      searchPlaceholder="Search buyer by name or code..."
                      codeKey="code"
                      titleKey="name"
                      icon={Users}
                    />
                  </div>


                  <div className="form-group">
                    <label className="form-label">PI Ref / PO # *</label>
                    <input required type="text" name="pi_no" className="form-input" value={formData.pi_no} onChange={handleFormChange} placeholder="e.g. P0009695" />
                  </div>

                  <div className="form-group">
                    <CustomDatePicker
                      label="PI Date"
                      required
                      value={formData.pi_date}
                      onChange={val => handleFormChange({ target: { name: 'pi_date', value: val } })}
                    />
                  </div>

                  <div className="form-group">
                    <CustomDatePicker
                      label="Ex-Factory Date"
                      value={formData.ex_factory_date}
                      onChange={val => handleFormChange({ target: { name: 'ex_factory_date', value: val } })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <input type="text" name="payment_terms" className="form-input" value={formData.payment_terms} onChange={handleFormChange} />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Delivered To: Contact Person</label>
                    <input type="text" name="delivered_to_name" className="form-input" value={formData.delivered_to_name} onChange={handleFormChange} />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Delivered To: Company Name</label>
                    <input type="text" name="delivered_to_company" className="form-input" value={formData.delivered_to_company} onChange={handleFormChange} />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Delivered To: Full Address</label>
                    <textarea name="delivered_to_address" className="form-input" value={formData.delivered_to_address} onChange={handleFormChange} rows="3"></textarea>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="form-section" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="form-section-title" style={{ marginBottom: 0 }}>📦 Performa Invoice Items</h3>
                  <button type="button" onClick={handleAddManualItem} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <Plus size={16} /> Add Manual Item
                  </button>
                </div>

                {/* Import from Buyer Master */}
                {formData.buyer && buyerMasters.length > 0 && (() => {
                  const filteredBuyerMasters = buyerMasters.filter(bm => {
                    if (!styleSearchTerm) return true;
                    const t = styleSearchTerm.toLowerCase();
                    return (
                      (bm.style_no && bm.style_no.toLowerCase().includes(t)) ||
                      (bm.product_name && bm.product_name.toLowerCase().includes(t)) ||
                      (bm.wood_type && bm.wood_type.toLowerCase().includes(t)) ||
                      (bm.finish_color && bm.finish_color.toLowerCase().includes(t))
                    );
                  });

                  const isAllFilteredSelected = filteredBuyerMasters.length > 0 && filteredBuyerMasters.every(bm => selectedMasterIds.includes(bm.id));

                  const handleToggleSelectAll = () => {
                    if (isAllFilteredSelected) {
                      const filteredIds = new Set(filteredBuyerMasters.map(bm => bm.id));
                      setSelectedMasterIds(prev => prev.filter(id => !filteredIds.has(id)));
                    } else {
                      const filteredIds = filteredBuyerMasters.map(bm => bm.id);
                      setSelectedMasterIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                    }
                  };

                  const handleImportAll = () => {
                    const listToImport = filteredBuyerMasters.length > 0 ? filteredBuyerMasters : buyerMasters;
                    if (listToImport.length === 0) return;

                    const newItems = listToImport.map(bm => {
                      const sample = bm.sample_detail || {};
                      const cbmVal = parseFloat(bm.cbm) || parseFloat(sample.cbm) || 0.15;
                      const priceVal = parseFloat(bm.price_usd) || parseFloat(sample.usd) || 0;
                      const qty = (bm.units !== undefined && bm.units !== null) ? parseInt(bm.units) : 1;
                      const totCbm = bm.total_cbm ? parseFloat(bm.total_cbm) : (qty * cbmVal);
                      const totAmt = bm.total_amount ? parseFloat(bm.total_amount) : (qty * priceVal);

                      return {
                        buyer_master: bm.id,
                        barcode: sample.sample_id || '',
                        buyer_no: bm.buyer_code || '',
                        style_no: bm.style_no || '',
                        product_name: bm.product_name || '',
                        size_length: bm.size_length || sample.size_length || '',
                        size_breadth: bm.size_breadth || sample.size_breadth || '',
                        size_height: bm.size_height || sample.size_height || '',
                        material: bm.wood_type || sample.material || '',
                        finish_color: bm.finish_color || sample.finish_color || '',
                        cbm: cbmVal,
                        price_usd: priceVal,
                        units: qty,
                        total_cbm: totCbm.toFixed(4),
                        total_amount: totAmt.toFixed(2),
                        remarks: bm.remark || '',
                        image_url: sample.images && sample.images.length > 0 ? sample.images[0].image_url : '',
                      };
                    });

                    setFormData(prev => ({
                      ...prev,
                      items: [...prev.items, ...newItems]
                    }));
                    setSelectedMasterIds([]);
                  };

                  return (
                    <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #d6c7b2', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                          <Layers size={20} color="#8b5a2b" /> Select Styles from Buyer Master to Populate PI
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.82rem',
                              color: '#8b5a2b',
                              fontWeight: 650,
                              backgroundColor: isAllFilteredSelected ? '#f5efe6' : '#ffffff',
                              border: '1.5px solid #d6c7b2',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            {isAllFilteredSelected ? '✓ Deselect All' : '☐ Select All'}
                          </button>
                          <span style={{ fontSize: '0.82rem', color: '#8b5a2b', fontWeight: 700, backgroundColor: '#f5efe6', padding: '4px 12px', borderRadius: '20px' }}>
                            {selectedMasterIds.length} style(s) selected
                          </span>
                        </div>
                      </div>

                      {/* Search Box */}
                      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                        <Search size={16} color="#8b5a2b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Search styles by number, product name or wood..."
                          value={styleSearchTerm}
                          onChange={e => setStyleSearchTerm(e.target.value)}
                          style={{ width: '100%', padding: '0.55rem 0.8rem 0.55rem 2.3rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none' }}
                        />
                      </div>

                      {/* Interactive List */}
                      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                        {filteredBuyerMasters.map(bm => {
                          const isSelected = selectedMasterIds.includes(bm.id);
                          return (
                            <div
                              key={bm.id}
                              onClick={() => {
                                setSelectedMasterIds(prev =>
                                  isSelected ? prev.filter(i => i !== bm.id) : [...prev, bm.id]
                                );
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '10px',
                                border: isSelected ? '1.5px solid #8b5a2b' : '1px solid #f1f5f9',
                                backgroundColor: isSelected ? '#f4ece1' : '#faf8f5',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
                                <Box size={18} color="#8b5a2b" style={{ flexShrink: 0 }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', flexShrink: 0 }}>
                                    Style: {bm.style_no}
                                  </span>
                                  <span style={{ color: '#475569', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    — {bm.product_name}
                                  </span>
                                  {(bm.wood_type || bm.finish_color) && (
                                    <span style={{ fontSize: '0.78rem', color: '#78716c', backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', flexShrink: 0 }}>
                                      {bm.wood_type} {bm.finish_color ? `| ${bm.finish_color}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check size={18} color="#8b5a2b" style={{ flexShrink: 0 }} />}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleImportBuyerMasters}
                          className="btn-primary"
                          disabled={selectedMasterIds.length === 0}
                          style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
                        >
                          Import Selected Styles ({selectedMasterIds.length})
                        </button>

                        <button
                          type="button"
                          onClick={handleImportAll}
                          className="btn-secondary"
                          style={{
                            padding: '0.55rem 1.25rem',
                            fontSize: '0.88rem',
                            borderColor: '#8b5a2b',
                            color: '#8b5a2b',
                            fontWeight: 650,
                            backgroundColor: '#fdf8f5'
                          }}
                        >
                          ⚡ Import All Styles ({filteredBuyerMasters.length})
                        </button>
                      </div>
                    </div>
                  );
                })()}


                <div className="table-container" style={{ overflowX: 'auto', width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem', minWidth: '1750px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>S.No</th>
                        <th style={{ width: '140px' }}>Barcode</th>
                        <th style={{ width: '130px' }}>Buyer #</th>
                        <th style={{ width: '140px' }}>Style No *</th>
                        <th style={{ width: '200px' }}>Name</th>
                        <th style={{ width: '240px' }}>Size CMs (L x B x H)</th>
                        <th style={{ width: '145px' }}>Material</th>
                        <th style={{ width: '145px' }}>Finish</th>
                        <th style={{ width: '110px' }}>CBM</th>
                        <th style={{ width: '120px' }}>Price USD</th>
                        <th style={{ width: '85px' }}>Units</th>
                        <th style={{ width: '110px' }}>Total CBM</th>
                        <th style={{ width: '120px' }}>Total Amount</th>
                        <th style={{ width: '150px' }}>Remarks</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td>
                            <input type="text" className="form-input" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.85rem' }} value={item.barcode} onChange={e => handleItemChange(idx, 'barcode', e.target.value)} placeholder="Barcode" />
                          </td>
                          <td>
                            <input type="text" className="form-input" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.85rem' }} value={item.buyer_no} onChange={e => handleItemChange(idx, 'buyer_no', e.target.value)} placeholder="Buyer #" />
                          </td>
                          <td>
                            <input required type="text" className="form-input" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.85rem' }} value={item.style_no} onChange={e => handleItemChange(idx, 'style_no', e.target.value)} placeholder="Style No" />
                          </td>
                          <td>
                            <input type="text" className="form-input" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.85rem' }} value={item.product_name} onChange={e => handleItemChange(idx, 'product_name', e.target.value)} placeholder="Product Name" />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <input type="number" step="0.1" className="form-input" style={{ width: '64px', padding: '0.35rem 0.25rem', textAlign: 'center', fontSize: '0.85rem' }} placeholder="L" value={item.size_length} onChange={e => handleItemChange(idx, 'size_length', e.target.value)} />
                              <input type="number" step="0.1" className="form-input" style={{ width: '64px', padding: '0.35rem 0.25rem', textAlign: 'center', fontSize: '0.85rem' }} placeholder="B" value={item.size_breadth} onChange={e => handleItemChange(idx, 'size_breadth', e.target.value)} />
                              <input type="number" step="0.1" className="form-input" style={{ width: '64px', padding: '0.35rem 0.25rem', textAlign: 'center', fontSize: '0.85rem' }} placeholder="H" value={item.size_height} onChange={e => handleItemChange(idx, 'size_height', e.target.value)} />
                            </div>
                          </td>
                          <td>
                            <input type="text" className="form-input" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.85rem' }} value={item.material} onChange={e => handleItemChange(idx, 'material', e.target.value)} placeholder="Mango Wood" />
                          </td>
                          <td>
                            <input type="text" className="form-input" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.85rem' }} value={item.finish_color} onChange={e => handleItemChange(idx, 'finish_color', e.target.value)} placeholder="Natural" />
                          </td>
                          <td>
                            <input type="number" step="0.0001" className="form-input" style={{ width: '100%', padding: '0.35rem 0.4rem', textAlign: 'center', fontSize: '0.85rem' }} value={item.cbm} onChange={e => handleItemChange(idx, 'cbm', e.target.value)} placeholder="0.1500" />
                          </td>
                          <td>
                            <input type="number" step="0.01" className="form-input" style={{ width: '100%', padding: '0.35rem 0.4rem', textAlign: 'right', fontSize: '0.85rem' }} value={item.price_usd} onChange={e => handleItemChange(idx, 'price_usd', e.target.value)} placeholder="120.00" />
                          </td>
                          <td>
                            <input type="number" className="form-input" style={{ width: '100%', padding: '0.35rem 0.4rem', textAlign: 'center', fontSize: '0.85rem' }} value={item.units} onChange={e => handleItemChange(idx, 'units', e.target.value)} placeholder="1" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <strong>{item.total_cbm || '0.0000'}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>${item.total_amount || '0.00'}</strong>
                          </td>
                          <td>
                            <input type="text" className="form-input" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.85rem' }} value={item.remarks} onChange={e => handleItemChange(idx, 'remarks', e.target.value)} placeholder="Remarks" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                              title="Delete Item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan="15" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            No items added to PI yet. Import styles from Buyer Master or click "+ Add Manual Item".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="pi-totals-summary" style={{ marginTop: '1.5rem', backgroundColor: '#f0f9ff', padding: '1.25rem', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a', fontSize: '1.05rem', fontWeight: 700 }}>PI Totals Summary:</h4>
                  <div style={{ fontSize: '0.95rem', color: '#1e3a8a' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>Total Units:</span> {totalUnits} | <span style={{ fontWeight: 600 }}>Total CBM:</span> {totalCbm.toFixed(4)} m³
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <span style={{ fontWeight: 600 }}>Total Amount:</span> ${totalAmt.toFixed(2)}
                    </div>
                  </div>
                  <div className="pi-totals-words" style={{ color: '#9a3412', fontWeight: 600, fontSize: '0.95rem' }}>{wordsRepresentation}</div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    if (confirmExit('/performa-invoices')) {
                      navigate('/performa-invoices');
                    }
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
                <button type="submit" className="btn-primary">
                  {editingId ? 'Save PI Changes' : 'Create Performa Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={28} color="#2563eb" style={{ flexShrink: 0 }} /> Performa Invoices (PI)
            </h2>
            <button onClick={() => navigate('/performa-invoices/new')} className="btn-primary">+ Create New PI</button>
          </div>

          <style>{`
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        @media (max-width: 900px) {
          .desktop-only { display: none; }
          .mobile-only { display: block; }
        }
        .pi-filter-card {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 0.85rem 1.25rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          margin-bottom: 1.5rem;
        }

        .pi-filter-bar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .pi-search-wrap {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex: 1 1 280px;
          max-width: 420px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0 0.85rem;
          height: 42px;
          box-sizing: border-box;
        }

        .pi-filters-wrap {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .pi-filter-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex: 1 1 auto;
        }

        .pi-filter-label {
          text-transform: uppercase;
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .pi-select-box {
          width: 100%;
          min-width: 130px;
        }

        @media (max-width: 768px) {
          .pi-filter-card {
            padding: 0.85rem !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .pi-filter-bar-inner {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          .pi-search-wrap {
            width: 100% !important;
            max-width: 100% !important;
            height: 42px !important;
            flex: none !important;
          }
          .pi-filters-wrap {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.5rem !important;
          }
          .pi-filter-item {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.3rem !important;
          }
          .pi-filter-label {
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            color: #64748b !important;
            display: block !important;
          }
          .pi-select-box {
            width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>

      {/* Universal Search & Filter Bar (Desktop Web View - Original) */}
      <div className="desktop-only filter-bar" style={{ marginBottom: '1.25rem', width: '100%' }}>
        <div className="bm-filter-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center', width: '100%' }}>
          <div className="bm-search" style={{ flex: '1 1 240px' }}>
            <Search size={16} className="filter-icon" />
            <span className="filter-label">Search:</span>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by PI No, Buyer, Contact..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="bm-export" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="filter-label" style={{ fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', fontSize: '0.78rem' }}>BUYER:</span>
            <SearchableSelect
              options={buyers}
              value={filterBuyerId}
              onChange={val => setFilterBuyerId(val)}
              placeholder="All Buyers"
              searchPlaceholder="Search buyer..."
              codeKey="code"
              titleKey="name"
              icon={Users}
              style={{ minWidth: '180px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="filter-label" style={{ fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', fontSize: '0.78rem' }}>PO STATUS:</span>
            <CustomSelect
              value={filterAllocationStatus}
              onChange={val => setFilterAllocationStatus(val?.target ? val.target.value : val)}
              placeholder="All Statuses"
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'UNALLOCATED', label: 'Unassigned Only' },
                { value: 'PARTIAL', label: 'Partially Allocated Only' },
                { value: 'FULLY_ALLOCATED', label: 'Fully Allocated Only' },
              ]}
              style={{ minWidth: '190px' }}
            />
          </div>

          <div className="bm-order" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="filter-label" style={{ fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', fontSize: '0.78rem' }}>ORDER BY:</span>
            <OrderBySelect
              options={ORDER_OPTIONS_DATE_PINO}
              value={ordering}
              onChange={setOrdering}
            />
          </div>
        </div>
      </div>

      {/* Universal Search & Filter Bar (Mobile View Only) */}
      <div className="mobile-only pi-filter-card">
        <div className="pi-filter-bar-inner">
          <div className="pi-search-wrap">
            <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by PI No, Buyer, Contact..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', color: '#1e293b' }}
            />
          </div>

          <div className="pi-filters-wrap">
            <div className="pi-filter-item">
              <span className="pi-filter-label">BUYER:</span>
              <div className="pi-select-box">
                <SearchableSelect
                  options={buyers}
                  value={filterBuyerId}
                  onChange={val => setFilterBuyerId(val)}
                  placeholder="All Buyers"
                  searchPlaceholder="Search buyer..."
                  codeKey="code"
                  titleKey="name"
                  icon={Users}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="pi-filter-item">
              <span className="pi-filter-label">PO STATUS:</span>
              <div className="pi-select-box">
                <CustomSelect
                  value={filterAllocationStatus}
                  onChange={val => setFilterAllocationStatus(val?.target ? val.target.value : val)}
                  placeholder="All Statuses"
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'UNALLOCATED', label: 'Unassigned Only' },
                    { value: 'PARTIAL', label: 'Partially Allocated Only' },
                    { value: 'FULLY_ALLOCATED', label: 'Fully Allocated Only' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="pi-filter-item">
              <span className="pi-filter-label">ORDER BY:</span>
              <div className="pi-select-box">
                <OrderBySelect
                  options={ORDER_OPTIONS_DATE_PINO}
                  value={ordering}
                  onChange={setOrdering}
                  width="100%"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

          {/* Module Navigation Sub-Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            borderBottom: '2px solid #e2e8f0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '2px'
          }}>
            <button
              onClick={() => setPiSubTab('directory')}
              style={{
                padding: '0.65rem 1rem',
                fontWeight: 800,
                fontSize: '0.85rem',
                color: piSubTab === 'directory' ? '#8b5a2b' : '#64748b',
                borderBottom: piSubTab === 'directory' ? '3px solid #8b5a2b' : '3px solid transparent',
                background: 'none',
                borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <FileSpreadsheet size={18} />Performa Invoices Directory ({filteredPIs.length})
            </button>
            <button
              onClick={() => setPiSubTab('allocation_tracker')}
              style={{
                padding: '0.65rem 1rem',
                fontWeight: 800,
                fontSize: '0.85rem',
                color: piSubTab === 'allocation_tracker' ? '#8b5a2b' : '#64748b',
                borderBottom: piSubTab === 'allocation_tracker' ? '3px solid #8b5a2b' : '3px solid transparent',
                background: 'none',
                borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Layers size={18} />PO Allocation & Supplier Tracker ({filteredPIs.length})
            </button>
          </div>

          {piSubTab === 'allocation_tracker' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredPIs.map(p => {
                const pItems = p.items || [];
                const pUnits = p.total_units !== undefined ? p.total_units : pItems.reduce((acc, it) => acc + (parseInt(it.units) || 0), 0);
                const pAlloc = p.allocated_units !== undefined ? p.allocated_units : 0;
                const pRem = p.remaining_units !== undefined ? p.remaining_units : Math.max(0, pUnits - pAlloc);
                const supAllocations = p.supplier_allocations || [];
                const isExpanded = expandedPiIds.has(p.id);
                const innerTab = expandedInnerTab[p.id] || 'items';

                const toggleExpand = () => {
                  setExpandedPiIds(prev => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  });
                };

                return (
                  <div key={p.id} style={{ backgroundColor: '#ffffff', border: isExpanded ? '2px solid #8b5a2b' : '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText color="#8b5a2b" size={22}/> Linked Buyer PI: {p.pi_no} ({p.buyer_detail?.name || 'Buyer'})
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          PI Date: <strong>{p.pi_date || '—'}</strong> | Ex-Factory: <strong>{p.ex_factory_date || '—'}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: pRem <= 0 ? '#dc2626' : '#0369a1', backgroundColor: pRem <= 0 ? '#fef2f2' : '#e0f2fe', border: pRem <= 0 ? '1px solid #fecaca' : '1px solid #bae6fd', padding: '0.35rem 0.85rem', borderRadius: '8px' }}>
                          {pRem <= 0 ? '🔒 Fully Allocated (0 pcs remaining)' : `✨ ${pRem} of ${pUnits} pcs Unassigned Remaining`}
                        </span>

                        <button
                          type="button"
                          onClick={toggleExpand}
                          className="btn-secondary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem', borderColor: isExpanded ? '#8b5a2b' : '#cbd5e1', color: isExpanded ? '#8b5a2b' : '#475569' }}
                        >
                        {isExpanded ? 'Collapse Breakdown ▲' : 'Breakdown ▼'}
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/pos/new?pi=${p.id}`)}
                          className="btn-primary"
                          style={{ backgroundColor: '#8b5a2b', borderColor: '#8b5a2b', padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <ShoppingBag size={15}/> +PO
                        </button>
                      </div>
                    </div>

                    {/* KPI Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: isExpanded ? '1.25rem' : '0' }}>
                      <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Ordered in PI</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{pUnits} pcs</div>
                      </div>

                      <div
                        onClick={toggleExpand}
                        style={{ background: '#fffbe6', padding: '0.85rem 1rem', borderRadius: '12px', border: '1.5px solid #ffe58f', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                        title="Click to expand supplier breakdown"
                      >
                        <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Assigned to Other Suppliers</span>
                          <span style={{ fontSize: '0.72rem', color: '#b45309' }}>{isExpanded ? '▼' : 'Expand 🔍'}</span>
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>{pAlloc} pcs</div>
                      </div>

                      <div style={{ background: pRem <= 0 ? '#fef2f2' : '#f0fdf4', padding: '0.85rem 1rem', borderRadius: '12px', border: pRem <= 0 ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.75rem', color: pRem <= 0 ? '#dc2626' : '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Auto-Filled Unassigned</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pRem <= 0 ? '#dc2626' : '#16a34a', marginTop: '2px' }}>{pRem} pcs</div>
                      </div>
                    </div>

                    {/* Inline Expandable Breakdown Panel */}
                    {isExpanded && (
                      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '2px dashed #e2e8f0', backgroundColor: '#fafafa', borderRadius: '12px', padding: '1rem' }}>
                        
                        {/* Inline Inner Sub-Tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedInnerTab(prev => ({ ...prev, [p.id]: 'items' }))}
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: innerTab === 'items' ? '#8b5a2b' : '#64748b',
                              borderBottom: innerTab === 'items' ? '3px solid #8b5a2b' : '3px solid transparent',
                              background: 'none',
                              borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem'
                            }}
                          >
                            <Layers size={15}/> 📦 Per-Item Remaining Balance ({pItems.length})
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedInnerTab(prev => ({ ...prev, [p.id]: 'suppliers' }))}
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: innerTab === 'suppliers' ? '#8b5a2b' : '#64748b',
                              borderBottom: innerTab === 'suppliers' ? '3px solid #8b5a2b' : '3px solid transparent',
                              background: 'none',
                              borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem'
                            }}
                          >
                            <Building2 size={15}/> 🏢 Supplier PO Assignments ({supAllocations.length})
                          </button>
                        </div>

                        {innerTab === 'items' ? (
                          <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '8px 12px' }}>STYLE NO / PRODUCT NAME</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>TOTAL ORDERED</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>ASSIGNED</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>REMAINING UNASSIGNED</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>STATUS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pItems.map((it, i) => {
                                  const reqQty = parseFloat(it.units) || 0;
                                  const allocQty = it.allocated_quantity !== undefined ? it.allocated_quantity : 0;
                                  const remQty = it.remaining_quantity !== undefined ? it.remaining_quantity : Math.max(0, reqQty - allocQty);

                                  return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>
                                        {it.style_no}
                                        {it.product_name && <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{it.product_name}</div>}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{reqQty} pcs</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>{allocQty} pcs</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: remQty <= 0 ? '#dc2626' : '#16a34a' }}>
                                        {remQty} pcs
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                        {remQty <= 0 ? (
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '4px' }}>
                                            Fully Assigned
                                          </span>
                                        ) : allocQty > 0 ? (
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '2px 8px', borderRadius: '4px' }}>
                                            Partial
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px' }}>
                                            Unassigned
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          supAllocations.length === 0 ? (
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                              No Supplier POs assigned yet. All {pUnits} pieces are unassigned.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {supAllocations.map((sal, sIdx) => (
                                <div key={sIdx} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                    <div>
                                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>🏢 {sal.supplier_name}</span>
                                      <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', fontWeight: 700, color: '#8b5a2b', backgroundColor: '#fffcf7', border: '1px solid #f3e8d5', padding: '2px 8px', borderRadius: '6px' }}>
                                        PO #{sal.po_number}
                                      </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706' }}>
                                        {sal.total_assigned_qty} pcs Assigned
                                      </span>
                                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {sal.po_date}</div>
                                    </div>
                                  </div>

                                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                        <th style={{ padding: '4px 6px' }}>ITEM / STYLE DESCRIPTION</th>
                                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>ASSIGNED QTY</th>
                                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>UNIT RATE (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sal.items.map((it, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                          <td style={{ padding: '6px 6px', fontWeight: 600, color: '#334155' }}>{it.description}</td>
                                          <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{it.quantity} {it.unit}</td>
                                          <td style={{ padding: '6px 6px', textAlign: 'right', color: '#64748b' }}>₹{it.rate?.toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredPIs.length > 0 && selectedRowIds.size === filteredPIs.length}
                      onChange={toggleSelectAll}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                  </th>
                  <th>PI / PO Ref #</th>
                  <th>PI Date</th>
                  <th>Buyer</th>
                  <th>Delivered To</th>
                  <th>Ex-Factory Date</th>
                  <th>Items Count</th>
                  <th>Total Units</th>
                  <th>Total Amount</th>
                  <th>PO Allocation Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPIs.map(p => {
                  const pItems = p.items || [];
                  const pUnits = p.total_units !== undefined ? p.total_units : pItems.reduce((acc, it) => acc + (it.units || 0), 0);
                  const pAmt = pItems.reduce((acc, it) => acc + (parseFloat(it.total_amount) || 0), 0);
                  const pRem = p.remaining_units !== undefined ? p.remaining_units : pUnits;
                  const pAlloc = p.allocated_units !== undefined ? p.allocated_units : 0;
                  const isRecentlyVisited = String(p.id) === String(lastVisitedId);

                  return (
                    <tr
                      key={p.id}
                      ref={isRecentlyVisited ? setHighlightRef : null}
                      onClick={() => navigate(`/performa-invoices/${p.id}`)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedRowIds.has(p.id) ? '#dcfce7' : undefined,
                        transition: 'background-color 0.2s ease',
                      }}
                      className={`table-fade-slide-up ${isRecentlyVisited ? 'row-recently-visited' : ''}`}
                      title="Click to view/edit detail"
                    >
                      <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(p.id)}
                          onChange={e => toggleSelectRow(p.id, e)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                        />
                      </td>
                      <td>
                        <strong>{p.pi_no}</strong>
                      </td>
                      <td>{p.pi_date || '—'}</td>
                      <td>
                        <strong>{p.buyer_detail?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.buyer_detail?.code}</div>
                      </td>
                      <td>
                        <div>{p.delivered_to_company || p.delivered_to_name || '—'}</div>
                        <small style={{ color: 'var(--text-muted)' }}>{p.delivered_to_name}</small>
                      </td>
                      <td>{p.ex_factory_date || '—'}</td>
                      <td><span className="navbar-role-badge admin-badge">{pItems.length} Items</span></td>
                      <td><strong>{pUnits}</strong></td>
                      <td><strong style={{ color: '#16a34a' }}>${pAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                      <td onClick={e => { e.stopPropagation(); setBreakdownModalPi(p); }}>
                        {pRem <= 0 && pUnits > 0 ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }} title="Click to view supplier breakdown">
                            🔍 Fully Allocated ({pUnits} pcs)
                          </span>
                        ) : pAlloc > 0 ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }} title="Click to view supplier breakdown">
                            🔍 Partial ({pRem} pcs left)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }} title="Click to view supplier breakdown">
                            🔍 Unassigned ({pRem} pcs)
                          </span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadExcel(p.id, p.pi_no); }}
                            className="btn-primary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Download PI Excel"
                          >
                            <Download size={14} /> Excel
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/pos/new?pi=${p.id}`); }}
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: '#14b8a6', color: '#0d9488', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Create PO from PI"
                          >
                            <ShoppingBag size={14} /> +PO
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/performa-invoices/${p.id}`); }} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.pi_no); }} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPIs.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading Performa Invoices...' : 'No Performa Invoices found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Card List */}
          <div className="mobile-only mobile-card-list">
            {filteredPIs.map(p => {
              const pItems = p.items || [];
              const pUnits = pItems.reduce((acc, it) => acc + (it.units || 0), 0);
              const isRecentlyVisited = String(p.id) === String(lastVisitedId);
              
              return (
                <div 
                  className={`mobile-card ${isRecentlyVisited ? 'card-recently-visited' : ''}`}
                  key={p.id} 
                  ref={isRecentlyVisited ? setHighlightRef : null}
                  onClick={() => navigate(`/performa-invoices/${p.id}`)}
                  style={{ backgroundColor: selectedRowIds.has(p.id) ? '#f0fdf4' : undefined }}
                >
                  <div className="mobile-card-img" style={{ backgroundColor: '#f5efe6', color: '#8b5a2b', borderRadius: '12px', width: '56px', height: '56px' }}>
                    <FileText size={24} />
                  </div>
                  
                  <div className="mobile-card-content" style={{ paddingLeft: '0.5rem' }}>
                    <div className="mobile-card-title">
                      {p.pi_no}
                    </div>
                    <div className="mobile-card-subtitle" style={{ marginTop: '0.25rem', color: 'var(--text-main)' }}>
                      {p.buyer_detail?.name || 'Unknown Buyer'}
                    </div>
                    <div className="mobile-card-subtitle" style={{ marginTop: '0.25rem' }}>
                      Items - <strong style={{ color: '#8b5a2b' }}>{pItems.length}</strong>
                    </div>
                  </div>

                  <div className="mobile-card-arrow">
                    <ChevronRight size={20} color="#94a3b8" />
                  </div>
                </div>
              );
            })}
            {filteredPIs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {loading ? 'Loading Performa Invoices...' : 'No Performa Invoices found.'}
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
        </>
      )}

      <SupplierAllocationBreakdownModal
        isOpen={Boolean(breakdownModalPi)}
        onClose={() => setBreakdownModalPi(null)}
        piData={breakdownModalPi}
      />

      {/* Unsaved Changes Exit Guard Modal */}
      <UnsavedChangesModal
        isOpen={showExitModal}
        title="Unsaved Performa Invoice Changes"
        message="You have unsaved changes in this Performa Invoice. Would you like to save your PI or store it as a draft before leaving?"
        onSave={handleSaveAndExit}
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />
    </div>
  );
}

export default BuyerPIs;
