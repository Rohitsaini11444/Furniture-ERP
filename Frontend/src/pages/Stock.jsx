import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, Download, Plus, ArrowLeft, ChevronRight, Package, Warehouse, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';

function Stock() {
  const navigate = useNavigate();

  const [stockItems, setStockItems] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  
  // Selection
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const emptyForm = {
    style_no: '',
    item_name: '',
    quantity: '',
    unit: 'pcs',
    unit_price: '',
    location: 'Main Store',
    status: 'In Stock',
    buyer: '',
    sample: '',
    remarks: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = () => {
    setLoading(true);
    const params = {
      page: currentPage,
      ordering: ordering,
    };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (buyerFilter) params.buyer = buyerFilter;

    api.get('/stock/', { params })
      .then(res => {
        const data = res.data.results || res.data;
        setStockItems(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error('Failed to fetch stock items', err))
      .finally(() => setLoading(false));

    api.get('/buyers/', { params: { nopage: true } })
      .then(res => setBuyers(res.data))
      .catch(err => console.error(err));

    api.get('/samples/', { params: { nopage: true } })
      .then(res => setSamples(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, ordering, statusFilter, buyerFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, buyerFilter, ordering]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDownloadExcel = () => {
    api.get('/stock/export-excel/', { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Inventory_Stock.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Failed to export excel', err);
        alert('Failed to download Stock Excel. Please try again.');
      });
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      style_no: item.style_no || '',
      item_name: item.item_name || '',
      quantity: item.quantity || '',
      unit: item.unit || 'pcs',
      unit_price: item.unit_price || '',
      location: item.location || 'Main Store',
      status: item.status || 'In Stock',
      buyer: item.buyer || '',
      sample: item.sample || '',
      remarks: item.remarks || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.buyer) delete payload.buyer;
    if (!payload.sample) delete payload.sample;

    const request = editingId
      ? api.put(`/stock/${editingId}/`, payload)
      : api.post('/stock/', payload);

    request
      .then(() => {
        closeModal();
        fetchData();
      })
      .catch(err => {
        console.error('Failed to save stock item', err);
        alert('Failed to save stock item. Please check inputs.');
      });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from Stock?`)) {
      api.delete(`/stock/${id}/`)
        .then(() => fetchData())
        .catch(err => console.error('Failed to delete stock item', err));
    }
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
      setSelectedRowIds(new Set(stockItems.map(s => s.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  // KPI calculations
  const totalStockItems = stockItems.length;
  const totalQuantity = stockItems.reduce((acc, i) => acc + (parseFloat(i.quantity) || 0), 0);
  const totalValue = stockItems.reduce((acc, i) => acc + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0)), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return <span className="navbar-role-badge contractor-badge">In Stock</span>;
      case 'Low Stock':
        return <span className="navbar-role-badge supervisor-badge" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>Low Stock</span>;
      case 'Reserved':
        return <span className="navbar-role-badge admin-badge" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>Reserved</span>;
      case 'Out of Stock':
        return <span className="navbar-role-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>Out of Stock</span>;
      default:
        return <span className="navbar-role-badge admin-badge">{status}</span>;
    }
  };

  return (
    <div>
      {showModal ? (
        <div className="new-page-form" style={{ padding: '1rem 0' }}>
          <button 
            onClick={closeModal} 
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
            <ArrowLeft size={18} /> Back to Stock Registry
          </button>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {editingId ? '✏️ Edit Stock Item' : '📦 Add New Stock Item'}
              </h2>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h3 className="form-section-title">📋 Item Details</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Style No *</label>
                      <input required type="text" name="style_no" className="form-input" value={formData.style_no} onChange={handleChange} placeholder="e.g. STY-2026-X" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Item / Product Name *</label>
                      <input required type="text" name="item_name" className="form-input" value={formData.item_name} onChange={handleChange} placeholder="e.g. Sheesham Wood Chair" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stock Quantity *</label>
                      <input required type="number" step="0.01" name="quantity" className="form-input" value={formData.quantity} onChange={handleChange} placeholder="e.g. 50" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit *</label>
                      <input required type="text" name="unit" className="form-input" value={formData.unit} onChange={handleChange} placeholder="e.g. pcs / set" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit Price (INR/USD)</label>
                      <input type="number" step="0.01" name="unit_price" className="form-input" value={formData.unit_price} onChange={handleChange} placeholder="e.g. 120.00" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Storage Location</label>
                      <input type="text" name="location" className="form-input" value={formData.location} onChange={handleChange} placeholder="e.g. Main Warehouse - Bay 4" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Status *</label>
                      <select name="status" className="form-input" value={formData.status} onChange={handleChange}>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Associated Buyer (Optional)</label>
                      <select name="buyer" className="form-input" value={formData.buyer} onChange={handleChange}>
                        <option value="">Select Buyer...</option>
                        {buyers.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Remarks / Storage Notes</label>
                      <textarea name="remarks" className="form-input" rows="2" value={formData.remarks} onChange={handleChange} placeholder="Any specific storage instructions or notes..."></textarea>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Add to Stock'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="page-header">
            <div>
              <h2>Inventory Stock Registry</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Track passed pieces and warehouse stock availability.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleDownloadExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={16} /> Export Excel
              </button>
              <button onClick={openCreateModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={16} /> + Add Stock Item
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.75rem', borderRadius: '10px' }}>
                <Package size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL STOCK ITEMS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalStockItems}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.75rem', borderRadius: '10px' }}>
                <Warehouse size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL PASSED QUANTITY</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalQuantity.toLocaleString()} pcs</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.75rem', borderRadius: '10px' }}>
                <Tag size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ESTIMATED STOCK VALUE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="bm-filter-container">
              <div className="bm-search">
                <Search size={18} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search by style no, product, location..."
                  className="filter-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="bm-export">
                <span className="filter-label">Filter Status:</span>
                <select
                  className="filter-input"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ minWidth: '140px' }}
                >
                  <option value="">All Statuses</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              <div className="bm-export">
                <span className="filter-label">Filter Buyer:</span>
                <select
                  className="filter-input"
                  value={buyerFilter}
                  onChange={e => setBuyerFilter(e.target.value)}
                  style={{ minWidth: '150px' }}
                >
                  <option value="">All Buyers</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="bm-order">
                <span className="filter-label">Order By:</span>
                <select
                  className="filter-input"
                  value={ordering}
                  onChange={e => setOrdering(e.target.value)}
                  style={{ minWidth: '130px', marginLeft: '0.5rem' }}
                >
                  <option value="-created_at">Latest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="-quantity">Quantity (High to Low)</option>
                  <option value="quantity">Quantity (Low to High)</option>
                  <option value="style_no">Style No (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={stockItems.length > 0 && selectedRowIds.size === stockItems.length}
                      onChange={toggleSelectAll}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                  </th>
                  <th>Style No</th>
                  <th>Item / Product Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>PO / Buyer Ref</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={9} hasImage={false} />
                ) : stockItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No items in Stock registry.
                    </td>
                  </tr>
                ) : (
                  stockItems.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => openEditModal(item)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedRowIds.has(item.id) ? '#dcfce7' : undefined,
                        transition: 'background-color 0.2s ease',
                      }}
                      className="smooth-fade-in"
                      title="Click to edit stock item"
                    >
                      <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(item.id)}
                          onChange={e => toggleSelectRow(item.id, e)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                        />
                      </td>
                      <td>
                        <span className="navbar-role-badge admin-badge" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                          {item.style_no}
                        </span>
                      </td>
                      <td>
                        <strong>{item.item_name}</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                          {parseFloat(item.quantity || 0)} {item.unit}
                        </span>
                      </td>
                      <td>{item.unit_price ? `₹${parseFloat(item.unit_price).toLocaleString()}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td>{item.location || 'Main Store'}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        {item.po_number_str ? (
                          <div style={{ fontSize: '0.8rem', color: '#14b8a6', fontWeight: 600 }}>PO: {item.po_number_str}</div>
                        ) : item.buyer_detail ? (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.buyer_detail.name}</div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.item_name); }} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="mobile-only mobile-card-list">
            {loading ? (
              <CardSkeleton count={5} />
            ) : stockItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No stock items found.
              </div>
            ) : (
              stockItems.map(item => (
                <div 
                  className="mobile-card smooth-fade-in" 
                  key={item.id} 
                  onClick={() => openEditModal(item)}
                  style={{ backgroundColor: selectedRowIds.has(item.id) ? '#f0fdf4' : '#fff' }}
                >
                  <div onClick={e => e.stopPropagation()} className="mobile-card-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRowIds.has(item.id)}
                      onChange={e => toggleSelectRow(item.id, e)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                  </div>

                  <div className="mobile-card-content" style={{ paddingLeft: '0.5rem' }}>
                    <div className="mobile-card-title">{item.item_name}</div>
                    <div className="mobile-card-subtitle" style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="navbar-role-badge admin-badge" style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '2px 8px' }}>
                        {item.style_no}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="mobile-card-subtitle" style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#059669', fontWeight: 'bold' }}>
                      Stock: {parseFloat(item.quantity || 0)} {item.unit} ({item.location || 'Main Store'})
                    </div>
                  </div>

                  <div className="mobile-card-arrow">
                    <ChevronRight size={20} color="#94a3b8" />
                  </div>
                </div>
              ))
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

export default Stock;
