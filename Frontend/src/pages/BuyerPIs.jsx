import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { Search, ArrowLeft, Trash2, Download, Layers, ShoppingBag, Plus, ChevronRight, FileText } from 'lucide-react';
import Pagination from '../components/Pagination';


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
  const [loading, setLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');
  

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

  const [formData, setFormData] = useState(emptyForm);

  const fetchPIs = () => {
    setLoading(true);
    const params = { page: currentPage, ordering: ordering };
    if (filterBuyerId) {
      params.buyer = filterBuyerId;
    }
    api.get('/buyer-pis/', { params })
      .then(res => {
        const data = res.data.results || res.data;
        setPis(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Failed to fetch Buyer PIs', err))
      .finally(() => setLoading(false));
  };

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBuyerId, ordering]);

  useEffect(() => {
    fetchPIs();
  }, [currentPage, ordering, filterBuyerId]);

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
      const randomNum = Math.floor(1000000 + Math.random() * 9000000);
      setFormData({
        ...emptyForm,
        pi_no: `P${randomNum}`,
      });
      setEditingId(null);
    }
  }, [id]);

  const handleBuyerChange = (e) => {
    const buyerId = e.target.value;
    const bObj = buyers.find(b => b.id === buyerId);
    setFormData(prev => ({
      ...prev,
      buyer: buyerId,
      delivered_to_company: bObj ? bObj.name : '',
      delivered_to_address: bObj ? (bObj.address || '') : '',
    }));
    fetchBuyerMasters(buyerId);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualItem = () => {
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

  const filteredPIs = pis.filter(p =>
    (p.pi_no && p.pi_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.buyer_detail && p.buyer_detail.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.delivered_to_name && p.delivered_to_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {id ? (
        <div className="new-page-form" style={{ padding: '1rem 0' }}>
          <button
            onClick={() => {
              if (location.state?.fromBuyer) {
                navigate(`/buyers/${location.state.fromBuyer}`);
              } else {
                navigate('/performa-invoices');
              }
            }}
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
            <ArrowLeft size={18} /> Back to Performa Invoices
          </button>

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

            <form onSubmit={handleSubmit}>
              {/* Header Info */}
              <div className="form-section">
                <h3 className="form-section-title">🏢 Buyer & Exporter Info</h3>
                <div className="pi-info-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Buyer *</label>
                    <select required name="buyer" className="form-input" value={formData.buyer} onChange={handleBuyerChange}>
                      <option value="">Select Buyer...</option>
                      {buyers.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">PI Ref / PO # *</label>
                    <input required type="text" name="pi_no" className="form-input" value={formData.pi_no} onChange={handleFormChange} placeholder="e.g. P0009695" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">PI Date *</label>
                    <input required type="date" name="pi_date" className="form-input" value={formData.pi_date} onChange={handleFormChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ex-Factory Date</label>
                    <input type="date" name="ex_factory_date" className="form-input" value={formData.ex_factory_date} onChange={handleFormChange} />
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
                {formData.buyer && buyerMasters.length > 0 && (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                      <Layers size={18} /> Select Styles from Buyer Master to Populate PI
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                      <select
                        multiple
                        className="form-input"
                        style={{ height: '180px', width: '100%' }}
                        value={selectedMasterIds}
                        onChange={e => {
                          const options = Array.from(e.target.selectedOptions, option => option.value);
                          setSelectedMasterIds(options);
                        }}
                      >
                        {buyerMasters.map(bm => (
                          <option key={bm.id} value={bm.id} style={{ padding: '0.25rem 0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                            Style: {bm.style_no} — {bm.product_name} ({bm.wood_type} | {bm.finish_color})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleImportBuyerMasters}
                        className="btn-primary"
                        disabled={selectedMasterIds.length === 0}
                        style={{ height: '40px', padding: '0 1rem', fontSize: '0.9rem', alignSelf: 'flex-start' }}
                      >
                        Import Selected Styles
                      </button>
                    </div>
                    <small style={{ color: '#64748b', marginTop: '0.75rem', display: 'block' }}>Hold Ctrl (or Cmd) to select multiple Buyer Master styles to add into this Performa Invoice.</small>
                  </div>
                )}

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

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => navigate('/performa-invoices')}>Cancel</button>
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
            <h2>Performa Invoices (PI)</h2>
            <button onClick={() => navigate('/performa-invoices/new')} className="btn-primary">+ Create New PI</button>
          </div>

          {/* Search & Filter Bar */}
          <div className="filter-bar">
            <div className="bm-filter-container">
              <div className="bm-search">
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

              <div className="bm-export">
                <span className="filter-label">Filter Buyer:</span>
                <select
                  className="filter-input"
                  value={filterBuyerId}
                  onChange={e => setFilterBuyerId(e.target.value)}
                  style={{ minWidth: '180px' }}
                >
                  <option value="">All Buyers</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div className="bm-order">
                <span className="filter-label">Order By:</span>
                <select
                  className="filter-input"
                  value={ordering}
                  onChange={e => setOrdering(e.target.value)}
                  style={{ minWidth: '130px' }}
                >
                  <option value="-created_at">Latest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="pi_no">PI No (A-Z)</option>
                  <option value="-pi_no">PI No (Z-A)</option>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPIs.map(p => {
                  const pItems = p.items || [];
                  const pUnits = pItems.reduce((acc, it) => acc + (it.units || 0), 0);
                  const pAmt = pItems.reduce((acc, it) => acc + (parseFloat(it.total_amount) || 0), 0);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/performa-invoices/${p.id}`)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedRowIds.has(p.id) ? '#dcfce7' : undefined,
                        transition: 'background-color 0.2s ease',
                      }}
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
                      <td><strong>{p.pi_no}</strong></td>
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
              
              return (
                <div 
                  className="mobile-card" 
                  key={p.id} 
                  onClick={() => navigate(`/performa-invoices/${p.id}`)}
                  style={{ backgroundColor: selectedRowIds.has(p.id) ? '#f0fdf4' : '#fff' }}
                >
                  <div className="mobile-card-img" style={{ backgroundColor: '#f5efe6', color: '#8b5a2b', borderRadius: '12px', width: '56px', height: '56px' }}>
                    <FileText size={24} />
                  </div>
                  
                  <div className="mobile-card-content" style={{ paddingLeft: '0.5rem' }}>
                    <div className="mobile-card-title">{p.pi_no}</div>
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
    </div>
  );
}

export default BuyerPIs;
