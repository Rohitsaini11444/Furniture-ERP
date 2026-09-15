import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, ArrowLeft, Trash2, Download, Layers, AlertCircle, CheckCircle, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import { OrderBySelect, ORDER_OPTIONS_DATE_PINO } from '../components/OrderBySelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import InvoiceQRCode from '../components/InvoiceQRCode';
import QRScannerModal from '../components/QRScannerModal';
import { useLastVisitedItem } from '../hooks/useLastVisitedItem';



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
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const hasVisitedItem = sessionStorage.getItem('last_visited_pis');
      const savedPage = sessionStorage.getItem('last_visited_page_pis');
      if (hasVisitedItem && savedPage) return Number(savedPage);
    } catch (e) {}
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  const { lastVisitedId, setHighlightRef } = useLastVisitedItem('pis', id, currentPage);

  // Scanner test state
  const [showTestScanner, setShowTestScanner] = useState(false);
  const [scanTestResult, setScanTestResult] = useState(null);

  const handleTestScanSuccess = (scannedCode) => {
    setShowTestScanner(false);
    setScanTestResult(scannedCode);
  };

  

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
    api.get('/performa-invoices/', { params })
      .then(res => {
        const data = res.data.results || res.data || [];
        setPis(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50) || 1);
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Failed to fetch PIs', err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering, debouncedSearch, filterBuyerId]);

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

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearch, filterBuyerId, ordering]);

  useEffect(() => {
    fetchPIs();
  }, [fetchPIs]);

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
    if (formErrors.buyer || formErrors.buyer_name) {
      setFormErrors(prev => ({ ...prev, buyer: null, buyer_name: null }));
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
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
    if (formErrors.items_general) {
      setFormErrors(prev => ({ ...prev, items_general: null }));
    }
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
    if (formErrors.items_general) {
      setFormErrors(prev => ({ ...prev, items_general: null }));
    }
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

    if (formErrors.items?.[index]?.[field] || formErrors.items_general) {
      setFormErrors(prev => {
        const newItems = { ...(prev.items || {}) };
        if (newItems[index]) {
          newItems[index] = { ...newItems[index] };
          delete newItems[index][field];
          if (Object.keys(newItems[index]).length === 0) {
            delete newItems[index];
          }
        }
        return {
          ...prev,
          items: newItems,
          items_general: null
        };
      });
    }
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    if (formErrors.items) {
      setFormErrors(prev => {
        const newItems = {};
        Object.entries(prev.items || {}).forEach(([rowKey, rowErr]) => {
          const rIdx = parseInt(rowKey, 10);
          if (rIdx < index) {
            newItems[rIdx] = rowErr;
          } else if (rIdx > index) {
            newItems[rIdx - 1] = rowErr;
          }
        });
        return { ...prev, items: newItems };
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.buyer) {
      errors.buyer = 'Buyer is required';
    }

    if (!formData.buyer_name || !formData.buyer_name.trim()) {
      errors.buyer_name = 'Buyer name is required';
    }

    if (!formData.pi_no || !formData.pi_no.trim()) {
      errors.pi_no = 'Invoice No is required';
    } else if (formData.pi_no.trim().length > 50) {
      errors.pi_no = 'Invoice No cannot exceed 50 characters';
    }

    if (!formData.pi_date) {
      errors.pi_date = 'Invoice Date is required';
    }

    if (!formData.items || formData.items.length === 0) {
      errors.items_general = 'At least one line item is required';
    } else {
      const itemErrors = {};
      formData.items.forEach((item, idx) => {
        const rowErr = {};
        if (!item.style_no || !item.style_no.trim()) {
          rowErr.style_no = 'Style No is required';
        } else if (item.style_no.trim().length > 100) {
          rowErr.style_no = 'Style No cannot exceed 100 characters';
        }

        const qty = parseInt(item.qty, 10);
        if (isNaN(qty) || qty <= 0) {
          rowErr.qty = 'Qty must be at least 1';
        } else if (qty > 1000000) {
          rowErr.qty = 'Qty exceeds maximum (1,000,000)';
        }

        if (item.rate_usd !== '' && item.rate_usd !== null && item.rate_usd !== undefined) {
          const rate = parseFloat(item.rate_usd);
          if (isNaN(rate) || rate < 0) {
            rowErr.rate_usd = 'Rate must be >= 0';
          }
        }

        if (Object.keys(rowErr).length > 0) {
          itemErrors[idx] = rowErr;
        }
      });

      if (Object.keys(itemErrors).length > 0) {
        errors.items = itemErrors;
      }
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstKey = Object.keys(clientErrors)[0];
      const msg = firstKey === 'items'
        ? 'Please correct line item errors below'
        : firstKey === 'items_general'
        ? clientErrors.items_general
        : clientErrors[firstKey];
      setToastNotification({
        type: 'error',
        message: msg || 'Please correct errors before saving.'
      });
      return;
    }

    setSubmitting(true);
    setFormErrors({});

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
      setToastNotification({
        type: 'success',
        message: editingId ? 'Invoice updated successfully!' : 'Invoice created successfully!'
      });
      setTimeout(() => {
        navigate('/invoices');
        fetchPIs();
      }, 1000);
    }).catch(err => {
      console.error('Failed to save PI', err.response?.data || err);
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const backendErrors = {};
        Object.entries(data).forEach(([key, val]) => {
          if (key === 'items' && Array.isArray(val)) {
            const itemErrors = {};
            val.forEach((rowErr, rIdx) => {
              if (rowErr && typeof rowErr === 'object') {
                const cleanRow = {};
                Object.entries(rowErr).forEach(([fKey, fVal]) => {
                  cleanRow[fKey] = Array.isArray(fVal) ? fVal.join(' ') : String(fVal);
                });
                itemErrors[rIdx] = cleanRow;
              } else if (rowErr) {
                itemErrors[rIdx] = { general: String(rowErr) };
              }
            });
            if (Object.keys(itemErrors).length > 0) {
              backendErrors.items = itemErrors;
            }
          } else {
            backendErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
          }
        });
        setFormErrors(backendErrors);
        setToastNotification({
          type: 'error',
          message: backendErrors.non_field_errors || backendErrors.general || 'Failed to save Invoice. Check highlighted fields.'
        });
      } else {
        setFormErrors({ general: err.message || 'Server error occurred while saving.' });
        setToastNotification({
          type: 'error',
          message: err.message || 'Server error occurred.'
        });
      }
    }).finally(() => {
      setSubmitting(false);
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

  const filteredPIs = pis;

  return (
    <div>
      {id ? (
        <div className="new-page-form" style={{ padding: '1rem 0' }}>
          <div className="form-card-container">
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

            <form onSubmit={handleSubmit} noValidate>
              {/* General Error Banner */}
              {formErrors.general && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{formErrors.general}</span>
                </div>
              )}

              {/* Header Info */}
              <div className="form-section">
                <h3 className="form-section-title">📄 General & Party Information</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Buyer / Consignee *</label>
                    <div style={{
                      borderRadius: '8px',
                      border: formErrors.buyer ? '1.5px solid #dc2626' : 'none'
                    }}>
                      <CustomSelect
                        name="buyer"
                        value={formData.buyer}
                        onChange={handleBuyerChange}
                        options={[
                          { value: '', label: 'Select Buyer...' },
                          ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                        ]}
                        placeholder="Select Buyer..."
                      />
                    </div>
                    {formErrors.buyer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.buyer}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Buyer Name (in Invoice) *</label>
                    <input
                      type="text"
                      name="buyer_name"
                      className="form-input"
                      value={formData.buyer_name}
                      onChange={handleFormChange}
                      placeholder="e.g. ANKITA KHANNA"
                      style={{
                        borderColor: formErrors.buyer_name ? '#dc2626' : undefined,
                        backgroundColor: formErrors.buyer_name ? '#fff5f5' : undefined
                      }}
                    />
                    {formErrors.buyer_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.buyer_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Invoice No. *</label>
                    <input
                      type="text"
                      name="pi_no"
                      className="form-input"
                      value={formData.pi_no}
                      onChange={handleFormChange}
                      placeholder="e.g. INV50 076047"
                      style={{
                        borderColor: formErrors.pi_no ? '#dc2626' : undefined,
                        backgroundColor: formErrors.pi_no ? '#fff5f5' : undefined
                      }}
                    />
                    {formErrors.pi_no && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.pi_no}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <CustomDatePicker
                      label="Invoice Date *"
                      value={formData.pi_date}
                      onChange={val => handleFormChange({ target: { name: 'pi_date', value: val } })}
                    />
                    {formErrors.pi_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.pi_date}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Buyer's Order No. & Date</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="text" name="buyer_order_no" className="form-input" value={formData.buyer_order_no} onChange={handleFormChange} placeholder="Order No (e.g. 50 076047)" style={{ flex: 1 }} />
                      <div style={{ flex: 1 }}>
                        <CustomDatePicker
                          value={formData.buyer_order_date}
                          onChange={val => handleFormChange({ target: { name: 'buyer_order_date', value: val } })}
                        />
                      </div>
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

                {/* Items General Error Banner */}
                {formErrors.items_general && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.88rem',
                    fontWeight: 500
                  }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{formErrors.items_general}</span>
                  </div>
                )}

                <div className="table-container" style={{
                  overflowX: 'auto',
                  width: '100%',
                  border: `1.5px solid ${formErrors.items_general ? '#dc2626' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  boxShadow: formErrors.items_general ? '0 0 0 1px #dc2626' : 'none'
                }}>
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
                      {formData.items.map((item, idx) => {
                        const rowErr = formErrors.items?.[idx] || {};
                        const hasRowErr = Object.keys(rowErr).length > 0;
                        return (
                          <tr key={idx} style={{ backgroundColor: hasRowErr ? '#fff8f8' : undefined }}>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  borderColor: rowErr.style_no ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.style_no ? '#fff5f5' : undefined
                                }}
                                value={item.style_no}
                                onChange={e => handleItemChange(idx, 'style_no', e.target.value)}
                                placeholder="2410-144-120"
                              />
                              {rowErr.style_no && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.style_no}</div>}
                            </td>
                            <td>
                              <textarea
                                rows="2"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  fontSize: '0.8rem',
                                  width: '100%',
                                  resize: 'vertical',
                                  borderColor: rowErr.description ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.description ? '#fff5f5' : undefined
                                }}
                                value={item.description}
                                onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                placeholder="Description & Box details..."
                              />
                              {rowErr.description && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.description}</div>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-input"
                                  style={{
                                    width: '58px',
                                    padding: '0.35rem 0.25rem',
                                    textAlign: 'center',
                                    borderColor: rowErr.dimension_w ? '#dc2626' : undefined,
                                    backgroundColor: rowErr.dimension_w ? '#fff5f5' : undefined
                                  }}
                                  placeholder="W"
                                  value={item.dimension_w}
                                  onChange={e => handleItemChange(idx, 'dimension_w', e.target.value)}
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-input"
                                  style={{
                                    width: '58px',
                                    padding: '0.35rem 0.25rem',
                                    textAlign: 'center',
                                    borderColor: rowErr.dimension_d ? '#dc2626' : undefined,
                                    backgroundColor: rowErr.dimension_d ? '#fff5f5' : undefined
                                  }}
                                  placeholder="D"
                                  value={item.dimension_d}
                                  onChange={e => handleItemChange(idx, 'dimension_d', e.target.value)}
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-input"
                                  style={{
                                    width: '58px',
                                    padding: '0.35rem 0.25rem',
                                    textAlign: 'center',
                                    borderColor: rowErr.dimension_h ? '#dc2626' : undefined,
                                    backgroundColor: rowErr.dimension_h ? '#fff5f5' : undefined
                                  }}
                                  placeholder="H"
                                  value={item.dimension_h}
                                  onChange={e => handleItemChange(idx, 'dimension_h', e.target.value)}
                                />
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.0001"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.4rem',
                                  textAlign: 'center',
                                  borderColor: rowErr.volume_per_pc ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.volume_per_pc ? '#fff5f5' : undefined
                                }}
                                value={item.volume_per_pc}
                                onChange={e => handleItemChange(idx, 'volume_per_pc', e.target.value)}
                                placeholder="0.16"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.4rem',
                                  textAlign: 'center',
                                  borderColor: rowErr.qty ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.qty ? '#fff5f5' : undefined
                                }}
                                value={item.qty}
                                onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                                placeholder="50"
                              />
                              {rowErr.qty && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.qty}</div>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <strong>{item.total_volume || '0.00'}</strong>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.4rem',
                                  textAlign: 'right',
                                  borderColor: rowErr.rate_usd ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.rate_usd ? '#fff5f5' : undefined
                                }}
                                value={item.rate_usd}
                                onChange={e => handleItemChange(idx, 'rate_usd', e.target.value)}
                                placeholder="64.00"
                              />
                              {rowErr.rate_usd && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.rate_usd}</div>}
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
                        );
                      })}
                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{
                            textAlign: 'center',
                            padding: '1.75rem',
                            color: formErrors.items_general ? '#dc2626' : '#94a3b8',
                            backgroundColor: formErrors.items_general ? '#fff5f5' : 'transparent'
                          }}>
                            {formErrors.items_general ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                <AlertCircle size={18} />
                                <span>At least one line item is required. Click "+ Add Manual Item" or select POs above.</span>
                              </div>
                            ) : (
                              'No line items added yet. Click "+ Add Manual Item" or select POs above to auto-populate.'
                            )}
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
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : editingId ? 'Save Invoice Changes' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* QR Scanner Camera Modal */}
          <QRScannerModal
            isOpen={showTestScanner}
            onClose={() => setShowTestScanner(false)}
            onScanSuccess={handleTestScanSuccess}
            title="Test Invoice QR Code Scanner"
          />

          {scanTestResult && (
            <div style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.8)', zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }} onClick={() => setScanTestResult(null)}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', maxWidth: '420px', width: '100%' }} onClick={e => e.stopPropagation()}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>
                  ✅ QR Code Scanned Successfully!
                </h4>
                <div style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontFamily: 'monospace', marginBottom: '1rem', wordBreak: 'break-all' }}>
                  {scanTestResult}
                </div>
                <button type="button" onClick={() => setScanTestResult(null)} style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem', fontWeight: 700 }}>
                  Close
                </button>
              </div>
            </div>
          )}

          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>Invoices</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowTestScanner(true)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, borderColor: '#0284c7', color: '#0284c7' }}
              >
                📷 Test QR Scanner
              </button>
              <button onClick={() => navigate('/invoices/new')} className="btn-primary">+ Create New Invoice</button>
            </div>
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
                <CustomSelect
                  value={filterBuyerId}
                  onChange={e => {
                    const val = e.target ? e.target.value : e;
                    setFilterBuyerId(val);
                  }}
                  options={[
                    { value: '', label: 'All Buyers' },
                    ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                  ]}
                  placeholder="All Buyers"
                  style={{ minWidth: '180px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
                <span className="filter-label" style={{ fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', fontSize: '0.78rem' }}>ORDER BY:</span>
                <OrderBySelect
                  options={ORDER_OPTIONS_DATE_PINO}
                  value={ordering}
                  onChange={setOrdering}
                />
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>QR Code</th>
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
                  const isRecentlyVisited = String(p.id) === String(lastVisitedId);

                  return (
                    <tr 
                      key={p.id}
                      ref={isRecentlyVisited ? setHighlightRef : null}
                      className={`table-fade-slide-up ${isRecentlyVisited ? 'row-recently-visited' : ''}`}
                    >
                      <td>
                        <InvoiceQRCode invoiceData={p} size={48} showTestButton={false} />
                      </td>
                      <td>
                        <strong>{p.pi_no}</strong>
                      </td>
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
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
      {/* Toast Notification */}
      {toastNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastNotification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastNotification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toastNotification.message}</span>
          <button
            onClick={() => setToastNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default PIs;
