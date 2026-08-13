import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

export default function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  // Don't render breadcrumbs on login page or home dashboard root
  if (pathname === '/login' || pathname === '/') {
    return null;
  }

  const crumbs = getCrumbsForPath(pathname);

  if (!crumbs || crumbs.length === 0) return null;

  return (
    <div className="breadcrumbs-bar">
      <div className="breadcrumbs-inner">
        <Link to="/" className="breadcrumb-item breadcrumb-home" title="Go to Home Dashboard">
          <Home size={14} />
          <span>Home</span>
        </Link>

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <React.Fragment key={index}>
              <ChevronRight size={13} className="breadcrumb-separator" />
              {isLast || !crumb.path ? (
                <span className="breadcrumb-item breadcrumb-active">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-item">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function getCrumbsForPath(pathname) {
  // Vendor & Supplier Management routes
  if (pathname === '/vendor-management') {
    return [{ label: 'Vendor / Supplier Management', path: '/vendor-management' }];
  }
  if (pathname.startsWith('/vendor-management/')) {
    return [
      { label: 'Vendor / Supplier Management', path: '/vendor-management' },
      { label: 'Vendor Details' }
    ];
  }
  if (pathname === '/suppliers') {
    return [
      { label: 'Vendor / Supplier Management', path: '/vendor-management' },
      { label: 'Suppliers' }
    ];
  }
  if (pathname === '/record-tax-invoice') {
    return [
      { label: 'Vendor / Supplier Management', path: '/vendor-management' },
      { label: 'Record Tax Invoice' }
    ];
  }

  // PO & Gate Entry routes
  if (pathname === '/pos') {
    return [{ label: 'PO & Gate Entry', path: '/pos' }];
  }
  if (pathname.startsWith('/pos/')) {
    return [
      { label: 'PO & Gate Entry', path: '/pos' },
      { label: 'PO Details' }
    ];
  }
  if (pathname === '/gate-entry') {
    return [
      { label: 'PO & Gate Entry', path: '/pos' },
      { label: 'Gate Entry Records' }
    ];
  }
  if (pathname.startsWith('/gate-entry/')) {
    return [
      { label: 'PO & Gate Entry', path: '/pos' },
      { label: 'Gate Entry Records', path: '/gate-entry' },
      { label: 'Gate Entry Details' }
    ];
  }

  // Stock Inventory & Production Pipeline routes
  if (pathname === '/stock' || pathname === '/production-pipeline') {
    return [{ label: 'Stock Inventory', path: '/stock' }];
  }
  if (pathname.startsWith('/stock/') || pathname.startsWith('/stock-details/')) {
    return [
      { label: 'Stock Inventory', path: '/stock' },
      { label: 'Stock Details' }
    ];
  }
  if (pathname === '/sanding') {
    return [
      { label: 'Stock Inventory', path: '/stock' },
      { label: 'Sanding Stage' }
    ];
  }

  // Store Management
  if (pathname === '/store-management') {
    return [{ label: 'Store Management Hub' }];
  }

  // Buyer Masters & Buyers
  if (pathname === '/buyer-masters') {
    return [{ label: 'Buyer Masters' }];
  }
  if (pathname.startsWith('/buyer-masters/buyer/')) {
    return [
      { label: 'Buyer Masters', path: '/buyer-masters' },
      { label: 'Buyer Master Details' }
    ];
  }
  if (pathname.startsWith('/buyer-masters/edit/')) {
    return [
      { label: 'Buyer Masters', path: '/buyer-masters' },
      { label: 'Edit Buyer Master' }
    ];
  }
  if (pathname === '/buyers') {
    return [{ label: 'Buyers Directory' }];
  }
  if (pathname.startsWith('/buyers/')) {
    return [
      { label: 'Buyers Directory', path: '/buyers' },
      { label: 'Buyer Details' }
    ];
  }

  // Samples
  if (pathname === '/samples') {
    return [{ label: 'Samples Catalog' }];
  }
  if (pathname.startsWith('/samples/')) {
    return [
      { label: 'Samples Catalog', path: '/samples' },
      { label: 'Sample Details' }
    ];
  }

  // Finishing
  if (pathname === '/finishing') {
    return [{ label: 'Finishing Catalog' }];
  }
  if (pathname.startsWith('/finishing/')) {
    return [
      { label: 'Finishing Catalog', path: '/finishing' },
      { label: 'Finish Details' }
    ];
  }

  // Performa Invoices & Tax Invoices
  if (pathname === '/performa-invoices') {
    return [{ label: 'Performa Invoices' }];
  }
  if (pathname.startsWith('/performa-invoices/')) {
    return [
      { label: 'Performa Invoices', path: '/performa-invoices' },
      { label: 'PI Details' }
    ];
  }
  if (pathname === '/invoices' || pathname === '/pis') {
    return [{ label: 'Invoices (PI)' }];
  }
  if (pathname.startsWith('/invoices/') || pathname.startsWith('/pis/')) {
    return [
      { label: 'Invoices (PI)', path: '/invoices' },
      { label: 'Invoice Details' }
    ];
  }

  // Store Management
  if (pathname === '/store-management') {
    return [{ label: 'Store Management Hub', path: '/store-management' }];
  }
  if (pathname === '/store-management/material-in') {
    return [
      { label: 'Store Management Hub', path: '/store-management' },
      { label: 'Material Inward Entry' }
    ];
  }
  if (pathname === '/store-management/daily-issue') {
    return [
      { label: 'Store Management Hub', path: '/store-management' },
      { label: 'Daily Issue Entry' }
    ];
  }
  if (pathname === '/store-management/item-master/new') {
    return [
      { label: 'Store Management Hub', path: '/store-management' },
      { label: 'New Store Item Master' }
    ];
  }
  if (pathname.startsWith('/store-management/item-master/edit/')) {
    return [
      { label: 'Store Management Hub', path: '/store-management' },
      { label: 'Edit Store Item Master' }
    ];
  }

  // Admin & Tools
  if (pathname === '/tools') {
    return [{ label: 'Presentation & Tools' }];
  }
  if (pathname === '/users') {
    return [{ label: 'User Management' }];
  }
  if (pathname === '/units') {
    return [{ label: 'Production Units' }];
  }
  if (pathname === '/notifications') {
    return [{ label: 'Notifications' }];
  }

  // Fallback for any unmapped route
  const formattedName = pathname
    .replace('/', '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return [{ label: formattedName || 'Page' }];
}
