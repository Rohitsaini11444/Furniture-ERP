import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { X, Search } from 'lucide-react';

function Buyers() {
  const [buyers, setBuyers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Soft Delete Audit state
  const [deleteBuyerId, setDeleteBuyerId] = useState(null);
  const [deleteBuyerName, setDeleteBuyerName] = useState('');
  const [deleteNote, setDeleteNote] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
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

  const filteredBuyers = buyers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
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
                <td><strong>{b.name}</strong></td>
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
