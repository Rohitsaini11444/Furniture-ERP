import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Eye, CheckCircle2 } from 'lucide-react';

export default function InvoiceQRCode({ invoiceData, size = 95, showTestButton = true }) {
  const [showTestModal, setShowTestModal] = useState(false);

  // Format encoded JSON payload
  const payload = JSON.stringify({
    invoice_no: invoiceData.pi_no || invoiceData.invoice_no || 'PI-626890',
    po_number: invoiceData.buyer_order_no || invoiceData.po_number || 'PO-984512',
    buyer: invoiceData.buyer_name || (invoiceData.buyer ? invoiceData.buyer.name : 'Valued Buyer'),
    date: invoiceData.pi_date || invoiceData.created_at || new Date().toISOString().split('T')[0],
    items_count: invoiceData.items ? invoiceData.items.length : 1
  });

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      {/* SVG QR Code Box */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '0.45rem',
        borderRadius: '10px',
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <QRCodeSVG
          value={payload}
          size={size}
          bgColor={"#ffffff"}
          fgColor={"#0f172a"}
          level={"M"}
          includeMargin={false}
        />
      </div>

      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>
        SCAN FOR GATE ENTRY
      </span>

      {showTestButton && (
        <button
          type="button"
          onClick={() => setShowTestModal(true)}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.25rem 0.6rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#0284c7',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <Eye size={12} /> Test QR Payload
        </button>
      )}

      {/* Test Payload Preview Modal */}
      {showTestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }} onClick={() => setShowTestModal(false)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <CheckCircle2 size={22} color="#16a34a" />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Invoice QR Code Encoded Payload
              </h4>
            </div>

            <div style={{
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              padding: '1rem',
              borderRadius: '10px',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              marginBottom: '1.25rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {JSON.stringify(JSON.parse(payload), null, 2)}
            </div>

            <button
              type="button"
              onClick={() => setShowTestModal(false)}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Close Test Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
