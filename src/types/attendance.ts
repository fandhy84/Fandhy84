export type AttendanceType = 'MASUK' | 'PULANG';

export type AttendanceStatus = 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG_CEPAT' | 'PULANG_NORMAL' | 'IZIN' | 'SAKIT';

export interface Student {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  jenisKelamin: 'L' | 'P';
  namaOrtu: string;
  noHpOrtu: string; // formatted e.g. 08123456789 or 628123456789
  emailOrtu?: string;
  avatar?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  nisn: string;
  namaSiswa: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm:ss
  tipe: AttendanceType;
  status: AttendanceStatus;
  keterangan?: string;
  noHpOrtu: string;
  namaOrtu: string;
  notifikasiStatus: 'TERKIRIM' | 'MENUNGGU' | 'GAGAL' | 'TIDAK_ADA_NOMOR';
  syncedToSheets: boolean;
  sheetsRowIndex?: number;
  timestamp: number;
}

export interface SchoolConfig {
  namaSekolah: string;
  alamatSekolah: string;
  jamMasukBatas: string; // e.g. "07:15"
  jamPulangBatas: string; // e.g. "14:30"
  autoOpenWhatsApp: boolean;
  pesanTemplateMasuk: string;
  pesanTemplatePulang: string;
  pesanTemplateIzin: string;
  webhookUrl?: string;
}

export interface SheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  isAutoSync: boolean;
  lastSyncedAt?: string;
}
