import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Boxes, FileText, ShoppingCart, Palette,
  Sparkles, Wrench, Package, Truck, Receipt, ArrowRight,
  Users, Layers, ClipboardList, ClipboardCheck, Warehouse,
  TrendingUp, TrendingDown, DollarSign, Activity, BarChart3,
  PieChart, ShieldCheck, Plus, ExternalLink, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CustomSelect from '../components/CustomSelect';

const ALL_TILES = [
  { name: 'Sample',                  icon: <Box size={28} />,           color: '#22c55e', link: '/samples',           roles: ['admin'] },
  { name: 'Finishing Catalog',       icon: <Palette size={28} />,       color: '#8b5a2b', link: '/finishing',         roles: ['admin', 'supervisor'] },
  { name: 'Buyers',                  icon: <Users size={28} />,         color: '#ec4899', link: '/buyers',            roles: ['admin'] },
  { name: 'Buyer Master',            icon: <Layers size={28} />,        color: '#6366f1', link: '/buyer-masters',     roles: ['admin'] },
  { name: 'Performa Invoice (PI)',   icon: <Receipt size={28} />,       color: '#8b5cf6', link: '/performa-invoices', roles: ['admin'] },
  { name: 'PO & Gate Entry',         icon: <ClipboardCheck size={28} />, color: '#14b8a6', link: '/pos',               roles: ['admin', 'supervisor', 'store_manager'] },
  { name: 'Production Pipeline',     icon: <Boxes size={28} />,         color: '#3b82f6', link: '/production-pipeline', roles: ['admin', 'supervisor', 'contractor'] },
  { name: 'Store Management',       icon: <Warehouse size={28} />,     color: '#ea580c', link: '/store-management',  roles: ['admin', 'supervisor', 'contractor', 'store_manager'] },
  { name: 'Audit Trail Logs',       icon: <ShieldCheck size={28} />,   color: '#dc2626', link: '/audit-trail',       roles: ['admin'] },
  { name: 'Presentation & Tools',    icon: <Sparkles size={28} />,      color: '#8b5cf6', link: '/tools',             roles: ['admin', 'supervisor'] },
];

const WORKFLOW_STEPS = [
  { name: 'Performa Invoice', icon: <Receipt size={18} />,       color: '#8b5cf6' },
  { name: 'Supplier PO',      icon: <ClipboardList size={18} />, color: '#14b8a6' },
  { name: 'Gate Entry QC',    icon: <Warehouse size={18} />,     color: '#059669' },
  { name: 'Sanding Stage',    icon: <Wrench size={18} />,        color: '#3b82f6' },
  { name: 'Polishing Stage',  icon: <Sparkles size={18} />,      color: '#a855f7' },
  { name: 'Packaging Stage',  icon: <Package size={18} />,       color: '#16a34a' },
  { name: 'Finished Goods',   icon: <Boxes size={18} />,         color: '#15803d' },
];

const DEFAULT_MONTHLY_MOVEMENT = [
  { month: 'Mar', inward: 0, outward: 0 },
  { month: 'Apr', inward: 0, outward: 0 },
  { month: 'May', inward: 0, outward: 0 },
  { month: 'Jun', inward: 0, outward: 0 },
  { month: 'Jul', inward: 0, outward: 0 },
  { month: 'Aug', inward: 0, outward: 0 }
];

function AnimatedCounter({ value, duration = 1500, suffix = '', decimals = 0, start = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const targetValue = Number(value) || 0;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPercentage = Math.min(progress / duration, 1);
      
      // Easing out quad
      const easeProgress = progressPercentage * (2 - progressPercentage);
      
      const currentVal = easeProgress * targetValue;
      setCount(currentVal);

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setCount(targetValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, start]);

  return <span>{decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}{suffix}</span>;
}

function InteractiveStoreChart({ storeData, startAnimation }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [animatedHeights, setAnimatedHeights] = useState([]);

  const monthlyStoreMovement = useMemo(() => {
    return (storeData?.monthly_movement && storeData.monthly_movement.length > 0)
      ? storeData.monthly_movement
      : DEFAULT_MONTHLY_MOVEMENT;
  }, [storeData?.monthly_movement]);

  useEffect(() => {
    if (startAnimation) {
      setAnimatedHeights(monthlyStoreMovement.map(() => 0));
      const timeouts = monthlyStoreMovement.map((d, idx) => {
        return setTimeout(() => {
          setAnimatedHeights(prev => {
            const next = [...prev];
            next[idx] = d.inward;
            return next;
          });
        }, idx * 50);
      });
      return () => timeouts.forEach(clearTimeout);
    } else {
      setAnimatedHeights(monthlyStoreMovement.map(() => 0));
    }
  }, [startAnimation, monthlyStoreMovement]);

  const maxVal = Math.max(...monthlyStoreMovement.map(d => Math.max(d.inward, d.outward)), 10);
  const totalInward = storeData?.total_stock_qty !== undefined ? storeData.total_stock_qty : monthlyStoreMovement.reduce((s, d) => s + d.inward, 0);
  const totalOutward = storeData?.total_issued_qty !== undefined ? storeData.total_issued_qty : monthlyStoreMovement.reduce((s, d) => s + d.outward, 0);
  const balanceQty = storeData?.total_balance_qty !== undefined ? storeData.total_balance_qty : (totalInward - totalOutward);

  const count = monthlyStoreMovement.length;
  const svgWidth = 640;
  const chartBottomY = 170;
  const maxBarHeight = chartBottomY - 30;
  const availableWidth = svgWidth - 80;
  const groupWidth = Math.max(28, Math.min(48, Math.floor(availableWidth / count)));
  const gap = (availableWidth - (count * groupWidth)) / Math.max(1, count - 1);
  const startX = 40;

  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '0.5rem' }}>
      {/* Metric Badges */}
      <div className="store-chart-legend-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.6rem',
        padding: '0.6rem 0.85rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #f1f5f9',
        marginBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowDownRight size={15} color="#0284c7" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Inward</div>
            <strong style={{ fontSize: '0.88rem', color: '#0284c7', fontWeight: 800 }}>{totalInward.toLocaleString()} Pcs</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowUpRight size={15} color="#ea580c" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Issued</div>
            <strong style={{ fontSize: '0.85rem', color: '#ea580c', fontWeight: 800 }}>{totalOutward.toLocaleString()} Pcs</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Warehouse size={15} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Balance Stock</div>
            <strong style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800 }}>{balanceQty.toLocaleString()} Pcs</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={15} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Store Value</div>
            <strong style={{ fontSize: '0.85rem', color: '#8b5a2b', fontWeight: 800 }}>₹{(storeData?.total_inventory_valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
      </div>

      {/* SVG Dual-Bar Interactive Chart */}
      <div style={{ position: 'relative', width: '100%', height: '210px' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} 200`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="inwardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="outwardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {[30, 75, 120, 170].map((y, i) => (
            <line key={i} x1="20" y1={y} x2={svgWidth - 20} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
          ))}

          {monthlyStoreMovement.map((d, idx) => {
            const groupX = startX + idx * (groupWidth + gap);
            const singleBarWidth = Math.max(10, groupWidth / 2 - 2);
            const inwardVal = animatedHeights[idx] !== undefined ? animatedHeights[idx] : 0;
            const inwardHeight = Math.max(6, (inwardVal / maxVal) * maxBarHeight);
            const inwardY = chartBottomY - inwardHeight;

            const outwardHeight = Math.max(6, (d.outward / maxVal) * maxBarHeight);
            const outwardY = chartBottomY - outwardHeight;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={d.month + idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Column Highlight Backdrop */}
                <rect
                  x={groupX - 4}
                  y={30}
                  width={groupWidth + 8}
                  height={maxBarHeight + 5}
                  rx="8"
                  fill={isHovered ? "#f1f5f9" : "transparent"}
                  opacity={isHovered ? 0.65 : 0}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Inward Bar (Blue) */}
                <rect
                  x={groupX}
                  y={inwardY}
                  width={singleBarWidth}
                  height={inwardHeight}
                  rx="4"
                  fill="url(#inwardGrad)"
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.45}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Outward Bar (Orange) */}
                <rect
                  x={groupX + singleBarWidth + 3}
                  y={outwardY}
                  width={singleBarWidth}
                  height={outwardHeight}
                  rx="4"
                  fill="url(#outwardGrad)"
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.45}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Month Label */}
                <text
                  x={groupX + groupWidth / 2}
                  y={chartBottomY + 18}
                  textAnchor="middle"
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  fontSize="11"
                  fontWeight={isHovered ? '800' : '600'}
                >
                  {d.month}
                </text>

                {/* Executive Floating Tooltip Card */}
                {isHovered && (() => {
                  const topY = Math.min(inwardY, outwardY);
                  const tooltipWidth = 168;
                  const tooltipHeight = 34;
                  
                  // Position tooltip safely above bar, ensuring it never clips top edge
                  const tooltipY = Math.max(4, topY - 40);
                  
                  // Keep tooltip bounded inside SVG width
                  const rawX = groupX + groupWidth / 2 - tooltipWidth / 2;
                  const tooltipX = Math.max(10, Math.min(svgWidth - tooltipWidth - 10, rawX));

                  return (
                    <g style={{ transition: 'all 0.15s ease-out', pointerEvents: 'none' }}>
                      {/* Dark Glass Card Pill */}
                      <rect
                        x={tooltipX}
                        y={tooltipY}
                        width={tooltipWidth}
                        height={tooltipHeight}
                        rx="8"
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="1.2"
                      />
                      
                      {/* Inward Metric Badge (Blue Dot + Text) */}
                      <circle cx={tooltipX + 14} cy={tooltipY + 17} r="3.5" fill="#38bdf8" />
                      <text
                        x={tooltipX + 22}
                        y={tooltipY + 21}
                        fill="#e0f2fe"
                        fontSize="10.5"
                        fontWeight="700"
                      >
                        In: {d.inward.toLocaleString()}
                      </text>

                      {/* Vertical Separator */}
                      <line
                        x1={tooltipX + 84}
                        y1={tooltipY + 9}
                        x2={tooltipX + 84}
                        y2={tooltipY + 25}
                        stroke="#334155"
                        strokeWidth="1"
                      />

                      {/* Outward Metric Badge (Orange Dot + Text) */}
                      <circle cx={tooltipX + 96} cy={tooltipY + 17} r="3.5" fill="#fb923c" />
                      <text
                        x={tooltipX + 104}
                        y={tooltipY + 21}
                        fill="#ffedd5"
                        fontSize="10.5"
                        fontWeight="700"
                      >
                        Out: {d.outward.toLocaleString()}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#0284c7' }} />
          <span>Inward Received (Credit)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#ea580c', fontWeight: 700 }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ea580c' }} />
          <span>Issued Outward (Debit)</span>
        </div>
      </div>
    </div>
  );
}

function InteractiveRevenueChart({ monthlyData, startAnimation }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [animatedHeights, setAnimatedHeights] = useState([]);

  useEffect(() => {
    if (startAnimation) {
      setAnimatedHeights(monthlyData.map(() => 0));
      const timeouts = monthlyData.map((d, idx) => {
        return setTimeout(() => {
          setAnimatedHeights(prev => {
            const next = [...prev];
            next[idx] = d.revenue;
            return next;
          });
        }, idx * 50);
      });
      return () => timeouts.forEach(clearTimeout);
    } else {
      setAnimatedHeights(monthlyData.map(() => 0));
    }
  }, [startAnimation, monthlyData]);

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 10000);
  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = monthlyData.reduce((s, d) => s + (d.orders || Math.round(d.revenue / 1500)), 0);
  const peakItem = monthlyData.reduce((max, d) => (d.revenue > max.revenue ? d : max), monthlyData[0] || { revenue: 0, month: '-' });
  const avgRevenue = Math.round(totalRevenue / Math.max(1, monthlyData.length));

  // Dynamic bar layout calculations based on timeframe item count
  const count = monthlyData.length;
  const svgWidth = 640;
  const chartBottomY = 170;
  const chartTopY = 30;
  const maxBarHeight = chartBottomY - chartTopY;

  const availableWidth = svgWidth - 80;
  const barWidth = Math.max(20, Math.min(42, Math.floor(availableWidth / (count * 1.5))));
  const totalBarWidth = count * barWidth;
  const gap = count > 1 ? (availableWidth - totalBarWidth) / (count - 1) : 0;
  const startX = 40;

  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '0.5rem' }}>
      {/* Dynamic Summary Metric Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.6rem',
        padding: '0.6rem 0.85rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #f1f5f9',
        marginBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={15} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Revenue</div>
            <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>${totalRevenue.toLocaleString()}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={15} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Peak Month</div>
            <strong style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 800 }}>{peakItem.month} (${peakItem.revenue.toLocaleString()})</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingCart size={15} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Orders</div>
            <strong style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 800 }}>{totalOrders} Orders</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={15} color="#9333ea" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Monthly Avg</div>
            <strong style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 800 }}>${avgRevenue.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart Area */}
      <div style={{ position: 'relative', width: '100%', height: '210px' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} 200`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="barGradNormal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5a2b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[30, 75, 120, 170].map((y, i) => (
            <line key={i} x1="20" y1={y} x2={svgWidth - 20} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
          ))}

          {/* Render Interactive Bars */}
          {monthlyData.map((d, idx) => {
            const x = startX + idx * (barWidth + gap);
            const revenueVal = animatedHeights[idx] !== undefined ? animatedHeights[idx] : 0;
            const barHeight = Math.max(6, (revenueVal / maxRevenue) * maxBarHeight);
            const y = chartBottomY - barHeight;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={d.month + idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background Shadow Pill on Hover */}
                <rect
                  x={x - 4}
                  y={chartTopY - 5}
                  width={barWidth + 8}
                  height={maxBarHeight + 15}
                  rx={8}
                  fill={isHovered ? '#fef3c7' : 'transparent'}
                  opacity={isHovered ? 0.6 : 0}
                  style={{ transition: 'all 0.25s ease' }}
                />

                {/* Animated Bar Rectangle */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={isHovered ? "url(#barGradHover)" : "url(#barGradNormal)"}
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.45}
                  style={{
                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />

                {/* Top Glowing Indicator Line on Hover */}
                {isHovered && (
                  <rect
                    x={x}
                    y={y - 2}
                    width={barWidth}
                    height={4}
                    rx={2}
                    fill="#dc2626"
                  />
                )}

                {/* Month Name Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartBottomY + 20}
                  textAnchor="middle"
                  fill={isHovered ? '#8b5a2b' : '#64748b'}
                  fontSize={count > 8 ? "10" : "11"}
                  fontWeight={isHovered ? "800" : "600"}
                  style={{ transition: 'fill 0.2s ease' }}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Floating Tooltip */}
        {hoveredIndex !== null && monthlyData[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '0px',
              left: `${Math.min(82, Math.max(12, ((startX + hoveredIndex * (barWidth + gap) + barWidth / 2) / svgWidth) * 100))}%`,
              transform: 'translateX(-50%)',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              boxShadow: '0 12px 30px -5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
              zIndex: 50,
              pointerEvents: 'none',
              minWidth: '155px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b' }}>
                {monthlyData[hoveredIndex].month} 2026
              </span>
              {monthlyData[hoveredIndex].growth && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: monthlyData[hoveredIndex].growth.startsWith('+') ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                  color: monthlyData[hoveredIndex].growth.startsWith('+') ? '#34d399' : '#f87171'
                }}>
                  {monthlyData[hoveredIndex].growth}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.15rem' }}>
              ${monthlyData[hoveredIndex].revenue.toLocaleString()} USD
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShoppingCart size={12} color="#38bdf8" />
              <span>{monthlyData[hoveredIndex].orders || Math.round(monthlyData[hoveredIndex].revenue / 1500)} Export Orders</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, isAdmin, isSupervisor, isContractor, isStoreManager, isSandingSupervisor } = useAuth();

  const [startChartAnimation, setStartChartAnimation] = useState(false);
  const chartsGridRef = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStartChartAnimation(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (chartsGridRef.current) {
      observer.observe(chartsGridRef.current);
    }

    return () => {
      if (chartsGridRef.current) {
        observer.unobserve(chartsGridRef.current);
      }
    };
  }, []);

  const [startWorkflowAnimation, setStartWorkflowAnimation] = useState(false);
  const workflowRef = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStartWorkflowAnimation(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (workflowRef.current) {
      observer.observe(workflowRef.current);
    }

    return () => {
      if (workflowRef.current) {
        observer.unobserve(workflowRef.current);
      }
    };
  }, []);

  const [stats, setStats] = useState({
    totalSamples: 0,
    totalBuyers: 0,
    totalBuyerMasters: 0,
    totalPOs: 0,
    totalPIs: 0,
    totalStockItems: 0,
    pendingQcCount: 0,
    totalRevenueUSD: 0,
    recentPOs: [],
    recentPIs: [],
  });

  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('2026');

  const [revenueDatasets, setRevenueDatasets] = useState({
    '2026': [
      { month: 'Jan', revenue: 14200, orders: 9, growth: '+5.2%' },
      { month: 'Feb', revenue: 18500, orders: 12, growth: '+30.3%' },
      { month: 'Mar', revenue: 24200, orders: 18, growth: '+30.8%' },
      { month: 'Apr', revenue: 19800, orders: 14, growth: '-18.2%' },
      { month: 'May', revenue: 31000, orders: 22, growth: '+56.6%' },
      { month: 'Jun', revenue: 27900, orders: 19, growth: '-10.0%' },
      { month: 'Jul', revenue: 42800, orders: 29, growth: '+53.4%' },
      { month: 'Aug', revenue: 36000, orders: 24, growth: '-15.9%' },
      { month: 'Sep', revenue: 39500, orders: 26, growth: '+9.7%' },
      { month: 'Oct', revenue: 45200, orders: 31, growth: '+14.4%' },
      { month: 'Nov', revenue: 41000, orders: 27, growth: '-9.3%' },
      { month: 'Dec', revenue: 48900, orders: 34, growth: '+19.3%' },
    ],
    'last6': [
      { month: 'Mar', revenue: 24200, orders: 18, growth: '+30.8%' },
      { month: 'Apr', revenue: 19800, orders: 14, growth: '-18.2%' },
      { month: 'May', revenue: 31000, orders: 22, growth: '+56.6%' },
      { month: 'Jun', revenue: 27900, orders: 19, growth: '-10.0%' },
      { month: 'Jul', revenue: 42800, orders: 29, growth: '+53.4%' },
      { month: 'Aug', revenue: 36000, orders: 24, growth: '-15.9%' },
    ],
    'ytd': [
      { month: 'Jan', revenue: 14200, orders: 9, growth: '+5.2%' },
      { month: 'Feb', revenue: 18500, orders: 12, growth: '+30.3%' },
      { month: 'Mar', revenue: 24200, orders: 18, growth: '+30.8%' },
      { month: 'Apr', revenue: 19800, orders: 14, growth: '-18.2%' },
      { month: 'May', revenue: 31000, orders: 22, growth: '+56.6%' },
      { month: 'Jun', revenue: 27900, orders: 19, growth: '-10.0%' },
      { month: 'Jul', revenue: 42800, orders: 29, growth: '+53.4%' },
      { month: 'Aug', revenue: 36000, orders: 24, growth: '-15.9%' },
    ]
  });

  const activeMonthlyData = revenueDatasets[timeframe] || revenueDatasets['2026'];


  const [pipelineMetrics, setPipelineMetrics] = useState({
    gateEntry: 88,
    sanding: 72,
    polishing: 64,
    packaging: 94,
    passRate: 98.4
  });

  const [storeStats, setStoreStats] = useState(null);

  useEffect(() => {
    setLoading(true);
    if (user?.role === 'store_manager') {
      api.get('/store/stock-summary/')
        .then(res => setStoreStats(res.data))
        .catch(err => console.error('Failed to load store summary for dashboard:', err));
    }
    api.get('/dashboard/stats/')
      .then((res) => {
        const d = res.data;
        if (d) {
          setStats({
            totalSamples: d.totalSamples || 0,
            totalBuyers: d.totalBuyers || 0,
            totalBuyerMasters: d.totalBuyerMasters || 0,
            totalPOs: d.totalPOs || 0,
            totalPIs: d.totalPIs || 0,
            totalStockItems: d.totalStockItems || 0,
            pendingQcCount: d.pendingQcCount || 0,
            totalRevenueUSD: d.totalRevenueUSD || 0,
            recentPOs: d.recentPOs || [],
            recentPIs: d.recentPIs || [],
          });

          if (d.revenueDatasets) {
            setRevenueDatasets(d.revenueDatasets);
          }

          if (d.pipelineMetrics) {
            setPipelineMetrics(d.pipelineMetrics);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading dashboard stats:', err);
      })
      .finally(() => setLoading(false));
  }, []);



  const visibleTiles = ALL_TILES.filter((t) => t.roles.includes(user?.role));

  const getRoleWelcome = () => {
    if (isAdmin) return 'Executive ERP Control Center — Complete Operations & Analytics';
    if (user?.role === 'store_manager') return 'Store Manager Portal — Inventory, Stock & Material Operations';
    if (isSandingSupervisor) return 'Sanding Supervisor — Workstation & Batch Control';
    if (isSupervisor) return `${user.batch_category?.charAt(0).toUpperCase() + user.batch_category?.slice(1)} Supervisor Portal`;
    if (isContractor) return 'Contractor Portal — Batch Assignments & Status';
    return '';
  };

  const monthlyRevenueMock = [
    { month: 'Feb', revenue: 18500, orders: 12 },
    { month: 'Mar', revenue: 24200, orders: 18 },
    { month: 'Apr', revenue: 19800, orders: 14 },
    { month: 'May', revenue: 31000, orders: 22 },
    { month: 'Jun', revenue: 27900, orders: 19 },
    { month: 'Jul', revenue: 42800, orders: 29 },
    { month: 'Aug', revenue: 36000, orders: 24 },
  ];

  return (
    <div className="admin-dashboard-container smooth-fade-in">
      {/* Welcome & Executive Header */}
      <div className="dashboard-welcome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="dashboard-welcome-name">
            Welcome back, {user?.full_name || user?.username || 'System Admin'} 👋
          </h2>
          <p className="dashboard-welcome-role">{getRoleWelcome()}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className={`login-role-badge ${user?.role}-badge`} style={{ fontSize: '0.9rem', padding: '0.45rem 1.1rem' }}>
            {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </span>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div style={{ marginTop: '-0.5rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Quick Action Shortcuts
        </h4>
        <div className="admin-quick-actions">
          {user?.role === 'store_manager' ? (
            <>
              <Link to="/store-management/material-in" className="quick-action-btn">
                <Plus size={16} color="#22c55e" /> Material Inward Entry
              </Link>
              <Link to="/store-management/daily-issue" className="quick-action-btn">
                <Truck size={16} color="#ea580c" /> Record Daily Issue
              </Link>
              <Link to="/store-management/item-master/new" className="quick-action-btn">
                <Warehouse size={16} color="#3b82f6" /> Add New Store Item
              </Link>
              <Link to="/store-management" className="quick-action-btn">
                <Boxes size={16} color="#8b5cf6" /> Store Overview
              </Link>
            </>
          ) : (
            <>
              <Link to="/samples/new" className="quick-action-btn">
                <Plus size={16} color="#22c55e" /> Add New Sample
              </Link>
              <Link to="/buyers" className="quick-action-btn">
                <Users size={16} color="#ec4899" /> Add Buyer
              </Link>
              <Link to="/pos/new" className="quick-action-btn">
                <ClipboardList size={16} color="#14b8a6" /> Create Supplier PO
              </Link>
              <Link to="/tools" className="quick-action-btn">
                <Sparkles size={16} color="#8b5cf6" /> Generate PPT Presentation
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Navigation Quick Grid Tiles */}
      <div>
        <h3 className="workflow-title" style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>Modules Navigation & Management</h3>
        <div className="dashboard-grid">
          {visibleTiles.map((tile, index) => (
            <Link
              key={index}
              to={tile.link}
              className={`dashboard-tile stat-card-animated ${tile.link === '#' ? 'tile-disabled' : ''}`}
              style={{ animationDelay: `${Math.min(index * 40, 250)}ms` }}
            >
              <div className="tile-icon" style={{ backgroundColor: tile.color }}>
                {tile.icon}
              </div>
              <span className="tile-label">{tile.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        {user?.role === 'store_manager' ? (
          <>
            {/* KPI 1: Inward Received Stock */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#0284c7', animationDelay: '100ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                  <ArrowDownRight size={22} />
                </div>
                <span className="kpi-trend-badge" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                  Stock Inward
                </span>
              </div>
              <div>
                <div className="kpi-value">{(storeStats?.total_stock_qty || 0).toLocaleString()}</div>
                <p className="kpi-title">Inward Received Inventory Stock</p>
              </div>
            </div>

            {/* KPI 2: Issued Stock Qty */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#ea580c', animationDelay: '150ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#ffedd5', color: '#ea580c' }}>
                  <ArrowUpRight size={22} />
                </div>
                <span className="kpi-trend-badge" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
                  Outward Issues
                </span>
              </div>
              <div>
                <div className="kpi-value">{(storeStats?.total_issued_qty || 0).toLocaleString()}</div>
                <p className="kpi-title">Total Issued to Contractors</p>
              </div>
            </div>

            {/* KPI 3: Available Store Balance */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#16a34a', animationDelay: '200ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <Warehouse size={22} />
                </div>
                <span className="kpi-trend-badge" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                  Store Available
                </span>
              </div>
              <div>
                <div className="kpi-value">{(storeStats?.total_balance_qty || 0).toLocaleString()}</div>
                <p className="kpi-title">Balance Available Stock in Store</p>
              </div>
            </div>

            {/* KPI 4: Inventory Valuation */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#8b5a2b', animationDelay: '250ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <DollarSign size={22} />
                </div>
                <span className="kpi-trend-badge" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                  Valuation
                </span>
              </div>
              <div>
                <div className="kpi-value">₹ {(storeStats?.total_inventory_valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <p className="kpi-title">Current Store Inventory Valuation</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* KPI 1: Proforma Revenue */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#10b981', animationDelay: '100ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#d1fae5', color: '#059669' }}>
                  <DollarSign size={22} />
                </div>
                <span className="kpi-trend-badge">
                  <TrendingUp size={12} /> +18.4%
                </span>
              </div>
              <div>
                <div className="kpi-value">${stats.totalRevenueUSD.toLocaleString()}</div>
                <p className="kpi-title">Proforma Invoiced Revenue</p>
              </div>
            </div>

            {/* KPI 2: Active Purchase Orders */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#14b8a6', animationDelay: '150ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#ccfbf1', color: '#0d9488' }}>
                  <ClipboardList size={22} />
                </div>
                <span className="kpi-trend-badge">
                  <TrendingUp size={12} /> Live Active
                </span>
              </div>
              <div>
                <div className="kpi-value">{stats.totalPOs} POs</div>
                <p className="kpi-title">Supplier Purchase Orders ({stats.pendingQcCount} Pending QC)</p>
              </div>
            </div>

            {/* KPI 3: Total Buyers */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#ec4899', animationDelay: '200ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#fce7f3', color: '#db2777' }}>
                  <Users size={22} />
                </div>
                <span className="kpi-trend-badge">
                  Active Export
                </span>
              </div>
              <div>
                <div className="kpi-value">{stats.totalBuyers} Clients</div>
                <p className="kpi-title">Registered Buyer Accounts</p>
              </div>
            </div>

            {/* KPI 4: Samples & Stock Catalog */}
            <div className="admin-kpi-card stat-card-animated" style={{ '--kpi-color': '#6366f1', animationDelay: '250ms' }}>
              <div className="kpi-header">
                <div className="kpi-icon-wrap" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                  <Box size={22} />
                </div>
                <span className="kpi-trend-badge">
                  Catalog
                </span>
              </div>
              <div>
                <div className="kpi-value">{stats.totalSamples} Samples</div>
                <p className="kpi-title">{stats.totalBuyerMasters} Buyer Master Styles</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="admin-charts-grid" ref={chartsGridRef}>
        {user?.role === 'store_manager' ? (
          <>
            {/* Chart 1: Store Material In vs Daily Issue Analytics */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <BarChart3 size={20} color="#ea580c" /> Store Material In vs Daily Issue Analytics
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 700 }}>
                  Outward & Inward Ledger
                </span>
              </div>
              <InteractiveStoreChart storeData={storeStats} startAnimation={startChartAnimation} />
            </div>

            {/* Chart 2: Store Category Distribution & Stock Health */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <Warehouse size={20} color="#0284c7" /> Store Inventory & Category Health
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                  Active Stock Levels
                </span>
              </div>
              
              <div className="pipeline-progress-list" style={{ marginTop: '0.5rem' }}>
                {(storeStats?.category_health && storeStats.category_health.length > 0) ? (
                  storeStats.category_health.map((cat, idx) => {
                    const colors = ['#0284c7', '#16a34a', '#a855f7', '#ea580c', '#d97706', '#059669', '#dc2626'];
                    const color = colors[idx % colors.length];
                    return (
                      <div key={idx} className="pipeline-item">
                        <div className="pipeline-item-label">
                          <span style={{ fontWeight: 700, color: '#334155' }}>{cat.category_name}</span>
                          <span style={{ fontWeight: 700, color: cat.stock_percent < 50 ? '#dc2626' : '#16a34a' }}>
                            {cat.stock_percent}% Stocked ({cat.healthy_count}/{cat.total_count} Healthy)
                          </span>
                        </div>
                        <div className="pipeline-bar-track">
                          <div
                            className="pipeline-bar-fill"
                            style={{
                              width: startChartAnimation ? `${cat.stock_percent}%` : '0%',
                              background: cat.stock_percent < 50 ? '#dc2626' : color,
                              transition: 'width 1.5s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                    No store category stock data found.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Chart 1: Revenue & Order Analytics */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <BarChart3 size={20} color="#8b5a2b" /> Order Revenue & Growth Analytics
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CustomSelect
                    value={timeframe}
                    onChange={e => {
                      const val = e.target ? e.target.value : e;
                      setTimeframe(val);
                    }}
                    options={[
                      { value: '2026', label: '2026 Monthly Trend' },
                      { value: 'last6', label: 'Last 6 Months' },
                      { value: 'ytd', label: 'Year To Date' }
                    ]}
                    style={{ width: '170px' }}
                  />
                </div>
              </div>
              <InteractiveRevenueChart monthlyData={activeMonthlyData} startAnimation={startChartAnimation} />
            </div>

            {/* Chart 2: Manufacturing Pipeline Progress */}
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3 className="admin-chart-title">
                  <Activity size={20} color="#3b82f6" /> Production Workflow Pipeline
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                  <AnimatedCounter value={pipelineMetrics.passRate} decimals={1} start={startChartAnimation} suffix="% QC Pass" />
                </span>
              </div>
              
              <div className="pipeline-progress-list" style={{ marginTop: '0.5rem' }}>
                <div className="pipeline-item">
                  <div className="pipeline-item-label">
                    <span>Gate Entry & QC</span>
                    <span><AnimatedCounter value={pipelineMetrics.gateEntry} start={startChartAnimation} suffix="% Completed" /></span>
                  </div>
                  <div className="pipeline-bar-track">
                    <div className="pipeline-bar-fill" style={{ width: startChartAnimation ? `${pipelineMetrics.gateEntry}%` : '0%', background: '#10b981', transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  </div>
                </div>

                <div className="pipeline-item">
                  <div className="pipeline-item-label">
                    <span>Sanding Batch</span>
                    <span><AnimatedCounter value={pipelineMetrics.sanding} start={startChartAnimation} suffix="% Completed" /></span>
                  </div>
                  <div className="pipeline-bar-track">
                    <div className="pipeline-bar-fill" style={{ width: startChartAnimation ? `${pipelineMetrics.sanding}%` : '0%', background: '#3b82f6', transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  </div>
                </div>

                <div className="pipeline-item">
                  <div className="pipeline-item-label">
                    <span>Polishing & Finish</span>
                    <span><AnimatedCounter value={pipelineMetrics.polishing} start={startChartAnimation} suffix="% Completed" /></span>
                  </div>
                  <div className="pipeline-bar-track">
                    <div className="pipeline-bar-fill" style={{ width: startChartAnimation ? `${pipelineMetrics.polishing}%` : '0%', background: '#a855f7', transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  </div>
                </div>

                <div className="pipeline-item">
                  <div className="pipeline-item-label">
                    <span>Packaging & Export Stock</span>
                    <span><AnimatedCounter value={pipelineMetrics.packaging} start={startChartAnimation} suffix="% Completed" /></span>
                  </div>
                  <div className="pipeline-bar-track">
                    <div className="pipeline-bar-fill" style={{ width: startChartAnimation ? `${pipelineMetrics.packaging}%` : '0%', background: '#f59e0b', transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>


      {/* Workflow Process Diagram */}
      <div className="workflow-section" ref={workflowRef}>
        <h3 className="workflow-title">Pinkcity Manufacturing Lifecycle</h3>
        <div className="workflow-steps">
          {WORKFLOW_STEPS.map((step, index) => (
            <React.Fragment key={index}>
              <div 
                className="workflow-step"
                style={{
                  opacity: startWorkflowAnimation ? 1 : 0,
                  transform: startWorkflowAnimation ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(15px)',
                  transition: 'opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transitionDelay: `${index * 150}ms`
                }}
              >
                <div 
                  className="workflow-step-icon" 
                  style={{ 
                    backgroundColor: step.color,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15) rotate(8deg)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                >
                  {step.icon}
                </div>
                <span className="workflow-step-label">{step.name}</span>
              </div>
              {index < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight 
                  size={20} 
                  className="workflow-arrow" 
                  style={{
                    opacity: startWorkflowAnimation ? 1 : 0,
                    transform: startWorkflowAnimation ? 'translateX(0)' : 'translateX(-10px)',
                    transition: 'opacity 0.5s ease, transform 0.5s ease',
                    transitionDelay: `${(index * 150) + 75}ms`
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
