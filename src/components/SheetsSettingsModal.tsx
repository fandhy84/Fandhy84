import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Link,
  X,
  RefreshCw,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SheetsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  spreadsheetId: string;
  spreadsheetUrl: string;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  onCreateNewSpreadsheet: () => Promise<void>;
  onConnectExistingSpreadsheet: (id: string) => Promise<void>;
  onDisconnectSheets: () => void;
  isProcessing: boolean;
}

export const SheetsSettingsModal: React.FC<SheetsSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  spreadsheetId,
  spreadsheetUrl,
  onGoogleSignIn,
  onGoogleLogout,
  onCreateNewSpreadsheet,
  onConnectExistingSpreadsheet,
  onDisconnectSheets,
  isProcessing,
}) => {
  const [activeMode, setActiveMode] = useState<'create' | 'existing'>('create');
  const [inputSheetUrlOrId, setInputSheetUrlOrId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    let id = inputSheetUrlOrId.trim();

    // Extract ID if full URL pasted (e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit)
    const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      id = match[1];
    }

    if (!id) {
      setErrorMessage('Masukkan ID atau URL Google Spreadsheet yang valid.');
      return;
    }

    try {
      await onConnectExistingSpreadsheet(id);
      setInputSheetUrlOrId('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menghubungkan ke spreadsheet tersebut.');
    }
  };

  const handleCreateNew = async () => {
    setErrorMessage(null);
    try {
      await onCreateNewSpreadsheet();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membuat spreadsheet baru.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Integrasi Google Sheets Real-Time
              </h3>
              <p className="text-xs text-slate-500">
                Penyimpanan database absensi langsung ke akun Google Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth State Step */}
        {!user ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-3">
            <p className="text-xs text-slate-600">
              Silakan login dengan Akun Google Anda terlebih dahulu untuk memberikan izin akses ke Google Sheets & Drive.
            </p>

            <button
              onClick={onGoogleSignIn}
              disabled={isProcessing}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer text-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.39 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 10.03 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{isProcessing ? 'Menghubungkan...' : 'Masuk dengan Google (Otorisasi)'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Akun'}
                  className="w-8 h-8 rounded-full border border-emerald-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-bold text-emerald-950">{user.displayName || 'Akun Google'}</p>
                <p className="text-[11px] text-emerald-700">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onGoogleLogout}
              className="text-slate-500 hover:text-rose-600 text-xs font-semibold p-1.5 rounded-lg hover:bg-white transition-colors"
            >
              Ganti Akun
            </button>
          </div>
        )}

        {/* Current Active Sheet Info */}
        {spreadsheetId && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Spreadsheet Aktif
              </span>
              <button
                onClick={onDisconnectSheets}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
              >
                Putuskan Sambungan
              </button>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-mono text-[11px] text-slate-500 truncate">ID: {spreadsheetId}</p>
              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold pt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Spreadsheet di Google Sheets</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Options to Create New or Connect Existing */}
        {user && (
          <div className="space-y-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveMode('create')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeMode === 'create'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Baru Otomatis</span>
              </button>

              <button
                onClick={() => setActiveMode('existing')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeMode === 'existing'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                <span>Pakai Sheet yang Ada</span>
              </button>
            </div>

            {activeMode === 'create' ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
                <p className="text-slate-600">
                  Sistem akan otomatis membuat file Google Spreadsheet baru di Google Drive Anda
                  lengkap dengan kolom header presensi dan tab referensi siswa.
                </p>
                <button
                  onClick={handleCreateNew}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessing ? 'Sedang Membuat Sheet...' : 'Buat Spreadsheet Baru Sekarang'}</span>
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleConnectExisting}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-3"
              >
                <label className="font-semibold text-slate-700 block">
                  Tempel URL atau ID Google Spreadsheet
                </label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/... atau Spreadsheet ID"
                  value={inputSheetUrlOrId}
                  onChange={(e) => setInputSheetUrlOrId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !inputSheetUrlOrId.trim()}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {isProcessing ? 'Memverifikasi Akses...' : 'Sambungkan Spreadsheet'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
