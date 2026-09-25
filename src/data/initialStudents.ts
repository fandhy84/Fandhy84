import { Student, SchoolConfig } from '../types/attendance';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std_001',
    nisn: '0071234501',
    nama: 'Ahmad Rizky Pratama',
    kelas: 'X IPA 1',
    jenisKelamin: 'L',
    namaOrtu: 'Bambang Pratama',
    noHpOrtu: '081234567890',
    emailOrtu: 'bambang.pratama@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std_002',
    nisn: '0071234502',
    nama: 'Annisa Putri Wardani',
    kelas: 'X IPA 1',
    jenisKelamin: 'P',
    namaOrtu: 'Siti Wardani',
    noHpOrtu: '081398765432',
    emailOrtu: 'siti.wardani@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std_003',
    nisn: '0071234503',
    nama: 'Bagas Surya Wicaksono',
    kelas: 'X IPA 1',
    jenisKelamin: 'L',
    namaOrtu: 'Wicaksono Hadi',
    noHpOrtu: '085211223344',
    emailOrtu: 'wicaksono.h@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std_004',
    nisn: '0071234504',
    nama: 'Cantika Dewi Lestari',
    kelas: 'X IPA 2',
    jenisKelamin: 'P',
    namaOrtu: 'Dewi Sartika',
    noHpOrtu: '087855667788',
    emailOrtu: 'dewi.sartika@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std_005',
    nisn: '0071234505',
    nama: 'Dimas Anggara Saputra',
    kelas: 'X IPA 2',
    jenisKelamin: 'L',
    namaOrtu: 'Hendro Saputra',
    noHpOrtu: '081299887766',
    emailOrtu: 'hendro.saputra@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std_006',
    nisn: '0071234506',
    nama: 'Fatimah Az-Zahra',
    kelas: 'XI IPS 1',
    jenisKelamin: 'P',
    namaOrtu: 'Muhammad Ali',
    noHpOrtu: '082133445566',
    emailOrtu: 'muhammad.ali@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std_007',
    nisn: '0071234507',
    nama: 'Galih Ramadhan',
    kelas: 'XI IPS 1',
    jenisKelamin: 'L',
    namaOrtu: 'Rahmat Hidayat',
    noHpOrtu: '085712348765',
    emailOrtu: 'rahmat.hidayat@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std_008',
    nisn: '0071234508',
    nama: 'Nabila Zahra Khairunnisa',
    kelas: 'XII MIPA',
    jenisKelamin: 'P',
    namaOrtu: 'Agus Salim',
    noHpOrtu: '081344556677',
    emailOrtu: 'agus.salim@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  namaSekolah: 'SMA Negeri Nusantara Digital',
  alamatSekolah: 'Jl. Pendidikan Merdeka No. 45, Jakarta',
  jamMasukBatas: '07:15',
  jamPulangBatas: '14:30',
  autoOpenWhatsApp: false,
  pesanTemplateMasuk: `🔔 *NOTIFIKASI ABSENSI MASUK*
Yth. Bapak/Ibu {nama_ortu},

Menginformasikan bahwa putra/putri Anda:
👤 *Nama:* {nama_siswa}
🏫 *Kelas:* {kelas}
⏱️ *Waktu Masuk:* {jam} WIB ({tanggal})
📊 *Status:* {status}
🏫 *Sekolah:* {nama_sekolah}

Keterangan: {keterangan}

Terima kasih atas kerja samanya dalam memantau kehadiran siswa.
_Sistem Notifikasi Presensi Sekolah_`,
  pesanTemplatePulang: `🏠 *NOTIFIKASI ABSENSI PULANG*
Yth. Bapak/Ibu {nama_ortu},

Menginformasikan bahwa ananda:
👤 *Nama:* {nama_siswa}
🏫 *Kelas:* {kelas}
⏱️ *Waktu Pulang:* {jam} WIB ({tanggal})
📊 *Status:* {status}
🏫 *Sekolah:* {nama_sekolah}

Siswa telah menyelesaikan kegiatan belajar hari ini dan dipersilakan menuju rumah masing-masing.

Terima kasih.
_Sistem Notifikasi Presensi Sekolah_`,
  pesanTemplateIzin: `📋 *KONFIRMASI IZIN / SAKIT SISWA*
Yth. Bapak/Ibu {nama_ortu},

Pencatatan ketidakhadiran telah diverifikasi:
👤 *Nama:* {nama_siswa}
🏫 *Kelas:* {kelas}
📅 *Tanggal:* {tanggal}
📊 *Status:* {status}
📝 *Catatan:* {keterangan}

Terima kasih atas informasinya. Semoga lekas sembuh jika sakit.
_Sistem Kesiswaan {nama_sekolah}_`,
  webhookUrl: '',
};
