import { AttendanceRecord, SchoolConfig } from '../types/attendance';

/**
 * Normalize Indonesian telephone number to international WhatsApp format (628xxx)
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 08..., replace leading 0 with 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  // If starts with 8..., prepend 62
  else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateNotificationMessage(
  record: AttendanceRecord,
  config: SchoolConfig
): string {
  const isMasuk = record.tipe === 'MASUK';
  const isIzin = record.status === 'IZIN' || record.status === 'SAKIT';

  let template = config.pesanTemplateMasuk;
  if (isIzin) {
    template = config.pesanTemplateIzin;
  } else if (!isMasuk) {
    template = config.pesanTemplatePulang;
  }

  const statusTextMap: Record<string, string> = {
    TEPAT_WAKTU: 'Hadir Tepat Waktu ✅',
    TERLAMBAT: 'Terlambat ⚠️',
    PULANG_NORMAL: 'Selesai KBM Normal 🏠',
    PULANG_CEPAT: 'Pulang Lebih Awal ⏱️',
    IZIN: 'Izin (Tercatat) 📝',
    SAKIT: 'Sakit (Tercatat) 🏥',
  };

  const statusLabel = statusTextMap[record.status] || record.status;

  return template
    .replace(/{nama_ortu}/g, record.namaOrtu || 'Bapak/Ibu Orang Tua/Wali')
    .replace(/{nama_siswa}/g, record.namaSiswa)
    .replace(/{kelas}/g, record.kelas)
    .replace(/{tipe}/g, record.tipe === 'MASUK' ? 'MASUK' : 'PULANG')
    .replace(/{status}/g, statusLabel)
    .replace(/{jam}/g, record.waktu)
    .replace(/{tanggal}/g, record.tanggal)
    .replace(/{nama_sekolah}/g, config.namaSekolah)
    .replace(/{keterangan}/g, record.keterangan || '-');
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

export async function sendWebhookNotification(
  webhookUrl: string,
  record: AttendanceRecord,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: formatWhatsAppNumber(record.noHpOrtu),
        message: message,
        data: record,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Webhook notification error:', error);
    return false;
  }
}
