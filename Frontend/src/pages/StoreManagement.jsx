import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Warehouse, ArrowDownRight, ArrowUpRight, Plus, Search, Filter, RefreshCw,
  TrendingUp, TrendingDown, Users, FileText, Printer, CheckCircle, AlertTriangle,
  IndianRupee, Download, Eye, Layers, Shield, Tag, History, Edit, Trash2, ChevronRight, Package, Undo2,
  ShieldAlert, Check, XCircle, RotateCcw, Sparkles, ClipboardCheck, BarChart3, X, FileEdit
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDrafts } from '../context/DraftsContext';
import Pagination from '../components/Pagination';
import OrderBySelect from '../components/OrderBySelect';
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
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('Jul-26');

  const { drafts, deleteDraft } = useDrafts();

  // Ordering states for tabs
  const [orderItemMaster, setOrderItemMaster] = useState('item_code');
  const [orderMaterialIn, setOrderMaterialIn] = useState('-inward_date');
  const [orderDailyIssue, setOrderDailyIssue] = useState('-id');
  const [orderMaterialReturns, setOrderMaterialReturns] = useState('-id');

  // Total count states for Server-Side Pagination
  const [itemMasterTotalCount, setItemMasterTotalCount] = useState(0);
  const [materialInTotalCount, setMaterialInTotalCount] = useState(0);
  const [dailyIssuesTotalCount, setDailyIssuesTotalCount] = useState(0);
  const [materialReturnsTotalCount, setMaterialReturnsTotalCount] = useState(0);
  const [requisitionsTotalCount, setRequisitionsTotalCount] = useState(0);
  const [stockAdjustmentsTotalCount, setStockAdjustmentsTotalCount] = useState(0);
  const [contractorsTotalCount, setContractorsTotalCount] = useState(0);

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
  const [activeRowId, setActiveRowId] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Clear selection and active row when activeTab changes
  useEffect(() => {
    setSelectedRowIds(new Set());
    setActiveRowId(null);
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
      const res = await api.post('/store/export-selected/', {
        module: moduleKey,
        selected_ids: Array.from(selectedRowIds)
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([res.data]));
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

  // Lazy-load data for a specific active tab on-demand with Server-Side Pagination
  const fetchTabData = useCallback(async (tabKey, force = false, targetPage, targetSearch, targetCategory, targetStatus, targetContractor, targetSupplier) => {
    setLoading(true);
    const searchVal = targetSearch !== undefined ? targetSearch : searchQuery;
    const catVal = targetCategory !== undefined ? targetCategory : selectedCategory;
    const statusVal = targetStatus !== undefined ? targetStatus : selectedStatus;
    const contVal = targetContractor !== undefined ? targetContractor : selectedContractorFilter;
    const supVal = targetSupplier !== undefined ? targetSupplier : selectedSupplierFilter;

    try {
      if (tabKey === 'item-master') {
        const p = targetPage !== undefined ? targetPage : pageItemMaster;
        const res = await api.get('/store/items/', {
          params: {
            page: p,
            page_size: ITEMS_PER_PAGE,
            search: searchVal || undefined,
            category: catVal || undefined,
            default_status: statusVal || undefined,
          }
        });
        setItemsList(res.data.results || res.data || []);
        setItemMasterTotalCount(res.data.count ?? (res.data.results || res.data || []).length);
      } else if (tabKey === 'material-in') {
        const p = targetPage !== undefined ? targetPage : pageMaterialIn;
        const res = await api.get('/store/material-in/', {
          params: {
            page: p,
            page_size: ITEMS_PER_PAGE,
            search: searchVal || undefined,
            supplier: supVal || undefined,
          }
        });
        setMaterialInList(res.data.results || res.data || []);
        setMaterialInTotalCount(res.data.count ?? (res.data.results || res.data || []).length);
      } else if (tabKey === 'daily-issue') {
        const p = targetPage !== undefined ? targetPage : pageDailyIssue;
        const res = await api.get('/store/daily-issues/', {
          params: {
            page: p,
            page_size: ITEMS_PER_PAGE,
            search: searchVal || undefined,
            contractor: contVal || undefined,
            status: statusVal || undefined,
          }
        });
        setDailyIssuesList(res.data.results || res.data || []);
        setDailyIssuesTotalCount(res.data.count ?? (res.data.results || res.data || []).length);
      } else if (tabKey === 'material-returns') {
        const p = targetPage !== undefined ? targetPage : pageMaterialReturns;
        const res = await api.get('/store/material-returns/', {
          params: {
            page: p,
            page_size: ITEMS_PER_PAGE,
            search: searchVal || undefined,
            contractor: contVal || undefined,
          }
        });
        setMaterialReturnsList(res.data.results || res.data || []);
        setMaterialReturnsTotalCount(res.data.count ?? (res.data.results || res.data || []).length);
      } else if (tabKey === 'requisitions') {
        const p = targetPage !== undefined ? targetPage : pageRequisitions;
        const res = await api.get('/store/requisitions/', {
          params: {
            page: p,
            page_size: ITEMS_PER_PAGE,
            search: searchVal || undefined,
            status: statusVal || undefined,
          }
        });
        setRequisitionsList(res.data.results || res.data || []);
        setRequisitionsTotalCount(res.data.count ?? (res.data.results || res.data || []).length);
      } else if (tabKey === 'adjustments') {
        const p = targetPage !== undefined ? targetPage : pageAdjustments;
        const res = await api.get('/store/stock-adjustments/', {
          params: {
            page: p,
            page_size: ITEMS_PER_PAGE,
            search: searchVal || undefined,
            status: statusVal || undefined,
          }
        });
        setStockAdjustmentsList(res.data.results || res.data || []);
        setStockAdjustmentsTotalCount(res.data.count ?? (res.data.results || res.data || []).length);
      } else if (tabKey === 'contractors' || tabKey === 'billing') {
        const p = targetPage !== undefined ? targetPage : (tabKey === 'contractors' ? pageContractors : pageBilling);
        const [cRes, cpRes] = await Promise.all([
          api.get('/users/', { params: { role: 'contractor', page: p, page_size: ITEMS_PER_PAGE, search: searchVal || undefined } }),
          api.get('/store/contractor-persons/', { params: { nopage: true } }),
        ]);
        setContractors(cRes.data.results || cRes.data || []);
        setContractorsTotalCount(cRes.data.count ?? (cRes.data.results || cRes.data || []).length);
        setContractorPersons(cpRes.data.results || cpRes.data || []);
      }
      setLoadedTabs(prev => ({ ...prev, [tabKey]: true }));
    } catch (err) {
      console.error(`Failed to fetch data for tab ${tabKey}`, err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedStatus, selectedContractorFilter, selectedSupplierFilter, pageItemMaster, pageMaterialIn, pageDailyIssue, pageMaterialReturns, pageRequisitions, pageAdjustments, pageContractors, pageBilling]);

  // Fetch categories once on mount
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/store/categories/');
      setCategories(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, []);

  // Fetch only Stock Summary with Server-Side Pagination
  const fetchStockSummary = useCallback(async (targetPage = pageStockSummary, targetSearch = searchQuery, targetCategory = selectedCategory) => {
    setLoading(true);
    try {
      const res = await api.get('/store/stock-summary/', {
        params: {
          page: targetPage,
          page_size: ITEMS_PER_PAGE,
          search: targetSearch || undefined,
          category: targetCategory || undefined,
        }
      });
      setStockSummaryData(res.data);
      setLoadedTabs(prev => ({ ...prev, 'stock-summary': true }));
    } catch (err) {
      console.error('Failed to load stock summary', err);
    } finally {
      setLoading(false);
    }
  }, [pageStockSummary, searchQuery, selectedCategory]);

  // Combined baseline fetch for initial load / manual refresh
  const fetchBaselineData = useCallback(async (targetPage = 1, targetSearch = searchQuery, targetCategory = selectedCategory) => {
    setLoading(true);
    try {
      await Promise.allSettled([
        fetchStockSummary(targetPage, targetSearch, targetCategory),
        fetchCategories(),
      ]);
      if (activeTab !== 'stock-summary') {
        fetchTabData(activeTab, true);
      }
    } catch (err) {
      console.error('Failed to load store management baseline data', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchCategories, fetchStockSummary, fetchTabData, searchQuery, selectedCategory]);

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
      toFetch.push(api.get('/store/items/', { params: { nopage: true } }).then(r => setItemsList(r.data.results || r.data || [])));
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
      fetchStockSummary();
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
      fetchStockSummary();
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
      fetchStockSummary();
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
      fetchStockSummary();
      fetchTabData(activeTab, true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve adjustment.');
    }
  };

  const handleRejectAdjustment = async (id) => {
    try {
      await api.post(`/store/stock-adjustments/${id}/reject/`);
      fetchStockSummary();
      fetchTabData(activeTab, true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject adjustment.');
    }
  };

  // Fetch categories once on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Trigger server-side fetch only for stock-summary when page, search, or filter changes
  useEffect(() => {
    if (activeTab === 'stock-summary') {
      const timer = setTimeout(() => {
        fetchStockSummary(pageStockSummary, searchQuery, selectedCategory);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchStockSummary, pageStockSummary, searchQuery, selectedCategory]);

  // Trigger server-side fetch for other tabs when activeTab, page, search, or filters change
  useEffect(() => {
    if (activeTab !== 'stock-summary') {
      if (
        (activeTab === 'item-master' && orderItemMaster === 'draft') ||
        (activeTab === 'material-in' && orderMaterialIn === 'draft') ||
        (activeTab === 'daily-issue' && orderDailyIssue === 'draft') ||
        (activeTab === 'material-returns' && orderMaterialReturns === 'draft')
      ) {
        return;
      }
      const timer = setTimeout(() => {
        let currentPage = 1;
        if (activeTab === 'item-master') currentPage = pageItemMaster;
        else if (activeTab === 'material-in') currentPage = pageMaterialIn;
        else if (activeTab === 'daily-issue') currentPage = pageDailyIssue;
        else if (activeTab === 'material-returns') currentPage = pageMaterialReturns;
        else if (activeTab === 'requisitions') currentPage = pageRequisitions;
        else if (activeTab === 'adjustments') currentPage = pageAdjustments;
        else if (activeTab === 'contractors') currentPage = pageContractors;
        else if (activeTab === 'billing') currentPage = pageBilling;

        fetchTabData(activeTab, true, currentPage, searchQuery);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [
    activeTab,
    fetchTabData,
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedContractorFilter,
    selectedSupplierFilter,
    pageItemMaster,
    pageMaterialIn,
    pageDailyIssue,
    pageMaterialReturns,
    pageRequisitions,
    pageAdjustments,
    pageContractors,
    pageBilling,
    orderItemMaster,
    orderMaterialIn,
    orderDailyIssue,
    orderMaterialReturns
  ]);

  // Handle auto-opening item detail modal when navigated from top Navbar Search
  useEffect(() => {
    if (location.state?.selectedItemId || location.state?.itemData) {
      const targetId = location.state?.selectedItemId || location.state?.itemData?.id;
      const targetItem = (stockSummaryData?.items || []).find(it => String(it.id) === String(targetId)) || location.state?.itemData;
      if (targetItem) {
        setSelectedDetailItem(targetItem);
        setIsDetailModalOpen(true);
      }
    }
  }, [location.state, stockSummaryData]);

  // Reset page to 1 across all tabs when search or filter changes
  useEffect(() => {
    setPageStockSummary(1);
    setPageItemMaster(1);
    setPageMaterialIn(1);
    setPageDailyIssue(1);
    setPageMaterialReturns(1);
    setPageRequisitions(1);
    setPageAdjustments(1);
    setPageContractors(1);
    setPageBilling(1);
  }, [searchQuery, selectedCategory, selectedStatus, selectedContractorFilter, selectedSupplierFilter]);

  // Drafts per module
  const itemMasterDrafts = React.useMemo(() => drafts.filter(d => d.formType === 'store_item'), [drafts]);
  const materialInDrafts = React.useMemo(() => drafts.filter(d => d.formType === 'store_in'), [drafts]);
  const dailyIssueDrafts = React.useMemo(() => drafts.filter(d => d.formType === 'store_issue'), [drafts]);
  const materialReturnDrafts = React.useMemo(() => drafts.filter(d => d.formType === 'store_return'), [drafts]);

  // Order options with draft badge
  const itemMasterOrderOptions = [
    { value: 'item_code', label: 'Item Code (A-Z)' },
    { value: '-item_code', label: 'Item Code (Z-A)' },
    { value: 'item_name', label: 'Item Name (A-Z)' },
    { value: '-id', label: 'Recently Created' },
    { value: 'draft', label: 'Drafts', badge: itemMasterDrafts.length, icon: FileEdit, isDividerBefore: true },
  ];

  const materialInOrderOptions = [
    { value: '-inward_date', label: 'Newest Date' },
    { value: 'inward_date', label: 'Oldest Date' },
    { value: '-id', label: 'Recently Created' },
    { value: 'draft', label: 'Drafts', badge: materialInDrafts.length, icon: FileEdit, isDividerBefore: true },
  ];

  const dailyIssueOrderOptions = [
    { value: '-id', label: 'Recently Created' },
    { value: 'id', label: 'Oldest Created' },
    { value: 'draft', label: 'Drafts', badge: dailyIssueDrafts.length, icon: FileEdit, isDividerBefore: true },
  ];

  const materialReturnOrderOptions = [
    { value: '-id', label: 'Recently Created' },
    { value: '-return_date', label: 'Newest Date' },
    { value: 'draft', label: 'Drafts', badge: materialReturnDrafts.length, icon: FileEdit, isDividerBefore: true },
  ];

  useEffect(() => {
    if (orderItemMaster === 'draft') setPageItemMaster(1);
  }, [orderItemMaster]);
  useEffect(() => {
    if (orderMaterialIn === 'draft') setPageMaterialIn(1);
  }, [orderMaterialIn]);
  useEffect(() => {
    if (orderDailyIssue === 'draft') setPageDailyIssue(1);
  }, [orderDailyIssue]);
  useEffect(() => {
    if (orderMaterialReturns === 'draft') setPageMaterialReturns(1);
  }, [orderMaterialReturns]);

  // Server-side paginated items directly from API responses
  const paginatedStockItems = stockSummaryData?.items || [];
  const paginatedItemMaster = itemsList;
  const paginatedMaterialIn = materialInList;
  const paginatedDailyIssues = dailyIssuesList;
  const paginatedContractors = contractors;
  const paginatedBillingContractors = contractors;
  const paginatedMaterialReturns = materialReturnsList;
  const paginatedRequisitions = requisitionsList;
  const paginatedAdjustments = stockAdjustmentsList;

  // Display lists: when in draft mode, show mapped drafts
  const displayItemMaster = React.useMemo(() => {
    if (orderItemMaster === 'draft') {
      const q = searchQuery.toLowerCase().trim();
      return itemMasterDrafts
        .filter(d => {
          if (!q) return true;
          const code = String(d.data?.item_code || '').toLowerCase();
          const name = String(d.data?.item_name || '').toLowerCase();
          return code.includes(q) || name.includes(q);
        })
        .map(d => ({
          id: d.id,
          isDraft: true,
          draftData: d.data,
          item_code: d.data?.item_code || 'DRAFT',
          item_name: d.data?.item_name || 'Draft Store Item',
          category_name: categories.find(c => String(c.id) === String(d.data?.category))?.name || 'Uncategorized',
          unit: d.data?.unit || 'pcs',
          base_rate: d.data?.base_rate || d.data?.current_rate || 0,
          current_rate: d.data?.current_rate || d.data?.base_rate || 0,
          default_status: d.data?.default_status || 'charge',
        }));
    }
    return paginatedItemMaster;
  }, [orderItemMaster, itemMasterDrafts, searchQuery, categories, paginatedItemMaster]);

  const displayMaterialIn = React.useMemo(() => {
    if (orderMaterialIn === 'draft') {
      const q = searchQuery.toLowerCase().trim();
      return materialInDrafts
        .filter(d => {
          if (!q) return true;
          const bill = String(d.data?.bill_no || d.data?.voucher_no || '').toLowerCase();
          return bill.includes(q);
        })
        .map(d => {
          const itemObj = itemsList.find(i => String(i.id) === String(d.data?.item));
          const suppObj = suppliers.find(s => String(s.id) === String(d.data?.supplier));
          const qty = parseFloat(d.data?.qty || 0);
          const rate = parseFloat(d.data?.bill_rate || 0);
          return {
            id: d.id,
            isDraft: true,
            draftData: d.data,
            month_year: d.data?.month_year || 'Draft',
            inward_date: d.data?.inward_date || (d.savedAt ? new Date(d.savedAt).toISOString().split('T')[0] : 'Draft'),
            bill_no: d.data?.bill_no || d.data?.voucher_no || 'DRAFT',
            supplier_name: suppObj?.name || (typeof d.data?.supplier === 'object' ? d.data?.supplier?.name : '') || 'Unspecified',
            item_code: itemObj?.item_code || '—',
            item_name: itemObj?.item_name || (typeof d.data?.item === 'object' ? d.data?.item?.item_name : '') || 'Draft Item',
            qty: d.data?.qty || 0,
            unit: d.data?.unit || itemObj?.unit || 'pcs',
            bill_rate: d.data?.bill_rate || 0,
            total_amount: !isNaN(qty) && !isNaN(rate) ? (qty * rate) : 0,
          };
        });
    }
    return paginatedMaterialIn;
  }, [orderMaterialIn, materialInDrafts, searchQuery, itemsList, suppliers, paginatedMaterialIn]);

  const displayDailyIssues = React.useMemo(() => {
    if (orderDailyIssue === 'draft') {
      const q = searchQuery.toLowerCase().trim();
      return dailyIssueDrafts
        .filter(d => {
          if (!q) return true;
          const vch = String(d.data?.voucher_no || '').toLowerCase();
          return vch.includes(q);
        })
        .map(d => {
          const itemObj = itemsList.find(i => String(i.id) === String(d.data?.item));
          const contrObj = contractors.find(c => String(c.id) === String(d.data?.contractor));
          const personObj = contractorPersons.find(p => String(p.id) === String(d.data?.contractor_person));
          const unitObj = productionUnits.find(u => String(u.id) === String(d.data?.production_unit));
          const qty = parseFloat(d.data?.qty || 0);
          const rate = parseFloat(d.data?.rate || 0);
          const totalVal = !isNaN(qty) && !isNaN(rate) ? (qty * rate) : 0;
          const isCharge = (d.data?.status || 'charge') === 'charge';
          return {
            id: d.id,
            isDraft: true,
            draftData: d.data,
            voucher_no: d.data?.voucher_no || 'DRAFT',
            contractor_name: contrObj?.full_name || contrObj?.username || 'Contractor',
            contractor_person_name: personObj?.name || 'Self',
            item_name: itemObj?.item_name || 'Draft Item',
            qty: d.data?.qty || 0,
            unit: d.data?.unit || itemObj?.unit || 'pcs',
            rate: d.data?.rate || 0,
            status: d.data?.status || 'charge',
            chargeable_total: isCharge ? totalVal : 0,
            non_chargeable_total: !isCharge ? totalVal : 0,
            production_unit_name: unitObj?.name || '-',
          };
        });
    }
    return paginatedDailyIssues;
  }, [orderDailyIssue, dailyIssueDrafts, searchQuery, itemsList, contractors, contractorPersons, productionUnits, paginatedDailyIssues]);

  const displayMaterialReturns = React.useMemo(() => {
    if (orderMaterialReturns === 'draft') {
      const q = searchQuery.toLowerCase().trim();
      return materialReturnDrafts
        .filter(d => {
          if (!q) return true;
          const vch = String(d.data?.voucher_no || '').toLowerCase();
          return vch.includes(q);
        })
        .map(d => {
          const itemObj = itemsList.find(i => String(i.id) === String(d.data?.item));
          const contrObj = contractors.find(c => String(c.id) === String(d.data?.contractor));
          const qty = parseFloat(d.data?.qty || 0);
          const rate = parseFloat(d.data?.rate || 0);
          const totalVal = !isNaN(qty) && !isNaN(rate) ? (qty * rate) : 0;
          return {
            id: d.id,
            isDraft: true,
            draftData: d.data,
            voucher_no: d.data?.voucher_no || 'DRAFT',
            return_date: d.data?.return_date || (d.savedAt ? new Date(d.savedAt).toISOString().split('T')[0] : 'Draft'),
            contractor_name: contrObj?.full_name || contrObj?.username || 'Contractor',
            item_code: itemObj?.item_code || '—',
            item_name: itemObj?.item_name || 'Draft Item',
            qty: d.data?.qty || 0,
            unit: d.data?.unit || itemObj?.unit || 'pcs',
            rate: d.data?.rate || 0,
            total_amount: totalVal,
            status: d.data?.status || 'charge',
          };
        });
    }
    return paginatedMaterialReturns;
  }, [orderMaterialReturns, materialReturnDrafts, searchQuery, itemsList, contractors, paginatedMaterialReturns]);

  return (
    <div style={{ padding: '0.25rem 0.5rem 1rem 0.5rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        .desktop-table-view table th {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.8rem !important;
        }
        .desktop-table-view table td {
          padding: 0.48rem 0.75rem !important;
          font-size: 0.82rem !important;
        }
        .desktop-table-view table tbody tr {
          transition: background-color 140ms ease, box-shadow 140ms ease;
          cursor: pointer;
        }
        .desktop-table-view table tbody tr:hover {
          background-color: #f1f5f9 !important;
        }
        .desktop-table-view table tbody tr:hover td {
          background-color: transparent !important;
        }
        .desktop-table-view table tbody tr.row-active-highlight {
          background-color: #e0f2fe !important;
          box-shadow: inset 4px 0 0 #0284c7;
        }
        .desktop-table-view table tbody tr.row-active-highlight td {
          background-color: transparent !important;
        }
        .desktop-table-view table tbody tr.row-active-highlight:hover {
          background-color: #d0ebfc !important;
        }
        .desktop-table-view table tbody tr.row-active-highlight:hover td {
          background-color: transparent !important;
        }
        .store-tab-content-wrapper > div > div:first-child {
          padding: 0.5rem 0.85rem !important;
        }
        .store-tab-content-wrapper h3 {
          font-size: 0.95rem !important;
        }
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
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Warehouse size={18} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Store Management Hub
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="store-action-btns" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/store-management/material-in')}
            className="btn-subtle-motion btn-action-material-in"
            title="Credit Stock Inward Entry"
            style={{
              padding: '0.42rem 0.8rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
            }}
          >
            <ArrowDownRight size={15} />
            <span>Material In</span>
          </button>

          <button
            onClick={() => navigate('/store-management/daily-issue')}
            className="btn-subtle-motion btn-action-daily-issue"
            title="Daily Issue Entry Outward"
            style={{
              padding: '0.42rem 0.8rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
            }}
          >
            <ArrowUpRight size={15} />
            <span>Daily Issue</span>
          </button>

          <button
            onClick={() => navigate('/store-management/material-return')}
            className="btn-subtle-motion btn-action-return"
            title="Record Material Return"
            style={{
              padding: '0.42rem 0.8rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#d97706',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
            }}
          >
            <Undo2 size={15} />
            <span>Material Return</span>
          </button>

          <button
            onClick={() => setIsPhysicalAuditModalOpen(true)}
            style={{
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #e7e5e4',
              backgroundColor: '#ffffff',
              color: '#44403c',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <ClipboardCheck size={15} color="#5c3a21" />
            <span>Physical Audit</span>
          </button>

          <button
            onClick={() => setIsExcelImportModalOpen(true)}
            style={{
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              backgroundColor: '#f0f9ff',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
          >
            <Download size={15} color="#0284c7" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => setShowAnalytics(prev => !prev)}
            style={{
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #e7e5e4',
              backgroundColor: showAnalytics ? '#5c3a21' : '#ffffff',
              color: showAnalytics ? '#ffffff' : '#44403c',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={15} color={showAnalytics ? '#ffffff' : '#5c3a21'} />
            <span>{showAnalytics ? 'Hide Analytics' : 'Analytics'}</span>
          </button>

          <button
            onClick={() => {
              setSelectionMode(prev => !prev);
              if (selectionMode) setSelectedRowIds(new Set());
            }}
            style={{
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              border: selectionMode ? '1px solid #2563eb' : '1px solid #e7e5e4',
              backgroundColor: selectionMode ? '#eff6ff' : '#ffffff',
              color: selectionMode ? '#1d4ed8' : '#44403c',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle size={15} color={selectionMode ? '#1d4ed8' : '#5c3a21'} />
            <span>{selectionMode ? 'Exit Selection' : 'Select Items'}</span>
          </button>

          <button
            onClick={() => navigate('/store-management/item-master/new')}
            className="btn-subtle-motion btn-action-new-item"
            style={{
              padding: '0.42rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Plus size={16} />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectionMode && (
        <div style={{
          marginBottom: '0.75rem',
          padding: '0.5rem 1rem',
          borderRadius: '10px',
          backgroundColor: '#3c2415',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 6px 18px rgba(60, 36, 21, 0.2)',
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
          className="store-low-stock-banner"
          style={{
            padding: '0.45rem 0.85rem',
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '10px',
            marginBottom: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.06)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div className="store-low-stock-banner-text" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={16} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.84rem', color: '#78350f', lineHeight: 1.2 }}>
                Low Stock Alert: {lowStockItems.length} Store {lowStockItems.length === 1 ? 'Item is' : 'Items are'} below threshold!
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: 1.2 }}>
                Generate batch purchase requisitions for Admin approval.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="store-low-stock-banner-btn"
            onClick={() => setIsReorderIndentModalOpen(true)}
            style={{
              backgroundColor: '#5c3a21',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.38rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(92, 58, 33, 0.15)',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={14} color="#fbbf24" /> Review & Generate Indent
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
          <div className="desktop-only" style={{ marginBottom: '0.75rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.65rem'
            }}>
              {/* Card 1: Total Stock Qty */}
              <div className="stat-card-animated" style={{
                backgroundColor: '#ffffff',
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                animationDelay: '0ms'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ArrowDownRight size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Inward Received Stock
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', lineHeight: 1.15 }}>
                    {stockSummaryData ? stockSummaryData.total_stock_qty.toLocaleString() : 0}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Total Store Received
                  </div>
                </div>
              </div>

              {/* Card 2: Total Issued Qty */}
              <div className="stat-card-animated" style={{
                backgroundColor: '#ffffff',
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                animationDelay: '30ms'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#ffedd5',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ArrowUpRight size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Issued Stock Qty
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ea580c', lineHeight: 1.15 }}>
                    {stockSummaryData ? stockSummaryData.total_issued_qty.toLocaleString() : 0}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Total Issued to Contractors
                  </div>
                </div>
              </div>

              {/* Card 3: Balance Stock Qty */}
              <div className="stat-card-animated" style={{
                backgroundColor: '#ffffff',
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                animationDelay: '60ms'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Warehouse size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Balance Available Stock
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.15 }}>
                    {stockSummaryData ? stockSummaryData.total_balance_qty.toLocaleString() : 0}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Available in Store
                  </div>
                </div>
              </div>

              {/* Card 4: Inventory Valuation */}
              <div className="stat-card-animated" style={{
                backgroundColor: '#ffffff',
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                animationDelay: '90ms'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IndianRupee size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Inventory Valuation (₹)
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8b5a2b', lineHeight: 1.15 }}>
                    ₹ {stockSummaryData ? stockSummaryData.total_inventory_valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Current Store Valuation
                  </div>
                </div>
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
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'stock-summary' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Layers size={14} />
          <span>Stock Summary (Excel Sheet 1)</span>
        </button>

        <button
          ref={el => navTabRefs.current['item-master'] = el}
          onClick={() => setActiveTab('item-master')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'item-master' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Tag size={14} />
          <span>Item Master & Rate Comparison (Sheet 5)</span>
        </button>

        <button
          ref={el => navTabRefs.current['material-in'] = el}
          onClick={() => setActiveTab('material-in')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'material-in' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <ArrowDownRight size={14} />
          <span>Material In (Sheet 4)</span>
        </button>

        <button
          ref={el => navTabRefs.current['daily-issue'] = el}
          onClick={() => setActiveTab('daily-issue')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'daily-issue' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <ArrowUpRight size={14} />
          <span>Daily Issue Entry (Sheet 2)</span>
        </button>

        <button
          ref={el => navTabRefs.current['material-returns'] = el}
          onClick={() => setActiveTab('material-returns')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'material-returns' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Undo2 size={14} />
          <span>Material Returns (Sheet 3)</span>
        </button>

        <button
          ref={el => navTabRefs.current['requisitions'] = el}
          onClick={() => setActiveTab('requisitions')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'requisitions' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <FileText size={14} />
          <span>Material Requisitions (MRN)</span>
        </button>

        <button
          ref={el => navTabRefs.current['adjustments'] = el}
          onClick={() => setActiveTab('adjustments')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'adjustments' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <ShieldAlert size={14} />
          <span>Stock Variance & Loss Logs</span>
        </button>

        <button
          ref={el => navTabRefs.current['contractors'] = el}
          onClick={() => setActiveTab('contractors')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'contractors' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <Users size={14} />
          <span>Contractors Directory (Sheet 3)</span>
        </button>

        <button
          ref={el => navTabRefs.current['billing'] = el}
          onClick={() => setActiveTab('billing')}
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '0.38rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'billing' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease'
          }}
        >
          <FileText size={14} />
          <span>Monthly Contractor Billing</span>
        </button>
      </div>

      {/* Main Content Sections based on Active Tab */}
      <div key={activeTab} className="store-tab-content-wrapper">

        {/* TAB 1: STOCK SUMMARY */}
        {activeTab === 'stock-summary' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '340px', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '0.3rem 0.65rem' }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search store items by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.84rem' }}
                />
              </div>
              <button
                className="btn-subtle-motion"
                onClick={async () => {
                  setIsRefreshingSummary(true);
                  await fetchBaselineData();
                  setTimeout(() => setIsRefreshingSummary(false), 600);
                }}
                disabled={isRefreshingSummary}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: isRefreshingSummary ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}
              >
                <RefreshCw size={13} className={isRefreshingSummary ? 'spin-once' : ''} /> Refresh Summary
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view table-fade-slide-in" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    {selectionMode && (
                      <th style={{ width: '40px', padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                        <input
                          type="checkbox"
                          checked={paginatedStockItems.length > 0 && paginatedStockItems.every(i => selectedRowIds.has(i.id))}
                          onChange={() => handleToggleSelectAll(paginatedStockItems)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                    )}
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Item Code</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Item Name</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0284c7', backgroundColor: '#f0f9ff' }}>Stock Qty (Inward)</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#ea580c', backgroundColor: '#fff7ed' }}>Issued Qty</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4' }}>Balance Qty</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Rate (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Units</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#8b5a2b' }}>Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={8} cols={selectionMode ? 9 : 8} />
                  ) :
                    paginatedStockItems.map((item, idx) => {
                      const isSelected = selectedRowIds.has(item.id);
                      const isActive = activeRowId === item.id;
                      return (
                      <tr
                        key={item.id || idx}
                        className={`table-row-stagger ${isActive ? 'row-active-highlight' : ''}`}
                        onClick={() => {
                          if (selectionMode) {
                            handleToggleSelectRow(item.id);
                            return;
                          }
                          setActiveRowId(prev => prev === item.id ? null : item.id);
                        }}
                        onDoubleClick={() => {
                          const fullItem = itemsList.find(i => i.id === item.id || i.item_code === item.item_code) || item;
                          setSelectedDetailItem(fullItem);
                          setIsDetailModalOpen(true);
                        }}
                        title="Click to select & highlight row | Double-click to open full details"
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelected ? '#eff6ff' : (isActive ? '#e0f2fe' : (item.is_low_stock ? '#fff1f2' : 'transparent')),
                          animationDelay: `${Math.min(idx * 20, 200)}ms`,
                          cursor: 'pointer'
                        }}
                      >
                      {selectionMode && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRowIds.has(item.id)}
                            onChange={() => handleToggleSelectRow(item.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1e293b' }}>{item.item_code}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        {item.item_name}
                        {item.is_low_stock && (
                          <span style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fecaca', color: '#991b1b', fontWeight: 700 }}>
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0284c7', backgroundColor: (isActive || isSelected) ? 'transparent' : '#f0f9ff' }}>
                        {item.stock_qty}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#ea580c', backgroundColor: (isActive || isSelected) ? 'transparent' : '#fff7ed' }}>
                        {item.issued_qty}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: item.balance_qty < 0 ? '#dc2626' : '#16a34a', backgroundColor: (isActive || isSelected) ? 'transparent' : '#f0fdf4' }}>
                        {item.balance_qty}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹ {item.rate.toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b' }}>{item.unit}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#8b5a2b' }}>
                        ₹ {item.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stock Item Cards List */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {paginatedStockItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  const fullItem = itemsList.find(i => i.id === item.id || i.item_code === item.item_code) || item;
                  setSelectedDetailItem(fullItem);
                  setIsDetailModalOpen(true);
                }}
                style={{
                  backgroundColor: item.is_low_stock ? '#fff8f8' : '#ffffff',
                  border: item.is_low_stock ? '1.5px solid #fecaca' : '1px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '1.1rem',
                  marginBottom: '0.85rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {/* Top Header: Box Icon Badge + Item Name + Item Code & Status Badges + Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: item.is_low_stock ? '#fee2e2' : '#fef3c7',
                    color: item.is_low_stock ? '#dc2626' : '#8b5a2b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Package size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      {item.item_name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: item.is_low_stock ? '#b91c1c' : '#8b5a2b',
                        backgroundColor: item.is_low_stock ? '#fee2e2' : '#fff7ed',
                        border: '1px solid ' + (item.is_low_stock ? '#fca5a5' : '#ffedd5'),
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {item.item_code}
                      </span>
                      {item.is_low_stock && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#dc2626',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={20} color="#94a3b8" />
                </div>

                {/* 3 Metric Columns with Vertical Dividers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr auto 1fr',
                  alignItems: 'center',
                  backgroundColor: '#fafafa',
                  padding: '0.65rem 0.5rem',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9'
                }}>
                  {/* Col 1: Inward */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>Inward</div>
                    <div style={{ fontSize: '1rem', fontWeight: 850, color: '#2563eb' }}>{item.stock_qty.toLocaleString()}</div>
                  </div>

                  {/* Divider 1 */}
                  <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />

                  {/* Col 2: Issued */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>Issued</div>
                    <div style={{ fontSize: '1rem', fontWeight: 850, color: '#ea580c' }}>{item.issued_qty.toLocaleString()}</div>
                  </div>

                  {/* Divider 2 */}
                  <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />

                  {/* Col 3: Balance */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>Balance</div>
                    <div style={{ fontSize: '1rem', fontWeight: 850, color: item.balance_qty < 0 ? '#dc2626' : '#16a34a' }}>{item.balance_qty.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={stockSummaryData?.current_page || pageStockSummary}
              totalPages={stockSummaryData?.total_pages || 1}
              onPageChange={setPageStockSummary}
            />
          </div>
        </div>
      )}

      {/* TAB 2: ITEM MASTER & RATE COMPARISON */}
      {activeTab === 'item-master' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Item Master Catalog & Historical Rate Tracker
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '280px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search item code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
              <OrderBySelect
                value={orderItemMaster}
                onChange={(val) => setOrderItemMaster(val)}
                options={itemMasterOrderOptions}
              />
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #d6c7b2', backgroundColor: '#faf6f0', color: '#8b5a2b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Tag size={16} /> Add Category
              </button>
              <button
                onClick={() => { setSelectedItemForEdit(null); setIsItemModalOpen(true); }}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#8b5a2b', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Add Store Item
              </button>
            </div>
          </div>

          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Item Code</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Item Name</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Unit</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Master Rate (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>Current Rate (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Default Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={8} />
                ) : displayItemMaster.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      {orderItemMaster === 'draft' ? 'No item master drafts saved.' : 'No store items found.'}
                    </td>
                  </tr>
                ) : (
                  displayItemMaster.map((item, idx) => {
                    const isActive = activeRowId === item.id;
                    return (
                    <tr
                      key={item.id || idx}
                      className={isActive ? 'row-active-highlight' : ''}
                      onClick={() => {
                        if (item.isDraft) {
                          navigate('/store-management/item-master/new', { state: { draftData: item.draftData, draftId: item.id } });
                          return;
                        }
                        setActiveRowId(prev => prev === item.id ? null : item.id);
                      }}
                      onDoubleClick={() => {
                        if (!item.isDraft) {
                          setSelectedDetailItem(item);
                          setIsDetailModalOpen(true);
                        }
                      }}
                      title={item.isDraft ? "Click to resume draft" : "Click to select & highlight row | Double-click to open full details"}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isActive ? '#e0f2fe' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1e293b' }}>{item.item_code}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{item.item_name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{item.category_name || '-'}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b' }}>{item.unit}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(item.base_rate).toFixed(2)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                      ₹ {parseFloat(item.current_rate || item.base_rate).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {item.isDraft ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#fef3c7',
                          color: '#92400e'
                        }}>
                          • Draft
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: item.default_status === 'charge' ? '#fff7ed' : '#f0fdf4',
                          color: item.default_status === 'charge' ? '#c2410c' : '#16a34a'
                        }}>
                          {item.default_status === 'charge' ? 'Chargeable' : 'Non-Chargeable'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {item.isDraft ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/store-management/item-master/new', { state: { draftData: item.draftData, draftId: item.id } });
                            }}
                            title="Resume Editing Draft"
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileEdit size={13} color="#d97706" /> Resume
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to discard this draft?')) {
                                deleteDraft(item.id);
                              }
                            }}
                            title="Discard Draft"
                            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            <Trash2 size={13} /> Discard
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedItemForRate(item); setIsRateModalOpen(true); }}
                            title="View Rate Comparison & Revise Rate"
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', color: '#0284c7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <TrendingUp size={14} /> Compare Rate
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedItemForEdit(item); setIsItemModalOpen(true); }}
                            title="Edit Item Master"
                            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }))}
              </tbody>
            </table>
          </div>

          {/* Mobile Item Master Card List */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {displayItemMaster.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (item.isDraft) {
                    navigate('/store-management/item-master/new', { state: { draftData: item.draftData, draftId: item.id } });
                  } else {
                    setSelectedDetailItem(item);
                    setIsDetailModalOpen(true);
                  }
                }}
                className="store-mobile-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8b5a2b', backgroundColor: '#faf6f0', padding: '3px 8px', borderRadius: '8px', border: '1px solid #e7e5e4' }}>
                    {item.item_code}
                  </span>
                  {item.isDraft ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e'
                    }}>
                      • Draft
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '10px',
                      backgroundColor: item.default_status === 'charge' ? '#fff7ed' : '#f0fdf4',
                      color: item.default_status === 'charge' ? '#c2410c' : '#16a34a'
                    }}>
                      {item.default_status === 'charge' ? 'Chargeable' : 'Non-Chargeable'}
                    </span>
                  )}
                </div>

                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                  {item.item_name}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  Category: <span style={{ fontWeight: 600, color: '#334155' }}>{item.category_name || '-'}</span> • Unit: <span style={{ fontWeight: 600 }}>{item.unit}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Master Rate</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>₹ {parseFloat(item.base_rate).toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600 }}>Current Rate</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>₹ {parseFloat(item.current_rate || item.base_rate).toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                  {item.isDraft ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/store-management/item-master/new', { state: { draftData: item.draftData, draftId: item.id } });
                        }}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <FileEdit size={14} color="#d97706" /> Resume
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to discard this draft?')) {
                            deleteDraft(item.id);
                          }
                        }}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={14} /> Discard
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedItemForRate(item); setIsRateModalOpen(true); }}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <TrendingUp size={14} /> Compare Rate
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedItemForEdit(item); setIsItemModalOpen(true); }}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit size={14} /> Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageItemMaster}
              totalPages={orderItemMaster === 'draft' ? (Math.ceil(displayItemMaster.length / ITEMS_PER_PAGE) || 1) : (Math.ceil(itemMasterTotalCount / ITEMS_PER_PAGE) || 1)}
              onPageChange={setPageItemMaster}
            />
          </div>
        </div>
      )}

      {/* TAB 3: MATERIAL IN (INWARD STOCK RECEIPTS) */}
      {activeTab === 'material-in' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Material Inward Receipts Log (Excel Sheet 4)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '280px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search voucher, bill, supplier, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
              <OrderBySelect
                value={orderMaterialIn}
                onChange={(val) => setOrderMaterialIn(val)}
                options={materialInOrderOptions}
              />
              <button
                onClick={() => navigate('/store-management/material-in')}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowDownRight size={16} /> Record Material In
              </button>
            </div>
          </div>

          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#166534' }}>Month</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#166534' }}>Date</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#166534' }}>Bill #</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#166534' }}>Supplier Name</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#166534' }}>Item Code</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#166534' }}>Item Name</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#166534' }}>Qty</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#166534' }}>Unit</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#166534' }}>Bill Rate (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#166534' }}>Amount (₹)</th>
                  {orderMaterialIn === 'draft' ? (
                    <>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#166534' }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#166534' }}>Actions</th>
                    </>
                  ) : (
                    user?.role === 'admin' && (
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#166534' }}>Admin Controls</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={orderMaterialIn === 'draft' ? 12 : (user?.role === 'admin' ? 11 : 10)} />
                ) : displayMaterialIn.length === 0 ? (
                  <tr>
                    <td colSpan={orderMaterialIn === 'draft' ? 12 : (user?.role === 'admin' ? 11 : 10)} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      {orderMaterialIn === 'draft' ? 'No material inward drafts saved.' : 'No material inward records found.'}
                    </td>
                  </tr>
                ) : (
                  displayMaterialIn.map((row, idx) => {
                    const rowKey = row.id || `in-${idx}`;
                    const isActive = activeRowId === rowKey;
                    return (
                    <tr
                      key={rowKey}
                      className={isActive ? 'row-active-highlight' : ''}
                      onClick={() => {
                        if (row.isDraft) {
                          navigate('/store-management/material-in', { state: { draftData: row.draftData, draftId: row.id } });
                          return;
                        }
                        setActiveRowId(prev => prev === rowKey ? null : rowKey);
                      }}
                      title={row.isDraft ? "Click to resume draft" : "Click to select & highlight row"}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isActive ? '#e0f2fe' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{row.month_year || 'Jul-26'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{row.inward_date}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{row.bill_no}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{row.supplier_name}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1e293b' }}>{row.item_code}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{row.item_name}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{row.qty}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b' }}>{row.unit}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>₹ {parseFloat(row.bill_rate).toFixed(2)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      ₹ {parseFloat(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    {orderMaterialIn === 'draft' ? (
                      <>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#92400e'
                          }}>
                            • Draft
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/store-management/material-in', { state: { draftData: row.draftData, draftId: row.id } });
                              }}
                              title="Resume Editing Draft"
                              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <FileEdit size={13} color="#d97706" /> Resume
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to discard this draft?')) {
                                  deleteDraft(row.id);
                                }
                              }}
                              title="Discard Draft"
                              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              <Trash2 size={13} /> Discard
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      user?.role === 'admin' && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleVoidVoucher('/store/material-in/', row.id, row.bill_no || row.id)}
                            title="Void / Delete Inward Voucher (Admin Audit Trail)"
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={13} /> Void
                          </button>
                        </td>
                      )
                    )}
                  </tr>
                );
              }))}
              </tbody>
            </table>
          </div>

          {/* Mobile Material In Card List */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {displayMaterialIn.map((row, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (row.isDraft) {
                    navigate('/store-management/material-in', { state: { draftData: row.draftData, draftId: row.id } });
                  }
                }}
                className="store-mobile-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: row.isDraft ? '#92400e' : '#166534', backgroundColor: row.isDraft ? '#fef3c7' : '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                    {row.isDraft ? '• Draft' : `Bill #${row.bill_no}`}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {row.inward_date}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Supplier: <span style={{ color: '#0f172a' }}>{row.supplier_name}</span>
                </div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  [{row.item_code}] {row.item_name}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>Received Qty</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>{row.qty} {row.unit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>Total Amount</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>
                      ₹ {parseFloat(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {row.isDraft ? (
                  <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/store-management/material-in', { state: { draftData: row.draftData, draftId: row.id } });
                      }}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <FileEdit size={14} color="#d97706" /> Resume
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to discard this draft?')) {
                          deleteDraft(row.id);
                        }
                      }}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={14} /> Discard
                    </button>
                  </div>
                ) : (
                  user?.role === 'admin' && (
                    <div style={{ marginTop: '0.65rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleVoidVoucher('/store/material-in/', row.id, row.bill_no || row.id)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={13} /> Void Voucher
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageMaterialIn}
              totalPages={orderMaterialIn === 'draft' ? (Math.ceil(displayMaterialIn.length / ITEMS_PER_PAGE) || 1) : (Math.ceil(materialInTotalCount / ITEMS_PER_PAGE) || 1)}
              onPageChange={setPageMaterialIn}
            />
          </div>
        </div>
      )}

      {/* TAB 4: DAILY ISSUE ENTRY */}
      {activeTab === 'daily-issue' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Daily Store Issue Entries (Outward Ledger - Excel Sheet 2)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '280px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search voucher, contractor, worker, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
              <OrderBySelect
                value={orderDailyIssue}
                onChange={(val) => setOrderDailyIssue(val)}
                options={dailyIssueOrderOptions}
              />
              <button
                onClick={() => navigate('/store-management/daily-issue')}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowUpRight size={16} /> Record Issue Entry
              </button>
            </div>
          </div>

          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#fff7ed', borderBottom: '2px solid #fed7aa' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#9a3412' }}>Voucher No</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#9a3412' }}>Contractor</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#9a3412' }}>Contractor Person (Worker)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#9a3412' }}>Item</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#9a3412' }}>Qty</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9a3412' }}>Unit</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#9a3412' }}>Rate (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9a3412' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#9a3412' }}>Chargeable Total</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#9a3412' }}>Non-Chargeable Total</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#9a3412' }}>Unit #</th>
                  {orderDailyIssue === 'draft' ? (
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9a3412' }}>Actions</th>
                  ) : (
                    user?.role === 'admin' && (
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9a3412' }}>Admin Controls</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={orderDailyIssue === 'draft' ? 12 : (user?.role === 'admin' ? 12 : 11)} />
                ) : displayDailyIssues.length === 0 ? (
                  <tr>
                    <td colSpan={orderDailyIssue === 'draft' ? 12 : (user?.role === 'admin' ? 12 : 11)} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      {orderDailyIssue === 'draft' ? 'No daily issue drafts saved.' : 'No daily store issue records found.'}
                    </td>
                  </tr>
                ) : (
                  displayDailyIssues.map((row, idx) => {
                    const rowKey = row.id || `issue-${idx}`;
                    const isActive = activeRowId === rowKey;
                    return (
                    <tr
                      key={rowKey}
                      className={isActive ? 'row-active-highlight' : ''}
                      onClick={() => {
                        if (row.isDraft) {
                          navigate('/store-management/daily-issue', { state: { draftData: row.draftData, draftId: row.id } });
                          return;
                        }
                        setActiveRowId(prev => prev === rowKey ? null : rowKey);
                      }}
                      title={row.isDraft ? "Click to resume draft" : "Click to select & highlight row"}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isActive ? '#e0f2fe' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{row.voucher_no}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{row.contractor_name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#1e293b' }}>{row.contractor_person_name || 'Self'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{row.item_name}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#ea580c' }}>{row.qty}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b' }}>{row.unit}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>₹ {parseFloat(row.rate).toFixed(2)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {row.isDraft ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#fef3c7',
                          color: '#92400e'
                        }}>
                          • Draft
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: row.status === 'charge' ? '#fff7ed' : '#f0fdf4',
                          color: row.status === 'charge' ? '#c2410c' : '#16a34a'
                        }}>
                          {row.status === 'charge' ? 'Chargeable' : 'Non-Chargeable'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#c2410c' }}>
                      {parseFloat(row.chargeable_total) > 0 ? `₹ ${parseFloat(row.chargeable_total).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {parseFloat(row.non_chargeable_total) > 0 ? `₹ ${parseFloat(row.non_chargeable_total).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{row.production_unit_name || '-'}</td>
                    {orderDailyIssue === 'draft' ? (
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/store-management/daily-issue', { state: { draftData: row.draftData, draftId: row.id } });
                            }}
                            title="Resume Editing Draft"
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileEdit size={13} color="#d97706" /> Resume
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to discard this draft?')) {
                                deleteDraft(row.id);
                              }
                            }}
                            title="Discard Draft"
                            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            <Trash2 size={13} /> Discard
                          </button>
                        </div>
                      </td>
                    ) : (
                      user?.role === 'admin' && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleVoidVoucher('/store/daily-issues/', row.id, row.voucher_no)}
                            title="Void / Delete Daily Issue Voucher (Admin Audit Trail)"
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={13} /> Void
                          </button>
                        </td>
                      )
                    )}
                  </tr>
                );
              }))}
              </tbody>
            </table>
          </div>

          {/* Mobile Daily Issue Card List */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {displayDailyIssues.map((row, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (row.isDraft) {
                    navigate('/store-management/daily-issue', { state: { draftData: row.draftData, draftId: row.id } });
                  }
                }}
                className="store-mobile-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: row.isDraft ? '#92400e' : '#9a3412', backgroundColor: row.isDraft ? '#fef3c7' : '#ffedd5', padding: '2px 8px', borderRadius: '6px' }}>
                    {row.isDraft ? '• Draft' : `Voucher #${row.voucher_no}`}
                  </span>
                  {row.isDraft ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e'
                    }}>
                      • Draft
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: row.status === 'charge' ? '#fff7ed' : '#f0fdf4',
                      color: row.status === 'charge' ? '#c2410c' : '#16a34a'
                    }}>
                      {row.status === 'charge' ? 'Chargeable' : 'Non-Chargeable'}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
                  Contractor: {row.contractor_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem' }}>
                  Worker Delegate: <span style={{ fontWeight: 700, color: '#8b5a2b' }}>{row.contractor_person_name || 'Self'}</span>
                </div>

                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {row.item_name}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff7ed', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#9a3412', fontWeight: 600 }}>Issued Qty</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ea580c' }}>{row.qty} {row.unit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9a3412', fontWeight: 600 }}>Total Value</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#c2410c' }}>
                      ₹ {parseFloat(row.status === 'charge' ? row.chargeable_total : row.non_chargeable_total).toFixed(2)}
                    </div>
                  </div>
                </div>

                {row.isDraft ? (
                  <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/store-management/daily-issue', { state: { draftData: row.draftData, draftId: row.id } });
                      }}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <FileEdit size={14} color="#d97706" /> Resume
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to discard this draft?')) {
                          deleteDraft(row.id);
                        }
                      }}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={14} /> Discard
                    </button>
                  </div>
                ) : (
                  user?.role === 'admin' && (
                    <div style={{ marginTop: '0.65rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleVoidVoucher('/store/daily-issues/', row.id, row.voucher_no)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={13} /> Void Voucher
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageDailyIssue}
              totalPages={orderDailyIssue === 'draft' ? (Math.ceil(displayDailyIssues.length / ITEMS_PER_PAGE) || 1) : (Math.ceil(dailyIssuesTotalCount / ITEMS_PER_PAGE) || 1)}
              onPageChange={setPageDailyIssue}
            />
          </div>
        </div>
      )}

      {/* TAB: MATERIAL RETURNS LOG */}
      {activeTab === 'material-returns' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Store Material Returns Log (Sheet 3)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Unused stock returned by contractors credited back into Store Inventory
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '280px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search voucher, contractor, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
              <OrderBySelect
                value={orderMaterialReturns}
                onChange={(val) => setOrderMaterialReturns(val)}
                options={materialReturnOrderOptions}
              />
              <button
                onClick={() => navigate('/store-management/material-return')}
                style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={16} /> Record Material Return
              </button>
            </div>
          </div>

          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#fef3c7', borderBottom: '2px solid #fde68a' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Voucher No</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Return Date</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Contractor</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Item Code & Name</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>Returned Qty</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>Rate (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>Total Value</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>Credit Status</th>
                  {orderMaterialReturns === 'draft' ? (
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>Actions</th>
                  ) : (
                    user?.role === 'admin' && (
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>Actions</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} cols={orderMaterialReturns === 'draft' ? 9 : (user?.role === 'admin' ? 9 : 8)} />
                ) : displayMaterialReturns.length === 0 ? (
                  <tr>
                    <td colSpan={orderMaterialReturns === 'draft' ? 9 : (user?.role === 'admin' ? 9 : 8)} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      {orderMaterialReturns === 'draft' ? 'No material return drafts saved.' : 'No material return vouchers recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  displayMaterialReturns.map((ret, idx) => {
                    const rowKey = ret.id || `ret-${idx}`;
                    const isActive = activeRowId === rowKey;
                    return (
                    <tr
                      key={rowKey}
                      className={isActive ? 'row-active-highlight' : ''}
                      onClick={() => {
                        if (ret.isDraft) {
                          navigate('/store-management/material-return', { state: { draftData: ret.draftData, draftId: ret.id } });
                          return;
                        }
                        setActiveRowId(prev => prev === rowKey ? null : rowKey);
                      }}
                      title={ret.isDraft ? "Click to resume draft" : "Click to select & highlight row"}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isActive ? '#e0f2fe' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#b45309' }}>{ret.voucher_no}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{ret.return_date}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{ret.contractor_name || 'Self'}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        [{ret.item_code}] {ret.item_name}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        +{ret.qty} {ret.unit}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569' }}>₹ {parseFloat(ret.rate || 0).toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        ₹ {parseFloat(ret.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {ret.isDraft ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#92400e'
                          }}>
                            • Draft
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: ret.status === 'charge' ? '#dcfce7' : '#f1f5f9',
                            color: ret.status === 'charge' ? '#15803d' : '#64748b'
                          }}>
                            {ret.status === 'charge' ? 'Charge Credit' : 'Non-Charge'}
                          </span>
                        )}
                      </td>
                      {orderMaterialReturns === 'draft' ? (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/store-management/material-return', { state: { draftData: ret.draftData, draftId: ret.id } });
                              }}
                              title="Resume Editing Draft"
                              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <FileEdit size={13} color="#d97706" /> Resume
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to discard this draft?')) {
                                  deleteDraft(ret.id);
                                }
                              }}
                              title="Discard Draft"
                              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              <Trash2 size={13} /> Discard
                            </button>
                          </div>
                        </td>
                      ) : (
                        user?.role === 'admin' && (
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <button
                              onClick={() => handleVoidVoucher('/store/material-returns/', ret.id, ret.voucher_no)}
                              title="Void / Delete Return Voucher (Admin Audit Trail)"
                              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={13} /> Void
                            </button>
                          </td>
                        )
                      )}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageMaterialReturns}
              totalPages={orderMaterialReturns === 'draft' ? (Math.ceil(displayMaterialReturns.length / ITEMS_PER_PAGE) || 1) : (Math.ceil(materialReturnsTotalCount / ITEMS_PER_PAGE) || 1)}
              onPageChange={setPageMaterialReturns}
            />
          </div>
        </div>
      )}

      {/* TAB: MATERIAL REQUISITION NOTES (MRN) */}
      {activeTab === 'requisitions' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Store Material Requisitions (3-Step Indent Flow)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Supervisor material request ➔ Store Manager Approval ➔ Stock Issue
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '280px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search MRN #, item, requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
              <button
                onClick={() => setIsRequisitionModalOpen(true)}
                style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> New Material Requisition
              </button>
            </div>
          </div>

          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f0f9ff', borderBottom: '2px solid #bae6fd' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#0369a1' }}>Requisition No</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#0369a1' }}>Requested By</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#0369a1' }}>Store Item</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>Requested Qty</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#0369a1' }}>Factory Unit</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#0369a1' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#0369a1' }}>Approval / Issue Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} cols={7} />
                ) : requisitionsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      No material requisitions raised yet. Click "New Material Requisition" to create one.
                    </td>
                  </tr>
                ) : (
                  requisitionsList.map((mrn, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0284c7' }}>{mrn.requisition_no}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{mrn.requested_by_name}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>[{mrn.item_code}] {mrn.item_name}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {mrn.requested_qty} {mrn.unit}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{mrn.production_unit_name || 'General Store'}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: mrn.status === 'approved' ? '#dcfce7' : mrn.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                          color: mrn.status === 'approved' ? '#15803d' : mrn.status === 'rejected' ? '#b91c1c' : '#b45309'
                        }}>
                          {mrn.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {mrn.status === 'pending' && ['admin', 'store_manager'].includes(user?.role) ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleApproveRequisition(mrn.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequisition(mrn.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : mrn.status === 'approved' ? (
                          <button
                            onClick={() => navigate(`/store-management/daily-issue?item=${mrn.item}&qty=${mrn.requested_qty}${mrn.production_unit ? `&unit=${mrn.production_unit}` : ''}`)}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ArrowUpRight size={14} /> Issue Material Stock
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {mrn.approved_by_name ? `By ${mrn.approved_by_name}` : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Requisitions Card List */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {paginatedRequisitions.map((mrn, idx) => (
              <div key={idx} className="store-mobile-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                    MRN #{mrn.requisition_no}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    backgroundColor: mrn.status === 'approved' ? '#dcfce7' : mrn.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                    color: mrn.status === 'approved' ? '#15803d' : mrn.status === 'rejected' ? '#b91c1c' : '#b45309'
                  }}>
                    {mrn.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700, marginBottom: '0.2rem' }}>
                  Requested By: <span style={{ color: '#0f172a' }}>{mrn.requested_by_name}</span>
                </div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  [{mrn.item_code}] {mrn.item_name}
                </h4>

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7', marginBottom: '0.65rem' }}>
                  Requested: {mrn.requested_qty} {mrn.unit}
                </div>

                {mrn.status === 'pending' && ['admin', 'store_manager'].includes(user?.role) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => handleApproveRequisition(mrn.id)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleRejectRequisition(mrn.id)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageRequisitions}
              totalPages={Math.ceil(requisitionsTotalCount / ITEMS_PER_PAGE) || 1}
              onPageChange={setPageRequisitions}
            />
          </div>
        </div>
      )}

      {/* TAB: PHYSICAL STOCK VARIANCE LOGS */}
      {activeTab === 'adjustments' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Physical Stock Variance & Evaporation / Loss Logs
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Record liquid evaporation, wastage, damage, or audit count adjustments (Requires Admin Approval)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '280px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search adjustment #, item, reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
              <button
                onClick={() => setIsAdjustmentModalOpen(true)}
                style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldAlert size={16} /> Log Stock Variance
              </button>
            </div>
          </div>

          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#fef3c7', borderBottom: '2px solid #fde68a' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Adjustment No</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Logged By</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Item</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Type</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>Qty Delta</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#b45309' }}>Reason / Audit Note</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>Admin Approval</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} cols={8} />
                ) : stockAdjustmentsList.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      No physical stock adjustments or evaporation loss logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  stockAdjustmentsList.map((adj, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#d97706' }}>{adj.adjustment_no}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{adj.logged_by_name}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>[{adj.item_code}] {adj.item_name}</td>
                      <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize', color: '#64748b' }}>{adj.adjustment_type.replace('_', ' ')}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: parseFloat(adj.quantity_delta) < 0 ? '#dc2626' : '#16a34a' }}>
                        {parseFloat(adj.quantity_delta) > 0 ? `+${adj.quantity_delta}` : adj.quantity_delta}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{adj.reason}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: adj.status === 'approved' ? '#dcfce7' : adj.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                          color: adj.status === 'approved' ? '#15803d' : adj.status === 'rejected' ? '#b91c1c' : '#b45309'
                        }}>
                          {adj.status === 'pending_admin' ? 'PENDING ADMIN' : adj.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {adj.status === 'pending_admin' && user?.role === 'admin' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleApproveAdjustment(adj.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectAdjustment(adj.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {adj.approved_by_name ? `By ${adj.approved_by_name}` : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Adjustments Card List */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {paginatedAdjustments.map((adj, idx) => (
              <div key={idx} className="store-mobile-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                    ADJ #{adj.adjustment_no}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    backgroundColor: adj.status === 'approved' ? '#dcfce7' : adj.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                    color: adj.status === 'approved' ? '#15803d' : adj.status === 'rejected' ? '#b91c1c' : '#b45309'
                  }}>
                    {adj.status === 'pending_admin' ? 'PENDING ADMIN' : adj.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700, marginBottom: '0.2rem' }}>
                  Logged By: <span style={{ color: '#0f172a' }}>{adj.logged_by_name}</span> • Type: <span style={{ textTransform: 'capitalize' }}>{adj.adjustment_type.replace('_', ' ')}</span>
                </div>

                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  [{adj.item_code}] {adj.item_name}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafafa', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Qty Delta:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: parseFloat(adj.quantity_delta) < 0 ? '#dc2626' : '#16a34a' }}>
                    {parseFloat(adj.quantity_delta) > 0 ? `+${adj.quantity_delta}` : adj.quantity_delta}
                  </span>
                </div>

                {adj.status === 'pending_admin' && user?.role === 'admin' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => handleApproveAdjustment(adj.id)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleRejectAdjustment(adj.id)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageAdjustments}
              totalPages={Math.ceil(stockAdjustmentsTotalCount / ITEMS_PER_PAGE) || 1}
              onPageChange={setPageAdjustments}
            />
          </div>
        </div>
      )}

      {/* TAB 5: CONTRACTORS & WORKERS DIRECTORY */}
      {activeTab === 'contractors' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Contractors & Worker Delegate Directory (Excel Sheet 3)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '300px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search contractor name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Contractor Name</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Role / Designation</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Phone</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Registered Worker Person</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={5} />
                ) : paginatedContractors.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={32} color="#cbd5e1" />
                        <span style={{ fontWeight: 600 }}>No contractors found{searchQuery ? ` matching "${searchQuery}"` : ''}</span>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            style={{ border: 'none', background: 'none', color: '#ea580c', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedContractors.map((c, idx) => {
                    const workerPerson = contractorPersons.find(p => String(p.contractor) === String(c.id));
                    return (
                      <tr key={c.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                          {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>Contractor</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{c.phone || '-'}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#8b5a2b' }}>
                          {workerPerson ? workerPerson.person_name : 'Self'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => { setSelectedContractorForBill(c); setIsBillingModalOpen(true); }}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileText size={14} /> Generate Bill
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Contractors Directory List */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>Loading contractors...</div>
            ) : paginatedContractors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '12px' }}>
                <Users size={30} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600 }}>No contractors found{searchQuery ? ` matching "${searchQuery}"` : ''}</div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ border: 'none', background: 'none', color: '#ea580c', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem', textDecoration: 'underline' }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              paginatedContractors.map((c, idx) => {
                const workerPerson = contractorPersons.find(p => String(p.contractor) === String(c.id));
                return (
                  <div key={c.id || idx} className="store-mobile-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phone: {c.phone || 'N/A'}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748b', backgroundColor: '#fafafa', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '0.65rem' }}>
                      Worker Delegate: <strong style={{ color: '#8b5a2b' }}>{workerPerson ? workerPerson.person_name : 'Self'}</strong>
                    </div>

                    <button
                      onClick={() => { setSelectedContractorForBill(c); setIsBillingModalOpen(true); }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', backgroundColor: '#8b5a2b', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <FileText size={15} /> Generate Monthly Bill
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageContractors}
              totalPages={Math.ceil(contractorsTotalCount / ITEMS_PER_PAGE) || 1}
              onPageChange={setPageContractors}
            />
          </div>
        </div>
      )}

      {/* TAB 6: MONTHLY CONTRACTOR BILLING */}
      {activeTab === 'billing' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Monthly Contractor Settlement & Store Material Deduction Bills
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <div className="store-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', maxWidth: '300px', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search contractor name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {loading ? (
              <CardSkeleton count={6} />
            ) : paginatedBillingContractors.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                <Users size={32} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600 }}>No contractors found{searchQuery ? ` matching "${searchQuery}"` : ''}</div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ border: 'none', background: 'none', color: '#ea580c', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem', textDecoration: 'underline' }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              paginatedBillingContractors.map((c, idx) => (
                <div key={c.id || idx} style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Phone: {c.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Monthly Settlement</span>
                    <button
                      onClick={() => { setSelectedContractorForBill(c); setIsBillingModalOpen(true); }}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#8b5a2b', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FileText size={15} /> View Bill Statement
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageBilling}
              totalPages={Math.ceil(contractorsTotalCount / ITEMS_PER_PAGE) || 1}
              onPageChange={setPageBilling}
            />
          </div>
        </div>
      )}
      </div>

      {/* MODALS */}
      <StoreRateComparisonModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        item={selectedItemForRate}
        onSuccess={fetchBaselineData}
      />

      <ContractorBillingStatementModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        contractor={selectedContractorForBill}
        initialMonth={monthFilter}
      />

      <StoreItemDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedDetailItem}
        onEdit={(itemToEdit) => {
          setSelectedItemForEdit(itemToEdit);
          setIsItemModalOpen(true);
        }}
      />

      <StoreCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={(newCat) => {
          setCategories(prev => [...prev, newCat]);
          fetchBaselineData();
        }}
      />

      <StoreItemMasterModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={selectedItemForEdit}
        categories={categories}
        onSuccess={fetchBaselineData}
        onCategoryAdded={(newCat) => setCategories(prev => [...prev, newCat])}
      />

      <StoreMaterialReturnModal
        isOpen={isMaterialReturnModalOpen}
        onClose={() => setIsMaterialReturnModalOpen(false)}
        onSuccess={fetchBaselineData}
        initialContractors={contractors}
        initialItems={itemsList}
        initialUnits={productionUnits}
      />

      <StoreRequisitionModal
        isOpen={isRequisitionModalOpen}
        onClose={() => setIsRequisitionModalOpen(false)}
        onSuccess={fetchBaselineData}
        items={itemsList}
        units={productionUnits}
      />

      <StoreStockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={fetchBaselineData}
        items={itemsList}
      />

      <StoreReorderIndentModal
        isOpen={isReorderIndentModalOpen}
        onClose={() => setIsReorderIndentModalOpen(false)}
        lowStockItems={lowStockItems}
        onSuccess={fetchBaselineData}
      />

      <StorePhysicalAuditModal
        isOpen={isPhysicalAuditModalOpen}
        onClose={() => setIsPhysicalAuditModalOpen(false)}
        items={stockSummaryData?.items || []}
        onSuccess={fetchBaselineData}
      />

      <StoreExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onImportSuccess={fetchBaselineData}
      />

      {/* Bulk Delete Confirm Modal */}
      {showBulkDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 999999 }} onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px', padding: '1.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <AlertTriangle size={26} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Confirm Bulk Deletion
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Are you sure you want to delete <strong style={{ color: '#dc2626' }}>{selectedRowIds.size} selected item(s)</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteConfirm}
                disabled={deletingBulk}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: deletingBulk ? 'not-allowed' : 'pointer' }}
              >
                {deletingBulk ? 'Deleting...' : `Yes, Delete (${selectedRowIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Floating Action Speed Dial (FAB) */}
      <div className="mobile-only store-mobile-fab-container">
        {showMobileFabMenu && (
          <div className="store-mobile-fab-menu">
            <button
              type="button"
              className="store-mobile-fab-item"
              onClick={() => { setShowMobileFabMenu(false); navigate('/store-management/material-in'); }}
            >
              <ArrowDownRight size={16} color="#16a34a" />
              <span>Material In (Credit)</span>
            </button>
            <button
              type="button"
              className="store-mobile-fab-item"
              onClick={() => { setShowMobileFabMenu(false); navigate('/store-management/daily-issue'); }}
            >
              <ArrowUpRight size={16} color="#ea580c" />
              <span>Daily Issue (Outward)</span>
            </button>
            <button
              type="button"
              className="store-mobile-fab-item"
              onClick={() => { setShowMobileFabMenu(false); setIsMaterialReturnModalOpen(true); }}
            >
              <Undo2 size={16} color="#d97706" />
              <span>Record Return</span>
            </button>
            <button
              type="button"
              className="store-mobile-fab-item"
              onClick={() => { setShowMobileFabMenu(false); navigate('/store-management/item-master/new'); }}
            >
              <Plus size={16} color="#8b5a2b" />
              <span>New Item Master</span>
            </button>
            <button
              type="button"
              className="store-mobile-fab-item"
              onClick={() => { setShowMobileFabMenu(false); setIsRequisitionModalOpen(true); }}
            >
              <ClipboardCheck size={16} color="#0284c7" />
              <span>New Requisition</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className="store-mobile-fab-btn"
          onClick={() => setShowMobileFabMenu(prev => !prev)}
          style={{ transform: showMobileFabMenu ? 'rotate(45deg)' : 'none' }}
        >
          <Plus size={26} />
        </button>
      </div>
    </div>
  );
}
