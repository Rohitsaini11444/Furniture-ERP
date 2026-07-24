import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { X, Search, ArrowLeft, ShoppingBag, Package, CheckCircle, Clock, Edit, ChevronRight, Layers, Receipt, ClipboardList, FileText } from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import { OrderBySelect, ORDER_OPTIONS_DATE_STYLE, ORDER_OPTIONS_DATE_PINO, ORDER_OPTIONS_DATE_PONO, ORDER_OPTIONS_DATE_NAME } from '../components/OrderBySelect';
import { StatusSelect, PO_STATUS_OPTIONS } from '../components/StatusSelect';


function Buyers() {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
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
    buyerMasters: [],
    buyerPIs: [],
    pos: [],
  });
  const [activeTab, setActiveTab] = useState('Overview');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { id } = useParams();
  
  // Pagination & Ordering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ordering, setOrdering] = useState('-created_at');

  // Tab-specific filters & pagination (50/page)
  const [bmSearch, setBmSearch] = useState('');
  const [bmOrder, setBmOrder] = useState('-created_at');
  const [bmPage, setBmPage] = useState(1);

  const [piSearch, setPiSearch] = useState('');
  const [piOrder, setPiOrder] = useState('-created_at');
  const [piPage, setPiPage] = useState(1);

  const [poSearch, setPoSearch] = useState('');
  const [poStatus, setPoStatus] = useState('all');
  const [poOrder, setPoOrder] = useState('-created_at');
  const [poPage, setPoPage] = useState(1);
  
  const emptyForm = {
    name: '',
    code: '',
    email: '',
    phone: '',
    address: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchBuyers = () => {
    setLoading(true);
    api.get('/buyers/', { params: { page: currentPage, ordering: ordering } })
      .then(res => {
        const data = res.data.results || res.data;
        setBuyers(data);
        if (res.data.count !== undefined) {
          setTotalPages(Math.ceil(res.data.count / 50));
        } else {
          setTotalPages(1);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBuyers();
  }, [currentPage, ordering]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ordering]);

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

  useEffect(() => {
    if (id) {
      setLoadingDetails(true);
      api.get(`/buyers/${id}/`).then(buyerRes => {
        const buyer = buyerRes.data;
        setSelectedBuyer(buyer);
        
        Promise.all([
          api.get('/buyer-masters/', { params: { buyer: buyer.id, nopage: true } }),
          api.get('/buyer-pis/', { params: { buyer: buyer.id, nopage: true } }),
          api.get('/supplier-pos/', { params: { buyer: buyer.id, nopage: true } })
        ]).then(([bmRes, piRes, poRes]) => {
          const bmList = bmRes.data.results || bmRes.data || [];
          const piList = piRes.data.results || piRes.data || [];
          const poList = poRes.data.results || poRes.data || [];
          
          setBuyerDetails({
            buyerMasters: bmList,
            buyerPIs: piList,
            pos: poList,
          });
          setActiveTab('Overview');
        }).catch(err => {
          console.error("Error fetching buyer details", err);
        }).finally(() => {
          setLoadingDetails(false);
        });
      }).catch(err => {
        console.error("Error fetching buyer", err);
        setLoadingDetails(false);
      });
    } else {
      setSelectedBuyer(null);
    }
  }, [id]);

  const filteredBuyers = buyers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 1. Buyer Masters filtering & pagination
  const filteredBMs = buyerDetails.buyerMasters.filter(bm =>
    !bmSearch ||
    bm.style_no?.toLowerCase().includes(bmSearch.toLowerCase()) ||
    bm.product_name?.toLowerCase().includes(bmSearch.toLowerCase()) ||
    bm.wood_type?.toLowerCase().includes(bmSearch.toLowerCase()) ||
    bm.finish_color?.toLowerCase().includes(bmSearch.toLowerCase())
  ).sort((a, b) => {
    if (bmOrder === '-created_at') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (bmOrder === 'created_at') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (bmOrder === 'style_no') return (a.style_no || '').localeCompare(b.style_no || '');
    if (bmOrder === '-style_no') return (b.style_no || '').localeCompare(a.style_no || '');
    if (bmOrder === 'price_usd') return (parseFloat(a.price_usd) || 0) - (parseFloat(b.price_usd) || 0);
    if (bmOrder === '-price_usd') return (parseFloat(b.price_usd) || 0) - (parseFloat(a.price_usd) || 0);
    return 0;
  });
  const bmTotalPages = Math.max(1, Math.ceil(filteredBMs.length / 50));
  const paginatedBMs = filteredBMs.slice((bmPage - 1) * 50, bmPage * 50);

  // 2. Buyer PIs filtering & pagination
  const filteredPIs = buyerDetails.buyerPIs.filter(pi =>
    !piSearch ||
    pi.pi_no?.toLowerCase().includes(piSearch.toLowerCase()) ||
    pi.payment_terms?.toLowerCase().includes(piSearch.toLowerCase()) ||
    (pi.delivered_to_company || pi.delivered_to_name || '').toLowerCase().includes(piSearch.toLowerCase())
  ).sort((a, b) => {
    if (piOrder === '-created_at') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (piOrder === 'created_at') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (piOrder === 'pi_no') return (a.pi_no || '').localeCompare(b.pi_no || '');
    if (piOrder === '-pi_no') return (b.pi_no || '').localeCompare(a.pi_no || '');
    return 0;
  });
  const piTotalPages = Math.max(1, Math.ceil(filteredPIs.length / 50));
  const paginatedPIs = filteredPIs.slice((piPage - 1) * 50, piPage * 50);

  // 3. Supplier POs filtering & pagination
  const filteredPOs = buyerDetails.pos.filter(po => {
    const matchesSearch = !poSearch ||
      po.po_number?.toLowerCase().includes(poSearch.toLowerCase()) ||
      (po.supplier_name || po.supplier?.name || '').toLowerCase().includes(poSearch.toLowerCase());
    const matchesStatus = poStatus === 'all' || po.status === poStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (poOrder === '-created_at') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (poOrder === 'created_at') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (poOrder === 'po_number') return (a.po_number || '').localeCompare(b.po_number || '');
    if (poOrder === '-po_number') return (b.po_number || '').localeCompare(a.po_number || '');
    return 0;
  });
  const poTotalPages = Math.max(1, Math.ceil(filteredPOs.length / 50));
  const paginatedPOs = filteredPOs.slice((poPage - 1) * 50, poPage * 50);

  return (
    <div>
      {selectedBuyer ? (
        <div className="buyer-detail-view" style={{ padding: '1rem 0' }}>
          {/* Back Link */}
          <button 
            onClick={() => navigate('/buyers')} 
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
          <div className="buyer-profile-card">
            <div className="buyer-profile-info">
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

            <div className="buyer-profile-details">
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Buyer Code</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-color)' }}>{selectedBuyer.code}</strong>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Phone</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-color)' }}>{selectedBuyer.phone || '—'}</strong>
              </div>
            </div>

            <div className="buyer-profile-actions">
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
            {[
              { id: 'Overview', label: '🏠 Overview' },
              { id: 'Buyer Master', label: `📐 Buyer Master (${buyerDetails.buyerMasters.length})` },
              { id: 'PI', label: `📄 PI (${buyerDetails.buyerPIs.length})` },
              { id: 'PO', label: `📋 PO (${buyerDetails.pos.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #8b5a2b' : '3px solid transparent',
                  color: activeTab === tab.id ? '#8b5a2b' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  padding: '0.75rem 0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loader or Content */}
          {loadingDetails ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading buyer details...</div>
          ) : (
            <div>
              {/* TAB 1: OVERVIEW */}
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
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#eefdf4', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={22} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Buyer Master Styles</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.buyerMasters.length}
                        </strong>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Receipt size={22} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Total PIs</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.buyerPIs.length}
                        </strong>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ClipboardList size={22} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Total POs</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.pos.length}
                        </strong>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#faf5ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={22} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Pending POs</span>
                        <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {buyerDetails.pos.filter(po => po.status === 'Pending').length}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Overview Grid */}
                  <div className="buyer-detail-grid">
                    {/* Recent POs Table */}
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>Recent Purchase Orders</h3>
                        <button onClick={() => setActiveTab('PO')} style={{ background: 'none', border: 'none', color: '#8b5a2b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>View All →</button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '0.875rem' }}>
                          <thead>
                            <tr>
                              <th>PO Number</th>
                              <th>Supplier</th>
                              <th>Status</th>
                              <th>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPOs.slice(0, 5).map(po => (
                              <tr 
                                key={po.id}
                                onClick={() => navigate(`/pos/${po.id}`, { state: { fromBuyer: selectedBuyer.id } })}
                                style={{ cursor: 'pointer' }}
                                title="Click to view PO"
                              >
                                <td><strong>{po.po_number}</strong></td>
                                <td>{po.supplier_name || po.supplier?.name || '—'}</td>
                                <td>
                                  <span 
                                    className="navbar-role-badge" 
                                    style={{
                                      backgroundColor: po.status === 'Received' ? '#dcfce7' : '#fef3c7',
                                      color: po.status === 'Received' ? '#15803d' : '#d97706',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {po.status}
                                  </span>
                                </td>
                                <td>₹{parseFloat(po.total_amount || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                            {filteredPOs.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No POs found for this buyer.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Buyer Overview Summary Sidebar */}
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1.25rem', marginTop: 0 }}>ℹ️ Buyer Summary</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Buyer Code</span>
                          <strong style={{ color: 'var(--text-color)' }}>{selectedBuyer.code}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Buyer Master Styles</span>
                          <strong style={{ color: '#6366f1' }}>{buyerDetails.buyerMasters.length}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Buyer PIs</span>
                          <strong style={{ color: '#8b5cf6' }}>{buyerDetails.buyerPIs.length}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Supplier POs</span>
                          <strong style={{ color: '#14b8a6' }}>{buyerDetails.pos.length}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Contact Email</span>
                          <strong style={{ color: 'var(--text-color)' }}>{selectedBuyer.email || '—'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BUYER MASTER */}
              {activeTab === 'Buyer Master' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
                      Buyer Master Styles ({filteredBMs.length} Total)
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Search */}
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', backgroundColor: '#f8fafc' }}>
                        <Search size={14} style={{ color: '#64748b', marginRight: '0.4rem' }} />
                        <input
                          type="text"
                          placeholder="Search style or product..."
                          value={bmSearch}
                          onChange={e => { setBmSearch(e.target.value); setBmPage(1); }}
                          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', width: '170px' }}
                        />
                      </div>
                      {/* Order By Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#8b5a2b', fontWeight: 700, textTransform: 'uppercase' }}>ORDER BY:</span>
                        <OrderBySelect
                          options={ORDER_OPTIONS_DATE_STYLE}
                          value={bmOrder}
                          onChange={setBmOrder}
                        />
                      </div>
                      <button onClick={() => navigate('/buyer-masters')} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                        View All Buyer Masters →
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Style No</th>
                          <th>Product Name</th>
                          <th>Material</th>
                          <th>Finish</th>
                          <th>Dimensions (L×B×H)</th>
                          <th>Price (USD)</th>
                          <th>Total CBM</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBMs.map(bm => (
                          <tr key={bm.id} onClick={() => navigate(`/buyer-masters/${bm.id}`, { state: { fromBuyer: selectedBuyer.id } })} style={{ cursor: 'pointer' }}>
                            <td><span className="navbar-role-badge admin-badge">{bm.style_no}</span></td>
                            <td><strong>{bm.product_name}</strong></td>
                            <td>{bm.wood_type || '—'}</td>
                            <td>{bm.finish_color || '—'}</td>
                            <td>{bm.size_length || 0} × {bm.size_breadth || 0} × {bm.size_height || 0} cm</td>
                            <td><strong>${parseFloat(bm.price_usd || 0).toFixed(2)}</strong></td>
                            <td>{bm.total_cbm ? `${parseFloat(bm.total_cbm).toFixed(4)} CBM` : '—'}</td>
                            <td onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => navigate(`/buyer-masters/${bm.id}`, { state: { fromBuyer: selectedBuyer.id } })}
                                className="btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              >
                                View Style
                              </button>
                            </td>
                          </tr>
                        ))}
                        {paginatedBMs.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              No Buyer Master styles found matching filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {bmTotalPages > 1 && (
                    <div style={{ marginTop: '1rem' }}>
                      <Pagination currentPage={bmPage} totalPages={bmTotalPages} onPageChange={setBmPage} />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PI */}
              {activeTab === 'PI' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
                      Buyer Performa Invoices ({filteredPIs.length} Total)
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Search */}
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', backgroundColor: '#f8fafc' }}>
                        <Search size={14} style={{ color: '#64748b', marginRight: '0.4rem' }} />
                        <input
                          type="text"
                          placeholder="Search PI ref or details..."
                          value={piSearch}
                          onChange={e => { setPiSearch(e.target.value); setPiPage(1); }}
                          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', width: '170px' }}
                        />
                      </div>
                      {/* Order By Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#8b5a2b', fontWeight: 700, textTransform: 'uppercase' }}>ORDER BY:</span>
                        <OrderBySelect
                          options={ORDER_OPTIONS_DATE_PINO}
                          value={piOrder}
                          onChange={setPiOrder}
                        />
                      </div>
                      <button onClick={() => navigate('/performa-invoices')} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                        View All PIs →
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>PI / PO Ref No</th>
                          <th>PI Date</th>
                          <th>Ex-Factory Date</th>
                          <th>Payment Terms</th>
                          <th>Delivered To</th>
                          <th>Items Count</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPIs.map(pi => (
                          <tr key={pi.id} onClick={() => navigate(`/performa-invoices/${pi.id}`, { state: { fromBuyer: selectedBuyer.id } })} style={{ cursor: 'pointer' }}>
                            <td><strong>{pi.pi_no}</strong></td>
                            <td>{pi.pi_date || '—'}</td>
                            <td>{pi.ex_factory_date || '—'}</td>
                            <td><span style={{ fontSize: '0.82rem', color: '#475569' }}>{pi.payment_terms || '—'}</span></td>
                            <td>{pi.delivered_to_company || pi.delivered_to_name || '—'}</td>
                            <td><strong>{pi.items?.length || 0} items</strong></td>
                            <td onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => navigate(`/performa-invoices/${pi.id}`, { state: { fromBuyer: selectedBuyer.id } })}
                                className="btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              >
                                View PI
                              </button>
                            </td>
                          </tr>
                        ))}
                        {paginatedPIs.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              No Performa Invoices (PIs) found matching filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {piTotalPages > 1 && (
                    <div style={{ marginTop: '1rem' }}>
                      <Pagination currentPage={piPage} totalPages={piTotalPages} onPageChange={setPiPage} />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PO */}
              {activeTab === 'PO' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
                      Supplier Purchase Orders ({filteredPOs.length} Total)
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Search */}
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', backgroundColor: '#f8fafc' }}>
                        <Search size={14} style={{ color: '#64748b', marginRight: '0.4rem' }} />
                        <input
                          type="text"
                          placeholder="Search PO # or supplier..."
                          value={poSearch}
                          onChange={e => { setPoSearch(e.target.value); setPoPage(1); }}
                          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', width: '160px' }}
                        />
                      </div>
                      {/* Status Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#8b5a2b', fontWeight: 700, textTransform: 'uppercase' }}>STATUS:</span>
                        <StatusSelect
                          options={PO_STATUS_OPTIONS}
                          value={poStatus === 'all' ? '' : poStatus}
                          onChange={val => { setPoStatus(val === '' ? 'all' : val); setPoPage(1); }}
                          placeholder="All Statuses"
                        />
                      </div>
                      {/* Order By Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#8b5a2b', fontWeight: 700, textTransform: 'uppercase' }}>ORDER BY:</span>
                        <OrderBySelect
                          options={ORDER_OPTIONS_DATE_PONO}
                          value={poOrder}
                          onChange={setPoOrder}
                        />
                      </div>
                      <button onClick={() => navigate('/pos')} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                        View All POs →
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>PO Date</th>
                          <th>Supplier Name</th>
                          <th>Status</th>
                          <th>Total Amount (INR)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPOs.map(po => (
                          <tr key={po.id} onClick={() => navigate(`/pos/${po.id}`, { state: { fromBuyer: selectedBuyer.id } })} style={{ cursor: 'pointer' }}>
                            <td><strong>{po.po_number}</strong></td>
                            <td>{po.po_date || '—'}</td>
                            <td>{po.supplier_name || po.supplier?.name || '—'}</td>
                            <td>
                              <span 
                                className="navbar-role-badge" 
                                style={{
                                  backgroundColor: po.status === 'Received' ? '#dcfce7' : '#fef3c7',
                                  color: po.status === 'Received' ? '#15803d' : '#d97706'
                                }}
                              >
                                {po.status}
                              </span>
                            </td>
                            <td><strong>₹{parseFloat(po.total_amount || 0).toLocaleString()}</strong></td>
                            <td onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => navigate(`/pos/${po.id}`, { state: { fromBuyer: selectedBuyer.id } })}
                                className="btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              >
                                View PO
                              </button>
                            </td>
                          </tr>
                        ))}
                        {paginatedPOs.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              No Supplier Purchase Orders found matching filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {poTotalPages > 1 && (
                    <div style={{ marginTop: '1rem' }}>
                      <Pagination currentPage={poPage} totalPages={poTotalPages} onPageChange={setPoPage} />
                    </div>
                  )}
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
              <span className="filter-label" style={{ marginLeft: 'auto' }}>ORDER BY:</span>
              <OrderBySelect
                options={ORDER_OPTIONS_DATE_NAME}
                value={ordering}
                onChange={setOrdering}
              />
            </div>
          </div>

          <div className="table-container desktop-only">
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
                {loading ? (
                  <TableSkeleton rows={6} cols={6} hasImage={false} />
                ) : filteredBuyers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No buyers found.
                    </td>
                  </tr>
                ) : (
                  filteredBuyers.map(b => (
                    <tr 
                      key={b.id} 
                      onClick={() => navigate(`/buyers/${b.id}`)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s ease' }}
                      className="smooth-fade-in"
                      title="Click to view details"
                    >
                      <td>
                        <span style={{ fontWeight: 'bold', color: '#8b5a2b' }}>
                          {b.name}
                        </span>
                      </td>
                      <td><span className="navbar-role-badge admin-badge">{b.code}</span></td>
                      <td>{b.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td>{b.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td>{b.address || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => openEditModal(b)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginRight: 0 }}>Edit</button>
                          <button onClick={() => openDeleteModal(b)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
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
              <CardSkeleton count={4} />
            ) : filteredBuyers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No buyers found.
              </div>
            ) : (
              filteredBuyers.map(b => {
                const initials = b.name ? b.name.substring(0, 2).toUpperCase() : 'DB';
                return (
                  <div 
                    className="mobile-card smooth-fade-in" 
                    key={b.id} 
                    onClick={() => navigate(`/buyers/${b.id}`)}
                  >
                    <div className="mobile-card-img" style={{ backgroundColor: '#f5efe6', color: '#8b5a2b', fontWeight: 'bold', fontSize: '1.2rem', borderRadius: '12px', width: '56px', height: '56px' }}>
                      {initials}
                    </div>
                    
                    <div className="mobile-card-content" style={{ paddingLeft: '0.5rem' }}>
                      <div className="mobile-card-title">{b.name}</div>
                      <div className="mobile-card-subtitle" style={{ marginTop: '0.25rem' }}>
                        <span className="navbar-role-badge admin-badge" style={{ backgroundColor: '#f5efe6', color: '#8b5a2b', padding: '2px 8px' }}>{b.code}</span>
                      </div>
                    </div>

                    <div className="mobile-card-arrow">
                      <ChevronRight size={20} color="#94a3b8" />
                    </div>
                  </div>
                );
              })
            )}
          </div>


          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
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
