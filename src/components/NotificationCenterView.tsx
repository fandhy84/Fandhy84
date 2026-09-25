import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  Settings,
  ExternalLink,
  Save,
  BellRing,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord, SchoolConfig, Student } from '../types/attendance';
import { generateNotificationMessage, getWhatsAppUrl } from '../services/notificationService';

interface NotificationCenterViewProps {
  records: AttendanceRecord[];
  students: Student[];
  config: SchoolConfig;
  onUpdateConfig: (config: SchoolConfig) => void;
  onMarkNotificationSent: (recordId: string) => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  records,
  students,
  config,
  onUpdateConfig,
  onMarkNotificationSent,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'MENUNGGU' | 'TERKIRIM'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'outbox' | 'template'>('outbox');

  // Template editor state
  const [templateMasuk, setTemplateMasuk] = useState(config.pesanTemplateMasuk);
  const [templatePulang, setTemplatePulang] = useState(config.pesanTemplatePulang);
  const [templateIzin, setTemplateIzin] = useState(config.pesanTemplateIzin);
  const [autoOpenWA, setAutoOpenWA] = useState(config.autoOpenWhatsApp);
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRecords = records.filter((r) => {
    if (filter === 'MENUNGGU') return r.notifikasiStatus === 'MENUNGGU';
    if (filter === 'TERKIRIM') return r.notifikasiStatus === 'TERKIRIM';
    return true;
  });

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      pesanTemplateMasuk: templateMasuk,
      pesanTemplatePulang: templatePulang,
      pesanTemplateIzin: templateIzin,
      autoOpenWhatsApp: autoOpenWA,
      webhookUrl: webhookUrl.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleOpenWhatsApp = (record: AttendanceRecord) => {
    const msg = generateNotificationMessage(record, config);
    const url = getWhatsAppUrl(record.noHpOrtu, msg);
    onMarkNotificationSent(record.id);
    window.open(url, '_blank');
  };

  // Sample student for preview
  const sampleStudent = students[0] || {
    id: 'sample',
    nisn: '0071234501',
    nama: 'Ahmad Rizky Pratama',
    kelas: 'X IPA 1',
    jenisKelamin: 'L',
    namaOrtu: 'Bambang Pratama',
    noHpOrtu: '081234567890',
  };

  const previewSampleRecord: AttendanceRecord = {
    id: 'sample_rec',
    studentId: sampleStudent.id,
    nisn: sampleStudent.nisn,
    namaSiswa: sampleStudent.nama,
    kelas: sampleStudent.kelas,
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '06:55:00',
    tipe: 'MASUK',
    status: 'TEPAT_WAKTU',
    keterangan: 'Presensi Berhasil',
    noHpOrtu: sampleStudent.noHpOrtu,
    namaOrtu: sampleStudent.namaOrtu,
    notifikasiStatus: 'MENUNGGU',
    syncedToSheets: true,
    timestamp: Date.now(),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pusat Notifikasi Orang Tua</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola pengiriman pesan otomatis dan draft WhatsApp untuk orang tua siswa
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('outbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'outbox'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Antrean Pesan ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('template')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'template'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Format Pesan & Gateway</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'outbox' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Filter Status:</span>
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-medium cursor-pointer ${
                  filter === 'ALL'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Semua ({records.length})
              </button>
              <button
                onClick={() => setFilter('MENUNGGU')}
                className={`px-3 py-1 rounded-lg font-medium cursor-pointer ${
                  filter === 'MENUNGGU'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Belum Dikirim ({records.filter((r) => r.notifikasiStatus === 'MENUNGGU').length})
              </button>
              <button
                onClick={() => setFilter('TERKIRIM')}
                className={`px-3 py-1 rounded-lg font-medium cursor-pointer ${
                  filter === 'TERKIRIM'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Terkirim ({records.filter((r) => r.notifikasiStatus === 'TERKIRIM').length})
              </button>
            </div>
          </div>

          {/* List of Notification items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => {
                const message = generateNotificationMessage(record, config);
                const isSent = record.notifikasiStatus === 'TERKIRIM';
                const hasPhone = Boolean(record.noHpOrtu);

                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                record.tipe === 'MASUK'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {record.tipe}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {record.namaSiswa}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({record.kelas})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Orang Tua: <span className="font-semibold text-slate-700">{record.namaOrtu || '-'}</span> • {record.noHpOrtu || 'No HP Belum Diisi'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-slate-800 block">
                            {record.waktu}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              isSent
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : hasPhone
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isSent ? 'Terkirim' : hasPhone ? 'Siap Kirim' : 'Tanpa No HP'}
                          </span>
                        </div>
                      </div>

                      {/* Message Preview Box */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-sans whitespace-pre-line max-h-32 overflow-y-auto leading-relaxed">
                        {message}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleCopyMessage(message, record.id)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedId === record.id ? 'Tersalin!' : 'Salin Pesan'}</span>
                      </button>

                      {hasPhone ? (
                        <button
                          onClick={() => handleOpenWhatsApp(record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Buka WhatsApp</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Lengkapi No HP di Data Siswa
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 bg-white p-10 text-center rounded-2xl border border-slate-200 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">Tidak ada antrean notifikasi</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Setiap kali siswa absen, draf pesan WhatsApp akan otomatis masuk ke antrean ini.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Template Settings */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              Kustomisasi Format Pesan Notifikasi
            </h3>
            <p className="text-xs text-slate-500">
              Gunakan tag variabel: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">&#123;nama_siswa&#125;</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">&#123;kelas&#125;</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">&#123;jam&#125;</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">&#123;tanggal&#125;</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">&#123;status&#125;</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">&#123;nama_ortu&#125;</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">&#123;nama_sekolah&#125;</code>
            </p>

            <form onSubmit={handleSaveTemplates} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Format Pesan Presensi MASUK
                </label>
                <textarea
                  rows={6}
                  value={templateMasuk}
                  onChange={(e) => setTemplateMasuk(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Format Pesan Presensi PULANG
                </label>
                <textarea
                  rows={6}
                  value={templatePulang}
                  onChange={(e) => setTemplatePulang(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Format Pesan IZIN / SAKIT
                </label>
                <textarea
                  rows={5}
                  value={templateIzin}
                  onChange={(e) => setTemplateIzin(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Behavior switches */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoOpenWA}
                    onChange={(e) => setAutoOpenWA(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800">
                      Otomatis Buka WhatsApp Setelah Scan Berhasil
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Menghitung mundur 3 detik lalu membuka link wa.me ke orang tua siswa.
                    </p>
                  </div>
                </label>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    URL Webhook Otomatisasi WA Gateway (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="Contoh: https://api.fonnte.com/send atau webhook custom"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Jika sekolah menggunakan gateway bot (Fonnte/Wablas/Twilio), masukkan URL endpoint di sini.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                {savedSuccess ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Template berhasil disimpan!
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex items-center gap-2 mb-3 text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Pratinjau Tampilan Pesan WhatsApp Ortu
                </h4>
              </div>

              {/* Chat bubble representation */}
              <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3 text-xs font-sans text-slate-200 whitespace-pre-line leading-relaxed">
                {templateMasuk
                  .replace(/{nama_ortu}/g, sampleStudent.namaOrtu)
                  .replace(/{nama_siswa}/g, sampleStudent.nama)
                  .replace(/{kelas}/g, sampleStudent.kelas)
                  .replace(/{tipe}/g, 'MASUK')
                  .replace(/{status}/g, 'Hadir Tepat Waktu ✅')
                  .replace(/{jam}/g, '06:55:00')
                  .replace(/{tanggal}/g, new Date().toISOString().split('T')[0])
                  .replace(/{nama_sekolah}/g, config.namaSekolah)
                  .replace(/{keterangan}/g, 'Presensi Berhasil')}
              </div>

              <p className="text-[11px] text-slate-400 mt-3">
                Pesan ini yang akan langsung terisi saat guru/operator mengklik tombol &quot;Kirim WA&quot;
                atau saat scanner memicu notifikasi.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
