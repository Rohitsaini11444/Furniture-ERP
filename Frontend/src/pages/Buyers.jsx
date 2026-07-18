import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, ArrowLeft, ShoppingBag, Package, CheckCircle, Clock, Edit } from 'lucide-react';

function Buyers() {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Soft Delete Audit state
  const [deleteBuyerId, setDeleteBuyerId] = useState(null);
  const [deleteBuyerName, setDeleteBuyerName] = useState('');
  const [deleteNote, setDeleteNote] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Buyer Details Tab state
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [buyerDetails, setBuyerDetails] = useState({
    pos: [],
    buyerMasters: [],
    salesOrders: [],
  });
  const [activeTab, setActiveTab] = useState('Overview');
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const emptyForm = {
    name: '',
    code: '',
    email: '',
    phone: '',
    address: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchBuyers = () => {
    api.get('/buyers/')
      .then(res => setBuyers(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (buyer) => {
    setFormData({
      name: buyer.name,
      code: buyer.code,
      email: buyer.email || '',
      phone: buyer.phone || '',
      address: buyer.address || ''
    });
    setEditingId(buyer.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const request = editingId
      ? api.put(`/buyers/${editingId}/`, formData)
      : api.post('/buyers/', formData);

    request
      .then(() => {
        setIsModalOpen(false);
        setEditingId(null);
        fetchBuyers();
      })
      .catch(err => console.error(err));
  };

  const openDeleteModal = (buyer) => {
    setDeleteBuyerId(buyer.id);
    setDeleteBuyerName(buyer.name);
    setDeleteNote('');
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteNote.trim()) return;
    api.delete(`/buyers/${deleteBuyerId}/?note=${encodeURIComponent(deleteNote)}`)
      .then(() => {
        setIsDeleteModalOpen(false);
        setDeleteBuyerId(null);
        setDeleteBuyerName('');
        setDeleteNote('');
        fetchBuyers();
      })
      .catch(err => console.error(err));
  };

  const handleViewDetails = (buyer) => {
    setSelectedBuyer(buyer);
    setLoadingDetails(true);
    
    Promise.all([
      api.get(`/pos/?buyer=${buyer.id}`),
      api.get(`/buyer-masters/?buyer=${buyer.id}`),
      api.get('/sales-orders/')
    ]).then(([posRes, bmRes, soRes]) => {
      const matchingSO = soRes.data.filter(so => 
        so.buyer_name?.toLowerCase() === buyer.name?.toLowerCase() ||
        so.po_no?.toLowerCase() === buyer.code?.toLowerCase()
      );
      
      setBuyerDetails({
        pos: posRes.data,
        buyerMasters: bmRes.data,
        salesOrders: matchingSO,
      });
      setActiveTab('Overview');
    }).catch(err => {
      console.error("Error fetching buyer details", err);
    }).finally(() => {
      setLoadingDetails(false);
    });
  };

  const filteredBuyers = buyers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {selectedBuyer ? (
        <div className="buyer-detail-view" style={{ padding: '1rem 0' }}>
          {/* Back Link */}
          <button 
            onClick={() => setSelectedBuyer(null)} 
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
            <ArrowLeft size={18} /> Back to Buyers
          </button>

          {/* Profile Card */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f5efe6',
                color: '#8b5a2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.5rem',
                border: '2px solid #e7d8c9'
              }}>
                {(selectedBuyer.name || 'B').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>{selectedBuyer.name}</h2>
                  <span className="navbar-role-badge admin-badge" style={{ fontSize: '0.8rem', padding: '0.1rem 0.5rem' }}>{selectedBuyer.code}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span>✉️ {selectedBuyer.email || 'No email provided'}</span>
                  <span>📍 {selectedBuyer.address || 'No address details'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flex: 1, justifyContent: 'center', minWidth: '200px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Buyer Code</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-color)' }}>{selectedBuyer.code}</strong>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Phone</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-color)' }}>{selectedBuyer.phone || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => openEditModal(selectedBuyer)} 
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <Edit size={16} /> Edit Buyer
              </button>
              <button 
                onClick={() => openDeleteModal(selectedBuyer)} 
                className="btn-secondary" 
                style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '0.5rem 1rem' }}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            gap: '2rem'
          }}>
            {['Overview', 'Samples', 'POs', 'Sales Orders'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '3px solid #8b5a2b' : '3px solid transparent',
                  color: activeTab === tab ? '#8b5a2b' : 'var(--text-muted)',
                  fontWeight: activeTab === tab ? 600 : 500,
                  padding: '0.75rem 0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'Overview' && '🏠 Overview'}
                {tab === 'Samples' && '📦 Samples'}
                {tab === 'POs' && '📄 POs'}
                {tab === 'Sales Orders' && '💼 Sales Orders'}
              </button>
            ))}
          </div>

          {/* Loader or Content */}
          {loadingDetails ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading buyer statistics...</div>
          ) : (
            <div>
              {activeTab === 'Overview' && (
                <div>
                  {/* Stats Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                  }}>
                    {/* Card 1 */}
                    <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#eefdf4', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={22} /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Active POs</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.pos.filter(po => po.status !== 'Completed').length}
                        </strong>
                      </div>
                    </div>
                    {/* Card 2 */}
                    <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={22} /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Total Items</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.pos.reduce((sum, po) => sum + (po.units || 0), 0)}
                        </strong>
                      </div>
                    </div>
                    {/* Card 3 */}
                    <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={22} /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>In Production</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.pos.filter(po => po.status === 'Production').reduce((sum, po) => sum + (po.units || 0), 0)}
                        </strong>
                      </div>
                    </div>
                    {/* Card 4 */}
                    <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#faf5ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={22} /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Dispatched</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.pos.filter(po => po.status === 'Dispatched').reduce((sum, po) => sum + (po.units || 0), 0)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Left & Right Section Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                    {/* Recent POs Table */}
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>Recent Purchase Orders</h3>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '0.875rem' }}>
                          <thead>
                            <tr>
                              <th>PO Number</th>
                              <th>Quantity</th>
                              <th>Status</th>
                              <th>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {buyerDetails.pos.slice(0, 5).map(po => (
                              <tr 
                                key={po.id}
                                onClick={() => navigate(`/pos/${po.id}`)}
                                style={{ cursor: 'pointer' }}
                                title="Click to view/edit PO"
                              >
                                <td><strong>{po.po}</strong></td>
                                <td>{po.units || '—'}</td>
                                <td>
                                  <span 
                                    className="navbar-role-badge" 
                                    style={{
                                      backgroundColor: po.status === 'Confirmed' ? '#dcfce7' : po.status === 'Production' ? '#dbeafe' : po.status === 'Dispatched' ? '#f3e8ff' : '#f3f4f6',
                                      color: po.status === 'Confirmed' ? '#15803d' : po.status === 'Production' ? '#1d4ed8' : po.status === 'Dispatched' ? '#6b21a8' : '#374151',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {po.status || 'Confirmed'}
                                  </span>
                                </td>
                                <td>${parseFloat(po.total_amount || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                            {buyerDetails.pos.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No POs found for this buyer.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Buyer Overview Card */}
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1.25rem', marginTop: 0 }}>ℹ️ Buyer Overview</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total POs</span>
                          <strong style={{ color: 'var(--text-color)' }}>{buyerDetails.pos.length}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Sales Orders</span>
                          <strong style={{ color: 'var(--text-color)' }}>{buyerDetails.salesOrders.length}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Value</span>
                          <strong style={{ color: '#8b5a2b' }}>
                            ${buyerDetails.pos.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0).toLocaleString()}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Payment Terms</span>
                          <strong style={{ color: 'var(--text-color)' }}>30 Days</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Samples' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1rem', marginTop: 0 }}>Registered Samples & Styles</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Style No</th>
                          <th>Product Name</th>
                          <th>Wood Type</th>
                          <th>Finish Color</th>
                          <th>Dimensions (L×B×H)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyerDetails.buyerMasters.map(bm => (
                          <tr 
                            key={bm.id}
                            onClick={() => navigate(`/buyer-masters/${bm.id}`)}
                            style={{ cursor: 'pointer' }}
                            title="Click to view/edit style"
                          >
                            <td><span className="navbar-role-badge admin-badge">{bm.style_no}</span></td>
                            <td><strong>{bm.product_name}</strong></td>
                            <td>{bm.wood_type}</td>
                            <td>{bm.finish_color}</td>
                            <td>{bm.size_length} × {bm.size_breadth} × {bm.size_height} cm</td>
                          </tr>
                        ))}
                        {buyerDetails.buyerMasters.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No styles registered for this buyer yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'POs' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1rem', marginTop: 0 }}>All Purchase Orders</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>PO #</th>
                          <th>Style No</th>
                          <th>Units</th>
                          <th>Total CBM</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyerDetails.pos.map(po => (
                          <tr 
                            key={po.id}
                            onClick={() => navigate(`/pos/${po.id}`)}
                            style={{ cursor: 'pointer' }}
                            title="Click to view/edit PO"
                          >
                            <td><strong>{po.po}</strong></td>
                            <td><span className="navbar-role-badge admin-badge">{po.buyer_master_detail?.style_no}</span></td>
                            <td>{po.units || '—'}</td>
                            <td>{po.total_cbm} CBM</td>
                            <td>${parseFloat(po.total_amount || 0).toLocaleString()}</td>
                            <td>
                              <span 
                                className="navbar-role-badge" 
                                style={{
                                  backgroundColor: po.status === 'Confirmed' ? '#dcfce7' : po.status === 'Production' ? '#dbeafe' : po.status === 'Dispatched' ? '#f3e8ff' : '#f3f4f6',
                                  color: po.status === 'Confirmed' ? '#15803d' : po.status === 'Production' ? '#1d4ed8' : po.status === 'Dispatched' ? '#6b21a8' : '#374151'
                                }}
                              >
                                {po.status || 'Confirmed'}
                              </span>
                            </td>
                            <td>{po.remark || '—'}</td>
                          </tr>
                        ))}
                        {buyerDetails.pos.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No POs found for this buyer.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'Sales Orders' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1rem', marginTop: 0 }}>Sales Orders</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Sales Order No</th>
                          <th>Order Date</th>
                          <th>PO No</th>
                          <th>Sample Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyerDetails.salesOrders.map(so => (
                          <tr key={so.id}>
                            <td><strong>{so.sales_order_no}</strong></td>
                            <td>{so.order_date}</td>
                            <td>{so.po_no}</td>
                            <td>{so.sample_detail?.sample_id || so.sample}</td>
                          </tr>
                        ))}
                        {buyerDetails.salesOrders.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No sales orders matched this buyer's name.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="page-header">
            <h2>Buyers</h2>
            <button onClick={openCreateModal} className="btn-primary">+ Create New Buyer</button>
          </div>

          {/* Filter / Search Bar */}
          <div className="filter-bar">
            <div className="filter-bar-inner">
              <Search size={16} className="filter-icon" />
              <span className="filter-label">Search:</span>
              <input
                type="text"
                className="filter-input"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flexGrow: 1 }}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Buyer Name</th>
                  <th>Buyer Code</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuyers.map(b => (
                  <tr key={b.id}>
                    <td>
                      <button 
                        onClick={() => handleViewDetails(b)} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          padding: 0, 
                          font: 'inherit', 
                          cursor: 'pointer', 
                          textAlign: 'left', 
                          fontWeight: 'bold', 
                          color: '#8b5a2b' 
                        }}
                      >
                        {b.name}
                      </button>
                    </td>
                    <td><span className="navbar-role-badge admin-badge">{b.code}</span></td>
                    <td>{b.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{b.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{b.address || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEditModal(b)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginRight: 0 }}>Edit</button>
                        <button onClick={() => openDeleteModal(b)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBuyers.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No buyers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ Edit Buyer' : '+ Create New Buyer'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Buyer Name *</label>
                  <input required type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} placeholder="e.g. Acme Furniture Inc" />
                </div>
                <div className="form-group">
                  <label className="form-label">Buyer Code *</label>
                  <input required type="text" name="code" className="form-input" value={formData.code} onChange={handleChange} placeholder="e.g. ACM-01" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} placeholder="e.g. buyer@acme.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" name="phone" className="form-input" value={formData.phone} onChange={handleChange} placeholder="e.g. +1 555-0199" />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea name="address" className="form-input" rows="3" value={formData.address} onChange={handleChange} placeholder="Billing/Shipping Address..."></textarea>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Buyer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ borderBottomColor: '#fee2e2' }}>
              <h2 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ Delete Buyer
              </h2>
              <button className="modal-close" onClick={() => setIsDeleteModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-color)', fontSize: '0.95rem' }}>
                Are you sure you want to delete buyer <strong>{deleteBuyerName}</strong>? This action is permanent and will archive their record.
              </p>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Why do you want to delete this buyer? *</label>
                <textarea
                  required
                  className="form-input"
                  rows="3"
                  value={deleteNote}
                  onChange={e => setDeleteNote(e.target.value)}
                  placeholder="Enter deletion reason / audit note..."
                ></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                  disabled={!deleteNote.trim()}
                  onClick={confirmDelete}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Buyers;
