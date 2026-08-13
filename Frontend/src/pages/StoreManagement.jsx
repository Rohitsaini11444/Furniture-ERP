import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse, ArrowDownRight, ArrowUpRight, Plus, Search, Filter, RefreshCw,
  TrendingUp, TrendingDown, Users, FileText, Printer, CheckCircle, AlertTriangle,
  DollarSign, Download, Eye, Layers, Shield, Tag, History, Edit, Trash2, ChevronRight, Package
} from 'lucide-react';
import api from '../api/axios';

import StoreRateComparisonModal from '../components/StoreRateComparisonModal';
import ContractorBillingStatementModal from '../components/ContractorBillingStatementModal';

export default function StoreManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stock-summary'); // 'stock-summary' | 'item-master' | 'material-in' | 'daily-issue' | 'contractors' | 'billing'

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

  const [isMaterialInModalOpen, setIsMaterialInModalOpen] = useState(false);
  const [isDailyIssueModalOpen, setIsDailyIssueModalOpen] = useState(false);

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
    } catch (err) {
      console.error('Failed to load store management baseline data', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
            onClick={() => navigate('/store-management/item-master/new')}
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

      {/* Desktop KPI Stats Cards Bar */}
      <div className="desktop-only" style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          {/* Card 1: Total Stock Qty */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase' }}>Inventory Valuation (₹)</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={18} />
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
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 500 }}>
              Current Inventory Value
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: '#ffffff',
        padding: '0.5rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('stock-summary')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'stock-summary' ? '#8b5a2b' : 'transparent',
            color: activeTab === 'stock-summary' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={16} />
          <span>Stock Summary (Excel Sheet 1)</span>
        </button>

        <button
          onClick={() => setActiveTab('item-master')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'item-master' ? '#8b5a2b' : 'transparent',
            color: activeTab === 'item-master' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Tag size={16} />
          <span>Item Master & Rate Comparison (Sheet 5)</span>
        </button>

        <button
          onClick={() => setActiveTab('material-in')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'material-in' ? '#8b5a2b' : 'transparent',
            color: activeTab === 'material-in' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <ArrowDownRight size={16} />
          <span>Material In (Sheet 4)</span>
        </button>

        <button
          onClick={() => setActiveTab('daily-issue')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'daily-issue' ? '#8b5a2b' : 'transparent',
            color: activeTab === 'daily-issue' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <ArrowUpRight size={16} />
          <span>Daily Issue Entry (Sheet 2)</span>
        </button>

        <button
          onClick={() => setActiveTab('contractors')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'contractors' ? '#8b5a2b' : 'transparent',
            color: activeTab === 'contractors' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={16} />
          <span>Contractors Directory (Sheet 3)</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'billing' ? '#8b5a2b' : 'transparent',
            color: activeTab === 'billing' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={16} />
          <span>Monthly Contractor Billing</span>
        </button>
      </div>

      {/* Main Content Sections based on Active Tab */}

      {/* TAB 1: STOCK SUMMARY */}
      {activeTab === 'stock-summary' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '400px' }}>
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
              onClick={fetchBaselineData}
              style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} /> Refresh Summary
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
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
                {filteredStockItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.is_low_stock ? '#fff1f2' : 'transparent' }}>
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

          {/* Mobile Stock Item Cards List (Image 2 Screenshot) */}
          <div className="mobile-only" style={{ padding: '0.85rem' }}>
            {filteredStockItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/store-management/item-master/edit/${item.id}`)}
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
        </div>
      )}

      {/* TAB 2: ITEM MASTER & RATE COMPARISON */}
      {activeTab === 'item-master' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Item Master Catalog & Historical Rate Tracker
            </h3>
            <button
              onClick={() => { setSelectedItemForEdit(null); setIsItemModalOpen(true); }}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#8b5a2b', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add Store Item
            </button>
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
                {itemsList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => { setSelectedItemForRate(item); setIsRateModalOpen(true); }}
                          title="View Rate Comparison & Revise Rate"
                          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', color: '#0284c7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <TrendingUp size={14} /> Compare Rate
                        </button>

                        <button
                          onClick={() => navigate(`/store-management/item-master/edit/${item.id}`)}
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
                </tr>
              </thead>
              <tbody>
                {materialInList.map((row, idx) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
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
                </tr>
              </thead>
              <tbody>
                {filteredDailyIssues.map((row, idx) => (
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
                  </tr>
                ))}
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
                {contractors.map((c, idx) => {
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
            {contractors.map((c, idx) => (
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
        </div>
      )}

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
    </div>
  );
}
