import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Warehouse, ArrowDownRight, ArrowUpRight, Plus, Search, Filter, RefreshCw,
  TrendingUp, TrendingDown, Users, FileText, Printer, CheckCircle, AlertTriangle,
  IndianRupee, Download, Eye, Layers, Shield, Tag, History, Edit, Trash2, ChevronRight, Package, Undo2,
  ShieldAlert, Check, XCircle, RotateCcw, Sparkles, ClipboardCheck, BarChart3
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton, StatCardsSkeleton } from '../components/TableSkeleton';

import StoreRateComparisonModal from '../components/StoreRateComparisonModal';
import ContractorBillingStatementModal from '../components/ContractorBillingStatementModal';
import StoreItemDetailModal from '../components/StoreItemDetailModal';
import StoreCategoryModal from '../components/StoreCategoryModal';
import StoreItemMasterModal from '../components/StoreItemMasterModal';
import StoreMaterialReturnModal from '../components/StoreMaterialReturnModal';
import StoreRequisitionModal from '../components/StoreRequisitionModal';
import StoreStockAdjustmentModal from '../components/StoreStockAdjustmentModal';
import StoreReorderIndentModal from '../components/StoreReorderIndentModal';
import StorePhysicalAuditModal from '../components/StorePhysicalAuditModal';
import StoreAnalyticsSection from '../components/StoreAnalyticsSection';
import StoreExcelImportModal from '../components/StoreExcelImportModal';


export default function StoreManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stock-summary'); // 'stock-summary' | 'item-master' | 'material-in' | 'daily-issue' | 'material-returns' | 'requisitions' | 'adjustments' | 'contractors' | 'billing'

  // Pagination states (20 entries per page)
  const ITEMS_PER_PAGE = 20;
  const [pageStockSummary, setPageStockSummary] = useState(1);
  const [pageItemMaster, setPageItemMaster] = useState(1);
  const [pageMaterialIn, setPageMaterialIn] = useState(1);
  const [pageDailyIssue, setPageDailyIssue] = useState(1);
  const [pageContractors, setPageContractors] = useState(1);
  const [pageBilling, setPageBilling] = useState(1);
  const [pageRequisitions, setPageRequisitions] = useState(1);
  const [pageAdjustments, setPageAdjustments] = useState(1);
  const [pageMaterialReturns, setPageMaterialReturns] = useState(1);
  const [showMobileFabMenu, setShowMobileFabMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Sliding nav indicator state & refs
  const navTabRefs = React.useRef({});
  const [navIndicatorStyle, setNavIndicatorStyle] = useState({ opacity: 0 });
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);

  // Measure active module tab position
  useLayoutEffect(() => {
    const activeEl = navTabRefs.current[activeTab];
    if (activeEl) {
      setNavIndicatorStyle({
        width: `${activeEl.offsetWidth}px`,
        transform: `translate3d(${activeEl.offsetLeft}px, 0, 0)`,
        height: `${activeEl.offsetHeight}px`,
        opacity: 1
      });
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      const activeNavEl = navTabRefs.current[activeTab];
      if (activeNavEl) {
        setNavIndicatorStyle({
          width: `${activeNavEl.offsetWidth}px`,
          transform: `translate3d(${activeNavEl.offsetLeft}px, 0, 0)`,
          height: `${activeNavEl.offsetHeight}px`,
          opacity: 1
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Data states
  const [stockSummaryData, setStockSummaryData] = useState(null);
  const [itemsList, setItemsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [contractorPersons, setContractorPersons] = useState([]);
  const [productionUnits, setProductionUnits] = useState([]);
  const [materialInList, setMaterialInList] = useState([]);
  const [dailyIssuesList, setDailyIssuesList] = useState([]);
  const [materialReturnsList, setMaterialReturnsList] = useState([]);
  const [requisitionsList, setRequisitionsList] = useState([]);
  const [stockAdjustmentsList, setStockAdjustmentsList] = useState([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedContractorFilter, setSelectedContractorFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('Jul-26');

  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedItemForRate, setSelectedItemForRate] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [isMaterialInModalOpen, setIsMaterialInModalOpen] = useState(false);
  const [isDailyIssueModalOpen, setIsDailyIssueModalOpen] = useState(false);
  const [isMaterialReturnModalOpen, setIsMaterialReturnModalOpen] = useState(false);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [selectedContractorForBill, setSelectedContractorForBill] = useState(null);

  const [isReorderIndentModalOpen, setIsReorderIndentModalOpen] = useState(false);
  const [isPhysicalAuditModalOpen, setIsPhysicalAuditModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Multi-Select Bulk Actions State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Clear selection when activeTab changes
  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [activeTab]);

  const getActiveModuleKey = useCallback(() => {
    switch (activeTab) {
      case 'stock-summary':
      case 'item-master':
        return 'items';
      case 'material-in':
        return 'material_in';
      case 'daily-issue':
        return 'daily_issue';
      case 'material-returns':
        return 'material_return';
      default:
        return 'items';
    }
  }, [activeTab]);

  const handleToggleSelectRow = (id) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (items) => {
    if (!items || items.length === 0) return;
    const allIds = items.map(i => i.id);
    const allSelected = allIds.every(id => selectedRowIds.has(id));
    if (allSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(allIds));
    }
  };

  const handleExportSelectedExcel = async () => {
    if (selectedRowIds.size === 0) return;
    setExportingExcel(true);
    try {
      const moduleKey = getActiveModuleKey();
      const response = await api.post('/store/export-selected/', {
        module: moduleKey,
        selected_ids: Array.from(selectedRowIds)
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Store_${moduleKey}_Selected_${selectedRowIds.size}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export selected items to Excel:', err);
      alert('Failed to export selected items.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedRowIds.size === 0) return;
    setDeletingBulk(true);
    try {
      const moduleKey = getActiveModuleKey();
      const res = await api.post('/store/bulk-delete/', {
        module: moduleKey,
        selected_ids: Array.from(selectedRowIds)
      });
      alert(res.data?.message || 'Bulk deletion completed.');
      setSelectedRowIds(new Set());
      setShowBulkDeleteConfirm(false);
      fetchBaselineData();
    } catch (err) {
      console.error('Bulk deletion failed:', err);
      alert(err.response?.data?.detail || err.response?.data?.error || 'Failed to delete selected items.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const lowStockItems = React.useMemo(() => {
    return (stockSummaryData?.items || []).filter(it => it.is_low_stock || Number(it.balance_qty || 0) <= Number(it.reorder_level || 0));
  }, [stockSummaryData]);

  const [loading, setLoading] = useState(false);

  // Cache state tracking fetched tabs & modal options
  const [loadedTabs, setLoadedTabs] = useState({});
  const [modalOptionsLoaded, setModalOptionsLoaded] = useState({
    suppliers: false,
    contractors: false,
    items: false,
    units: false,
  });

  // Fetch initial baseline data (Only Stock Summary & Categories - 2 requests)
  const fetchBaselineData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/store/stock-summary/'),
        api.get('/store/categories/'),
      ]);

      if (results[0].status === 'fulfilled') setStockSummaryData(results[0].value.data);
      if (results[1].status === 'fulfilled') setCategories(results[1].value.data.results || results[1].value.data || []);
      setLoadedTabs(prev => ({ ...prev, 'stock-summary': true }));
    } catch (err) {
      console.error('Failed to load store management baseline data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lazy-load data for a specific active tab on-demand
  const fetchTabData = useCallback(async (tabKey, force = false) => {
    setLoading(true);
    try {
      if (tabKey === 'item-master') {
        const res = await api.get('/store/items/');
        setItemsList(res.data.results || res.data || []);
      } else if (tabKey === 'material-in') {
        const res = await api.get('/store/material-in/');
        setMaterialInList(res.data.results || res.data || []);
      } else if (tabKey === 'daily-issue') {
        const res = await api.get('/store/daily-issues/');
        setDailyIssuesList(res.data.results || res.data || []);
      } else if (tabKey === 'material-returns') {
        const res = await api.get('/store/material-returns/');
        setMaterialReturnsList(res.data.results || res.data || []);
      } else if (tabKey === 'requisitions') {
        const res = await api.get('/store/requisitions/');
        setRequisitionsList(res.data.results || res.data || []);
      } else if (tabKey === 'adjustments') {
        const res = await api.get('/store/stock-adjustments/');
        setStockAdjustmentsList(res.data.results || res.data || []);
      } else if (tabKey === 'contractors' || tabKey === 'billing') {
        const [cRes, cpRes] = await Promise.all([
          api.get('/users/', { params: { role: 'contractor' } }),
          api.get('/store/contractor-persons/'),
        ]);
        setContractors(cRes.data.results || cRes.data || []);
        setContractorPersons(cpRes.data.results || cpRes.data || []);
      }
      setLoadedTabs(prev => ({ ...prev, [tabKey]: true }));
    } catch (err) {
      console.error(`Failed to fetch data for tab ${tabKey}`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ensure dropdown data for modals is loaded on-demand
  const ensureModalOptions = useCallback(async (optionsList = []) => {
    const toFetch = [];
    if (optionsList.includes('suppliers') && !modalOptionsLoaded.suppliers) {
      toFetch.push(api.get('/suppliers/', { params: { nopage: true } }).then(r => setSuppliers(r.data.results || r.data || [])));
    }
    if (optionsList.includes('contractors') && !modalOptionsLoaded.contractors) {
      toFetch.push(api.get('/users/', { params: { role: 'contractor' } }).then(r => setContractors(r.data.results || r.data || [])));
      toFetch.push(api.get('/store/contractor-persons/').then(r => setContractorPersons(r.data.results || r.data || [])));
    }
    if (optionsList.includes('items') && !modalOptionsLoaded.items && itemsList.length === 0) {
      toFetch.push(api.get('/store/items/').then(r => setItemsList(r.data.results || r.data || [])));
    }
    if (optionsList.includes('units') && !modalOptionsLoaded.units) {
      toFetch.push(api.get('/production-units/').then(r => setProductionUnits(r.data.results || r.data || [])));
    }
    if (toFetch.length > 0) {
      await Promise.allSettled(toFetch);
      setModalOptionsLoaded(prev => {
        const updated = { ...prev };
        optionsList.forEach(opt => { updated[opt] = true; });
        return updated;
      });
    }
  }, [modalOptionsLoaded, itemsList.length]);

  // Admin Void Voucher Handler
  const handleVoidVoucher = async (endpoint, id, voucherNo) => {
    if (user?.role !== 'admin') {
      alert('Only Admin users are authorized to void or delete store vouchers.');
      return;
    }

    const reason = window.prompt(`[ADMIN VOID CONTROL] Enter audit reason for voiding Voucher #${voucherNo}:`, 'Admin Audit Reversal');
    if (reason === null) return;

    try {
      await api.delete(`${endpoint}${id}/`, { data: { reason } });
      alert(`Voucher #${voucherNo} voided successfully. Audit log recorded and store inventory balance recalculated.`);
      fetchBaselineData();
      fetchTabData(activeTab, true);
    } catch (err) {
      console.error('Error voiding voucher:', err);
      alert(err.response?.data?.detail || 'Failed to void voucher.');
    }
  };

  // Requisition Action Handlers
  const handleApproveRequisition = async (id) => {
    try {
      await api.post(`/store/requisitions/${id}/approve/`);
      fetchBaselineData();
      fetchTabData(activeTab, true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve requisition.');
    }
  };

  const handleRejectRequisition = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
      await api.post(`/store/requisitions/${id}/reject/`, { reason });
      fetchBaselineData();
      fetchTabData(activeTab, true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject requisition.');
    }
  };

  // Stock Adjustment Action Handlers
  const handleApproveAdjustment = async (id) => {
    try {
      await api.post(`/store/stock-adjustments/${id}/approve/`);
      alert('Stock variance adjustment approved and store inventory synced!');
      fetchBaselineData();
      fetchTabData(activeTab, true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve adjustment.');
    }
  };

  const handleRejectAdjustment = async (id) => {
    try {
      await api.post(`/store/stock-adjustments/${id}/reject/`);
      fetchBaselineData();
      fetchTabData(activeTab, true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject adjustment.');
    }
  };

  useEffect(() => {
    fetchBaselineData();
  }, [location.key, fetchBaselineData]);

  useEffect(() => {
    if (activeTab !== 'stock-summary') {
      fetchTabData(activeTab);
    }
  }, [activeTab, fetchTabData]);

  // Filtered Stock Summary Items
  const filteredStockItems = (stockSummaryData?.items || []).filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.item_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? item.category_name === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Filtered Daily Issues List
  const filteredDailyIssues = dailyIssuesList.filter(issue => {
    const matchesSearch = issue.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.contractor_person_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.voucher_no?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContractor = selectedContractorFilter ? String(issue.contractor) === String(selectedContractorFilter) : true;
    const matchesStatus = selectedStatus ? issue.status === selectedStatus : true;
    return matchesSearch && matchesContractor && matchesStatus;
  });

  useEffect(() => {
    setPageStockSummary(1);
    setPageDailyIssue(1);
  }, [searchQuery, selectedCategory, selectedContractorFilter, selectedStatus]);

  // Paginated lists (20 per page)
  const paginatedStockItems = filteredStockItems.slice((pageStockSummary - 1) * ITEMS_PER_PAGE, pageStockSummary * ITEMS_PER_PAGE);
  const paginatedItemMaster = itemsList.slice((pageItemMaster - 1) * ITEMS_PER_PAGE, pageItemMaster * ITEMS_PER_PAGE);
  const paginatedMaterialIn = materialInList.slice((pageMaterialIn - 1) * ITEMS_PER_PAGE, pageMaterialIn * ITEMS_PER_PAGE);
  const paginatedDailyIssues = filteredDailyIssues.slice((pageDailyIssue - 1) * ITEMS_PER_PAGE, pageDailyIssue * ITEMS_PER_PAGE);
  const paginatedContractors = contractors.slice((pageContractors - 1) * ITEMS_PER_PAGE, pageContractors * ITEMS_PER_PAGE);
  const paginatedBillingContractors = contractors.slice((pageBilling - 1) * ITEMS_PER_PAGE, pageBilling * ITEMS_PER_PAGE);
  const paginatedMaterialReturns = materialReturnsList.slice((pageMaterialReturns - 1) * ITEMS_PER_PAGE, pageMaterialReturns * ITEMS_PER_PAGE);
  const paginatedRequisitions = requisitionsList.slice((pageRequisitions - 1) * ITEMS_PER_PAGE, pageRequisitions * ITEMS_PER_PAGE);
  const paginatedAdjustments = stockAdjustmentsList.slice((pageAdjustments - 1) * ITEMS_PER_PAGE, pageAdjustments * ITEMS_PER_PAGE);

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
          .desktop-table-view { display: none !important; }
          .store-header-wrap {
            background-color: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 16px !important;
            padding: 1.25rem !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .store-action-btns {
            width: 100% !important;
            flex-direction: column !important;
            gap: 0.65rem !important;
            margin-top: 1rem !important;
          }
          .store-action-btns button {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.8rem 1rem !important;
            font-size: 0.95rem !important;
          }
        }
      `}</style>

      {/* Mobile App Navigation Header & Scrollable Module Chips Bar */}
      <div className="mobile-only">
        <div className="store-mobile-app-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ea580c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)' }}>
                <Warehouse size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Store Management</h2>
                <span style={{ fontSize: '0.72rem', color: '#fdba74', backgroundColor: 'rgba(234, 88, 12, 0.25)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  {user?.role === 'store_manager' ? 'Store Manager' : user?.role ? user.role.toUpperCase() : 'Store Hub'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(prev => !prev)}
                style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.12)', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Search size={18} />
              </button>
              <button
                type="button"
                onClick={() => fetchBaselineData()}
                style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.12)', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <div style={{ marginTop: '0.85rem' }}>
              <input
                type="text"
                placeholder="Search items, codes, vouchers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: 'none', fontSize: '0.88rem', backgroundColor: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>

        {/* Scrollable Module App Chips */}
        <div className="store-mobile-chip-bar">
          {[
            { id: 'stock-summary', label: 'Stock Summary', icon: Package, color: '#0284c7' },
            { id: 'item-master', label: 'Item Master', icon: Tag, color: '#8b5a2b' },
            { id: 'material-in', label: 'Material In', icon: ArrowDownRight, color: '#16a34a' },
            { id: 'daily-issue', label: 'Daily Issue', icon: ArrowUpRight, color: '#ea580c' },
            { id: 'material-returns', label: 'Returns', icon: Undo2, color: '#d97706' },
            { id: 'requisitions', label: 'Requisitions', icon: Plus, color: '#0284c7' },
            { id: 'adjustments', label: 'Adjustments', icon: ShieldAlert, color: '#d97706' },
            { id: 'contractors', label: 'Contractors', icon: Users, color: '#475569' },
            { id: 'billing', label: 'Billing', icon: FileText, color: '#8b5a2b' },
          ].map(chip => {
            const IconComp = chip.icon;
            const isActive = activeTab === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                className="store-mobile-chip"
                onClick={() => setActiveTab(chip.id)}
                style={{
                  backgroundColor: isActive ? '#0f172a' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 3px 8px rgba(15, 23, 42, 0.25)' : 'none'
                }}
              >
                <IconComp size={15} color={isActive ? '#ffffff' : chip.color} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Header Banner */}
      <div className="desktop-only store-header-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Warehouse size={22} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Store Management Hub
            </h1>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.4 }}>
            Manage store materials (Fevicol, Hardware, Bond, Lacquer, Thinner, Sand paper, Tapes), Stock Credit/Debit, Contractor Issues & Monthly Deduction Billing
          </p>
        </div>

        {/* Action Buttons */}
        <div className="store-action-btns" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/store-management/material-in')}
            className="btn-subtle-motion btn-action-material-in"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)'
            }}
          >
            <ArrowDownRight size={18} />
            <span>Material In (Credit Stock)</span>
          </button>

          <button
            onClick={() => navigate('/store-management/daily-issue')}
            className="btn-subtle-motion btn-action-daily-issue"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.2)'
            }}
          >
            <ArrowUpRight size={18} />
            <span>Daily Issue Entry (Outward)</span>
          </button>

          <button
            onClick={() => navigate('/store-management/material-return')}
            className="btn-subtle-motion btn-action-return"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#d97706',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.2)'
            }}
          >
            <Undo2 size={18} />
            <span>Record Material Return</span>
          </button>

          <button
            onClick={() => setIsPhysicalAuditModalOpen(true)}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '10px',
              border: '1px solid #e7e5e4',
              backgroundColor: '#ffffff',
              color: '#44403c',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}
          >
            <ClipboardCheck size={17} color="#5c3a21" />
            <span>Start Physical Audit</span>
          </button>

          <button
            onClick={() => setIsExcelImportModalOpen(true)}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '10px',
              border: '1px solid #bae6fd',
              backgroundColor: '#f0f9ff',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
          >
            <Download size={17} color="#0284c7" />
            <span>Import Excel Data</span>
          </button>

          <button
            onClick={() => setShowAnalytics(prev => !prev)}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '10px',
              border: '1px solid #e7e5e4',
              backgroundColor: showAnalytics ? '#5c3a21' : '#ffffff',
              color: showAnalytics ? '#ffffff' : '#44403c',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={17} color={showAnalytics ? '#ffffff' : '#5c3a21'} />
            <span>{showAnalytics ? 'Hide Analytics' : 'Store Analytics'}</span>
          </button>

          <button
            onClick={() => {
              setSelectionMode(prev => !prev);
              if (selectionMode) setSelectedRowIds(new Set());
            }}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '10px',
              border: selectionMode ? '1px solid #2563eb' : '1px solid #e7e5e4',
              backgroundColor: selectionMode ? '#eff6ff' : '#ffffff',
              color: selectionMode ? '#1d4ed8' : '#44403c',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle size={17} color={selectionMode ? '#1d4ed8' : '#5c3a21'} />
            <span>{selectionMode ? 'Exit Selection' : 'Select Items'}</span>
          </button>

          <button
            onClick={() => navigate('/store-management/item-master/new')}
            className="btn-subtle-motion btn-action-new-item"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Plus size={18} />
            <span>New Item Master</span>
          </button>
        </div>
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectionMode && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '14px',
          backgroundColor: '#3c2415',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 10px 25px rgba(60, 36, 21, 0.25)',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              fontSize: '0.82rem',
              fontWeight: 800
            }}>
              {selectedRowIds.size} Selected
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f5ece1' }}>
              Multi-Select Actions Mode Active ({activeTab.replace('-', ' ').toUpperCase()})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Select All / Deselect All */}
            <button
              onClick={() => {
                const currentItems = stockSummaryData?.items || itemsList || [];
                handleToggleSelectAll(currentItems);
              }}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {selectedRowIds.size > 0 ? 'Deselect All' : 'Select All'}
            </button>

            {/* Export Selected Excel */}
            <button
              onClick={handleExportSelectedExcel}
              disabled={selectedRowIds.size === 0 || exportingExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: selectedRowIds.size > 0 ? '#2563eb' : 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: selectedRowIds.size > 0 ? 'pointer' : 'not-allowed',
                opacity: selectedRowIds.size > 0 ? 1 : 0.6
              }}
            >
              <Download size={15} />
              <span>{exportingExcel ? 'Exporting...' : 'Export Excel'}</span>
            </button>

            {/* Bulk Delete / Void (Admin only) */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={selectedRowIds.size === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedRowIds.size > 0 ? '#dc2626' : 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: selectedRowIds.size > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedRowIds.size > 0 ? 1 : 0.6
                }}
              >
                <Trash2 size={15} />
                <span>Delete Selected</span>
              </button>
            )}

            {/* Close / Exit Mode */}
            <button
              onClick={() => { setSelectionMode(false); setSelectedRowIds(new Set()); }}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#f5ece1',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Low Stock Alert Reorder Indent Banner */}
      {lowStockItems.length > 0 && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 2px 5px rgba(217, 119, 6, 0.08)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#78350f', display: 'block' }}>
                ⚠️ Low Stock Alert: {lowStockItems.length} Store {lowStockItems.length === 1 ? 'Item is' : 'Items are'} below threshold!
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#92400e' }}>
                Generate batch purchase requisitions for Admin approval to restore inventory levels.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsReorderIndentModalOpen(true)}
            style={{
              backgroundColor: '#5c3a21',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.55rem 1.1rem',
              fontSize: '0.83rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 5px rgba(92, 58, 33, 0.2)',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={16} color="#fbbf24" /> Review & Generate Indent
          </button>
        </div>
      )}

      {/* Store Analytics Section */}
      {showAnalytics && (
        <StoreAnalyticsSection
          items={stockSummaryData?.items || []}
          dailyIssues={dailyIssuesList}
          contractors={contractors}
        />
      )}

      {/* Desktop & Mobile KPI Stats Cards Bar */}
      {loading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <>
          <div className="desktop-only" style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          {/* Card 1: Total Stock Qty */}
          <div className="stat-card-animated" style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', animationDelay: '0ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Inward Received Stock</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownRight size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7', marginTop: '0.5rem' }}>
              {stockSummaryData ? stockSummaryData.total_stock_qty.toLocaleString() : 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Store Inventory Received</span>
          </div>

          {/* Card 2: Total Issued Qty */}
          <div className="stat-card-animated" style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', animationDelay: '30ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>Issued Stock Qty</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ea580c', marginTop: '0.5rem' }}>
              {stockSummaryData ? stockSummaryData.total_issued_qty.toLocaleString() : 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Issued to Contractors</span>
          </div>

          {/* Card 3: Balance Stock Qty */}
          <div className="stat-card-animated" style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', animationDelay: '60ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Balance Available Stock</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Warehouse size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '0.5rem' }}>
              {stockSummaryData ? stockSummaryData.total_balance_qty.toLocaleString() : 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Available Stock Balance in Store</span>
          </div>

          {/* Card 4: Inventory Valuation */}
          <div className="stat-card-animated" style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', animationDelay: '90ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase' }}>Inventory Valuation (₹)</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5a2b', marginTop: '0.5rem' }}>
              ₹ {stockSummaryData ? stockSummaryData.total_inventory_valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Store Inventory Valuation</span>
          </div>
        </div>
      </div>

      {/* Mobile OVERVIEW KPI Cards (Image 1 Screenshot) */}
      <div className="mobile-only" style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.8rem',
          fontWeight: 800,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.75rem'
        }}>
          OVERVIEW
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.85rem'
        }}>
          {/* Card 1: Inward Stock */}
          <div style={{
            backgroundColor: '#f0f9ff',
            borderRadius: '16px',
            border: '1px solid #bae6fd',
            padding: '1.1rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ArrowDownRight size={18} />
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  INWARD STOCK
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 850, color: '#0284c7', lineHeight: 1.1 }}>
                {stockSummaryData ? stockSummaryData.total_stock_qty.toLocaleString() : 0}
              </div>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 500 }}>
              Total Inventory Received
            </div>
          </div>

          {/* Card 2: Issued Stock */}
          <div style={{
            backgroundColor: '#fff7ed',
            borderRadius: '16px',
            border: '1px solid #fed7aa',
            padding: '1.1rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#ffedd5',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ArrowUpRight size={18} />
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  ISSUED STOCK
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 850, color: '#ea580c', lineHeight: 1.1 }}>
                {stockSummaryData ? stockSummaryData.total_issued_qty.toLocaleString() : 0}
              </div>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 500 }}>
              Total Issued to Contractors
            </div>
          </div>

          {/* Card 3: Balance Stock */}
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '16px',
            border: '1px solid #bbf7d0',
            padding: '1.1rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Package size={18} />
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  BALANCE STOCK
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 850, color: '#16a34a', lineHeight: 1.1 }}>
                {stockSummaryData ? stockSummaryData.total_balance_qty.toLocaleString() : 0}
              </div>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 500 }}>
              Available Stock
            </div>
          </div>

          {/* Card 4: Inventory Value */}
          <div style={{
            backgroundColor: '#fefce8',
            borderRadius: '16px',
            border: '1px solid #fef08a',
            padding: '1.1rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '1.1rem',
                  fontWeight: 800
                }}>
                  ₹
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  INVENTORY VALUE
                </span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#8b5a2b', lineHeight: 1.1 }}>
                ₹{stockSummaryData ? stockSummaryData.total_inventory_valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )}

      {/* Navigation Tabs Bar */}
      <div className="desktop-only store-module-nav-container">
        {/* Sliding Indicator Backdrop */}
        <div className="store-nav-sliding-indicator" style={navIndicatorStyle} />

        <button
          ref={el => navTabRefs.current['stock-summary'] = el}
          onClick={() => setActiveTab('stock-summary')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'stock-summary' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Layers size={16} />
          <span>Stock Summary (Excel Sheet 1)</span>
        </button>

        <button
          ref={el => navTabRefs.current['item-master'] = el}
          onClick={() => setActiveTab('item-master')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'item-master' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Tag size={16} />
          <span>Item Master & Rate Comparison (Sheet 5)</span>
        </button>

        <button
          ref={el => navTabRefs.current['material-in'] = el}
          onClick={() => setActiveTab('material-in')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'material-in' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <ArrowDownRight size={16} />
          <span>Material In (Sheet 4)</span>
        </button>

        <button
          ref={el => navTabRefs.current['daily-issue'] = el}
          onClick={() => setActiveTab('daily-issue')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'daily-issue' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <ArrowUpRight size={16} />
          <span>Daily Issue Entry (Sheet 2)</span>
        </button>

        <button
          ref={el => navTabRefs.current['material-returns'] = el}
          onClick={() => setActiveTab('material-returns')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'material-returns' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Undo2 size={16} />
          <span>Material Returns (Sheet 3)</span>
        </button>

        <button
          ref={el => navTabRefs.current['requisitions'] = el}
          onClick={() => setActiveTab('requisitions')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'requisitions' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <FileText size={16} />
          <span>Material Requisitions (MRN)</span>
        </button>

        <button
          ref={el => navTabRefs.current['adjustments'] = el}
          onClick={() => setActiveTab('adjustments')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'adjustments' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <ShieldAlert size={16} />
          <span>Stock Variance & Loss Logs</span>
        </button>

        <button
          ref={el => navTabRefs.current['contractors'] = el}
          onClick={() => setActiveTab('contractors')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'contractors' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Users size={16} />
          <span>Contractors Directory (Sheet 3)</span>
        </button>

        <button
          ref={el => navTabRefs.current['billing'] = el}
          onClick={() => setActiveTab('billing')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'billing' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <FileText size={16} />
          <span>Monthly Contractor Billing</span>
        </button>
      </div>

      {/* Main Content Sections based on Active Tab */}
      <div key={activeTab} className="store-tab-content-wrapper">

        {/* TAB 1: STOCK SUMMARY */}
        {activeTab === 'stock-summary' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '400px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
                <Search size={18} color="#94a3b8" />
                <input
    </div>
  );
}
