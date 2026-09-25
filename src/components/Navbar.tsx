import React, { useEffect, useState } from 'react';
import {
  QrCode,
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'scan' | 'dashboard' | 'students' | 'notifications' | 'settings';
  setActiveTab: (tab: 'scan' | 'dashboard' | 'students' | 'notifications' | 'settings') => void;
  schoolName: string;
  user: User | null;
  spreadsheetId: string;
  spreadsheetUrl: string;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  onOpenSheetsModal: () => void;
  isSyncing: boolean;
  onManualSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  schoolName,
  user,
  spreadsheetId,
  spreadsheetUrl,
  onGoogleSignIn,
  onLogout,
  onOpenSheetsModal,
  isSyncing,
  onManualSync,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & School info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-800 text-base leading-tight tracking-tight">
                  HadirGo Presensi
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  QR Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
                {schoolName}
              </p>
            </div>
          </div>

          {/* Time & Google Sheets Connection Bar */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Live Clock */}
            <div className="flex items-center text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <div className="flex flex-col text-right">
                <span className="font-bold text-slate-800 font-mono">{currentTime}</span>
                <span className="text-[10px] text-slate-500">{currentDate}</span>
              </div>
            </div>

            {/* Google Sheets Sync Badge */}
            {spreadsheetId ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[130px]">Sheets Terhubung</span>
                <button
                  onClick={onManualSync}
                  title="Sinkronkan data sekarang"
                  className="p-1 hover:bg-emerald-100 rounded-md transition-colors text-emerald-700"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Buka di Google Sheets"
                    className="p-1 hover:bg-emerald-100 rounded-md transition-colors text-emerald-700"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenSheetsModal}
                className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hubungkan Google Sheets</span>
              </button>
            )}

            {/* Google Sign In / User Status */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  title="Keluar dari akun Google"
                  className="text-slate-500 hover:text-rose-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                type="button"
                className="flex items-center gap-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                <span>Masuk Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary bar: Time & Sheets quick state */}
        <div className="flex md:hidden items-center justify-between pb-2 text-xs border-t border-slate-100 pt-2">
          <span className="font-mono text-slate-700 font-medium">{currentTime}</span>
          {spreadsheetId ? (
            <span className="flex items-center text-emerald-700 text-[11px] font-medium bg-emerald-50 px-2 py-0.5 rounded-sm">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
              Sheets Terhubung
            </span>
          ) : (
            <button
              onClick={onOpenSheetsModal}
              className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-sm"
            >
              + Sambung Sheets
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar border-t border-slate-100 py-1.5">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Scanner QR</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard & Rekap</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Siswa & Kartu QR</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Notifikasi Orang Tua</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
