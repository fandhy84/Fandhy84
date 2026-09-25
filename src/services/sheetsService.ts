import { AttendanceRecord, Student } from '../types/attendance';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SpreadsheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export const createAttendanceSpreadsheet = async (
  accessToken: string,
  schoolName: string,
  initialStudents: Student[]
): Promise<SpreadsheetCreationResult> => {
  const currentYear = new Date().getFullYear();
  const title = `Database Absensi Siswa QR - ${schoolName} (${currentYear})`;

  const requestBody = {
    properties: {
      title: title,
    },
    sheets: [
      {
        properties: {
          sheetId: 0,
          title: 'Presensi_Harian',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          sheetId: 1,
          title: 'Data_Siswa',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          sheetId: 2,
          title: 'Panduan_Sistem',
        },
      },
    ],
  };

  const response = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gagal membuat spreadsheet: ${response.statusText}`);
  }

  const createdData = await response.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl;

  // Now populate header rows and initial student data
  await setupInitialSheetHeaders(accessToken, spreadsheetId, initialStudents);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
};

async function setupInitialSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  students: Student[]
) {
  // 1. Headers for Presensi_Harian
  const presensiHeaders = [
    [
      'ID Absen',
      'Tanggal',
      'Waktu WIB',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Tipe Absen',
      'Status Kehadiran',
      'Keterangan',
      'No. HP Ortu (WA)',
      'Status Notifikasi',
      'Timestamp ISO',
    ],
  ];

  await appendToRange(accessToken, spreadsheetId, "'Presensi_Harian'!A1:L1", presensiHeaders);

  // 2. Headers & initial students for Data_Siswa
  const siswaHeaders = [
    [
      'NISN',
      'Nama Lengkap Siswa',
      'Kelas',
      'L/P',
      'Nama Orang Tua / Wali',
      'Nomor WhatsApp Ortu',
      'Email Ortu (Opsional)',
    ],
  ];

  const studentRows = students.map((s) => [
    s.nisn,
    s.nama,
    s.kelas,
    s.jenisKelamin,
    s.namaOrtu,
    s.noHpOrtu,
    s.emailOrtu || '',
  ]);

  await appendToRange(accessToken, spreadsheetId, "'Data_Siswa'!A1:G", [
    ...siswaHeaders,
    ...studentRows,
  ]);

  // 3. Petunjuk
  const guideContent = [
    ['PANDUAN SISTEM ABSENSI SISWA QR CODE TERHUBUNG REAL-TIME'],
    ['1. Sheet "Presensi_Harian" diperbarui otomatis setiap kali siswa melakukan scan QR code.'],
    ['2. Sheet "Data_Siswa" menyimpan daftar referensi siswa untuk pencocokan QR Code.'],
    ['3. Notifikasi WhatsApp orang tua otomatis dibuat dengan format pesan dinamis.'],
    ['4. Dibuat oleh Sistem Absensi QR Sekolah - Terintegrasi Google Sheets.'],
  ];

  await appendToRange(accessToken, spreadsheetId, "'Panduan_Sistem'!A1:A5", guideContent);
}

export const appendAttendanceRecord = async (
  accessToken: string,
  spreadsheetId: string,
  record: AttendanceRecord
): Promise<boolean> => {
  const row = [
    record.id,
    record.tanggal,
    record.waktu,
    record.nisn,
    record.namaSiswa,
    record.kelas,
    record.tipe,
    record.status,
    record.keterangan || '-',
    record.noHpOrtu || '-',
    record.notifikasiStatus,
    new Date(record.timestamp).toISOString(),
  ];

  const range = "'Presensi_Harian'!A:L";
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal mengirim data ke Google Sheets: ${response.statusText}`);
  }

  return true;
};

export const batchAppendAttendanceRecords = async (
  accessToken: string,
  spreadsheetId: string,
  records: AttendanceRecord[]
): Promise<boolean> => {
  if (records.length === 0) return true;

  const rows = records.map((record) => [
    record.id,
    record.tanggal,
    record.waktu,
    record.nisn,
    record.namaSiswa,
    record.kelas,
    record.tipe,
    record.status,
    record.keterangan || '-',
    record.noHpOrtu || '-',
    record.notifikasiStatus,
    new Date(record.timestamp).toISOString(),
  ]);

  const range = "'Presensi_Harian'!A:L";
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal batch upload data ke Google Sheets`);
  }

  return true;
};

export const testSpreadsheetAccess = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> => {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Spreadsheet tidak ditemukan atau Anda tidak memiliki izin akses');
  }

  const data = await res.json();
  const title = data.properties?.title || 'Google Sheet';
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || '');
  return { title, sheetNames };
};

export const fetchStudentsFromSheet = async (
  accessToken: string,
  spreadsheetId: string
): Promise<Student[]> => {
  const range = "'Data_Siswa'!A2:G";
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Gagal membaca tab Data_Siswa dari Google Sheets');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter((r) => r.length >= 2 && r[0] && r[1])
    .map((r, idx) => {
      const nisn = String(r[0]).trim();
      const nama = String(r[1]).trim();
      const kelas = r[2] ? String(r[2]).trim() : 'Umum';
      const jenisKelamin = r[3] && String(r[3]).toUpperCase().startsWith('P') ? 'P' : 'L';
      const namaOrtu = r[4] ? String(r[4]).trim() : `Orang Tua dari ${nama}`;
      const noHpOrtu = r[5] ? String(r[5]).trim() : '';
      const emailOrtu = r[6] ? String(r[6]).trim() : undefined;

      return {
        id: `std_${nisn}_${idx}`,
        nisn,
        nama,
        kelas,
        jenisKelamin,
        namaOrtu,
        noHpOrtu,
        emailOrtu,
      };
    });
};

async function appendToRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
) {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Append error:', err);
    throw new Error(err?.error?.message || `Gagal menulis data ke range ${range}`);
  }
}
