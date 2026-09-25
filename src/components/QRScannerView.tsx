import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Zap,
  CheckCircle,
  AlertTriangle,
  Send,
  Sparkles,
  Search,
  LogIn,
  LogOut as LogOutIcon,
  RefreshCw,
  ExternalLink,
  Volume2,
  FileSpreadsheet,
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceType, SchoolConfig } from '../types/attendance';
import { playScanSuccessSound, playWarningSound, triggerHapticFeedback } from '../services/audioService';
import { generateNotificationMessage, getWhatsAppUrl } from '../services/notificationService';

interface QRScannerViewProps {
  students: Student[];
  onAttendanceScanned: (record: AttendanceRecord) => void;
  config: SchoolConfig;
  recentAttendance: AttendanceRecord[];
  isGoogleConnected: boolean;
  onOpenGoogleModal: () => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  students,
  onAttendanceScanned,
  config,
  recentAttendance,
  isGoogleConnected,
  onOpenGoogleModal,
}) => {
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('MASUK');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual search / NISN input
  const [manualQuery, setManualQuery] = useState<string>('');

  // Last scanned student result feedback popup
  const [lastScannedResult, setLastScannedResult] = useState<{
    record: AttendanceRecord;
    student: Student;
    message: string;
    waUrl: string;
  } | null>(null);

  const [notificationCountdown, setNotificationCountdown] = useState<number | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';
  const isProcessingScan = useRef<boolean>(false);

  // Trigger celebratory confetti
  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b'],
      });
    } catch {
      // Ignore
    }
  };

  // Determine attendance status based on school schedule
  const evaluateStatus = (type: AttendanceType, timeStr: string) => {
    // Format "HH:mm:ss" -> compare with "HH:mm"
    const [h, m] = timeStr.split(':').map(Number);
    const currentMins = h * 60 + m;

    if (type === 'MASUK') {
      const [limitH, limitM] = config.jamMasukBatas.split(':').map(Number);
      const limitMins = limitH * 60 + limitM;
      return currentMins > limitMins ? 'TERLAMBAT' : 'TEPAT_WAKTU';
    } else {
      const [limitH, limitM] = config.jamPulangBatas.split(':').map(Number);
      const limitMins = limitH * 60 + limitM;
      return currentMins < limitMins ? 'PULANG_CEPAT' : 'PULANG_NORMAL';
    }
  };

  // Process a scanned or typed raw text/NISN
  const handleProcessCode = useCallback(
    (decodedText: string) => {
      if (isProcessingScan.current) return;
      isProcessingScan.current = true;

      // Extract NISN from QR. The QR text might be raw NISN "0071234501" or JSON or URL containing it
      let targetNisn = decodedText.trim();
      try {
        if (targetNisn.startsWith('{')) {
          const parsed = JSON.parse(targetNisn);
          targetNisn = parsed.nisn || parsed.id || targetNisn;
        }
      } catch {
        // use raw text
      }

      const student = students.find(
        (s) =>
          s.nisn.toLowerCase() === targetNisn.toLowerCase() ||
          s.id.toLowerCase() === targetNisn.toLowerCase() ||
          s.nama.toLowerCase() === targetNisn.toLowerCase()
      );

      if (!student) {
        playWarningSound();
        alert(`QR Code / NISN "${targetNisn}" tidak ditemukan di database siswa. Silakan pastikan data terdaftar.`);
        setTimeout(() => {
          isProcessingScan.current = false;
        }, 1500);
        return;
      }

      // Check if already scanned recently today for this type
      const todayStr = new Date().toISOString().split('T')[0];
      const alreadyScanned = recentAttendance.find(
        (a) => a.studentId === student.id && a.tanggal === todayStr && a.tipe === attendanceType
      );

      if (alreadyScanned) {
        playWarningSound();
        const conf = window.confirm(
          `Perhatian: ${student.nama} sudah tercatat absen ${attendanceType} hari ini pada pukul ${alreadyScanned.waktu} WIB.\n\nApakah tetap ingin mencatat absensi ulang?`
        );
        if (!conf) {
          isProcessingScan.current = false;
          return;
        }
      }

      // Successful attendance recording
      playScanSuccessSound();
      triggerHapticFeedback();
      fireConfetti();

      const now = new Date();
      const waktuStr = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const status = evaluateStatus(attendanceType, waktuStr);

      const record: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentId: student.id,
        nisn: student.nisn,
        namaSiswa: student.nama,
        kelas: student.kelas,
        tanggal: todayStr,
        waktu: waktuStr,
        tipe: attendanceType,
        status: status as any,
        keterangan: status === 'TERLAMBAT' ? `Terlambat dari batas ${config.jamMasukBatas} WIB` : 'Presensi Berhasil',
        noHpOrtu: student.noHpOrtu,
        namaOrtu: student.namaOrtu,
        notifikasiStatus: student.noHpOrtu ? 'MENUNGGU' : 'TIDAK_ADA_NOMOR',
        syncedToSheets: false,
        timestamp: Date.now(),
      };

      onAttendanceScanned(record);

      // Generate WhatsApp message preview
      const waMsg = generateNotificationMessage(record, config);
      const waLink = getWhatsAppUrl(student.noHpOrtu, waMsg);

      setLastScannedResult({
        record,
        student,
        message: waMsg,
        waUrl: waLink,
      });

      // If auto open whatsapp is configured
      if (config.autoOpenWhatsApp && student.noHpOrtu) {
        setNotificationCountdown(3);
      }

      setTimeout(() => {
        isProcessingScan.current = false;
      }, 2000);
    },
    [students, recentAttendance, attendanceType, config, onAttendanceScanned]
  );

  // Handle countdown for automatic WhatsApp open
  useEffect(() => {
    if (notificationCountdown === null) return;
    if (notificationCountdown <= 0) {
      if (lastScannedResult?.waUrl) {
        window.open(lastScannedResult.waUrl, '_blank');
      }
      setNotificationCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setNotificationCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [notificationCountdown, lastScannedResult]);

  // Start scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      // Check if already running
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      await html5QrCodeRef.current.start(
        { facingMode: facingMode },
        {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleProcessCode(decodedText);
        },
        () => {
          // Scanning frame, do not log
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message || 'Tidak dapat mengakses kamera smartphone/laptop. Pastikan izin kamera telah diberikan.'
      );
    }
  };

  // Stop scanner
  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.warn('Error stopping camera:', err);
    } finally {
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Toggle facing camera (front/back)
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isScanning) {
      await stopCamera();
      // will be restarted by facingMode effect or manual call
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  };

  // Upload image QR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const result = await html5QrCodeRef.current.scanFile(file, true);
      handleProcessCode(result);
    } catch (err) {
      alert('QR Code tidak terdeteksi pada gambar yang diunggah. Silakan coba gambar lain yang lebih jelas.');
    } finally {
      e.target.value = '';
    }
  };

  // Autostart camera on mount and cleanup on unmount
  useEffect(() => {
    startCamera();
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner / Google Sheets prompt if not connected */}
      {!isGoogleConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Google Sheets Belum Terhubung
              </p>
              <p className="text-xs text-amber-700">
                Data presensi saat ini disimpan di memori lokal perangkat. Hubungkan Google Sheets agar otomatis tersinkronisasi real-time ke spreadsheet sekolah.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenGoogleModal}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Hubungkan Sekarang
          </button>
        </div>
      )}

      {/* Mode Switcher: Masuk vs Pulang */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Pilih Sesi Presensi
          </span>
          <h2 className="text-lg font-bold text-slate-800">
            {attendanceType === 'MASUK' ? 'Presensi Masuk Siswa' : 'Presensi Pulang Siswa'}
          </h2>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setAttendanceType('MASUK')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              attendanceType === 'MASUK'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Absen Masuk (Batas: {config.jamMasukBatas})</span>
          </button>

          <button
            onClick={() => setAttendanceType('PULANG')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              attendanceType === 'PULANG'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogOutIcon className="w-4 h-4" />
            <span>Absen Pulang (Batas: {config.jamPulangBatas})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Camera Viewport + Quick Test Simulator & Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Scanner */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg relative">
            {/* Camera Header Bar */}
            <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white z-20 relative">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isScanning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-xs font-medium">
                  {isScanning ? 'Kamera Aktif & Siap Scan' : 'Kamera Nonaktif'}
                </span>
              </div>

              {/* Camera Controls */}
              <div className="flex items-center gap-1.5">
                {hasTorch && isScanning && (
                  <button
                    onClick={toggleTorch}
                    title="Flashlight"
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      torchOn ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={toggleCameraFacing}
                  title="Ganti Kamera Depan/Belakang"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                {isScanning ? (
                  <button
                    onClick={stopCamera}
                    title="Matikan Kamera"
                    className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs transition-colors"
                  >
                    <CameraOff className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    title="Nyalakan Kamera"
                    className="p-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
              <div id={scannerContainerId} className="w-full h-full" />

              {/* Scanner HUD Overlay */}
              {isScanning && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10">
                  {/* Targeting Reticle */}
                  <div className="w-60 h-60 border-2 border-dashed border-indigo-400/80 rounded-2xl relative flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                    {/* Glowing corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

                    {/* Animated scanning laser */}
                    <div className="w-full h-0.5 bg-linear-to-r from-transparent via-emerald-400 to-transparent absolute animate-bounce" />

                    <span className="text-[11px] font-semibold text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full backdrop-blur-xs">
                      Arahkan QR Siswa ke Kotak
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white z-30">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
                  <p className="text-sm font-semibold mb-2">Akses Kamera Terkendala</p>
                  <p className="text-xs text-slate-300 max-w-sm mb-4">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}
            </div>

            {/* Bottom info banner */}
            <div className="bg-slate-950 px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                Suara beep otomatis berbunyi saat berhasil scan
              </span>
              <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">
                Upload Foto QR
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Input Manual (Jika Siswa Lupa Kartu / Kamera Rusak)
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik NISN atau Nama Siswa..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualQuery.trim()) {
                      handleProcessCode(manualQuery.trim());
                      setManualQuery('');
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => {
                  if (manualQuery.trim()) {
                    handleProcessCode(manualQuery.trim());
                    setManualQuery('');
                  }
                }}
                disabled={!manualQuery.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0"
              >
                Absenkan
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result Popup & Quick Simulator */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recent Scan Card */}
          {lastScannedResult ? (
            <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-emerald-500 to-teal-400" />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {lastScannedResult.student.avatar ? (
                    <img
                      src={lastScannedResult.student.avatar}
                      alt={lastScannedResult.student.nama}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-base">
                      {lastScannedResult.student.nama.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {lastScannedResult.record.tipe} BERHASIL
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          lastScannedResult.record.status === 'TEPAT_WAKTU' ||
                          lastScannedResult.record.status === 'PULANG_NORMAL'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lastScannedResult.record.status === 'TEPAT_WAKTU'
                          ? 'Tepat Waktu'
                          : lastScannedResult.record.status === 'TERLAMBAT'
                          ? 'Terlambat'
                          : lastScannedResult.record.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mt-1">
                      {lastScannedResult.student.nama}
                    </h3>
                    <p className="text-xs text-slate-500">
                      NISN: {lastScannedResult.student.nisn} • Kelas: {lastScannedResult.student.kelas}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-sm font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  {lastScannedResult.record.waktu}
                </div>
              </div>

              {/* WhatsApp Notification Box */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    Notifikasi Orang Tua (WhatsApp)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700">
                    {lastScannedResult.student.noHpOrtu || 'Tidak ada no HP'}
                  </span>
                </div>

                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 text-xs text-slate-700 whitespace-pre-line font-sans max-h-24 overflow-y-auto">
                  {lastScannedResult.message}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={lastScannedResult.waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {notificationCountdown !== null
                        ? `Membuka WhatsApp (${notificationCountdown}s)...`
                        : 'Kirim WhatsApp ke Orang Tua'}
                    </span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">Menunggu Scan Siswa</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Arahkan QR Code Kartu Pelajar siswa ke kamera atau klik salah satu nama siswa pada simulator demo di bawah.
              </p>
            </div>
          )}

          {/* Quick Simulator: 1-Click Scan Test (Crucial for live preview without physical printed card) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Simulator Cepat (Klik untuk Tes Scan)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Tanpa kamera</span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Klik nama siswa di bawah untuk menguji alur absensi, suara beep, confetti, serta notifikasi WhatsApp:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {students.slice(0, 8).map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleProcessCode(student.nisn)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all group cursor-pointer"
                >
                  {student.avatar ? (
                    <img
                      src={student.avatar}
                      alt={student.nama}
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {student.nama.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-700">
                      {student.nama}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {student.kelas} • {student.nisn}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
