import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box, FileText, ShoppingCart,
  Loader, Sparkles, Wrench,
  Package, Truck, Receipt, ArrowRight,
  Lock, Users, Layers, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_TILES = [
  { name: 'Sample',        icon: <Box size={32} />,          color: '#22c55e', link: '/samples',       roles: ['admin', 'supervisor', 'contractor'] },
  { name: 'Buyers',        icon: <Users size={32} />,        color: '#ec4899', link: '/buyers',        roles: ['admin', 'supervisor'] },
  { name: 'Buyer Master',  icon: <Layers size={32} />,       color: '#6366f1', link: '/buyer-masters', roles: ['admin', 'supervisor'] },
  { name: 'PO',            icon: <ClipboardList size={32} />, color: '#14b8a6', link: '/pos',           roles: ['admin', 'supervisor'] },
  { name: 'Sales Order',   icon: <FileText size={32} />,      color: '#f97316', link: '/sales-orders',  roles: ['admin', 'supervisor'] },
  { name: 'Purchase (MO)', icon: <ShoppingCart size={32} />,  color: '#3b82f6', link: '/purchase-imos', roles: ['admin'] },
  { name: 'Sanding',       icon: <Loader size={32} />,        color: '#a0522d', link: '/sanding',       roles: ['admin', 'supervisor', 'contractor'] },
  { name: 'Polish',        icon: <Sparkles size={32} />,      color: '#a855f7', link: '#',              roles: ['admin', 'supervisor'] },
  { name: 'Fitting',       icon: <Wrench size={32} />,        color: '#2563eb', link: '#',              roles: ['admin', 'supervisor'] },
  { name: 'Packaging',     icon: <Package size={32} />,       color: '#eab308', link: '#',              roles: ['admin', 'supervisor'] },
  { name: 'Dispatch',      icon: <Truck size={32} />,         color: '#3b82f6', link: '#',              roles: ['admin'] },
  { name: 'Invoice',       icon: <Receipt size={32} />,       color: '#ef4444', link: '#',              roles: ['admin'] },
];

const WORKFLOW_STEPS = [
  { name: 'Sanding',    icon: <Loader size={20} />,    color: '#a0522d' },
  { name: 'Polish',     icon: <Sparkles size={20} />,  color: '#a855f7' },
  { name: 'Fitting',    icon: <Wrench size={20} />,    color: '#2563eb' },
  { name: 'Packaging',  icon: <Package size={20} />,   color: '#eab308' },
  { name: 'Dispatch',   icon: <Truck size={20} />,     color: '#3b82f6' },
  { name: 'Invoice',    icon: <Receipt size={20} />,   color: '#ef4444' },
];

function Dashboard() {
  const { user, isAdmin, isSupervisor, isContractor, isSandingSupervisor } = useAuth();

  const visibleTiles = ALL_TILES.filter((t) =>
    t.roles.includes(user?.role)
  );

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
        <span className={`login-role-badge ${user?.role}-badge`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
          {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
        </span>
      </div>

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
