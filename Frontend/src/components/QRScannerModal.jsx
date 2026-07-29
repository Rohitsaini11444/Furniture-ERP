import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess, title = "Scan Invoice / PO QR Code" }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [manualCode, setManualCode] = useState('');
  
  const scannerRef = useRef(null);
  const readerElementId = 'qr-reader-container';

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')) || devices[0];
          setSelectedCameraId(backCam.id);
        } else {
          setErrorMsg("No camera detected on this device. You can type the PO/Invoice code manually below.");
        }
      })
      .catch(err => {
        console.error("Camera access error:", err);
        setErrorMsg("Unable to access camera. Please allow camera permissions or use manual entry below.");
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedCameraId && !isScanning) {
      startScanner(selectedCameraId);
    }
  }, [isOpen, selectedCameraId]);

  const startScanner = (cameraId) => {
    if (scannerRef.current) {
      stopScanner();
    }

    setTimeout(() => {
      try {
        const html5QrcodeScanner = new Html5Qrcode(readerElementId);
        scannerRef.current = html5QrcodeScanner;

        const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(Math.floor(minDim * 0.85), 240);
          return { width: boxSize, height: boxSize };
        };

        html5QrcodeScanner.start(
          cameraId,
          {
            fps: 15,
            qrbox: qrboxFunction,
            aspectRatio: 1.0
          },
          (decodedText) => {
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, audioCtx.currentTime);
              osc.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.15);
            } catch (e) {
              console.log("Audio feedback error:", e);
            }

            stopScanner();
            onScanSuccess(decodedText);
          },
          () => {
            // Frame scan loop error - silent
          }
        ).then(() => {
          setIsScanning(true);
        }).catch(err => {
          console.error("Failed to start scanner:", err);
          setErrorMsg("Could not start camera feed. Please try manual code entry.");
        });
      } catch (err) {
        console.error("Scanner init error:", err);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        setIsScanning(false);
      }).catch(err => console.error("Error stopping scanner:", err));
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      stopScanner();
      onScanSuccess(manualCode.trim());
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    setSelectedCameraId(nextCam.id);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.75rem'
    }} onClick={onClose}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        minHeight: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '1.1rem 1.25rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b'
        }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Camera size={22} color="#38bdf8" /> {title}
          </h4>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              color: '#94a3b8',
              cursor: 'pointer',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Feed Viewfinder Box (Expanded Height for Mobile) */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#090d16',
          textAlign: 'center',
          flex: 1,
          minHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div
            id={readerElementId}
            style={{
              width: '100%',
              maxWidth: '420px',
              minHeight: '320px',
              overflow: 'hidden',
              borderRadius: '18px',
              border: '2px solid #38bdf8',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.25)'
            }}
          />

          {errorMsg && (
            <div style={{ marginTop: '1rem', backgroundColor: '#451a03', border: '1px solid #78350f', color: '#fde68a', padding: '0.85rem 1.1rem', borderRadius: '12px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {cameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              style={{
                marginTop: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '999px',
                padding: '0.55rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <RefreshCw size={15} /> Switch Camera ({cameras.find(c => c.id === selectedCameraId)?.label || 'Camera'})
            </button>
          )}
        </div>

        {/* Manual Code Input Fallback Form */}
        <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Or type PO / Invoice # (e.g. PO-626890)"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem 0.75rem 2.4rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.35rem',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              Verify Code
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
