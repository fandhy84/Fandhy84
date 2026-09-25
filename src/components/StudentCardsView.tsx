import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  Plus,
  Printer,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  RefreshCw,
  QrCode as QrIcon,
  Phone,
  Mail,
  School,
  X,
  Upload,
} from 'lucide-react';
import { Student, SchoolConfig } from '../types/attendance';

interface StudentCardsViewProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  config: SchoolConfig;
  onSyncStudentsFromSheets?: () => void;
  onSyncStudentsToSheets?: () => void;
  isSheetsConnected: boolean;
  isSyncing: boolean;
}

export const StudentCardsView: React.FC<StudentCardsViewProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  config,
  onSyncStudentsFromSheets,
  onSyncStudentsToSheets,
  isSheetsConnected,
  isSyncing,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nisn: '',
    nama: '',
    kelas: 'X IPA 1',
    jenisKelamin: 'L' as 'L' | 'P',
    namaOrtu: '',
    noHpOrtu: '',
    emailOrtu: '',
  });

  // Cached QR Code data URLs mapped by student NISN
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  // Generate QR codes for all students
  useEffect(() => {
    let isMounted = true;
    const generateAllQrs = async () => {
      const qrs: Record<string, string> = {};
      for (const student of students) {
        try {
          // encode NISN in QR
          const url = await QRCode.toDataURL(student.nisn, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 200,
            color: {
              dark: '#1e1b4b',
              light: '#ffffff',
            },
          });
          qrs[student.nisn] = url;
        } catch (e) {
          console.error(e);
        }
      }
      if (isMounted) {
        setQrCodes(qrs);
      }
    };
    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [students]);

  // Unique classes
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [students]);

  // Filtered students
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClass === 'ALL' || s.kelas === selectedClass;
      const matchSearch =
        !search ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn.includes(search) ||
        s.namaOrtu.toLowerCase().includes(search.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, search]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      nisn: `007${Math.floor(1000000 + Math.random() * 9000000)}`,
      nama: '',
      kelas: classes[0] || 'X IPA 1',
      jenisKelamin: 'L',
      namaOrtu: '',
      noHpOrtu: '',
      emailOrtu: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      jenisKelamin: student.jenisKelamin,
      namaOrtu: student.namaOrtu,
      noHpOrtu: student.noHpOrtu,
      emailOrtu: student.emailOrtu || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.nisn) return;

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        ...formData,
      });
    } else {
      const newStudent: Student = {
        id: `std_${Date.now()}`,
        ...formData,
      };
      onAddStudent(newStudent);
    }
    setIsModalOpen(false);
  };

  const handlePrintCards = () => {
    window.print();
  };

  const handleDownloadQR = (student: Student) => {
    const qrUrl = qrCodes[student.nisn];
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_${student.nisn}_${student.nama.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Data Siswa & Kartu Pelajar QR</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data siswa, cetak kartu pelajar QR, dan sinkronkan dengan Google Sheets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSheetsConnected && (
            <>
              <button
                onClick={onSyncStudentsFromSheets}
                disabled={isSyncing}
                title="Muat data siswa dari Google Sheets (Tab Data_Siswa)"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Tarik dari Sheets</span>
              </button>

              <button
                onClick={onSyncStudentsToSheets}
                disabled={isSyncing}
                title="Kirim daftar siswa ini ke Google Sheets (Tab Data_Siswa)"
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload ke Sheets</span>
              </button>
            </>
          )}

          <button
            onClick={handlePrintCards}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Semua Kartu (Print)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas ({students.length})</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Kelas {c} ({students.filter((s) => s.kelas === c).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NISN, atau orang tua..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid of Student ID Cards (Kartu Pelajar) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-2 print:gap-3">
        {filtered.map((student) => {
          const qrUrl = qrCodes[student.nisn];

          return (
            <div
              key={student.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between print:border-slate-400 print:shadow-none"
            >
              {/* Card Header (School Brand) */}
              <div className="bg-linear-to-r from-indigo-700 via-indigo-800 to-blue-900 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                    <School className="w-3.5 h-3.5 text-indigo-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 leading-none">
                      KARTU PELAJAR
                    </p>
                    <p className="text-xs font-semibold truncate max-w-[170px] leading-tight">
                      {config.namaSekolah}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20">
                  {student.kelas}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 flex gap-3 items-center">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 p-1.5 rounded-xl shrink-0">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR NISN ${student.nisn}`}
                      className="w-24 h-24 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      Loading QR...
                    </div>
                  )}
                  <span className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                    {student.nisn}
                  </span>
                </div>

                {/* Student Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                    {student.nama}
                  </h4>
                  <p className="text-xs text-indigo-600 font-semibold">
                    {student.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </p>

                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 space-y-0.5">
                    <p className="truncate">
                      <span className="text-slate-400">Ortu:</span> {student.namaOrtu || '-'}
                    </p>
                    <p className="flex items-center gap-1 font-mono text-slate-600 truncate">
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                      {student.noHpOrtu || 'Belum diisi'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Actions (Hidden when printing) */}
              <div className="bg-slate-50 px-3 py-2 border-t border-slate-100 flex items-center justify-between text-xs print:hidden">
                <button
                  onClick={() => handleDownloadQR(student)}
                  className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium cursor-pointer"
                  title="Download Gambar QR Code"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh QR</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(student)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Edit Data Siswa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus data siswa ${student.nama}?`)) {
                        onDeleteStudent(student.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Hapus Siswa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Tidak ada siswa yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">
            Coba ubah kata kunci pencarian atau tambah siswa baru.
          </p>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  NISN (Nomor Induk Siswa Nasional) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0071234501"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Farhan"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: X IPA 1"
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenisKelamin}
                    onChange={(e) =>
                      setFormData({ ...formData, jenisKelamin: e.target.value as 'L' | 'P' })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bapak Ahmad Dahlan"
                  value={formData.namaOrtu}
                  onChange={(e) => setFormData({ ...formData, namaOrtu: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nomor WhatsApp Orang Tua (Untuk Notifikasi)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={formData.noHpOrtu}
                  onChange={(e) => setFormData({ ...formData, noHpOrtu: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Nomor ini akan menerima pesan notifikasi otomatis saat anak absen.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
