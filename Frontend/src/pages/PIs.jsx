import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, ArrowLeft, Trash2, Download, Layers } from 'lucide-react';
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

function PIs() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pis, setPis] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [availablePOs, setAvailablePOs] = useState([]);
  const [selectedPOIds, setSelectedPOIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuyerId, setFilterBuyerId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-id');
  

  const defaultDeclaration = (
    "We declare that this invoice shows that the actual price of the goods and that all particulars are true and correct. " +
    "We are not registered under Central Excise Act 1944 and Rules made there under and no cenvat credit or input stage benefits in any input has been availed by us or supporting manufacturer. " +
    "No duty free input either imported or procured locally has been used in the export product. The value declared is fair and same is equivalent to PMV of the goods. " +
    "The goods are non antique and not art treasure. We further declare that neither red sandors wood nor any oher prohibited wood has been used in the manufacturing of above items."
  );

  const emptyForm = {
    pi_no: '',
    pi_date: new Date().toISOString().split('T')[0],
    buyer: '',
    buyer_order_no: '',
    buyer_order_date: new Date().toISOString().split('T')[0],
    exporter_ref: '',
    other_references: '',
    buyer_name: '',
    buyer_other_consignee: '',
    department_no: '69',
    pre_carriage_by: 'Trailer',
    place_of_receipt: 'Jaipur',
    vessel_flight_no: 'By Sea',
    port_of_loading: 'Mundra',
    port_of_discharge: '',
    place_of_delivery: 'UNITED KINGDOM',
    country_of_origin: 'INDIA',
    country_final_destination: 'UK',
    terms_payment: 'Payment: T/T',
    terms_delivery: `Delivery: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} Ex-Factory`,
    category_header: 'Wooden Furniture Items',
    declaration_text: defaultDeclaration,
    items: [],
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchPIs = () => {
    setLoading(true);
    const params = { page: currentPage, ordering: ordering };
    if (filterBuyerId) {
      params.buyer = filterBuyerId;
    }
    api.get('/performa-invoices/', { params })
      .then(res => {
        const data = res.data.results || res.data;
        setPis(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Failed to fetch PIs', err))
      .finally(() => setLoading(false));
  };

  const fetchBuyers = () => {
    api.get('/buyers/', { params: { nopage: true } })
      .then(res => setBuyers(res.data))
      .catch(err => console.error('Failed to fetch buyers', err));
  };

  const fetchPOsForBuyer = (buyerId) => {
    if (!buyerId) {
      setAvailablePOs([]);
      return;
    }
    api.get('/pos/', { params: { buyer: buyerId, nopage: true } })
      .then(res => setAvailablePOs(res.data))
      .catch(err => console.error('Failed to fetch POs for buyer', err));
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
      api.get(`/performa-invoices/${id}/`)
        .then(res => {
          const p = res.data;
          setFormData({
            pi_no: p.pi_no || '',
            pi_date: p.pi_date || '',
            buyer: p.buyer || '',
            buyer_order_no: p.buyer_order_no || '',
            buyer_order_date: p.buyer_order_date || '',
            exporter_ref: p.exporter_ref || '',
            other_references: p.other_references || '',
            buyer_name: p.buyer_name || '',
            buyer_other_consignee: p.buyer_other_consignee || '',
            department_no: p.department_no || '69',
            pre_carriage_by: p.pre_carriage_by || 'Trailer',
            place_of_receipt: p.place_of_receipt || 'Jaipur',
            vessel_flight_no: p.vessel_flight_no || 'By Sea',
            port_of_loading: p.port_of_loading || 'Mundra',
            port_of_discharge: p.port_of_discharge || '',
            place_of_delivery: p.place_of_delivery || 'UNITED KINGDOM',
            country_of_origin: p.country_of_origin || 'INDIA',
            country_final_destination: p.country_final_destination || 'UK',
            terms_payment: p.terms_payment || 'Payment: T/T',
            terms_delivery: p.terms_delivery || '',
            category_header: p.category_header || 'Wooden Furniture Items',
            declaration_text: p.declaration_text || defaultDeclaration,
            items: p.items || [],
          });
          setEditingId(p.id);
          if (p.buyer) {
            fetchPOsForBuyer(p.buyer);
          }
        })
        .catch(err => console.error('Failed to fetch PI detail', err));
    } else if (id === 'new') {
      const generatedNo = `PI50 ${Math.floor(100000 + Math.random() * 900000)}`;
      setFormData({ ...emptyForm, pi_no: generatedNo });
      setEditingId(null);
    }
  }, [id]);

  const handleBuyerChange = (e) => {
    const buyerId = e.target.value;
    const bObj = buyers.find(b => b.id === buyerId);
    setFormData(prev => ({
      ...prev,
      buyer: buyerId,
      buyer_name: bObj ? bObj.name : '',
    }));
    fetchPOsForBuyer(buyerId);
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
          style_no: '',
          description: '',
          dimension_w: '',
          dimension_d: '',
          dimension_h: '',
          volume_per_pc: '',
          qty: 1,
          total_volume: '',
          rate_usd: '',
          amount_usd: '',
          image_url: '',
        }
      ]
    }));
  };

  const handleImportPOs = () => {
    if (selectedPOIds.length === 0) return;
    const selectedPOs = availablePOs.filter(po => selectedPOIds.includes(po.id));

    const newItems = selectedPOs.map(po => {
      const bm = po.buyer_master_detail || {};
      const sample = bm.sample_detail || {};
      let img = '';
      if (sample.images && sample.images.length > 0) {
        img = sample.images[0].image_url || sample.images[0].image || '';
      }
      const qty = po.units || 1;
      const vol_pc = parseFloat(po.cbm) || 0.16;
      const rate = parseFloat(po.price_usd) || 0;

      return {
        po: po.id,
        style_no: bm.style_no || po.po || '',
        description: bm.product_name || '',
        dimension_w: bm.size_length || sample.size_length || '',
        dimension_d: bm.size_breadth || sample.size_breadth || '',
        dimension_h: bm.size_height || sample.size_height || '',
        volume_per_pc: vol_pc,
        qty: qty,
        total_volume: (qty * vol_pc).toFixed(4),
        rate_usd: rate,
        amount_usd: (qty * rate).toFixed(2),
        image_url: img,
      };
    });

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }));
    setSelectedPOIds([]);
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      const qty = parseInt(item.qty, 10) || 0;
      const vol_pc = parseFloat(item.volume_per_pc) || 0;
      const rate = parseFloat(item.rate_usd) || 0;

      if (field === 'qty' || field === 'volume_per_pc') {
        item.total_volume = (qty * vol_pc).toFixed(4);
      }
      if (field === 'qty' || field === 'rate_usd') {
        item.amount_usd = (qty * rate).toFixed(2);
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
      buyer_order_date: formData.buyer_order_date || null,
      items: formData.items.map(item => ({
        ...item,
        po: item.po || null,
        qty: parseInt(item.qty, 10) || 0,
        dimension_w: item.dimension_w !== '' && item.dimension_w !== null ? parseFloat(item.dimension_w) : null,
        dimension_d: item.dimension_d !== '' && item.dimension_d !== null ? parseFloat(item.dimension_d) : null,
        dimension_h: item.dimension_h !== '' && item.dimension_h !== null ? parseFloat(item.dimension_h) : null,
        volume_per_pc: item.volume_per_pc !== '' && item.volume_per_pc !== null ? parseFloat(item.volume_per_pc) : null,
        total_volume: item.total_volume !== '' && item.total_volume !== null ? parseFloat(item.total_volume) : null,
        rate_usd: item.rate_usd !== '' && item.rate_usd !== null ? parseFloat(item.rate_usd) : null,
        amount_usd: item.amount_usd !== '' && item.amount_usd !== null ? parseFloat(item.amount_usd) : null,
      }))
    };

    const req = editingId
      ? api.put(`/performa-invoices/${editingId}/`, payload)
      : api.post('/performa-invoices/', payload);

    req.then(() => {
      navigate('/pis');
      fetchPIs();
    }).catch(err => {
      console.error('Failed to save PI', err.response?.data || err);
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      alert(`Failed to save Performa Invoice:\n${errMsg}`);
    });
  };

  const handleDelete = (piId, piNo) => {
    if (window.confirm(`Are you sure you want to delete PI "${piNo}"?`)) {
      api.delete(`/performa-invoices/${piId}/`)
        .then(() => fetchPIs())
        .catch(err => console.error('Failed to delete PI', err));
    }
  };

  const handleDownloadExcel = (piId, piNo) => {
    api.get(`/performa-invoices/${piId}/export-excel/`, { responseType: 'blob' })
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

  // Calculations for summary
  const totalQty = formData.items.reduce((acc, item) => acc + (parseInt(item.qty, 10) || 0), 0);
  const totalVol = formData.items.reduce((acc, item) => acc + (parseFloat(item.total_volume) || 0), 0);
  const totalAmt = formData.items.reduce((acc, item) => acc + (parseFloat(item.amount_usd) || 0), 0);
  const wordsRepresentation = num2words(totalAmt);

  const filteredPIs = pis.filter(p =>
    (p.pi_no && p.pi_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.buyer_detail && p.buyer_detail.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.buyer_order_no && p.buyer_order_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {id ? (
        <div className="new-page-form" style={{ padding: '1rem 0' }}>
          <button
            onClick={() => navigate('/invoices')}
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
            <ArrowLeft size={18} /> Back to Invoices
          </button>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {editingId ? `✏️ Edit Invoice (${formData.pi_no})` : '+ Create New Invoice'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={() => handleDownloadExcel(editingId, formData.pi_no)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#16a34a' }}
                >
                  <Download size={16} /> Download Excel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Header Info */}
              <div className="form-section">
                <h3 className="form-section-title">📄 General & Party Information</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Buyer / Consignee *</label>
                    <select required name="buyer" className="form-input" value={formData.buyer} onChange={handleBuyerChange}>
                      <option value="">Select Buyer...</option>
                      {buyers.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Buyer Name (in Invoice) *</label>
                    <input required type="text" name="buyer_name" className="form-input" value={formData.buyer_name} onChange={handleFormChange} placeholder="e.g. ANKITA KHANNA" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Invoice No. *</label>
                    <input required type="text" name="pi_no" className="form-input" value={formData.pi_no} onChange={handleFormChange} placeholder="e.g. INV50 076047" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Invoice Date *</label>
                    <input required type="date" name="pi_date" className="form-input" value={formData.pi_date} onChange={handleFormChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Buyer's Order No. & Date</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="buyer_order_no" className="form-input" value={formData.buyer_order_no} onChange={handleFormChange} placeholder="Order No (e.g. 50 076047)" />
                      <input type="date" name="buyer_order_date" className="form-input" value={formData.buyer_order_date} onChange={handleFormChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Exporter's Ref & Dept #</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="exporter_ref" className="form-input" value={formData.exporter_ref} onChange={handleFormChange} placeholder="Exporter Ref" />
                      <input type="text" name="department_no" className="form-input" value={formData.department_no} onChange={handleFormChange} placeholder="Dept # (e.g. 69)" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Carriage & Ports */}
              <div className="form-section">
                <h3 className="form-section-title">🚢 Carriage, Port & Delivery Details</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Pre-Carriage & Place of Receipt</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="pre_carriage_by" className="form-input" value={formData.pre_carriage_by} onChange={handleFormChange} placeholder="Pre-Carriage (e.g. Trailer)" />
                      <input type="text" name="place_of_receipt" className="form-input" value={formData.place_of_receipt} onChange={handleFormChange} placeholder="Receipt (e.g. Jaipur)" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vessel/Flight No. & Port of Loading</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="vessel_flight_no" className="form-input" value={formData.vessel_flight_no} onChange={handleFormChange} placeholder="Vessel (e.g. By Sea)" />
                      <input type="text" name="port_of_loading" className="form-input" value={formData.port_of_loading} onChange={handleFormChange} placeholder="Port (e.g. Mundra)" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Port of Discharge & Place of Delivery</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="port_of_discharge" className="form-input" value={formData.port_of_discharge} onChange={handleFormChange} placeholder="Discharge Port" />
                      <input type="text" name="place_of_delivery" className="form-input" value={formData.place_of_delivery} onChange={handleFormChange} placeholder="Delivery (e.g. UNITED KINGDOM)" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Origin & Destination Country</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="country_of_origin" className="form-input" value={formData.country_of_origin} onChange={handleFormChange} placeholder="Origin (e.g. INDIA)" />
                      <input type="text" name="country_final_destination" className="form-input" value={formData.country_final_destination} onChange={handleFormChange} placeholder="Destination (e.g. UK)" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Terms of Payment & Delivery</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="terms_payment" className="form-input" value={formData.terms_payment} onChange={handleFormChange} placeholder="Payment: T/T" />
                      <input type="text" name="terms_delivery" className="form-input" value={formData.terms_delivery} onChange={handleFormChange} placeholder="Delivery: Ex-Factory" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category Header in Table</label>
                    <input type="text" name="category_header" className="form-input" value={formData.category_header} onChange={handleFormChange} placeholder="Wooden Furniture Items" />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 className="form-section-title" style={{ margin: 0 }}>📦 Line Items (Goods Description & Rates)</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleAddManualItem} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      + Add Manual Item
                    </button>
                  </div>
                </div>

                {/* Import PO section */}
                {formData.buyer && availablePOs.length > 0 && (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                      <Layers size={18} /> Auto-fill Items from Confirmed POs
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        multiple
                        className="form-input"
                        style={{ height: '80px', flexGrow: 1 }}
                        value={selectedPOIds}
                        onChange={e => {
                          const options = Array.from(e.target.selectedOptions, option => option.value);
                          setSelectedPOIds(options);
                        }}
                      >
                        {availablePOs.map(po => (
                          <option key={po.id} value={po.id}>
                            {po.po} — {po.buyer_master_detail?.style_no} ({po.buyer_master_detail?.product_name}) — Qty: {po.units || 1}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleImportPOs}
                        className="btn-primary"
                        disabled={selectedPOIds.length === 0}
                        style={{ height: '40px', padding: '0 1rem', fontSize: '0.85rem' }}
                      >
                        Import Selected POs
                      </button>
                    </div>
                    <small style={{ color: '#64748b', marginTop: '0.25rem', display: 'block' }}>Hold Ctrl (or Cmd) to select multiple POs to add as PI line items.</small>
                  </div>
                )}

                <div className="table-container" style={{ overflowX: 'auto', width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem', minWidth: '1080px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '140px', minWidth: '140px' }}>Style No *</th>
                        <th style={{ width: '240px', minWidth: '240px' }}>Description of Goods</th>
                        <th style={{ width: '200px', minWidth: '200px' }}>Dimensions CM (W x D x H)</th>
                        <th style={{ width: '90px', minWidth: '90px' }}>Vol/Pc</th>
                        <th style={{ width: '80px', minWidth: '80px' }}>Qty</th>
                        <th style={{ width: '90px', minWidth: '90px' }}>Total Vol</th>
                        <th style={{ width: '100px', minWidth: '100px' }}>Rate US$</th>
                        <th style={{ width: '100px', minWidth: '100px' }}>Amount US$</th>
                        <th style={{ width: '50px', minWidth: '50px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              required
                              type="text"
                              className="form-input"
                              style={{ padding: '0.35rem 0.5rem', width: '100%' }}
                              value={item.style_no}
                              onChange={e => handleItemChange(idx, 'style_no', e.target.value)}
                              placeholder="2410-144-120"
                            />
                          </td>
                          <td>
                            <textarea
                              rows="2"
                              className="form-input"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                              value={item.description}
                              onChange={e => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="Description & Box details..."
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <input type="number" step="0.1" className="form-input" style={{ width: '58px', padding: '0.35rem 0.25rem', textAlign: 'center' }} placeholder="W" value={item.dimension_w} onChange={e => handleItemChange(idx, 'dimension_w', e.target.value)} />
                              <input type="number" step="0.1" className="form-input" style={{ width: '58px', padding: '0.35rem 0.25rem', textAlign: 'center' }} placeholder="D" value={item.dimension_d} onChange={e => handleItemChange(idx, 'dimension_d', e.target.value)} />
                              <input type="number" step="0.1" className="form-input" style={{ width: '58px', padding: '0.35rem 0.25rem', textAlign: 'center' }} placeholder="H" value={item.dimension_h} onChange={e => handleItemChange(idx, 'dimension_h', e.target.value)} />
                            </div>
                          </td>
                          <td>
                            <input type="number" step="0.0001" className="form-input" style={{ width: '100%', padding: '0.35rem 0.4rem', textAlign: 'center' }} value={item.volume_per_pc} onChange={e => handleItemChange(idx, 'volume_per_pc', e.target.value)} placeholder="0.16" />
                          </td>
                          <td>
                            <input type="number" className="form-input" style={{ width: '100%', padding: '0.35rem 0.4rem', textAlign: 'center' }} value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} placeholder="50" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <strong>{item.total_volume || '0.00'}</strong>
                          </td>
                          <td>
                            <input type="number" step="0.01" className="form-input" style={{ width: '100%', padding: '0.35rem 0.4rem', textAlign: 'right' }} value={item.rate_usd} onChange={e => handleItemChange(idx, 'rate_usd', e.target.value)} placeholder="64.00" />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>${item.amount_usd || '0.00'}</strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                              title="Delete Item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            No line items added yet. Click "+ Add Manual Item" or select POs above to auto-populate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div style={{ marginTop: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                    <span>Amount Chargeable Totals:</span>
                    <span>Total Qty: {totalQty} | Total Vol: {totalVol.toFixed(2)} m³ | Total Amount: ${totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#8b5a2b', fontStyle: 'italic', fontSize: '0.95rem' }}>
                    {wordsRepresentation}
                  </div>
                </div>
              </div>

              {/* Declaration Section */}
              <div className="form-section">
                <h3 className="form-section-title">📜 Declaration Text</h3>
                <div className="form-group">
                  <textarea
                    rows="4"
                    name="declaration_text"
                    className="form-input"
                    value={formData.declaration_text}
                    onChange={handleFormChange}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => navigate('/invoices')}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Save Invoice Changes' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <h2>Invoices</h2>
            <button onClick={() => navigate('/invoices/new')} className="btn-primary">+ Create New Invoice</button>
          </div>

          {/* Search & Filter Bar */}
          <div className="filter-bar">
            <div className="filter-bar-inner" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexGrow: 1, minWidth: '240px' }}>
                <Search size={16} className="filter-icon" />
                <span className="filter-label">Search:</span>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search by Invoice No, Buyer, Order No..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
                <span className="filter-label">Order By:</span>
                <select
                  className="filter-input"
                  value={ordering}
                  onChange={e => setOrdering(e.target.value)}
                  style={{ minWidth: '130px' }}
                >
                  <option value="-id">Latest First</option>
                  <option value="id">Oldest First</option>
                  <option value="pi_no">Invoice No (A-Z)</option>
                  <option value="-pi_no">Invoice No (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Invoice Date</th>
                  <th>Buyer / Consignee</th>
                  <th>Order # & Date</th>
                  <th>Items Count</th>
                  <th>Total Qty</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPIs.map(p => {
                  const pItems = p.items || [];
                  const pQty = pItems.reduce((acc, it) => acc + (it.qty || 0), 0);
                  const pAmt = pItems.reduce((acc, it) => acc + (parseFloat(it.amount_usd) || 0), 0);

                  return (
                    <tr key={p.id}>
                      <td><strong>{p.pi_no}</strong></td>
                      <td>{p.pi_date || '—'}</td>
                      <td>
                        <strong>{p.buyer_detail?.name || p.buyer_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.buyer_detail?.code}</div>
                      </td>
                      <td>{p.buyer_order_no ? `${p.buyer_order_no} (${p.buyer_order_date || ''})` : '—'}</td>
                      <td><span className="navbar-role-badge admin-badge">{pItems.length} Items</span></td>
                      <td><strong>{pQty}</strong></td>
                      <td><strong style={{ color: '#16a34a' }}>${pAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleDownloadExcel(p.id, p.pi_no)}
                            className="btn-primary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Download PI Excel"
                          >
                            <Download size={14} /> Excel
                          </button>
                          <button onClick={() => navigate(`/invoices/${p.id}`)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                          <button onClick={() => handleDelete(p.id, p.pi_no)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPIs.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading Invoices...' : 'No Invoices found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

export default PIs;
