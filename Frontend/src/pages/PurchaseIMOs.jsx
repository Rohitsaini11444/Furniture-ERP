import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { X } from 'lucide-react';

function PurchaseIMOs() {
  const [purchases, setPurchases] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    purchase_no: '', purchase_date: '', supplier_name: '', material_name: '',
    rate: '', total: '', expected_delivery_date: '', warehouse: '',
    grn_status: '', invoice_number: '', remark: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchPurchases = () => {
    api.get('/purchase-imos/')
      .then(res => setPurchases(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchPurchases(); }, []);

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const openCreateModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setFormData({
      purchase_no: p.purchase_no,
      purchase_date: p.purchase_date,
      supplier_name: p.supplier_name,
      material_name: p.material_name,
      rate: p.rate,
      total: p.total,
      expected_delivery_date: p.expected_delivery_date,
      warehouse: p.warehouse,
      grn_status: p.grn_status,
      invoice_number: p.invoice_number,
      remark: p.remark || ''
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const request = editingId
      ? api.put(`/purchase-imos/${editingId}/`, formData)
      : api.post('/purchase-imos/', formData);

    request.then(() => { setIsModalOpen(false); setEditingId(null); fetchPurchases(); })
           .catch(err => console.error(err));
  };

  return (
    <div>
      <div className="page-header">
        <h2>Purchase IMO</h2>
        <button onClick={openCreateModal} className="btn-primary">+ Create New</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Purchase No</th>
              <th>Date</th>
              <th>Supplier Name</th>
              <th>Material Name</th>
              <th>Total</th>
              <th>Warehouse</th>
              <th>GRN Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id} onClick={() => openEditModal(p)} style={{cursor: 'pointer'}} title="Click to edit">
                <td><strong>{p.purchase_no}</strong></td>
                <td>{p.purchase_date}</td>
                <td>{p.supplier_name}</td>
                <td>{p.material_name}</td>
                <td>₹{Number(p.total).toLocaleString()}</td>
                <td>{p.warehouse}</td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: p.grn_status === 'Received' ? '#d1fae5' : p.grn_status === 'Pending' ? '#fef3c7' : '#fee2e2',
                    color: p.grn_status === 'Received' ? '#065f46' : p.grn_status === 'Pending' ? '#92400e' : '#991b1b',
                  }}>
                    {p.grn_status}
                  </span>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No purchase orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ Edit Purchase IMO' : '+ Create New Purchase IMO'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Purchase No</label>
                    <input required type="text" name="purchase_no" className="form-input" value={formData.purchase_no} onChange={handleChange} placeholder="e.g. PUR-2024-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Date</label>
                    <input required type="date" name="purchase_date" className="form-input" value={formData.purchase_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier Name</label>
                    <input required type="text" name="supplier_name" className="form-input" value={formData.supplier_name} onChange={handleChange} placeholder="e.g. TimberCo Pvt Ltd." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Material Name</label>
                    <input required type="text" name="material_name" className="form-input" value={formData.material_name} onChange={handleChange} placeholder="e.g. Teak Wood Planks" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate (per unit)</label>
                    <input required type="number" step="0.01" name="rate" className="form-input" value={formData.rate} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Amount</label>
                    <input required type="number" step="0.01" name="total" className="form-input" value={formData.total} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Delivery Date</label>
                    <input required type="date" name="expected_delivery_date" className="form-input" value={formData.expected_delivery_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warehouse</label>
                    <input required type="text" name="warehouse" className="form-input" value={formData.warehouse} onChange={handleChange} placeholder="e.g. Warehouse A" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GRN Status</label>
                    <select required name="grn_status" className="form-input" value={formData.grn_status} onChange={handleChange}>
                      <option value="">Select status...</option>
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Number</label>
                    <input required type="text" name="invoice_number" className="form-input" value={formData.invoice_number} onChange={handleChange} placeholder="e.g. INV-2024-001" />
                  </div>
                </div>
                <div className="form-group" style={{marginTop: '0.5rem'}}>
                  <label className="form-label">Remark</label>
                  <textarea name="remark" className="form-input" rows="3" value={formData.remark} onChange={handleChange} placeholder="Any additional notes..."></textarea>
                </div>
                <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'}}>
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Purchase IMO'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseIMOs;
