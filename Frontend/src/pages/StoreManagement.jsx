import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse, ArrowDownRight, ArrowUpRight, Plus, Search, Filter, RefreshCw,
  TrendingUp, TrendingDown, Users, FileText, Printer, CheckCircle, AlertTriangle,
  IndianRupee, Download, Eye, Layers, Shield, Tag, History, Edit, Trash2, ChevronRight, Package, Undo2,
  ShieldAlert, Check, XCircle
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


export default function StoreManagement() {
  const navigate = useNavigate();
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

  const [loading, setLoading] = useState(false);

  // Fetch initial baseline data
  const fetchBaselineData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/store/stock-summary/'),
        api.get('/store/items/'),
        api.get('/store/categories/'),
        api.get('/suppliers/', { params: { nopage: true } }),
        api.get('/users/', { params: { role: 'contractor' } }),
        api.get('/store/contractor-persons/'),
        api.get('/production-units/'),
        api.get('/store/material-in/'),
        api.get('/store/daily-issues/'),
        api.get('/store/material-returns/'),
        api.get('/store/requisitions/'),
        api.get('/store/stock-adjustments/'),
      ]);

      if (results[0].status === 'fulfilled') setStockSummaryData(results[0].value.data);
      if (results[1].status === 'fulfilled') setItemsList(results[1].value.data.results || results[1].value.data || []);
      if (results[2].status === 'fulfilled') setCategories(results[2].value.data.results || results[2].value.data || []);
      if (results[3].status === 'fulfilled') setSuppliers(results[3].value.data.results || results[3].value.data || []);
      if (results[4].status === 'fulfilled') setContractors(results[4].value.data.results || results[4].value.data || []);
      if (results[5].status === 'fulfilled') setContractorPersons(results[5].value.data.results || results[5].value.data || []);
      if (results[6].status === 'fulfilled') setProductionUnits(results[6].value.data.results || results[6].value.data || []);
      if (results[7].status === 'fulfilled') setMaterialInList(results[7].value.data.results || results[7].value.data || []);
      if (results[8].status === 'fulfilled') setDailyIssuesList(results[8].value.data.results || results[8].value.data || []);
      if (results[9].status === 'fulfilled') setMaterialReturnsList(results[9].value.data.results || results[9].value.data || []);
      if (results[10]?.status === 'fulfilled') setRequisitionsList(results[10].value.data.results || results[10].value.data || []);
      if (results[11]?.status === 'fulfilled') setStockAdjustmentsList(results[11].value.data.results || results[11].value.data || []);
    } catch (err) {
      console.error('Failed to load store management baseline data', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve adjustment.');
    }
  };

  const handleRejectAdjustment = async (id) => {
    try {
      await api.post(`/store/stock-adjustments/${id}/reject/`);
      fetchBaselineData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject adjustment.');
    }
  };

  useEffect(() => {
    fetchBaselineData();
  }, [fetchBaselineData]);

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

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
          .desktop-only { display: block !important; }
          .desktop-table-view { display: block !important; }
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

      {/* Header Banner */}
      <div className="store-header-wrap" style={{
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
      <div className="store-module-nav-container">
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
                  type="text"
                  placeholder="Search store items by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem' }}
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
                style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: isRefreshingSummary ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <RefreshCw size={14} className={isRefreshingSummary ? 'spin-once' : ''} /> Refresh Summary
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view table-fade-slide-in" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
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
                    <TableSkeleton rows={8} cols={8} />
                  ) :
                    paginatedStockItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className="table-row-stagger"
                      onClick={() => {
                        const fullItem = itemsList.find(i => i.id === item.id || i.item_code === item.item_code) || item;
                        setSelectedDetailItem(fullItem);
                        setIsDetailModalOpen(true);
                      }}
                      title="Click to view full item details and image"
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: item.is_low_stock ? '#fff1f2' : 'transparent',
                        animationDelay: `${Math.min(idx * 20, 200)}ms`,
                        cursor: 'pointer'
                      }}
                    >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1e293b' }}>{item.item_code}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      {item.item_name}
                      {item.is_low_stock && (
                        <span style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fecaca', color: '#991b1b', fontWeight: 700 }}>
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0284c7', backgroundColor: '#f0f9ff' }}>
                      {item.stock_qty}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#ea580c', backgroundColor: '#fff7ed' }}>
                      {item.issued_qty}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: item.balance_qty < 0 ? '#dc2626' : '#16a34a', backgroundColor: '#f0fdf4' }}>
                      {item.balance_qty}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹ {item.rate.toFixed(2)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b' }}>{item.unit}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#8b5a2b' }}>
                      ₹ {item.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
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
                {/* Top Header: Box Icon Badge + Item Code + Item Name & Badges + Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: item.is_low_stock ? '#fee2e2' : '#fef3c7',
                    color: item.is_low_stock ? '#dc2626' : '#8b5a2b',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Package size={18} />
                    <span style={{ fontSize: '0.66rem', fontWeight: 850, marginTop: '1px' }}>{item.item_code}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {item.item_name}
                      </h4>
                      {item.is_low_stock && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#dc2626',
                          backgroundColor: '#fee2e2',
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
              currentPage={pageStockSummary}
              totalPages={Math.ceil(filteredStockItems.length / ITEMS_PER_PAGE)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          <div style={{ overflowX: 'auto' }}>
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
                ) :
                  paginatedItemMaster.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => { setSelectedDetailItem(item); setIsDetailModalOpen(true); }}
                    title="Click to view full details and image"
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
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
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageItemMaster}
              totalPages={Math.ceil(itemsList.length / ITEMS_PER_PAGE)}
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
            <button
              onClick={() => navigate('/store-management/material-in')}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowDownRight size={16} /> Record Material In
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                  {user?.role === 'admin' && (
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#166534' }}>Admin Controls</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={user?.role === 'admin' ? 11 : 10} />
                ) :
                  paginatedMaterialIn.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                    {user?.role === 'admin' && (
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleVoidVoucher('/store/material-in/', row.id, row.bill_no || row.id)}
                          title="Void / Delete Inward Voucher (Admin Audit Trail)"
                          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={13} /> Void
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageMaterialIn}
              totalPages={Math.ceil(materialInList.length / ITEMS_PER_PAGE)}
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
            <button
              onClick={() => navigate('/store-management/daily-issue')}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowUpRight size={16} /> Record Issue Entry
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                  {user?.role === 'admin' && (
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#9a3412' }}>Admin Controls</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={user?.role === 'admin' ? 12 : 11} />
                ) :
                  paginatedDailyIssues.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{row.voucher_no}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{row.contractor_name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#1e293b' }}>{row.contractor_person_name || 'Self'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{row.item_name}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#ea580c' }}>{row.qty}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b' }}>{row.unit}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>₹ {parseFloat(row.rate).toFixed(2)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
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
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#c2410c' }}>
                      {parseFloat(row.chargeable_total) > 0 ? `₹ ${parseFloat(row.chargeable_total).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {parseFloat(row.non_chargeable_total) > 0 ? `₹ ${parseFloat(row.non_chargeable_total).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{row.production_unit_name || '-'}</td>
                    {user?.role === 'admin' && (
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleVoidVoucher('/store/daily-issues/', row.id, row.voucher_no)}
                          title="Void / Delete Daily Issue Voucher (Admin Audit Trail)"
                          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={13} /> Void
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageDailyIssue}
              totalPages={Math.ceil(filteredDailyIssues.length / ITEMS_PER_PAGE)}
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
            <button
              onClick={() => setIsMaterialReturnModalOpen(true)}
              style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={16} /> Record Material Return
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} cols={8} />
                ) : materialReturnsList.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      No material return vouchers recorded yet.
                    </td>
                  </tr>
                ) : (
                  materialReturnsList.map((ret, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                      </td>
                      {user?.role === 'admin' && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleVoidVoucher('/store/material-returns/', ret.id, ret.voucher_no)}
                            title="Void / Delete Return Voucher (Admin Audit Trail)"
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={13} /> Void
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
            <button
              onClick={() => setIsRequisitionModalOpen(true)}
              style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> New Material Requisition
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                            onClick={() => navigate(`/store-management/daily-issue?item=${mrn.item}&qty=${mrn.requested_qty}`)}
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
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldAlert size={16} /> Log Stock Variance
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
        </div>
      )}

      {/* TAB 5: CONTRACTORS & WORKERS DIRECTORY */}
      {activeTab === 'contractors' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Contractors & Worker Delegate Directory (Excel Sheet 3)
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                {paginatedContractors.map((c, idx) => {
                  const workerPerson = contractorPersons.find(p => String(p.contractor) === String(c.id));
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {c.full_name || c.username}
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
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageContractors}
              totalPages={Math.ceil(contractors.length / ITEMS_PER_PAGE)}
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
          </div>

          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {paginatedBillingContractors.map((c, idx) => (
              <div key={idx} style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {c.full_name || c.username}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Phone: {c.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Jul-26 Settlement</span>
                  <button
                    onClick={() => { setSelectedContractorForBill(c); setIsBillingModalOpen(true); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#8b5a2b', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={15} /> View Bill Statement
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
            <Pagination
              currentPage={pageBilling}
              totalPages={Math.ceil(contractors.length / ITEMS_PER_PAGE)}
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
    </div>
  );
}
