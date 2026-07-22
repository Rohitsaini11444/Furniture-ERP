import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Box, FileText, ShoppingCart,
  Loader, Sparkles, Wrench,
  Package, Truck, Receipt, ArrowRight,
  Lock, Users, Layers, ClipboardList, ClipboardCheck,
  Monitor, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_TILES = [
  { name: 'Sample',                  icon: <Box size={32} />,           color: '#22c55e', link: '/samples',           roles: ['admin'] },
  { name: 'Buyers',                  icon: <Users size={32} />,         color: '#ec4899', link: '/buyers',            roles: ['admin'] },
  { name: 'Buyer Master',            icon: <Layers size={32} />,        color: '#6366f1', link: '/buyer-masters',     roles: ['admin'] },
  { name: 'Performa Invoice (PI)',   icon: <Receipt size={32} />,       color: '#8b5cf6', link: '/performa-invoices', roles: ['admin'] },
  { name: 'PO',                      icon: <ClipboardList size={32} />, color: '#14b8a6', link: '/pos',               roles: ['admin', 'supervisor'] },
  { name: 'Gate Entry',              icon: <ClipboardCheck size={32} />, color: '#f59e0b', link: '/gate-entry',        roles: ['admin', 'supervisor'] },
  { name: 'Sanding',                 icon: <Loader size={32} />,        color: '#a0522d', link: '/sanding',           roles: ['admin', 'supervisor', 'contractor'] },
  { name: 'Polish',                  icon: <Sparkles size={32} />,      color: '#a855f7', link: '#',                  roles: ['admin', 'supervisor'] },
  { name: 'Fitting',                 icon: <Wrench size={32} />,        color: '#2563eb', link: '#',                  roles: ['admin', 'supervisor'] },
  { name: 'Packaging',               icon: <Package size={32} />,       color: '#eab308', link: '#',                  roles: ['admin', 'supervisor'] },
  { name: 'Dispatch',                icon: <Truck size={32} />,         color: '#3b82f6', link: '#',                  roles: ['admin'] },
  { name: 'Invoice',                 icon: <Receipt size={32} />,       color: '#ef4444', link: '/invoices',          roles: ['admin'] },
];

const WORKFLOW_STEPS = [
  { name: 'Performa Invoice', icon: <Receipt size={20} />,       color: '#8b5cf6' },
  { name: 'PO',               icon: <ClipboardList size={20} />, color: '#14b8a6' },
  { name: 'Sanding',          icon: <Loader size={20} />,        color: '#a0522d' },
  { name: 'Polish',           icon: <Sparkles size={20} />,      color: '#a855f7' },
  { name: 'Fitting',          icon: <Wrench size={20} />,        color: '#2563eb' },
  { name: 'Packaging',        icon: <Package size={20} />,       color: '#eab308' },
  { name: 'Dispatch',         icon: <Truck size={20} />,         color: '#3b82f6' },
  { name: 'Invoice',          icon: <Receipt size={20} />,       color: '#ef4444' },
];

function Dashboard() {
  const { user, isAdmin, isSupervisor, isContractor, isSandingSupervisor } = useAuth();

  const visibleTiles = ALL_TILES.filter((t) =>
    t.roles.includes(user?.role)
  );

  const [activeDevices, setActiveDevices] = useState([]);
  const [showDevicesModal, setShowDevicesModal] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      api.get('/auth/devices/')
        .then(res => setActiveDevices(res.data))
        .catch(err => console.error("Failed to load devices", err));
    }
  }, [isAdmin]);

  const getRoleWelcome = () => {
    if (isAdmin) return 'Full system access — manage everything.';
    if (isSandingSupervisor) return 'Sanding Supervisor — manage your batch & contractor assignments.';
    if (isSupervisor) return `${user.batch_category?.charAt(0).toUpperCase() + user.batch_category?.slice(1)} Supervisor — manage your batch.`;
    if (isContractor) return 'Contractor — view your assigned sanding work.';
    return '';
  };

  return (
    <div>
      {/* Welcome banner */}
      <div className="dashboard-welcome">
        <div>
          <h2 className="dashboard-welcome-name">
            Welcome, {user?.full_name || user?.username}
          </h2>
          <p className="dashboard-welcome-role">{getRoleWelcome()}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAdmin && activeDevices.length > 0 && (
            <button 
              onClick={() => setShowDevicesModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              <Monitor size={16} />
              Logged into {activeDevices.length} device{activeDevices.length > 1 ? 's' : ''}
            </button>
          )}
          <span className={`login-role-badge ${user?.role}-badge`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
            {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </span>
        </div>
      </div>

      {showDevicesModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Active Devices</h3>
              <button className="close-btn" onClick={() => setShowDevicesModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>You are currently logged into the following devices:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeDevices.map(device => (
                  <div key={device.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Monitor size={16} /> {device.ip_address}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(device.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', wordBreak: 'break-word' }}>
                      {device.user_agent || 'Unknown Device'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Tiles */}
      <div className="dashboard-grid">
        {visibleTiles.map((tile, index) => (
          <Link key={index} to={tile.link} className={`dashboard-tile ${tile.link === '#' ? 'tile-disabled' : ''}`}>
            <div className="tile-icon" style={{ backgroundColor: tile.color }}>
              {tile.icon}
            </div>
            <span className="tile-label">{tile.name}</span>
            {tile.link === '#' && <span className="tile-soon">Coming soon</span>}
          </Link>
        ))}
      </div>

      {/* Workflow */}
      <div className="workflow-section">
        <h3 className="workflow-title">Manufacturing Workflow</h3>
        <div className="workflow-steps">
          {WORKFLOW_STEPS.map((step, index) => (
            <React.Fragment key={index}>
              <div className="workflow-step">
                <div className="workflow-step-icon" style={{ backgroundColor: step.color }}>
                  {step.icon}
                </div>
                <span className="workflow-step-label">{step.name}</span>
              </div>
              {index < WORKFLOW_STEPS.length - 1 && <ArrowRight size={20} className="workflow-arrow" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
