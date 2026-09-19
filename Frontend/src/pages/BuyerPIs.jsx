import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { Search, ArrowLeft, Trash2, Download, Layers, ShoppingBag, Plus, ChevronRight, FileText, Box, Check, Users, Clock, History, ArrowDownAZ, ArrowUpZA, FileSpreadsheet, Building2, AlertCircle, CheckCircle, X, Pencil, DollarSign, Package, FileEdit } from 'lucide-react';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { OrderBySelect, ORDER_OPTIONS_DATE_PINO } from '../components/OrderBySelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import SupplierAllocationBreakdownModal from '../components/SupplierAllocationBreakdownModal';
import { useLastVisitedItem } from '../hooks/useLastVisitedItem';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesModal from '../components/UnsavedChangesModal';
import { useDrafts } from '../context/DraftsContext';




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

  const { drafts, deleteDraft } = useDrafts();

  // Order & Draft Options
  const orderOptions = useMemo(() => {
    const draftCount = drafts.filter(d => d.formType === 'pi').length;
    return [
      ...ORDER_OPTIONS_DATE_PINO,
      {
        value: 'draft',
        label: 'Drafts',
        badge: draftCount > 0 ? draftCount : null,
        icon: FileEdit,
        isDividerBefore: true
      }
    ];
  }, [drafts]);

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
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

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
    if (ordering === 'draft') {
      setLoading(true);
      const currentDrafts = drafts.filter(d => d.formType === 'pi');
      const mapped = currentDrafts.map(d => {
        const fd = d.data || {};
        const buyerId = fd.buyer;
        const buyerObj = buyers.find(b => String(b.id) === String(buyerId));
        const items = Array.isArray(fd.items) ? fd.items : [];
        const totalUnits = items.reduce((acc, it) => acc + (parseInt(it.units, 10) || 0), 0);
        const totalAmt = items.reduce((acc, it) => acc + (parseFloat(it.total_amount) || 0), 0);

        return {
          id: d.id,
          pi_no: fd.pi_no || 'Draft PI',
          pi_date: fd.pi_date || (d.updatedAt ? d.updatedAt.split('T')[0] : ''),
          buyer: buyerId,
          buyer_detail: buyerObj || (buyerId ? { name: String(buyerId) } : null),
          delivered_to_name: fd.delivered_to_name || '',
          delivered_to_company: fd.delivered_to_company || '',
          delivered_to_address: fd.delivered_to_address || '',
          ex_factory_date: fd.ex_factory_date || '',
          items: items,
          total_units: totalUnits,
          total_amount: totalAmt,
          allocated_units: 0,
          remaining_units: totalUnits,
          supplier_allocations: [],
          isDraft: true,
          rawDraft: d,
          updatedAt: d.updatedAt
        };
      });

      let resList = mapped;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        resList = resList.filter(p =>
          (p.pi_no && p.pi_no.toLowerCase().includes(q)) ||
          (p.buyer_detail?.name && p.buyer_detail.name.toLowerCase().includes(q)) ||
          (p.delivered_to_company && p.delivered_to_company.toLowerCase().includes(q)) ||
          (p.delivered_to_name && p.delivered_to_name.toLowerCase().includes(q))
        );
      }
      if (filterBuyerId) {
        resList = resList.filter(p => String(p.buyer) === String(filterBuyerId));
      }

      resList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

      setTotalPages(Math.max(1, Math.ceil(resList.length / 50)));
      const paginated = resList.slice((currentPage - 1) * 50, currentPage * 50);
      setPis(paginated);
      setLoading(false);
      return;
    }

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
        const mapped = data.map(item => ({ ...item, isDraft: false }));
        setPis(mapped);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50) || 1);
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Failed to fetch Buyer PIs', err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering, debouncedSearch, filterBuyerId, drafts, buyers]);

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
    if (ordering === 'draft') {
      setPiSubTab('directory');
    }
  }, [ordering]);

  useEffect(() => {
    fetchPIs();
  }, [fetchPIs]);

  const handleBuyerChange = (eOrVal) => {
    const buyerId = (typeof eOrVal === 'object' && eOrVal?.target) ? eOrVal.target.value : eOrVal;
    const bObj = buyers.find(b => b.id === buyerId);
    setIsDirty(true);
    setFormErrors(prev => ({ ...prev, buyer: undefined, general: undefined }));
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
    setFormErrors(prev => ({ ...prev, [name]: undefined, general: undefined }));
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualItem = () => {
    setIsDirty(true);
    setFormErrors(prev => ({ ...prev, items_general: undefined, general: undefined }));
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

    setFormErrors(prev => ({ ...prev, items_general: undefined, general: undefined }));
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }));
    setSelectedMasterIds([]);
  };

  const handleItemChange = (index, field, value) => {
    if (formErrors.items?.[index]?.[field] || formErrors.items_general || formErrors.general) {
      setFormErrors(prev => {
        const nextItems = prev.items ? [...prev.items] : [];
        if (nextItems[index]) {
          nextItems[index] = { ...nextItems[index], [field]: undefined };
        }
        return { ...prev, items: nextItems, items_general: undefined, general: undefined };
      });
    }
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
    setFormErrors(prev => {
      if (!prev.items) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      };
    });
  };

  const validateDecimal = (val, fieldName, label, maxWhole, maxDecimals, maxTotal, minVal = 0, maxVal = null) => {
    if (val === '' || val === null || val === undefined) return null;
    const strVal = String(val).trim();
    if (!strVal) return null;
    const num = Number(strVal);
    if (isNaN(num)) {
      return `${label} must be a valid number.`;
    }
    if (minVal !== null && num < minVal) {
      return minVal === 0 ? `${label} cannot be negative.` : `${label} must be at least ${minVal}.`;
    }
    if (maxVal !== null && num > maxVal) {
      return `${label} cannot exceed ${maxVal}.`;
    }
    const parts = strVal.split('.');
    const whole = parts[0].replace('-', '');
    const decimals = parts[1] || '';
    if (whole.length > maxWhole) {
      return `${label} cannot exceed ${maxWhole} digits before decimal.`;
    }
    if (decimals.length > maxDecimals) {
      return `${label} cannot have more than ${maxDecimals} decimal places.`;
    }
    if (whole.length + decimals.length > maxTotal) {
      return `${label} cannot exceed ${maxTotal} digits in total.`;
    }
    return null;
  };

  const validateForm = () => {
    const errors = {};
    const itemErrors = [];

    // Buyer
    if (!formData.buyer) {
      errors.buyer = 'Please select a Buyer.';
    }

    // PI Ref / PO #
    if (!formData.pi_no || !String(formData.pi_no).trim()) {
      errors.pi_no = 'PI Ref / PO # is required.';
    } else {
      const piTrimmed = String(formData.pi_no).trim();
      if (piTrimmed.length < 2) {
        errors.pi_no = 'PI Ref / PO # must be at least 2 characters long.';
      } else if (piTrimmed.length > 100) {
        errors.pi_no = 'PI Ref / PO # cannot exceed 100 characters.';
      } else if (/([^\d])\1{4,}/.test(piTrimmed)) {
        errors.pi_no = 'PI Ref / PO # contains excessive repeating characters.';
      } else if (!/^[a-zA-Z0-9\s/_\-().#]+$/.test(piTrimmed)) {
        errors.pi_no = 'PI Ref / PO # contains invalid characters.';
      }
    }

    // Dates
    if (!formData.pi_date) {
      errors.pi_date = 'PI Date is required.';
    }
    if (formData.pi_date && formData.ex_factory_date) {
      const pDate = new Date(formData.pi_date);
      const eDate = new Date(formData.ex_factory_date);
      if (eDate < pDate) {
        errors.ex_factory_date = 'Ex-Factory Date cannot be earlier than PI Date.';
      }
    }

    // Optional text fields spam checks
    if (formData.payment_terms) {
      const pt = formData.payment_terms.trim();
      if (pt.length > 200) errors.payment_terms = 'Payment terms cannot exceed 200 characters.';
      else if (/([^\d])\1{5,}/.test(pt)) errors.payment_terms = 'Payment terms contain excessive repeating characters.';
    }
    if (formData.delivered_to_name) {
      const dn = formData.delivered_to_name.trim();
      if (dn.length > 200) errors.delivered_to_name = 'Contact person name cannot exceed 200 characters.';
      else if (/([^\d])\1{5,}/.test(dn)) errors.delivered_to_name = 'Contact person name contains excessive repeating characters.';
    }
    if (formData.delivered_to_company) {
      const dc = formData.delivered_to_company.trim();
      if (dc.length > 200) errors.delivered_to_company = 'Company name cannot exceed 200 characters.';
      else if (/([^\d])\1{5,}/.test(dc)) errors.delivered_to_company = 'Company name contains excessive repeating characters.';
    }
    if (formData.delivered_to_address) {
      const da = formData.delivered_to_address.trim();
      if (da.length > 1000) errors.delivered_to_address = 'Address cannot exceed 1000 characters.';
      else if (/([^\d])\1{6,}/.test(da)) errors.delivered_to_address = 'Address contains excessive repeating characters.';
    }

    // Line items validation
    if (!formData.items || formData.items.length === 0) {
      errors.items_general = 'At least one line item is required in the Performa Invoice.';
    } else {
      let hasRowErrors = false;
      formData.items.forEach((item, idx) => {
        const rowErr = {};

        // Style No
        if (!item.style_no || !String(item.style_no).trim()) {
          rowErr.style_no = 'Style No is required.';
        } else {
          const s = String(item.style_no).trim();
          if (s.length < 2) {
            rowErr.style_no = 'Must be at least 2 chars.';
          } else if (s.length > 100) {
            rowErr.style_no = 'Max 100 chars.';
          } else if (/([^\d])\1{4,}/.test(s)) {
            rowErr.style_no = 'Contains repeating chars.';
          }
        }

        // Units
        if (item.units === '' || item.units === null || item.units === undefined) {
          rowErr.units = 'Units required.';
        } else {
          const units = Number(item.units);
          if (isNaN(units) || !Number.isInteger(units)) {
            rowErr.units = 'Whole number required.';
          } else if (units < 1) {
            rowErr.units = 'Min 1.';
          } else if (units > 999999) {
            rowErr.units = 'Max 999,999.';
          }
        }

        // Price USD
        const priceErr = validateDecimal(item.price_usd, 'price_usd', 'Price (USD)', 10, 2, 12, 0, 999999.99);
        if (priceErr) rowErr.price_usd = priceErr;

        // CBM
        const cbmErr = validateDecimal(item.cbm, 'cbm', 'CBM', 6, 4, 10, 0.0001, 100);
        if (cbmErr) rowErr.cbm = cbmErr;

        // Dimensions (L, B, H)
        ['size_length', 'size_breadth', 'size_height'].forEach(dim => {
          const label = dim === 'size_length' ? 'Length' : dim === 'size_breadth' ? 'Breadth' : 'Height';
          const dimErr = validateDecimal(item[dim], dim, label, 8, 2, 10, 0.01, 9999.99);
          if (dimErr) rowErr[dim] = dimErr;
        });

        // Other item string length checks
        if (item.product_name && String(item.product_name).length > 200) {
          rowErr.product_name = 'Max 200 chars.';
        }
        if (item.material && String(item.material).length > 255) {
          rowErr.material = 'Max 255 chars.';
        }
        if (item.finish_color && String(item.finish_color).length > 255) {
          rowErr.finish_color = 'Max 255 chars.';
        }
        if (item.barcode && String(item.barcode).length > 100) {
          rowErr.barcode = 'Max 100 chars.';
        }
        if (item.buyer_no && String(item.buyer_no).length > 100) {
          rowErr.buyer_no = 'Max 100 chars.';
        }
        if (item.remarks && String(item.remarks).length > 1000) {
          rowErr.remarks = 'Max 1000 chars.';
        }

        if (Object.keys(rowErr).length > 0) {
          hasRowErrors = true;
        }
        itemErrors.push(rowErr);
      });

      if (hasRowErrors) {
        errors.items = itemErrors;
        errors.items_general = 'Some line items have validation errors. Please review the highlighted cells.';
      }
    }

    if (Object.keys(errors).length > 0) {
      errors.general = errors.items_general || 'Please correct the highlighted errors before submitting.';
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
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

    try {
      if (editingId) {
        await api.put(`/buyer-pis/${editingId}/`, payload);
      } else {
        await api.post('/buyer-pis/', payload);
      }
      if (currentDraftId) clearDraft(currentDraftId);
      setIsDirty(false);
      setFormErrors({});
      setToastNotification({
        type: 'success',
        text: editingId
          ? `Performa Invoice "${formData.pi_no}" updated successfully!`
          : `Performa Invoice "${formData.pi_no}" created successfully!`
      });
      setTimeout(() => setToastNotification(null), 4000);
      navigate('/performa-invoices');
      fetchPIs();
    } catch (err) {
      console.error('Failed to save Performa Invoice', err.response?.data || err);
      const data = err.response?.data;
      const newErrors = {};

      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          if (key === 'items') {
            if (Array.isArray(data.items)) {
              if (data.items.length > 0 && typeof data.items[0] === 'string') {
                newErrors.items_general = data.items.join(' ');
              } else {
                newErrors.items = data.items.map(rowErr => {
                  if (!rowErr || typeof rowErr !== 'object') return {};
                  const mapped = {};
                  Object.keys(rowErr).forEach(rf => {
                    mapped[rf] = Array.isArray(rowErr[rf]) ? rowErr[rf].join(' ') : String(rowErr[rf]);
                  });
                  return mapped;
                });
                const hasAnyRowError = newErrors.items.some(r => Object.keys(r).length > 0);
                if (hasAnyRowError) {
                  newErrors.items_general = 'Some line items have invalid data. Please review the highlighted row errors.';
                }
              }
            } else if (typeof data.items === 'string') {
              newErrors.items_general = data.items;
            }
          } else if (key === 'non_field_errors' || key === 'detail') {
            const msg = Array.isArray(data[key]) ? data[key].join(' ') : String(data[key]);
            newErrors.general = msg;
          } else {
            newErrors[key] = Array.isArray(data[key]) ? data[key].join(' ') : String(data[key]);
          }
        });
        if (!newErrors.general) {
          newErrors.general = newErrors.items_general || 'Failed to save Performa Invoice. Please review the highlighted fields.';
        }
      } else {
        newErrors.general = err.message || 'Failed to save Performa Invoice. Please try again.';
      }
      setFormErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
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
      if (p.isDraft) {
        if (filterAllocationStatus !== 'UNALLOCATED') return false;
        return true;
      }
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

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const totalPiCount = pis.length;
  const totalPiValueUsd = pis.reduce((acc, p) => {
    const pItems = p.items || [];
    return acc + pItems.reduce((sum, it) => sum + (parseFloat(it.total_amount) || 0), 0);
  }, 0);
  const totalOrderedUnitsAll = pis.reduce((acc, p) => {
    const pItems = p.items || [];
    return acc + (p.total_units !== undefined ? p.total_units : pItems.reduce((sum, it) => sum + (parseInt(it.units) || 0), 0));
  }, 0);
  const totalRemainingUnitsAll = pis.reduce((acc, p) => {
    const pItems = p.items || [];
    const pUnits = p.total_units !== undefined ? p.total_units : pItems.reduce((sum, it) => sum + (parseInt(it.units) || 0), 0);
    const pAlloc = p.allocated_units !== undefined ? p.allocated_units : 0;
    return acc + (p.remaining_units !== undefined ? p.remaining_units : Math.max(0, pUnits - pAlloc));
  }, 0);

  return (
    <div>
      {id ? (
        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
          <style>{`
            @media (max-width: 768px) {
              .pi-action-btns {
                flex-direction: column-reverse !important;
                width: 100% !important;
              }
              .pi-action-btns button {
                width: 100% !important;
                justify-content: center !important;
                padding: 0.8rem 1rem !important;
              }
            }
          `}</style>
          {/* Header with Back Button and Title (Daily Issue style) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (confirmExit('/performa-invoices')) navigate('/performa-invoices');
                }}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Back to Performa Invoices"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Performa Invoices
                  </span>
                </div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingId ? `Edit Performa Invoice (${formData.pi_no})` : 'Create New Performa Invoice (PI)'}
                </h1>
              </div>
            </div>

            {editingId && (
              <div className="pi-header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/pos/new?pi=${editingId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #14b8a6',
                    backgroundColor: '#ffffff',
                    color: '#0d9488',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <ShoppingBag size={16} /> <span>Create PO from PI</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadExcel(editingId, formData.pi_no)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={16} /> <span>Download PI Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Container (Full Width across desktop) */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '1.75rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <form id="pi-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{formErrors.general}</span>
                </div>
              )}

              {/* Buyer & Exporter Info (2 Compact 4-Column Rows across desktop) */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                backgroundColor: '#fafaf9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Building2 size={18} color="#8b5cf6" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Buyer & Exporter Details
                  </h3>
                </div>

                {/* Row 1: Core Transaction Attributes (4 Columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.buyer ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Buyer *
                    </label>
                    <div style={{
                      borderRadius: '8px',
                      border: formErrors.buyer ? '1.5px solid #dc2626' : 'none'
                    }}>
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
                    {formErrors.buyer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.buyer}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.pi_no ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      PI Ref / PO # *
                    </label>
                    <input
                      type="text"
                      name="pi_no"
                      className="form-input"
                      value={formData.pi_no}
                      onChange={handleFormChange}
                      placeholder="e.g. P0009695"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: formErrors.pi_no ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: formErrors.pi_no ? '#fff5f5' : '#ffffff',
                        fontWeight: 700,
                        boxSizing: 'border-box'
                      }}
                    />
                    {formErrors.pi_no && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.pi_no}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <CustomDatePicker
                      label="PI Date *"
                      value={formData.pi_date}
                      onChange={val => handleFormChange({ target: { name: 'pi_date', value: val } })}
                    />
                    {formErrors.pi_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.pi_date}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <CustomDatePicker
                      label="Ex-Factory Date"
                      value={formData.ex_factory_date}
                      onChange={val => handleFormChange({ target: { name: 'ex_factory_date', value: val } })}
                    />
                    {formErrors.ex_factory_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.ex_factory_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Delivery & Terms Attributes (4 Columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.payment_terms ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      name="payment_terms"
                      className="form-input"
                      value={formData.payment_terms}
                      onChange={handleFormChange}
                      placeholder="e.g. 100% TT 30 Days from BL"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: formErrors.payment_terms ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: formErrors.payment_terms ? '#fff5f5' : '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                    {formErrors.payment_terms && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.payment_terms}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.delivered_to_name ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Delivered To: Contact Person
                    </label>
                    <input
                      type="text"
                      name="delivered_to_name"
                      className="form-input"
                      value={formData.delivered_to_name}
                      onChange={handleFormChange}
                      placeholder="Contact person name"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: formErrors.delivered_to_name ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: formErrors.delivered_to_name ? '#fff5f5' : '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                    {formErrors.delivered_to_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.delivered_to_name}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.delivered_to_company ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Delivered To: Company Name
                    </label>
                    <input
                      type="text"
                      name="delivered_to_company"
                      className="form-input"
                      value={formData.delivered_to_company}
                      onChange={handleFormChange}
                      placeholder="Company or destination entity"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: formErrors.delivered_to_company ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: formErrors.delivered_to_company ? '#fff5f5' : '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                    {formErrors.delivered_to_company && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.delivered_to_company}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.delivered_to_address ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Delivered To: Full Address
                    </label>
                    <input
                      type="text"
                      name="delivered_to_address"
                      className="form-input"
                      value={formData.delivered_to_address}
                      onChange={handleFormChange}
                      placeholder="Full delivery warehouse / port address..."
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: formErrors.delivered_to_address ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: formErrors.delivered_to_address ? '#fff5f5' : '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                    {formErrors.delivered_to_address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> <span>{formErrors.delivered_to_address}</span>
                      </div>
                    )}
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
                      {formData.items.map((item, idx) => {
                        const rowErr = formErrors.items?.[idx] || {};
                        const hasRowErr = Object.keys(rowErr).length > 0;
                        return (
                          <tr key={idx} style={{ backgroundColor: hasRowErr ? '#fff8f8' : undefined }}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.barcode ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.barcode ? '#fff5f5' : undefined
                                }}
                                value={item.barcode}
                                onChange={e => handleItemChange(idx, 'barcode', e.target.value)}
                                placeholder="Barcode"
                              />
                              {rowErr.barcode && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.barcode}</div>}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.buyer_no ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.buyer_no ? '#fff5f5' : undefined
                                }}
                                value={item.buyer_no}
                                onChange={e => handleItemChange(idx, 'buyer_no', e.target.value)}
                                placeholder="Buyer #"
                              />
                              {rowErr.buyer_no && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.buyer_no}</div>}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.style_no ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.style_no ? '#fff5f5' : undefined
                                }}
                                value={item.style_no}
                                onChange={e => handleItemChange(idx, 'style_no', e.target.value)}
                                placeholder="Style No"
                              />
                              {rowErr.style_no && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.style_no}</div>}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.product_name ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.product_name ? '#fff5f5' : undefined
                                }}
                                value={item.product_name}
                                onChange={e => handleItemChange(idx, 'product_name', e.target.value)}
                                placeholder="Product Name"
                              />
                              {rowErr.product_name && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.product_name}</div>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-input"
                                  style={{
                                    width: '64px',
                                    padding: '0.35rem 0.25rem',
                                    textAlign: 'center',
                                    fontSize: '0.85rem',
                                    borderColor: rowErr.size_length ? '#dc2626' : undefined,
                                    backgroundColor: rowErr.size_length ? '#fff5f5' : undefined
                                  }}
                                  placeholder="L"
                                  value={item.size_length}
                                  onChange={e => handleItemChange(idx, 'size_length', e.target.value)}
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-input"
                                  style={{
                                    width: '64px',
                                    padding: '0.35rem 0.25rem',
                                    textAlign: 'center',
                                    fontSize: '0.85rem',
                                    borderColor: rowErr.size_breadth ? '#dc2626' : undefined,
                                    backgroundColor: rowErr.size_breadth ? '#fff5f5' : undefined
                                  }}
                                  placeholder="B"
                                  value={item.size_breadth}
                                  onChange={e => handleItemChange(idx, 'size_breadth', e.target.value)}
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-input"
                                  style={{
                                    width: '64px',
                                    padding: '0.35rem 0.25rem',
                                    textAlign: 'center',
                                    fontSize: '0.85rem',
                                    borderColor: rowErr.size_height ? '#dc2626' : undefined,
                                    backgroundColor: rowErr.size_height ? '#fff5f5' : undefined
                                  }}
                                  placeholder="H"
                                  value={item.size_height}
                                  onChange={e => handleItemChange(idx, 'size_height', e.target.value)}
                                />
                              </div>
                              {(rowErr.size_length || rowErr.size_breadth || rowErr.size_height) && (
                                <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>
                                  {rowErr.size_length || rowErr.size_breadth || rowErr.size_height}
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.material ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.material ? '#fff5f5' : undefined
                                }}
                                value={item.material}
                                onChange={e => handleItemChange(idx, 'material', e.target.value)}
                                placeholder="Mango Wood"
                              />
                              {rowErr.material && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.material}</div>}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.finish_color ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.finish_color ? '#fff5f5' : undefined
                                }}
                                value={item.finish_color}
                                onChange={e => handleItemChange(idx, 'finish_color', e.target.value)}
                                placeholder="Natural"
                              />
                              {rowErr.finish_color && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.finish_color}</div>}
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
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.cbm ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.cbm ? '#fff5f5' : undefined
                                }}
                                value={item.cbm}
                                onChange={e => handleItemChange(idx, 'cbm', e.target.value)}
                                placeholder="0.1500"
                              />
                              {rowErr.cbm && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.cbm}</div>}
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
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.price_usd ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.price_usd ? '#fff5f5' : undefined
                                }}
                                value={item.price_usd}
                                onChange={e => handleItemChange(idx, 'price_usd', e.target.value)}
                                placeholder="120.00"
                              />
                              {rowErr.price_usd && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.price_usd}</div>}
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.4rem',
                                  textAlign: 'center',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.units ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.units ? '#fff5f5' : undefined
                                }}
                                value={item.units}
                                onChange={e => handleItemChange(idx, 'units', e.target.value)}
                                placeholder="1"
                              />
                              {rowErr.units && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.units}</div>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <strong>{item.total_cbm || '0.0000'}</strong>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>${item.total_amount || '0.00'}</strong>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  width: '100%',
                                  fontSize: '0.85rem',
                                  borderColor: rowErr.remarks ? '#dc2626' : undefined,
                                  backgroundColor: rowErr.remarks ? '#fff5f5' : undefined
                                }}
                                value={item.remarks}
                                onChange={e => handleItemChange(idx, 'remarks', e.target.value)}
                                placeholder="Remarks"
                              />
                              {rowErr.remarks && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>{rowErr.remarks}</div>}
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
                        );
                      })}
                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan="15" style={{
                            textAlign: 'center',
                            padding: '1.75rem',
                            color: formErrors.items_general ? '#dc2626' : '#94a3b8',
                            backgroundColor: formErrors.items_general ? '#fff5f5' : 'transparent'
                          }}>
                            {formErrors.items_general ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                <AlertCircle size={18} />
                                <span>At least one item is required. Import styles from Buyer Master or click "+ Add Manual Item".</span>
                              </div>
                            ) : (
                              'No items added to PI yet. Import styles from Buyer Master or click "+ Add Manual Item".'
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Metric Cards (Daily Issue Style) */}
                <div style={{
                  marginTop: '1.5rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Quantity
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {totalUnits} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Units</span>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Volume
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {totalCbm.toFixed(4)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>m³</span>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Valuation (USD)
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                        ${totalAmt.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Amount In Words
                      </span>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#9a3412', marginTop: '4px', lineHeight: 1.3 }}>
                        {wordsRepresentation || 'Zero Dollars Only.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div style={{
                marginTop: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1.25rem',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete PI ${formData.pi_no}?`)) {
                          handleDelete(editingId);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: '#fef2f2',
                        color: '#ef4444',
                        border: '1px solid #fca5a5',
                        padding: '0.65rem 1.2rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} /> Delete PI
                    </button>
                  )}
                </div>

                <div className="pi-action-btns" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmExit('/performa-invoices')) {
                        navigate('/performa-invoices');
                      }
                    }}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDraft()}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #8b5a2b',
                      backgroundColor: '#ffffff',
                      color: '#8b5a2b',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer'
                    }}
                  >
                    <FileText size={16} /> Save as Draft
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '0.65rem 1.6rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#8b5cf6',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 2px 4px rgba(139, 92, 246, 0.25)'
                    }}
                  >
                    <span>{submitting ? 'Saving PI...' : (editingId ? 'Save PI Changes' : 'Confirm & Create Performa Invoice')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* ── Page Header Bar (Title & Right Action CTAs) ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#faf5ee',
                border: '1px solid #f0eae1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5a2b',
                flexShrink: 0
              }}>
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}>
                  Performa Invoices (PI)
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Manage customer orders, export invoices, and track supplier purchase order allocations.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/performa-invoices/new')}
                style={{
                  backgroundColor: '#8b5a2b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.35rem',
                  fontSize: '0.88rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 5px rgba(139, 90, 43, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={16} /> Create New PI
              </button>
            </div>
          </div>

          {/* ── Executive KPI Metric Cards Strip ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Performa Invoices
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {totalPiCount}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginLeft: '6px' }}>Orders</span>
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#faf5ee', border: '1px solid #f0eae1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5a2b' }}>
                <FileSpreadsheet size={20} />
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Export Sales Value (USD)
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                  ${totalPiValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <DollarSign size={20} />
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Ordered Units
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {totalOrderedUnitsAll.toLocaleString()}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginLeft: '6px' }}>Pcs</span>
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                <Package size={20} />
              </div>
            </div>

            <div style={{
              backgroundColor: totalRemainingUnitsAll > 0 ? '#fffbeb' : '#f0fdf4',
              border: totalRemainingUnitsAll > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: totalRemainingUnitsAll > 0 ? '#92400e' : '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {totalRemainingUnitsAll > 0 ? 'Unallocated Balance' : 'Allocation Status'}
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalRemainingUnitsAll > 0 ? '#b45309' : '#15803d', marginTop: '2px' }}>
                  {totalRemainingUnitsAll.toLocaleString()}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: totalRemainingUnitsAll > 0 ? '#92400e' : '#166534', marginLeft: '6px' }}>
                    {totalRemainingUnitsAll > 0 ? 'Pcs Pending PO' : 'All Allocated'}
                  </span>
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: totalRemainingUnitsAll > 0 ? '#fef3c7' : '#dcfce7', border: totalRemainingUnitsAll > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalRemainingUnitsAll > 0 ? '#b45309' : '#16a34a' }}>
                <Layers size={20} />
              </div>
            </div>
          </div>

          {/* ── Unified Search & Filters Card ── */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '0.9rem 1.15rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flex: '1 1 260px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0 0.85rem',
              height: '38px',
              boxSizing: 'border-box'
            }}>
              <Search size={16} color="#64748b" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by PI No, Buyer, Contact..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '0.86rem',
                  color: '#1e293b'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '2 1 auto' }}>
              <div style={{ minWidth: '190px', flex: '1 1 190px' }}>
                <SearchableSelect
                  options={buyers}
                  value={filterBuyerId}
                  onChange={val => setFilterBuyerId(val)}
                  placeholder="All Buyers"
                  searchPlaceholder="Filter buyer..."
                  codeKey="code"
                  titleKey="name"
                  icon={Users}
                />
              </div>

              <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
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
                />
              </div>

              <div style={{ minWidth: '170px', flex: '1 1 170px' }}>
                <OrderBySelect
                  options={orderOptions}
                  value={ordering}
                  onChange={setOrdering}
                />
              </div>

              {(searchTerm || filterBuyerId || (filterAllocationStatus && filterAllocationStatus !== 'ALL')) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterBuyerId('');
                    setFilterAllocationStatus('ALL');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.8rem',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={13} /> Clear
                </button>
              )}
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
              <FileSpreadsheet size={18} />{ordering === 'draft' ? `Draft Invoices Directory (${filteredPIs.length})` : `Performa Invoices Directory (${filteredPIs.length})`}
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
            ordering === 'draft' ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                <FileEdit size={38} color="#d97706" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b', fontSize: '1.05rem', fontWeight: 700 }}>Drafts cannot be allocated to POs</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>Save your draft Performa Invoice before allocating items to Purchase Orders or Suppliers.</p>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredPIs.map(p => {
                const pItems = p.items || [];
                const pUnits = p.total_units !== undefined ? p.total_units : pItems.reduce((acc, it) => acc + (parseInt(it.units) || 0), 0);
                const pAlloc = p.allocated_units !== undefined ? p.allocated_units : 0;
                const pRem = p.remaining_units !== undefined ? p.remaining_units : Math.max(0, pUnits - pAlloc);
                const supAllocations = p.supplier_allocations || [];
                const isExpanded = expandedPiIds.has(p.id);
                const innerTab = expandedInnerTab[p.id] || 'items';
                const allocPercent = pUnits > 0 ? Math.min(100, Math.round((pAlloc / pUnits) * 100)) : 0;

                const toggleExpand = () => {
                  setExpandedPiIds(prev => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  });
                };

                return (
                  <div
                    key={p.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: isExpanded ? '1.5px solid #8b5a2b' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      boxShadow: isExpanded ? '0 3px 10px rgba(139, 90, 43, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* ── Compact Main Row: Header + Metrics + Action CTAs ── */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      {/* Left Column: PI Ref # & Buyer Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '240px', flex: '1 1 auto' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: '#faf5ee',
                          border: '1px solid #f0eae1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#8b5a2b',
                          flexShrink: 0
                        }}>
                          <FileText size={17} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <strong
                              style={{
                                fontSize: '0.92rem',
                                color: '#0f172a',
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }}
                              title={p.pi_no}
                            >
                              {p.pi_no}
                            </strong>
                            {p.buyer_detail?.name && (
                              <span
                                style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  color: '#475569',
                                  backgroundColor: '#f1f5f9',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block'
                                }}
                                title={p.buyer_detail.name}
                              >
                                {p.buyer_detail.name}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            whiteSpace: 'nowrap'
                          }}>
                            <span>PI: <strong style={{ color: '#334155' }}>{formatDisplayDate(p.pi_date)}</strong></span>
                            <span>•</span>
                            <span>Ex-Factory: <strong style={{ color: '#334155' }}>{formatDisplayDate(p.ex_factory_date)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Column: Compact Allocation Metric Chips */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexWrap: 'wrap'
                      }}>
                        {/* Chip 1: Total Ordered */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '7px',
                          padding: '0.28rem 0.6rem',
                          fontSize: '0.78rem'
                        }}>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Total:</span>
                          <strong style={{ color: '#0f172a', fontWeight: 800 }}>{pUnits} pcs</strong>
                        </div>

                        {/* Chip 2: Assigned */}
                        <div
                          onClick={toggleExpand}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            backgroundColor: '#fffbe6',
                            border: '1px solid #fde68a',
                            borderRadius: '7px',
                            padding: '0.28rem 0.6rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                          title="Click to view assigned supplier breakdown"
                        >
                          <span style={{ color: '#b45309', fontWeight: 600 }}>Assigned:</span>
                          <strong style={{ color: '#d97706', fontWeight: 800 }}>{pAlloc} pcs</strong>
                          {allocPercent > 0 && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309' }}>({allocPercent}%)</span>
                          )}
                        </div>

                        {/* Chip 3: Unassigned Status Pill */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: pRem <= 0 ? '#f0fdf4' : '#f0f9ff',
                          border: pRem <= 0 ? '1px solid #bbf7d0' : '1px solid #bae6fd',
                          borderRadius: '7px',
                          padding: '0.28rem 0.65rem',
                          fontSize: '0.78rem'
                        }}>
                          <span style={{ color: pRem <= 0 ? '#166534' : '#0369a1', fontWeight: 600 }}>
                            {pRem <= 0 ? 'Status:' : 'Unassigned:'}
                          </span>
                          <strong style={{ color: pRem <= 0 ? '#15803d' : '#0284c7', fontWeight: 800 }}>
                            {pRem <= 0 ? '🔒 Fully Allocated' : `✨ ${pRem} pcs`}
                          </strong>
                        </div>
                      </div>

                      {/* Right Column: Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={toggleExpand}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.32rem 0.7rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '7px',
                            border: isExpanded ? '1px solid #8b5a2b' : '1px solid #cbd5e1',
                            backgroundColor: isExpanded ? '#faf5ee' : '#ffffff',
                            color: isExpanded ? '#8b5a2b' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isExpanded ? 'Collapse ▲' : 'Breakdown ▼'}
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/pos/new?pi=${p.id}`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.32rem 0.8rem',
                            fontSize: '0.78rem',
                            fontWeight: 750,
                            borderRadius: '7px',
                            border: 'none',
                            backgroundColor: '#8b5a2b',
                            color: '#ffffff',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(139, 90, 43, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Create PO from this PI"
                        >
                          <ShoppingBag size={13} /> +PO
                        </button>
                      </div>
                    </div>

                    {/* ── Inline Expandable Breakdown Panel (Compact Table & Suppliers) ── */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #f1f5f9',
                        backgroundColor: '#f8fafc',
                        borderRadius: '9px',
                        padding: '0.75rem'
                      }}>
                        {/* Inner Pill Sub-Tabs */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedInnerTab(prev => ({ ...prev, [p.id]: 'items' }))}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: innerTab === 'items' ? '#ffffff' : '#64748b',
                              backgroundColor: innerTab === 'items' ? '#8b5a2b' : '#ffffff',
                              borderRadius: '6px',
                              border: innerTab === 'items' ? '1px solid #8b5a2b' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Layers size={13} /> Per-Item Balance ({pItems.length})
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedInnerTab(prev => ({ ...prev, [p.id]: 'suppliers' }))}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: innerTab === 'suppliers' ? '#ffffff' : '#64748b',
                              backgroundColor: innerTab === 'suppliers' ? '#8b5a2b' : '#ffffff',
                              borderRadius: '6px',
                              border: innerTab === 'suppliers' ? '1px solid #8b5a2b' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Building2 size={13} /> Supplier PO Assignments ({supAllocations.length})
                          </button>
                        </div>

                        {innerTab === 'items' ? (
                          <div style={{
                            overflowX: 'auto',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}>
                            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Style No / Product Name</th>
                                  <th style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Ordered</th>
                                  <th style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Assigned</th>
                                  <th style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Remaining</th>
                                  <th style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pItems.map((it, i) => {
                                  const reqQty = parseFloat(it.units) || 0;
                                  const allocQty = it.allocated_quantity !== undefined ? it.allocated_quantity : 0;
                                  const remQty = it.remaining_quantity !== undefined ? it.remaining_quantity : Math.max(0, reqQty - allocQty);

                                  return (
                                    <tr key={i} style={{ borderBottom: i === pItems.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <span>{it.style_no}</span>
                                          {it.product_name && (
                                            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>• {it.product_name}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{reqQty} pcs</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>{allocQty} pcs</td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: remQty <= 0 ? '#dc2626' : '#16a34a' }}>
                                        {remQty} pcs
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        {remQty <= 0 ? (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: '4px' }}>
                                            Fully Assigned
                                          </span>
                                        ) : allocQty > 0 ? (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '1px 6px', borderRadius: '4px' }}>
                                            Partial
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px' }}>
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
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                              No Supplier POs assigned yet. All {pUnits} pieces are unassigned.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {supAllocations.map((sal, sIdx) => (
                                <div key={sIdx} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                                    <div>
                                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1e293b' }}>🏢 {sal.supplier_name}</span>
                                      <span style={{ marginLeft: '0.5rem', fontSize: '0.74rem', fontWeight: 700, color: '#8b5a2b', backgroundColor: '#fffcf7', border: '1px solid #f3e8d5', padding: '1px 6px', borderRadius: '5px' }}>
                                        PO #{sal.po_number}
                                      </span>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#d97706' }}>
                                        {sal.total_assigned_qty} pcs Assigned
                                      </span>
                                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Date: {sal.po_date}</span>
                                    </div>
                                  </div>

                                  <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                        <th style={{ padding: '3px 6px' }}>Item / Style Description</th>
                                        <th style={{ padding: '3px 6px', textAlign: 'right' }}>Assigned Qty</th>
                                        <th style={{ padding: '3px 6px', textAlign: 'right' }}>Unit Rate (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sal.items.map((it, i) => (
                                        <tr key={i} style={{ borderBottom: i === sal.items.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                                          <td style={{ padding: '4px 6px', fontWeight: 600, color: '#334155' }}>{it.description}</td>
                                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{it.quantity} {it.unit}</td>
                                          <td style={{ padding: '4px 6px', textAlign: 'right', color: '#64748b' }}>₹{it.rate?.toFixed(2)}</td>
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
            )
          ) : (
            <>
              <div className="desktop-only" style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                marginBottom: '1.5rem'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ width: '40px', textAlign: 'center', padding: '12px 10px' }}>
                          <input
                            type="checkbox"
                            checked={filteredPIs.length > 0 && selectedRowIds.size === filteredPIs.length}
                            onChange={toggleSelectAll}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                          />
                        </th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>PI / PO Ref #</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Status</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>PI Date</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Buyer</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delivered To</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Ex-Factory Date</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Items</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Total Units</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Total Amount</th>
                        <th style={{ padding: '12px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>PO Allocation</th>
                        <th style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', whiteSpace: 'nowrap', width: '150px' }}>Actions</th>
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
                            onClick={() => {
                              if (p.isDraft) {
                                navigate('/performa-invoices/new', {
                                  state: { draftId: p.rawDraft.id, draftData: p.rawDraft.data }
                                });
                              } else {
                                navigate(`/performa-invoices/${p.id}`);
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: selectedRowIds.has(p.id) ? '#dcfce7' : undefined,
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background-color 0.15s ease',
                            }}
                            className={`table-fade-slide-up ${isRecentlyVisited ? 'row-recently-visited' : ''}`}
                            title={p.isDraft ? "Click to resume draft" : "Click to view/edit detail"}
                          >
                            <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '10px 10px' }}>
                              <input
                                type="checkbox"
                                checked={selectedRowIds.has(p.id)}
                                onChange={e => toggleSelectRow(p.id, e)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                              />
                            </td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                {p.isDraft ? (
                                  <FileEdit size={16} color="#d97706" style={{ flexShrink: 0 }} />
                                ) : (
                                  <FileText size={16} color="#8b5a2b" style={{ flexShrink: 0 }} />
                                )}
                                <strong style={{ color: p.isDraft ? '#b45309' : '#0f172a', fontSize: '0.88rem' }}>{p.pi_no}</strong>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {p.isDraft ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.73rem',
                                  fontWeight: 700,
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fde68a'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                                  Draft
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.73rem',
                                  fontWeight: 700,
                                  backgroundColor: '#ecfdf5',
                                  color: '#065f46',
                                  border: '1px solid #a7f3d0'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                  Saved
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
                              {formatDisplayDate(p.pi_date)}
                            </td>
                            <td style={{ padding: '10px 12px', maxWidth: '180px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.buyer_detail?.name || '—'}
                              </div>
                              {p.buyer_detail?.code && (
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.buyer_detail.code}</div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', maxWidth: '170px' }} title={p.delivered_to_company ? `${p.delivered_to_company} (${p.delivered_to_name || ''})` : (p.delivered_to_name || '—')}>
                              <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.delivered_to_company || p.delivered_to_name || '—'}
                              </div>
                              {p.delivered_to_company && p.delivered_to_name && (
                                <div style={{ fontSize: '0.74rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.delivered_to_name}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '0.84rem', color: '#475569' }}>
                              {formatDisplayDate(p.ex_factory_date)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                {pItems.length} {pItems.length === 1 ? 'item' : 'items'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                              {pUnits}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <strong style={{ color: '#16a34a', fontSize: '0.92rem' }}>
                                ${pAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td onClick={e => { if (!p.isDraft) { e.stopPropagation(); setBreakdownModalPi(p); } }} style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {p.isDraft ? (
                                <span style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: '#94a3b8',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  Draft (Unsaved)
                                </span>
                              ) : pRem <= 0 && pUnits > 0 ? (
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title="Click to view supplier breakdown">
                                  🔒 Fully Allocated ({pUnits} pcs)
                                </span>
                              ) : pAlloc > 0 ? (
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title="Click to view supplier breakdown">
                                  ⚠️ Partial ({pRem} pcs left)
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284c7', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title="Click to view supplier breakdown">
                                  🔍 Unassigned ({pRem} pcs)
                                </span>
                              )}
                            </td>
                            <td onClick={e => e.stopPropagation()} style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {p.isDraft ? (
                                <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate('/performa-invoices/new', {
                                        state: { draftId: p.rawDraft.id, draftData: p.rawDraft.data }
                                      });
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '0.3rem 0.65rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      backgroundColor: '#fef3c7',
                                      border: '1px solid #fde68a',
                                      color: '#92400e',
                                      borderRadius: '6px',
                                      cursor: 'pointer'
                                    }}
                                    title="Resume Draft"
                                  >
                                    <FileEdit size={13} /> Resume
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Discard draft for "${p.pi_no || 'Performa Invoice'}"?`)) {
                                        deleteDraft(p.id);
                                      }
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fef2f2',
                                      color: '#dc2626',
                                      cursor: 'pointer'
                                    }}
                                    title="Discard Draft"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/pos/new?pi=${p.id}`); }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      backgroundColor: '#f0fdfa',
                                      border: '1px solid #99f6e4',
                                      color: '#0d9488',
                                      borderRadius: '6px',
                                      cursor: 'pointer'
                                    }}
                                    title="Create PO from this PI"
                                  >
                                    <ShoppingBag size={13} /> +PO
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadExcel(p.id, p.pi_no); }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      border: '1px solid #bbf7d0',
                                      backgroundColor: '#f0fdf4',
                                      color: '#16a34a',
                                      cursor: 'pointer'
                                    }}
                                    title="Download PI Excel"
                                  >
                                    <Download size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/performa-invoices/${p.id}`); }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      backgroundColor: '#ffffff',
                                      color: '#475569',
                                      cursor: 'pointer'
                                    }}
                                    title="Edit Performa Invoice"
                                  >
                                    <Pencil size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.pi_no); }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fef2f2',
                                      color: '#dc2626',
                                      cursor: 'pointer'
                                    }}
                                    title="Delete Performa Invoice"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredPIs.length === 0 && (
                        <tr>
                          <td colSpan="12" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                            {loading
                              ? 'Loading Performa Invoices...'
                              : ordering === 'draft'
                                ? 'No draft performa invoices found. When you save a PI as draft, it will appear here.'
                                : 'No Performa Invoices found matching your criteria.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                  onClick={() => {
                    if (p.isDraft) {
                      navigate('/performa-invoices/new', {
                        state: { draftId: p.rawDraft.id, draftData: p.rawDraft.data }
                      });
                    } else {
                      navigate(`/performa-invoices/${p.id}`);
                    }
                  }}
                  style={{ backgroundColor: selectedRowIds.has(p.id) ? '#f0fdf4' : undefined }}
                >
                  <div className="mobile-card-img" style={{
                    backgroundColor: p.isDraft ? '#fef3c7' : '#f5efe6',
                    color: p.isDraft ? '#d97706' : '#8b5a2b',
                    borderRadius: '12px',
                    width: '56px',
                    height: '56px'
                  }}>
                    {p.isDraft ? <FileEdit size={24} /> : <FileText size={24} />}
                  </div>
                  
                  <div className="mobile-card-content" style={{ paddingLeft: '0.5rem' }}>
                    <div className="mobile-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{p.pi_no}</span>
                      {p.isDraft && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a'
                        }}>
                          Draft
                        </span>
                      )}
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
                {loading
                  ? 'Loading Performa Invoices...'
                  : ordering === 'draft'
                    ? 'No draft performa invoices found. When you save a PI as draft, it will appear here.'
                    : 'No Performa Invoices found.'}
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

export default BuyerPIs;
