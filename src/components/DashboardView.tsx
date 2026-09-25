import React, { useState, useMemo } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Send,
  PlusCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig } from '../types/attendance';
import { generateNotificationMessage, getWhatsAppUrl } from '../services/notificationService';

interface DashboardViewProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  config: SchoolConfig;
  spreadsheetUrl: string;
  onAddManualAttendance: (record: AttendanceRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  attendanceRecords,
  config,
  spreadsheetUrl,
  onAddManualAttendance,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState<'ALL' | 'MASUK' | 'PULANG'>('ALL');
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual record form state
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualStatus, setManualStatus] = useState<'IZIN' | 'SAKIT' | 'TEPAT_WAKTU' | 'TERLAMBAT'>('IZIN');
  const [manualKeterangan, setManualKeterangan] = useState('');

  // Extract unique classes
  const classList = useMemo(() => {
    const set = new Set(students.map((s) => s.kelas));
    return Array.from(set).sort();
  }, [students]);

  // Records for selected date
  const dateRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.tanggal === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Statistics
  const stats = useMemo(() => {
    const totalStudents = students.length;
    // unique students who checked in today
    const masukRecords = dateRecords.filter((r) => r.tipe === 'MASUK');
    const checkedInStudentIds = new Set(masukRecords.map((r) => r.studentId));

    const totalHadir = checkedInStudentIds.size;
    const tepatWaktu = masukRecords.filter((r) => r.status === 'TEPAT_WAKTU').length;
    const terlambat = masukRecords.filter((r) => r.status === 'TERLAMBAT').length;
    const izinSakit = dateRecords.filter((r) => r.status === 'IZIN' || r.status === 'SAKIT').length;
    const pulang = dateRecords.filter((r) => r.tipe === 'PULANG').length;
    const belumHadir = Math.max(0, totalStudents - totalHadir - izinSakit);

    return {
      totalStudents,
      totalHadir,
      tepatWaktu,
      terlambat,
      izinSakit,
      pulang,
      belumHadir,
      persentaseHadir: totalStudents > 0 ? Math.round((totalHadir / totalStudents) * 100) : 0,
    };
  }, [students, dateRecords]);

  // Filtered attendance list
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const matchDate = record.tanggal === selectedDate;
      const matchClass = selectedClass === 'ALL' || record.kelas === selectedClass;
      const matchType = selectedType === 'ALL' || record.tipe === selectedType;
      const matchSearch =
        !searchQuery ||
        record.namaSiswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.nisn.includes(searchQuery);

      return matchDate && matchClass && matchType && matchSearch;
    });
  }, [attendanceRecords, selectedDate, selectedClass, selectedType, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Absen',
      'Tanggal',
      'Waktu',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Tipe',
      'Status',
      'Keterangan',
      'No HP Ortu',
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.tanggal,
      r.waktu,
      r.nisn,
      `"${r.namaSiswa}"`,
      `"${r.kelas}"`,
      r.tipe,
      r.status,
      `"${r.keterangan || ''}"`,
      `"${r.noHpOrtu}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Presensi_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit manual attendance (Izin / Sakit / Manual)
  const handleSaveManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) return;

    const student = students.find((s) => s.id === manualStudentId);
    if (!student) return;

    const now = new Date();
    const waktuStr = now.toLocaleTimeString('id-ID', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const record: AttendanceRecord = {
      id: `manual_${Date.now()}`,
      studentId: student.id,
      nisn: student.nisn,
      namaSiswa: student.nama,
      kelas: student.kelas,
      tanggal: selectedDate,
      waktu: waktuStr,
      tipe: 'MASUK',
      status: manualStatus,
      keterangan: manualKeterangan || `Pencatatan manual ${manualStatus}`,
      noHpOrtu: student.noHpOrtu,
      namaOrtu: student.namaOrtu,
      notifikasiStatus: student.noHpOrtu ? 'MENUNGGU' : 'TIDAK_ADA_NOMOR',
      syncedToSheets: false,
      timestamp: Date.now(),
    };

    onAddManualAttendance(record);
    setShowManualModal(false);
    setManualKeterangan('');
    setManualStudentId('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard & Rekapitulasi Presensi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan kehadiran siswa real-time per tanggal dan kelas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Buka Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Izin / Sakit</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Siswa
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalStudents}</span>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Siswa terdaftar</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Hadir Masuk
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.totalHadir}</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            {stats.persentaseHadir}% kehadiran
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
            Tepat Waktu
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-blue-600">{stats.tepatWaktu}</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-[11px] text-blue-600 mt-1 block">
            &le; {config.jamMasukBatas} WIB
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Terlambat
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600">{stats.terlambat}</span>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-[11px] text-amber-600 mt-1 block">
            &gt; {config.jamMasukBatas} WIB
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            Izin / Sakit
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-purple-600">{stats.izinSakit}</span>
            <span className="text-xs font-bold text-purple-600">Surat</span>
          </div>
          <span className="text-[11px] text-purple-600 mt-1 block">Tercatat dispensasi</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Belum Hadir
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600">{stats.belumHadir}</span>
            <span className="text-xs font-bold text-rose-500">Siswa</span>
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">Belum tap scan</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {classList.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setSelectedType('MASUK')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedType === 'MASUK' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setSelectedType('PULANG')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedType === 'PULANG' ? 'bg-white text-sky-700 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Pulang
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa / NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Siswa</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Tipe & Status</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4">Sheets Real-time</th>
                <th className="py-3.5 px-4 text-right">Notifikasi Ortu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const waMsg = generateNotificationMessage(record, config);
                  const waUrl = getWhatsAppUrl(record.noHpOrtu, waMsg);

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{record.namaSiswa}</div>
                        <div className="text-[11px] text-slate-400 font-mono">NISN: {record.nisn}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{record.kelas}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {record.waktu} <span className="text-[10px] text-slate-400 font-normal">WIB</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              record.tipe === 'MASUK'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {record.tipe}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                              record.status === 'TEPAT_WAKTU' || record.status === 'PULANG_NORMAL'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : record.status === 'TERLAMBAT'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {record.status === 'TEPAT_WAKTU'
                              ? 'Tepat Waktu'
                              : record.status === 'TERLAMBAT'
                              ? 'Terlambat'
                              : record.status === 'PULANG_NORMAL'
                              ? 'Pulang Normal'
                              : record.status === 'PULANG_CEPAT'
                              ? 'Pulang Awal'
                              : record.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {record.keterangan || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {record.syncedToSheets ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Tersinkron
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Antrian lokal
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {record.noHpOrtu ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                            title={`Kirim WA ke ${record.namaOrtu} (${record.noHpOrtu})`}
                          >
                            <Send className="w-3 h-3" />
                            <span>Kirim WA</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tanpa No HP</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Belum ada data presensi pada tanggal {selectedDate}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attendance Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Catat Kehadiran Manual / Izin / Sakit</h3>
            <p className="text-xs text-slate-500">
              Pilih siswa untuk mencatat dispensasi surat izin, sakit, atau absensi manual.
            </p>

            <form onSubmit={handleSaveManualAttendance} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Siswa</label>
                <select
                  required
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.kelas} - {s.nisn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Kehadiran</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="IZIN">Izin (Dispensasi)</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="TEPAT_WAKTU">Hadir (Manual Tepat Waktu)</option>
                  <option value="TERLAMBAT">Hadir (Manual Terlambat)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan / Alasan</label>
                <input
                  type="text"
                  placeholder="Contoh: Surat sakit dr. Budi / Acara keluarga"
                  value={manualKeterangan}
                  onChange={(e) => setManualKeterangan(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!manualStudentId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
