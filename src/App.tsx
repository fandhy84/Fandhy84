/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { QRScannerView } from './components/QRScannerView';
import { DashboardView } from './components/DashboardView';
import { StudentCardsView } from './components/StudentCardsView';
import { NotificationCenterView } from './components/NotificationCenterView';
import { SettingsView } from './components/SettingsView';
import { SheetsSettingsModal } from './components/SheetsSettingsModal';

import { Student, AttendanceRecord, SchoolConfig } from './types/attendance';
import { INITIAL_STUDENTS, DEFAULT_SCHOOL_CONFIG } from './data/initialStudents';
import {
  initAuth,
  googleSignIn,
  logout as authLogout,
  getAccessToken,
  setCachedAccessToken,
} from './services/firebaseAuth';
import {
  createAttendanceSpreadsheet,
  appendAttendanceRecord,
  batchAppendAttendanceRecords,
  testSpreadsheetAccess,
  fetchStudentsFromSheet,
} from './services/sheetsService';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'scan' | 'dashboard' | 'students' | 'notifications' | 'settings'
  >('scan');

  // Persistence keys
  const STUDENTS_STORAGE_KEY = 'hadirgo_students_v1';
  const ATTENDANCE_STORAGE_KEY = 'hadirgo_attendance_v1';
  const CONFIG_STORAGE_KEY = 'hadirgo_config_v1';
  const SHEET_ID_KEY = 'hadirgo_sheet_id';
  const SHEET_URL_KEY = 'hadirgo_sheet_url';

  // State: Students
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_STUDENTS;
  });

  // State: Attendance records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  // State: School configuration
  const [config, setConfig] = useState<SchoolConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return DEFAULT_SCHOOL_CONFIG;
  });

  // State: Google Sheets
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem(SHEET_ID_KEY) || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem(SHEET_URL_KEY) || '';
  });

  // Auth & UI state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (spreadsheetId) {
      localStorage.setItem(SHEET_ID_KEY, spreadsheetId);
    } else {
      localStorage.removeItem(SHEET_ID_KEY);
    }
  }, [spreadsheetId]);

  useEffect(() => {
    if (spreadsheetUrl) {
      localStorage.setItem(SHEET_URL_KEY, spreadsheetUrl);
    } else {
      localStorage.removeItem(SHEET_URL_KEY);
    }
  }, [spreadsheetUrl]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        // user signed out or token unavailable
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // Show transient sync toast
  const showToast = (msg: string) => {
    setSyncNotice(msg);
    setTimeout(() => {
      setSyncNotice(null);
    }, 3500);
  };

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    try {
      setIsSyncing(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        showToast('Berhasil login dengan Akun Google');
      }
    } catch (err: any) {
      alert(`Gagal login Google: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Logout
  const handleGoogleLogout = async () => {
    await authLogout();
    setUser(null);
    setAccessToken(null);
    setCachedAccessToken(null);
    showToast('Telah keluar dari Akun Google');
  };

  // Create new spreadsheet
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      throw new Error('Silakan login ke akun Google terlebih dahulu.');
    }
    setIsSyncing(true);
    try {
      const res = await createAttendanceSpreadsheet(accessToken, config.namaSekolah, students);
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      setIsSheetsModalOpen(false);
      showToast('Spreadsheet baru berhasil dibuat dan terhubung!');

      // Batch upload any existing un-synced attendance records
      const unsynced = attendanceRecords.filter((r) => !r.syncedToSheets);
      if (unsynced.length > 0) {
        await batchAppendAttendanceRecords(accessToken, res.spreadsheetId, unsynced);
        setAttendanceRecords((prev) =>
          prev.map((r) => ({ ...r, syncedToSheets: true }))
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect existing spreadsheet
  const handleConnectExistingSpreadsheet = async (id: string) => {
    if (!accessToken) {
      throw new Error('Silakan login ke akun Google terlebih dahulu.');
    }
    setIsSyncing(true);
    try {
      const info = await testSpreadsheetAccess(accessToken, id);
      setSpreadsheetId(id);
      const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
      setSpreadsheetUrl(url);
      setIsSheetsModalOpen(false);
      showToast(`Terhubung ke "${info.title}"`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect spreadsheet
  const handleDisconnectSheets = () => {
    setSpreadsheetId('');
    setSpreadsheetUrl('');
    setIsSheetsModalOpen(false);
    showToast('Koneksi Google Sheets diputus.');
  };

  // Manual Sync
  const handleManualSync = async () => {
    if (!spreadsheetId) {
      setIsSheetsModalOpen(true);
      return;
    }
    if (!accessToken) {
      await handleGoogleSignIn();
      return;
    }

    setIsSyncing(true);
    try {
      const unsynced = attendanceRecords.filter((r) => !r.syncedToSheets);
      if (unsynced.length > 0) {
        await batchAppendAttendanceRecords(accessToken, spreadsheetId, unsynced);
        setAttendanceRecords((prev) =>
          prev.map((r) => ({ ...r, syncedToSheets: true }))
        );
        showToast(`${unsynced.length} data presensi disinkronkan ke Google Sheets`);
      } else {
        showToast('Semua data presensi sudah tersinkron dengan Google Sheets.');
      }
    } catch (err: any) {
      alert(`Gagal sinkronisasi: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull students from Google Sheets Data_Siswa tab
  const handleSyncStudentsFromSheets = async () => {
    if (!spreadsheetId || !accessToken) {
      alert('Hubungkan akun Google dan Google Sheets terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    try {
      const fetched = await fetchStudentsFromSheet(accessToken, spreadsheetId);
      if (fetched.length === 0) {
        alert('Tidak ada data siswa yang ditemukan pada tab "Data_Siswa" di Google Sheets.');
        return;
      }
      setStudents(fetched);
      showToast(`Berhasil menarik ${fetched.length} data siswa dari Google Sheets!`);
    } catch (e: any) {
      alert(e?.message || 'Gagal memuat siswa dari Google Sheets');
    } finally {
      setIsSyncing(false);
    }
  };

  // When a student attendance is recorded (via Scanner or Manual)
  const handleAttendanceScanned = useCallback(
    async (record: AttendanceRecord) => {
      // 1. Add to local state immediately
      setAttendanceRecords((prev) => [record, ...prev]);

      // 2. Real-time sync to Google Sheets if connected
      const currentToken = accessToken;
      if (spreadsheetId && currentToken) {
        try {
          await appendAttendanceRecord(currentToken, spreadsheetId, record);
          setAttendanceRecords((prev) =>
            prev.map((r) => (r.id === record.id ? { ...r, syncedToSheets: true } : r))
          );
        } catch (e) {
          console.warn('Real-time sync to sheets failed, preserved in local queue:', e);
        }
      }
    },
    [accessToken, spreadsheetId]
  );

  // Mark notification as sent
  const handleMarkNotificationSent = (recordId: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, notifikasiStatus: 'TERKIRIM' } : r))
    );
  };

  // Student management
  const handleAddStudent = (student: Student) => {
    setStudents((prev) => [student, ...prev]);
    showToast(`Siswa ${student.nama} berhasil ditambahkan.`);
  };

  const handleUpdateStudent = (updated: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showToast(`Data siswa ${updated.nama} diperbarui.`);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    showToast('Siswa berhasil dihapus.');
  };

  const handleResetSampleData = () => {
    setStudents(INITIAL_STUDENTS);
    showToast('Data siswa dikembalikan ke sampel awal.');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        schoolName={config.namaSekolah}
        user={user}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleGoogleLogout}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
      />

      {/* Floating Sync Toast */}
      {syncNotice && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl border border-slate-700 backdrop-blur-md flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'scan' && (
          <QRScannerView
            students={students}
            onAttendanceScanned={handleAttendanceScanned}
            config={config}
            recentAttendance={attendanceRecords}
            isGoogleConnected={Boolean(spreadsheetId)}
            onOpenGoogleModal={() => setIsSheetsModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            students={students}
            attendanceRecords={attendanceRecords}
            config={config}
            spreadsheetUrl={spreadsheetUrl}
            onAddManualAttendance={handleAttendanceScanned}
          />
        )}

        {activeTab === 'students' && (
          <StudentCardsView
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            config={config}
            onSyncStudentsFromSheets={handleSyncStudentsFromSheets}
            isSheetsConnected={Boolean(spreadsheetId)}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationCenterView
            records={attendanceRecords}
            students={students}
            config={config}
            onUpdateConfig={setConfig}
            onMarkNotificationSent={handleMarkNotificationSent}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            config={config}
            onUpdateConfig={setConfig}
            onResetSampleData={handleResetSampleData}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 print:hidden">
        <p>
          {config.namaSekolah} • Sistem Presensi QR Code Real-Time terintegrasi Google Sheets & WhatsApp Orang Tua.
        </p>
      </footer>

      {/* Google Sheets Connection Modal */}
      <SheetsSettingsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        user={user}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleLogout={handleGoogleLogout}
        onCreateNewSpreadsheet={handleCreateNewSpreadsheet}
        onConnectExistingSpreadsheet={handleConnectExistingSpreadsheet}
        onDisconnectSheets={handleDisconnectSheets}
        isProcessing={isSyncing}
      />
    </div>
  );
}
