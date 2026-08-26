import React, { useMemo } from 'react';
import { Flame, Activity, Moon, Users, TrendingUp, Package, ShieldCheck } from 'lucide-react';

export default function StoreAnalyticsSection({ items = [], dailyIssues = [], contractors = [] }) {
  // Compute contractor consumption totals
  const contractorAnalytics = useMemo(() => {
    const map = {};
    dailyIssues.forEach(issue => {
      const cId = issue.contractor || 'direct';
      const cName = issue.contractor_name || issue.contractor_person_name || 'Direct / Internal';
      const qty = parseFloat(issue.qty || 0);
      const rate = parseFloat(issue.rate || issue.item_rate || 0);
      const val = qty * (rate || 1);

      if (!map[cId]) {
        map[cId] = { name: cName, totalQty: 0, totalVal: 0, count: 0 };
      }
      map[cId].totalQty += qty;
      map[cId].totalVal += val;
      map[cId].count += 1;
    });

    const list = Object.values(map).sort((a, b) => b.totalVal - a.totalVal);
    const maxVal = list[0]?.totalVal || 1;

    return list.map(c => ({
      ...c,
      pct: Math.min(100, Math.round((c.totalVal / maxVal) * 100))
    }));
  }, [dailyIssues]);

  // Compute item velocity / movement speed
  const itemMovementMap = useMemo(() => {
    const issueCountMap = {};
    dailyIssues.forEach(issue => {
      const itemId = issue.item || issue.item_id;
      if (itemId) {
        issueCountMap[itemId] = (issueCountMap[itemId] || 0) + 1;
      }
    });

    const fast = [];
    const moderate = [];
    const slow = [];

    items.forEach(it => {
      const count = issueCountMap[it.id] || 0;
      if (count >= 3) {
        fast.push({ ...it, issueCount: count });
      } else if (count >= 1) {
        moderate.push({ ...it, issueCount: count });
      } else {
        slow.push({ ...it, issueCount: 0 });
      }
    });

    return { fast, moderate, slow };
  }, [items, dailyIssues]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        
        {/* Card 1: Contractor Consumption Breakdown */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e7e5e4',
            padding: '1.25rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}
              >
                <Users size={17} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1c1917' }}>
                  Contractor Material Consumption
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#78716c' }}>
                  Outward inventory issued by contractor
                </span>
              </div>
            </div>
          </div>

          {contractorAnalytics.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#a8a29e', fontSize: '0.82rem' }}>
              No outward issue entries logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {contractorAnalytics.slice(0, 5).map((c, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                    <strong style={{ color: '#292524' }}>{c.name}</strong>
                    <span style={{ color: '#57534e', fontWeight: 600 }}>
                      {c.totalQty.toFixed(1)} pcs ({c.count} issues)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      backgroundColor: '#f5f5f4',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${c.pct}%`,
                        backgroundColor: '#5c3a21',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Inventory Velocity & Movement Speed */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e7e5e4',
            padding: '1.25rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706'
                }}
              >
                <TrendingUp size={17} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1c1917' }}>
                  Inventory Velocity Classification
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#78716c' }}>
                  Fast-moving vs Dead/Slow stock movement
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {/* Fast Moving */}
            <div
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#16a34a', marginBottom: '4px' }}>
                <Flame size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 750 }}>Fast Moving</span>
              </div>
              <strong style={{ fontSize: '1.25rem', color: '#14532d', fontWeight: 800 }}>
                {itemMovementMap.fast.length}
              </strong>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>
                Frequent issues
              </span>
            </div>

            {/* Moderate */}
            <div
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#d97706', marginBottom: '4px' }}>
                <Activity size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 750 }}>Moderate</span>
              </div>
              <strong style={{ fontSize: '1.25rem', color: '#78350f', fontWeight: 800 }}>
                {itemMovementMap.moderate.length}
              </strong>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#b45309', marginTop: '2px' }}>
                Normal movement
              </span>
            </div>

            {/* Dead / Slow Stock */}
            <div
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#dc2626', marginBottom: '4px' }}>
                <Moon size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 750 }}>Slow / Dead</span>
              </div>
              <strong style={{ fontSize: '1.25rem', color: '#7f1d1d', fontWeight: 800 }}>
                {itemMovementMap.slow.length}
              </strong>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#b91c1c', marginTop: '2px' }}>
                0 issues in 30d
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
