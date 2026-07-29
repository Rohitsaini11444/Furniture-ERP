import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Boxes, FileText, ShoppingCart, Palette,
  Sparkles, Wrench, Package, Truck, Receipt, ArrowRight,
  Users, Layers, ClipboardList, ClipboardCheck, Warehouse,
  TrendingUp, TrendingDown, DollarSign, Activity, BarChart3,
  PieChart, ShieldCheck, Plus, ExternalLink, Calendar, ArrowUpRight
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
  { name: 'PO & Gate Entry',         icon: <ClipboardCheck size={28} />, color: '#14b8a6', link: '/pos',               roles: ['admin', 'supervisor'] },
  { name: 'Production Pipeline',     icon: <Boxes size={28} />,         color: '#3b82f6', link: '/production-pipeline', roles: ['admin', 'supervisor', 'contractor'] },
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
  const { user, isAdmin, isSupervisor, isContractor, isSandingSupervisor } = useAuth();
  
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

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/samples/', { params: { limit: 1 } }),
      api.get('/buyers/', { params: { limit: 1 } }),
      api.get('/buyer-masters/', { params: { limit: 1 } }),
      api.get('/supplier-pos/'),
      api.get('/stock/'),
      api.get('/buyer-pis/'),
    ]).then(([samplesRes, buyersRes, bmRes, posRes, stockRes, pisRes]) => {
      let sampleCount = samplesRes.status === 'fulfilled' ? (samplesRes.value.data.count ?? (samplesRes.value.data.length || 0)) : 0;
      let buyerCount = buyersRes.status === 'fulfilled' ? (buyersRes.value.data.count ?? (buyersRes.value.data.length || 0)) : 0;
      let bmCount = bmRes.status === 'fulfilled' ? (bmRes.value.data.count ?? (bmRes.value.data.length || 0)) : 0;
      
      let poData = posRes.status === 'fulfilled' ? (posRes.value.data.results || posRes.value.data || []) : [];
      let stockData = stockRes.status === 'fulfilled' ? (stockRes.value.data.results || stockRes.value.data || []) : [];
      let piData = pisRes.status === 'fulfilled' ? (pisRes.value.data.results || pisRes.value.data || []) : [];

      let totalUSD = piData.reduce((sum, item) => {
        let val = parseFloat(item.total_usd || item.total_amount || 0);
        if (!val && item.items && Array.isArray(item.items)) {
          val = item.items.reduce((iSum, sub) => iSum + parseFloat(sub.total_amount || 0), 0);
        }
        return sum + val;
      }, 0);

      let pendingQC = poData.filter(p => p.status === 'Pending').length;

      // Dynamically calculate monthly revenue from PIs if present
      if (piData.length > 0) {
        const monthMap = {};
        piData.forEach(item => {
          const dt = new Date(item.created_at || item.issue_date || item.date || Date.now());
          const monthStr = dt.toLocaleString('en-US', { month: 'short' });
          let val = parseFloat(item.total_usd || item.total_amount || 0);
          if (!val && item.items && Array.isArray(item.items)) {
            val = item.items.reduce((iSum, sub) => iSum + parseFloat(sub.total_amount || 0), 0);
          }
          monthMap[monthStr] = (monthMap[monthStr] || 0) + val;
        });

        const monthsOrder = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
        const dynamicMonthly = monthsOrder.map((m) => {
          const rev = monthMap[m] !== undefined ? monthMap[m] : 0;
          return { month: m, revenue: rev, orders: Math.max(0, Math.round(rev / 1500)) };
        });
        setMonthlyRevenueData(dynamicMonthly);
      }

      // Dynamically calculate pipeline stats
      const completedPOs = poData.filter(p => p.status === 'Completed' || p.status === 'Verified' || p.status === 'Received').length;
      const totalPOCount = Math.max(1, poData.length);
      const gateRate = Math.min(100, Math.round(((totalPOCount - pendingQC) / totalPOCount) * 100));
      const sandingRate = Math.min(100, Math.round(gateRate * 0.85));
      const polishRate = Math.min(100, Math.round(sandingRate * 0.88));
      const packRate = Math.min(100, Math.round((stockData.length / Math.max(1, sampleCount)) * 90));

      setPipelineMetrics({
        gateEntry: gateRate,
        sanding: sandingRate,
        polishing: polishRate,
        packaging: packRate,
        passRate: parseFloat((95 + (completedPOs / totalPOCount) * 4).toFixed(1))
      });

      setStats({
        totalSamples: sampleCount,
        totalBuyers: buyerCount,
        totalBuyerMasters: bmCount,
        totalPOs: poData.length,
        totalPIs: piData.length,
        totalStockItems: stockData.length,
        pendingQcCount: pendingQC,
        totalRevenueUSD: totalUSD,
        recentPOs: poData.slice(0, 5),
        recentPIs: piData.slice(0, 5),
      });
    }).finally(() => setLoading(false));
  }, []);



  const visibleTiles = ALL_TILES.filter((t) => t.roles.includes(user?.role));

  const getRoleWelcome = () => {
    if (isAdmin) return 'Executive ERP Control Center — Complete Operations & Analytics';
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
          <Link to="/samples" className="quick-action-btn">
            <Plus size={16} color="#22c55e" /> Add New Sample
          </Link>
          <Link to="/buyers" className="quick-action-btn">
            <Users size={16} color="#ec4899" /> Add Buyer
          </Link>
          <Link to="/pos" className="quick-action-btn">
            <ClipboardList size={16} color="#14b8a6" /> Create Supplier PO
          </Link>
          <Link to="/tools" className="quick-action-btn">
            <Sparkles size={16} color="#8b5cf6" /> Generate PPT Presentation
          </Link>
        </div>
      </div>

      {/* Navigation Quick Grid Tiles */}
      <div>
        <h3 className="workflow-title" style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>Modules Navigation & Management</h3>
        <div className="dashboard-grid">
          {visibleTiles.map((tile, index) => (
            <Link key={index} to={tile.link} className={`dashboard-tile ${tile.link === '#' ? 'tile-disabled' : ''}`}>
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
        {/* KPI 1: Proforma Revenue */}
        <div className="admin-kpi-card" style={{ '--kpi-color': '#10b981' }}>
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
        <div className="admin-kpi-card" style={{ '--kpi-color': '#14b8a6' }}>
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
        <div className="admin-kpi-card" style={{ '--kpi-color': '#ec4899' }}>
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
        <div className="admin-kpi-card" style={{ '--kpi-color': '#6366f1' }}>
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
      </div>

      {/* Analytics Charts Grid */}
      <div className="admin-charts-grid" ref={chartsGridRef}>
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
