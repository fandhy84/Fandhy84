import React, { useState } from 'react';
import {
  School,
  Clock,
  Save,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  HelpCircle,
  Database,
  ExternalLink,
} from 'lucide-react';
import { SchoolConfig } from '../types/attendance';

interface SettingsViewProps {
  config: SchoolConfig;
  onUpdateConfig: (config: SchoolConfig) => void;
  onResetSampleData: () => void;
  onOpenSheetsModal: () => void;
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
  onResetSampleData,
  onOpenSheetsModal,
  spreadsheetId,
  spreadsheetUrl,
}) => {
  const [formData, setFormData] = useState({
    namaSekolah: config.namaSekolah,
    alamatSekolah: config.alamatSekolah,
    jamMasukBatas: config.jamMasukBatas,
    jamPulangBatas: config.jamPulangBatas,
  });

  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      ...formData,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Pengaturan Sekolah & Presensi</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sesuaikan profil sekolah, jam operasional presensi, dan koneksi Google Sheets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <School className="w-4 h-4 text-indigo-600" />
              Identitas Sekolah
            </h3>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Sekolah</label>
              <input
                type="text"
                required
                value={formData.namaSekolah}
                onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Alamat Sekolah</label>
              <input
                type="text"
                value={formData.alamatSekolah}
                onChange={(e) => setFormData({ ...formData, alamatSekolah: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2 pt-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Aturan Jam Kehadiran
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Batas Jam Masuk (Tepat Waktu)
                </label>
                <input
                  type="time"
                  required
                  value={formData.jamMasukBatas}
                  onChange={(e) => setFormData({ ...formData, jamMasukBatas: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Scan lewat dari jam ini otomatis diberi status <b>Terlambat</b>.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Batas Jam Pulang (Selesai KBM)
                </label>
                <input
                  type="time"
                  required
                  value={formData.jamPulangBatas}
                  onChange={(e) => setFormData({ ...formData, jamPulangBatas: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Scan sebelum jam ini diberi status <b>Pulang Cepat</b>.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {saved ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Pengaturan berhasil disimpan!
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Database & Cloud Sheets Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Koneksi Google Sheets
            </h3>

            {spreadsheetId ? (
              <div className="text-xs space-y-2">
                <p className="text-slate-600">
                  Database absensi terhubung langsung dengan akun Google Sheets Anda.
                </p>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl font-mono text-[11px] truncate">
                  ID: {spreadsheetId}
                </div>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka File Spreadsheet</span>
                  </a>
                )}
                <button
                  onClick={onOpenSheetsModal}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs mt-2 transition-colors cursor-pointer"
                >
                  Kelola Spreadsheet
                </button>
              </div>
            ) : (
              <div className="text-xs space-y-2">
                <p className="text-slate-500">
                  Google Sheets belum terhubung. Hubungkan akun Anda untuk mengaktifkan sinkronisasi otomatis.
                </p>
                <button
                  onClick={onOpenSheetsModal}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Hubungkan Google Sheets
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Data & Uji Coba
            </h3>
            <p className="text-xs text-slate-500">
              Reset atau kembalikan daftar siswa sampel ke kondisi awal jika ingin menguji ulang sistem presensi.
            </p>
            <button
              onClick={() => {
                if (confirm('Kembalikan data siswa ke sampel awal?')) {
                  onResetSampleData();
                }
              }}
              className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-xs transition-colors cursor-pointer"
            >
              Reset ke Data Sampel Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
