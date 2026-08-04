import React, { useState, useEffect, useCallback } from 'react';
import {
  Warehouse, ArrowDownRight, ArrowUpRight, Plus, Search, Filter, RefreshCw,
  TrendingUp, TrendingDown, Users, FileText, Printer, CheckCircle, AlertTriangle,
  DollarSign, Download, Eye, Layers, Shield, Tag, History, Edit, Trash2
} from 'lucide-react';
import api from '../api/axios';

import StoreItemMasterModal from '../components/StoreItemMasterModal';
import StoreRateComparisonModal from '../components/StoreRateComparisonModal';
import StoreMaterialInModal from '../components/StoreMaterialInModal';
import StoreDailyIssueModal from '../components/StoreDailyIssueModal';
import ContractorBillingStatementModal from '../components/ContractorBillingStatementModal';

export default function StoreManagement() {
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
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header Banner */}
      <div style={{
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
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Warehouse size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Store Management Hub
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
            Manage store materials (Fevicol, Hardware, Bond, Lacquer, Thinner, Sand paper, Tapes), Stock Credit/Debit, Contractor Issues & Monthly Deduction Billing
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsMaterialInModalOpen(true)}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontWeight: 600,
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
            onClick={() => setIsDailyIssueModalOpen(true)}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              fontWeight: 600,
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
            onClick={() => {
              setSelectedItemForEdit(null);
              setIsItemModalOpen(true);
            }}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontWeight: 600,
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

      {/* KPI Stats Cards Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
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

          <div style={{ overflowX: 'auto' }}>
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
                          onClick={() => { setSelectedItemForEdit(item); setIsItemModalOpen(true); }}
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
              onClick={() => setIsMaterialInModalOpen(true)}
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
              onClick={() => setIsDailyIssueModalOpen(true)}
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
      <StoreItemMasterModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={selectedItemForEdit}
        categories={categories}
        onSuccess={fetchBaselineData}
      />

      <StoreRateComparisonModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        item={selectedItemForRate}
        onSuccess={fetchBaselineData}
      />

      <StoreMaterialInModal
        isOpen={isMaterialInModalOpen}
        onClose={() => setIsMaterialInModalOpen(false)}
        items={itemsList}
        suppliers={suppliers}
        units={productionUnits}
        onSuccess={fetchBaselineData}
      />

      <StoreDailyIssueModal
        isOpen={isDailyIssueModalOpen}
        onClose={() => setIsDailyIssueModalOpen(false)}
        items={itemsList}
        contractors={contractors}
        persons={contractorPersons}
        units={productionUnits}
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
