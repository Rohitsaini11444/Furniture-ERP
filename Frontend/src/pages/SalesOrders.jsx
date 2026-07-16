import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { X } from 'lucide-react';

function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [samples, setSamples] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sample: '',
    sales_order_no: '',
    order_date: '',
    buyer_name: '',
    po_no: ''
  });

  const fetchData = () => {
    api.get('/sales-orders/')
      .then(res => setOrders(res.data))
      .catch(err => console.error(err));

    api.get('/samples/')
      .then(res => setSamples(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const openCreateModal = () => {
    setFormData({ sample: '', sales_order_no: '', order_date: '', buyer_name: '', po_no: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (order) => {
    setFormData({
      sample: order.sample,
      sales_order_no: order.sales_order_no,
      order_date: order.order_date,
      buyer_name: order.buyer_name,
      po_no: order.po_no
    });
    setEditingId(order.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const request = editingId
      ? api.put(`/sales-orders/${editingId}/`, formData)
      : api.post('/sales-orders/', formData);

    request.then(() => { setIsModalOpen(false); setEditingId(null); fetchData(); })
           .catch(err => console.error(err));
  };

  const getSampleLabel = (sampleId) => {
    const s = samples.find(s => s.id === sampleId);
    return s ? `${s.sample_id} — ${s.product_name}` : sampleId;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Sales Orders</h2>
        <button onClick={openCreateModal} className="btn-primary">+ Create New</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order No</th>
              <th>Order Date</th>
              <th>Buyer Name</th>
              <th>PO No</th>
              <th>Sample</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} onClick={() => openEditModal(o)} style={{cursor: 'pointer'}} title="Click to edit">
                <td><strong>{o.sales_order_no}</strong></td>
                <td>{o.order_date}</td>
                <td>{o.buyer_name}</td>
                <td>{o.po_no}</td>
                <td>{getSampleLabel(o.sample)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No sales orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ Edit Sales Order' : '+ Create New Sales Order'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Sample</label>
                  <select required name="sample" className="form-input" value={formData.sample} onChange={handleChange}>
                    <option value="">Select a sample...</option>
                    {samples.map(s => (
                      <option key={s.id} value={s.id}>{s.sample_id} — {s.product_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sales Order No</label>
                  <input required type="text" name="sales_order_no" className="form-input" value={formData.sales_order_no} onChange={handleChange} placeholder="e.g. SO-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Order Date</label>
                  <input required type="date" name="order_date" className="form-input" value={formData.order_date} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Buyer Name</label>
                  <input required type="text" name="buyer_name" className="form-input" value={formData.buyer_name} onChange={handleChange} placeholder="e.g. Comfort Living Ltd." />
                </div>
                <div className="form-group">
                  <label className="form-label">PO No</label>
                  <input required type="text" name="po_no" className="form-input" value={formData.po_no} onChange={handleChange} placeholder="e.g. PO-7823" />
                </div>
                <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'}}>
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Sales Order'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesOrders;
