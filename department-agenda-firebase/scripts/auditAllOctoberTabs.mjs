import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const STAFF_ROSTER = [
  // Dinas
  { name: 'Salim, S.Sos, M.Si', nip: '19681021 199010 1 001', rank: 'Pembina Utama Muda - IV/c', position: 'Kepala Dinas', department: 'Dinas', category: 'PNS' },
  { name: 'Adrial, S.K.M, M.K.M.', nip: '19710520 199403 1 009', rank: 'Pembina Tingkat I - IV/b', position: 'Sekretaris', department: 'Dinas', category: 'PNS' },

  // Kewirausahaan
  { name: 'Syofya Nora, S.H.I.', nip: '19771107 200212 2 007', rank: 'Pembina - IV/a', position: 'Kepala Bidang Kewirausahaan', department: 'Bidang Kewirausahaan', category: 'PNS' },
  { name: 'Fitria Lestari Pujiastuti, S.E.', nip: '19871008 201101 2 003', rank: 'Penata Tingkat I - III/d', position: 'Pengembang Kewirausahaan Ahli Muda', department: 'Bidang Kewirausahaan', category: 'PNS' },
  { name: 'Neli Triani, S.E.', nip: '19830804 201101 2 001', rank: 'Penata Tingkat I - III/d', position: 'Pengembang Kewirausahaan Ahli Muda', department: 'Bidang Kewirausahaan', category: 'PNS' },
  { name: 'Febri Yanti', nip: '19750228 201001 2 004', rank: 'Penata Muda - III/a', position: 'Pengolah Data dan Informasi', department: 'Bidang Kewirausahaan', category: 'PNS' },
  { name: 'Putri Harum Nastasya, S.TP.', nip: '19960702 202421 2 025', rank: 'IX', position: 'Pengembang Kewirausahaan Ahli Pertama', department: 'Bidang Kewirausahaan', category: 'PPPK' },
  { name: 'Shundari, S.E.', nip: '19901107 202421 2 022', rank: 'IX', position: 'Pengembang Kewirausahaan Ahli Pertama', department: 'Bidang Kewirausahaan', category: 'PPPK' },
  { name: 'Afrinaldi', nip: '19890917 202521 1 023', rank: 'V', position: 'Pengadministrasi Perkantoran', department: 'Bidang Kewirausahaan', category: 'PPPK' },

  // Pemberdayaan dan Pelindungan Koperasi
  { name: 'Padlinsono, M.Si.', nip: '19761206 200212 1 012', rank: 'Pembina - IV/a', position: 'Kepala Bidang Pemberdayaan dan Pelindungan Koperasi', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'PNS' },
  { name: 'Depi Chandra, S.E., M.M.', nip: '19730623 200212 1 004', rank: 'Pembina - IV/a', position: 'Penelaah Teknis Kebijakan', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'PNS' },
  { name: 'Wiwik Siswanti, S.Sos.', nip: '19690302 198903 2 009', rank: 'Penata Tingkat I - III/d', position: 'Pengawas Koperasi Ahli Muda', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'PNS' },
  { name: 'Debbi Shinta, S.E.', nip: '19760818 201212 2 002', rank: 'Penata Tingkat I - III/d', position: 'Pengawas Koperasi Ahli Pertama', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'PNS' },
  { name: 'Sangiran Nur Reminit Waruwu, S.E.', nip: '19881123 201503 2 004', rank: 'Penata - III/c', position: 'Penelaah Teknis Kebijakan', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'PNS' },
  { name: 'Febrika Sandhra, S.E.', nip: '19930222 202321 2 034', rank: 'IX', position: 'Pengawas Koperasi Ahli Pertama', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'PPPK' },
  { name: 'Rinto Mangoloi Silitonga, S.Akun.', nip: '19840312 202321 1 018', rank: 'IX', position: 'Pengawas Koperasi Ahli Pertama', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'PPPK' },
  { name: 'Muhammad Irfan Baharudin', nip: '', rank: '', position: 'Project Manager Officer (PMO)', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'NON_ASN' },
  { name: 'Randy Wirapratama', nip: '', rank: '', position: 'Project Manager Officer (PMO)', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', category: 'NON_ASN' },

  // Pengawasan Koperasi
  { name: 'Eva Corrina, S.E.', nip: '19750426 199403 2 003', rank: 'Pembina - IV/a', position: 'Kepala Bidang Pengawasan Koperasi', department: 'Bidang Pengawasan Koperasi', category: 'PNS' },
  { name: 'Riza Fardiansyah, S.E., M.Si.', nip: '19690417 200003 1 005', rank: 'Pembina - IV/a', position: 'Pengawas Koperasi Ahli Muda', department: 'Bidang Pengawasan Koperasi', category: 'PNS' },
  { name: 'Sjarifah Ira Sartika, S.IP., M.H.', nip: '19760723 200212 2 007', rank: 'Pembina - IV/a', position: 'Penelaah Teknis Kebijakan', department: 'Bidang Pengawasan Koperasi', category: 'PNS' },
  { name: 'Oktavia Rezki Riani, S.Sos.', nip: '19681015 198811 2 003', rank: 'Penata Tingkat I - III/d', position: 'Pengawas Koperasi Ahli Muda', department: 'Bidang Pengawasan Koperasi', category: 'PNS' },
  { name: 'Mery Sefina Simor, S.Kom.', nip: '19850910 200502 2 001', rank: 'Penata Tingkat I - III/d', position: 'Pengawas Koperasi Ahli Pertama', department: 'Bidang Pengawasan Koperasi', category: 'PNS' },
  { name: 'Nur Fadilah, S.IP.', nip: '19820208 200901 2 000', rank: 'Penata Muda Tingkat I - III/b', position: 'Penelaah Teknis Kebijakan', department: 'Bidang Pengawasan Koperasi', category: 'PNS' },
  { name: 'Maria Sinambela', nip: '19750307 201212 2 001', rank: 'Pengatur Tingkat I - II/d', position: 'Pengadministrasi Perkantoran', department: 'Bidang Pengawasan Koperasi', category: 'PNS' },
  { name: 'Anthika Banuaji, S.E.', nip: '19721208 202321 1 002', rank: 'IX', position: 'Pengawas Koperasi Ahli Pertama', department: 'Bidang Pengawasan Koperasi', category: 'PPPK' },

  // Pengembangan Usaha Mikro
  { name: 'Leny Nuriskawaty, S.Si. Apt., M.H.', nip: '19780604 200502 2 005', rank: 'Pembina - IV/a', position: 'Kepala Bidang Pengembangan Usaha Mikro', department: 'Bidang Pengembangan Usaha Mikro', category: 'PNS' },
  { name: 'Markholis Waldi, SE., M.Ec.Dev.', nip: '19751203 200003 1 003', rank: 'Pembina - IV/a', position: 'Penelaah Teknis Kebijakan', department: 'Bidang Pengembangan Usaha Mikro', category: 'PNS' },
  { name: 'Edward Eko Wijaya, S.T., M.T.', nip: '19721230 200312 1 003', rank: 'Pembina - IV/a', position: 'Analis Kebijakan Ahli Muda', department: 'Bidang Pengembangan Usaha Mikro', category: 'PNS' },
  { name: 'Riska Harmonis, S.H.', nip: '19820310 201001 2 013', rank: 'Penata Tingkat I - III/d', position: 'Pengembang Kewirausahaan Ahli Muda', department: 'Bidang Pengembangan Usaha Mikro', category: 'PNS' },
  { name: 'Dewi Astuti, S.E.', nip: '19780216 200312 2 006', rank: 'Penata Tingkat I - III/d', position: 'Pengembang Kewirausahaan Ahli Muda', department: 'Bidang Pengembangan Usaha Mikro', category: 'PNS' },
  { name: 'Hardi', nip: '19820117 201405 1 002', rank: 'Pengatur - II/c', position: 'Pengadministrasi Perkantoran', department: 'Bidang Pengembangan Usaha Mikro', category: 'PNS' },
  { name: 'Nova Susana, S.E.', nip: '19841111 202421 2 012', rank: 'IX', position: 'Pengembang Kewirausahaan Ahli Pertama', department: 'Bidang Pengembangan Usaha Mikro', category: 'PPPK' },
  { name: 'Destri Wilia, S.E.', nip: '19881213 202421 2 036', rank: 'IX', position: 'Pengembang Kewirausahaan Ahli Pertama', department: 'Bidang Pengembangan Usaha Mikro', category: 'PPPK' },

  // UPTD Pengelolaan Dana Bergulir
  { name: 'Zulfahri, S.E., M.M.', nip: '19781119 200212 1 003', rank: 'Pembina - IV/a', position: 'Kepala UPTD Pengelolaan Dana Bergulir', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PNS' },
  { name: 'Intan Permata Sari, S.E.', nip: '19810322 200604 2 012', rank: 'Penata Tingkat I - III/d', position: 'Kepala Sub Bagian Tata Usaha UPTD Pengelolaan Dana Bergulir', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PNS' },
  { name: 'Nurlela, S.E.', nip: '19840525 200801 2 009', rank: 'Penata Tingkat I - III/d', position: 'Penelaah Teknis Kebijakan', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PNS' },
  { name: 'Hardina Maya, A.Md.', nip: '19761003 200212 2 006', rank: 'Penata - III/c', position: 'Penelaah Teknis Kebijakan', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PNS' },
  { name: 'Edi Ruzika', nip: '19681126 201001 1 001', rank: 'Pengatur Tingkat I - II/d', position: 'Pengadministrasi Perkantoran', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PNS' },
  { name: 'Rusmadi Akbar, S.H.', nip: '19921026 202521 1 007', rank: 'IX', position: 'Penata Layanan Operasional', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PPPK' },
  { name: 'Didi Suryadi', nip: '19920112 202521 1 024', rank: 'V', position: 'Pengadministrasi Perkantoran', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PPPK' },
  { name: 'Sulaiman', nip: '19830212 202521 1 025', rank: 'V', position: 'Pengadministrasi Perkantoran', department: 'UPTD Pengelolaan Dana Bergulir', category: 'PPPK' },

  // UPTD PLUT KUMKM
  { name: 'Meydiana Esterawaty Jastina, S.E.', nip: '19760521 201001 2 002', rank: 'Penata Tingkat I - III/d', position: 'Kepala UPTD PLUT KUMKM', department: 'UPTD PLUT KUMKM', category: 'PNS' },
  { name: 'Hafidz Qodli Abdillah, S.E.', nip: '19920215 202012 1 005', rank: 'Penata Muda Tingkat I - III/b', position: 'Kepala Sub Bagian Tata Usaha UPTD PLUT KUMKM', department: 'UPTD PLUT KUMKM', category: 'PNS' },
  { name: 'Riski Yanto, S.Sos., M.Si.', nip: '19740101 199302 1 001', rank: 'Pembina - IV/a', position: 'Pengembang Kewirausahaan Ahli Muda', department: 'UPTD PLUT KUMKM', category: 'PNS' },
  { name: 'Mahipal, S.E.', nip: '19830316 202421 1 006', rank: 'IX', position: 'Pengembang Kewirausahaan Ahli Pertama', department: 'UPTD PLUT KUMKM', category: 'PPPK' },
  { name: 'Marlina Ramli', nip: '', rank: '', position: 'Konsultan PLUT', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'Nurul Qamariyah Adijaya', nip: '', rank: '', position: 'Konsultan PLUT', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'Elfiyanti', nip: '', rank: '', position: 'Konsultan PLUT', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'Galih Tri Satrya', nip: '', rank: '', position: 'Konsultan PLUT', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'Bayu Setiadji', nip: '', rank: '', position: 'Konsultan PLUT', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'Nada Khairunnisa', nip: '', rank: '', position: 'Manajer Rumah Kemasan', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'Muhammad Gybran Satriyadi', nip: '', rank: '', position: 'Operator Rumah Kemasan', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'M. Taufiq Lidaus', nip: '', rank: '', position: 'Operator Rumah Kemasan', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },
  { name: 'Adam Tua Rahman Hakim Siregar', nip: '', rank: '', position: 'Desainer Rumah Kemasan', department: 'UPTD PLUT KUMKM', category: 'NON_ASN' },

  // Sekretariat
  { name: 'Zuziani, S.E.', nip: '19810902 200212 2 004', rank: 'Penata Tingkat I - III/d', position: 'Analis Keuangan Pusat dan Daerah Ahli Muda', department: 'Sekretariat', category: 'PNS' },
  { name: 'Emelia Kontesa, S.IP.', nip: '19820306 201001 2 021', rank: 'Penata Tingkat I - III/d', position: 'Penelaah Teknis Kebijakan', department: 'Sekretariat', category: 'PNS' },
  { name: 'Maslinda, S.E.', nip: '19750525 200212 2 015', rank: 'Penata Tingkat I - III/d', position: 'Kepala Subbagian Perencanaan Program', department: 'Sekretariat', category: 'PNS' },
  { name: 'Wahyuni Sya\'arany, S.Kom.', nip: '19881026 201001 2 004', rank: 'Penata - III/c', position: 'Perencana Ahli Pertama', department: 'Sekretariat', category: 'PNS' },
  { name: 'Novirianti, A.Md.', nip: '19751107 200604 2 023', rank: 'Penata - III/c', position: 'Penelaah Teknis Kebijakan', department: 'Sekretariat', category: 'PNS' },
  { name: 'Septia Yorita, S.E.', nip: '19810906 200901 2 002', rank: 'Penata - III/c', position: 'Kepala Subbagian Umum dan Kepegawaian', department: 'Sekretariat', category: 'PNS' },
  { name: 'Bima Satria Saragih, S.Tr. Ak.', nip: '19970104 202012 1 005', rank: 'Penata Muda Tingkat I - III/b', position: 'Penelaah Teknis Kebijakan', department: 'Sekretariat', category: 'PNS' },
  { name: 'Ilhami Kurnia Putri, S.Kom.', nip: '20010712 202504 2 011', rank: 'Penata Muda - III/a', position: 'Penata Kelola Sistem dan Teknologi Informasi', department: 'Sekretariat', category: 'PNS' },
  { name: 'Yosi Ariansyah', nip: '19800803 200901 1 006', rank: 'Pengatur Tingkat I - II/d', position: 'Pengadministrasi Perkantoran', department: 'Sekretariat', category: 'PNS' },
  { name: 'Vinggo Sepco Putra, A.Md.', nip: '19960913 202203 1 003', rank: 'Pengatur - II/c', position: 'Pengolah Data dan Informasi', department: 'Sekretariat', category: 'PNS' },
  { name: 'Maknur Hamijaya', nip: '19830201 202521 1 018', rank: 'V', position: 'Pengadministrasi Perkantoran', department: 'Sekretariat', category: 'PPPK' },
  { name: 'Sorimuda Sagala', nip: '19861124 202521 1 019', rank: 'V', position: 'Pengadministrasi Perkantoran', department: 'Sekretariat', category: 'PPPK' },
  { name: 'Selfi Hermiliadesti, S.IP.', nip: '19931218 202321 2 031', rank: 'IX', position: 'Perencana Ahli Pertama', department: 'Sekretariat', category: 'PPPK' },
  { name: 'Hendi Suyanto, S.Si.', nip: '19870113 202421 1 008', rank: 'IX', position: 'Perencana Ahli Pertama', department: 'Sekretariat', category: 'PPPK' },
  { name: 'Julyan Elsa Rizqita, A.Md.', nip: '19940708 202421 2 043', rank: 'VII', position: 'Arsiparis Terampil', department: 'Sekretariat', category: 'PPPK' }
];

function cleanCell(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (val.richText && Array.isArray(val.richText)) {
      return val.richText.map(part => (part && part.text ? String(part.text) : '')).join('').trim();
    }
    if (val.text !== undefined) {
      if (typeof val.text === 'string') return val.text.trim();
      if (typeof val.text === 'object') return cleanCell(val.text);
      return String(val.text).trim();
    }
    if (val.result !== undefined) {
      if (val.result instanceof Date) return val.result.toISOString();
      return String(val.result).trim();
    }
    if (val.hyperlink) return String(val.hyperlink).trim();
    return JSON.stringify(val);
  }
  return String(val).trim();
}

function detectPrivacyLeaks(text) {
  const leaks = [];
  if (!text) return leaks;

  // Zoom URL with or without password query
  const zoomUrlMatch = text.match(/https?:\/\/[^\s]*zoom\.us[^\s]*/gi);
  if (zoomUrlMatch) {
    for (const u of zoomUrlMatch) {
      leaks.push({ type: 'ZOOM_URL', value: u });
    }
  }

  // Meeting ID (standalone or preceded by ID/Meeting ID)
  const meetingIdMatch = text.match(/(?:meeting\s*id|id\s*meeting|id\s*zoom)[:\s]*([0-9\s]{9,14})/gi);
  if (meetingIdMatch) {
    for (const m of meetingIdMatch) {
      leaks.push({ type: 'MEETING_ID', value: m.trim() });
    }
  }

  // Passcode / Password / Sandi / PIN code with word boundary (avoiding "pimpinan", "Tanjungpinang", "Pinjam")
  const passcodeMatch = text.match(/\b(?:passcode|password|sandi|pin\s*code|pwd)[:\s=]+([a-zA-Z0-9_\-.]+)/gi);
  if (passcodeMatch) {
    for (const p of passcodeMatch) {
      leaks.push({ type: 'PASSCODE', value: p.trim() });
    }
  }

  // Phone numbers (e.g. 0812..., +62...)
  const phoneMatch = text.match(/(?:\+62|08)[0-9\s-]{9,15}/g);
  if (phoneMatch) {
    for (const p of phoneMatch) {
      // filter out common non-phone number patterns if any
      const cleanedPhone = p.replace(/\s+/g, '');
      if (cleanedPhone.length >= 10 && cleanedPhone.length <= 14) {
        leaks.push({ type: 'PHONE', value: p.trim() });
      }
    }
  }

  return leaks;
}

function resolveAttendees(rawText) {
  if (!rawText) return { matched: [], unmatched: [], raw: '' };
  const cleaned = rawText.trim();
  const matched = [];
  const unmatched = [];

  // Match against known staff names (case-insensitive substring or fuzzy)
  for (const staff of STAFF_ROSTER) {
    const baseName = staff.name.split(',')[0].trim();
    if (cleaned.toLowerCase().includes(baseName.toLowerCase())) {
      matched.push({ name: staff.name, department: staff.department, role: staff.position });
    }
  }

  // Check known role abbreviations
  const lower = cleaned.toLowerCase();
  if (lower.includes('kadis') || lower.includes('kepala dinas')) {
    if (!matched.some(m => m.name.includes('Salim'))) {
      matched.push({ name: 'Salim, S.Sos, M.Si', department: 'Dinas', role: 'Kepala Dinas (matched via "Kadis")' });
    }
  }
  if (lower.includes('sekdis') || lower.includes('sekretaris dinas') || (lower.includes('sekretaris') && !lower.includes('subbag'))) {
    if (!matched.some(m => m.name.includes('Adrial'))) {
      matched.push({ name: 'Adrial, S.K.M, M.K.M.', department: 'Dinas', role: 'Sekretaris (matched via "Sekdis")' });
    }
  }
  if (lower.includes('ka. plut') || lower.includes('kepala plut')) {
    if (!matched.some(m => m.name.includes('Meydiana'))) {
      matched.push({ name: 'Meydiana Esterawaty Jastina, S.E.', department: 'UPTD PLUT KUMKM', role: 'Kepala UPTD PLUT KUMKM (matched via "Ka. PLUT")' });
    }
  }
  if (lower.includes('konsultan plut')) {
    matched.push({ name: 'Konsultan PLUT (Tim)', department: 'UPTD PLUT KUMKM', role: 'Konsultan PLUT' });
  }
  if (lower.includes('pmo')) {
    matched.push({ name: 'PMO Tim (Muhammad Irfan / Randy)', department: 'Bidang Pemberdayaan dan Pelindungan Koperasi', role: 'PMO' });
  }

  // Ambiguous tokens to flag
  const ambiguousTokens = ['kabid', 'kasi', 'subbag', 'staf', 'operator', 'tim', 'seluruh pegawai', 'dinas'];
  for (const tok of ambiguousTokens) {
    if (lower.includes(tok)) {
      unmatched.push(tok);
    }
  }

  return { matched, unmatched: Array.from(new Set(unmatched)), raw: cleaned };
}

async function runAudit() {
  const filePath = path.resolve('../temp_october_2026.xlsx');
  console.log(`Reading Excel file: ${filePath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(`Total worksheets found: ${workbook.worksheets.length}`);

  const auditReport = {
    totalWorksheets: workbook.worksheets.length,
    tabs: [],
    totalActivities: 0,
    activeDays: 0,
    emptyDays: 0,
    privacyLeaksDetected: [],
    multiDayCandidates: [],
    unmatchedAttendeeRoles: new Set()
  };

  const activityMapByTitle = new Map();

  for (let idx = 0; idx < workbook.worksheets.length; idx++) {
    const ws = workbook.worksheets[idx];
    const sheetName = ws.name;

    // Detect column indexes from row 5
    const row5 = ws.getRow(5);
    let colMap = {
      no: -1,
      date: -1,
      time: -1,
      title: -1,
      location: -1,
      organizer: -1,
      attendees: -1,
      notes: -1
    };

    row5.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const txt = cleanCell(cell.value).toLowerCase();
      if (txt === 'no' || txt === 'no.') colMap.no = colNumber;
      else if (txt.includes('hari') || txt.includes('tanggal')) colMap.date = colNumber;
      else if (txt.includes('pukul') || txt.includes('jam') || txt.includes('waktu')) colMap.time = colNumber;
      else if (txt.includes('kegiatan') || txt.includes('agenda') || txt.includes('acara')) colMap.title = colNumber;
      else if (txt.includes('tempat') || txt.includes('lokasi')) colMap.location = colNumber;
      else if (txt.includes('penyelenggara')) colMap.organizer = colNumber;
      else if (txt.includes('dihadiri')) colMap.attendees = colNumber;
      else if (txt.includes('keterangan')) colMap.notes = colNumber;
    });

    // Fallback if not detected
    if (colMap.no === -1) colMap.no = 1;
    if (colMap.date === -1) colMap.date = colMap.no + 1;
    if (colMap.time === -1) colMap.time = colMap.no + 2;
    if (colMap.title === -1) colMap.title = colMap.no + 3;
    if (colMap.location === -1) colMap.location = colMap.no + 4;
    if (colMap.organizer === -1) colMap.organizer = colMap.no + 5;
    if (colMap.attendees === -1) colMap.attendees = colMap.no + 6;
    if (colMap.notes === -1) colMap.notes = colMap.no + 7;

    const tabData = {
      sheetIndex: idx + 1,
      sheetName,
      columnOffset: colMap.no,
      declaredDate: null,
      activityCount: 0,
      activities: []
    };

    // Rows 6+
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < 6) return;

      const no = cleanCell(row.getCell(colMap.no).value);
      const dateCell = cleanCell(row.getCell(colMap.date).value);
      const timeCell = cleanCell(row.getCell(colMap.time).value);
      const titleCell = cleanCell(row.getCell(colMap.title).value);
      const placeCell = cleanCell(row.getCell(colMap.location).value);
      const organizerCell = cleanCell(row.getCell(colMap.organizer).value);
      const attendeesCell = cleanCell(row.getCell(colMap.attendees).value);
      const notesCell = cleanCell(row.getCell(colMap.notes).value);

      // If title is empty, skip row
      if (!titleCell && !placeCell && !timeCell) return;

      if (!tabData.declaredDate && dateCell) {
        tabData.declaredDate = dateCell;
      }

      const isOpenEnded = /s\.?d\.?\s*selesai/i.test(timeCell) || /s\/?d\s*selesai/i.test(timeCell);
      
      // Privacy scanning
      const allText = `${titleCell} ${placeCell} ${organizerCell} ${attendeesCell} ${notesCell}`;
      const leaks = detectPrivacyLeaks(allText);

      // Attendees resolution
      const attendeeRes = resolveAttendees(attendeesCell);
      attendeeRes.unmatched.forEach(u => auditReport.unmatchedAttendeeRoles.add(u));

      const act = {
        rowNumber,
        sheetName,
        no,
        rawDate: dateCell,
        rawTime: timeCell,
        isOpenEnded,
        title: titleCell,
        location: placeCell,
        organizer: organizerCell,
        rawAttendees: attendeesCell,
        matchedAttendees: attendeeRes.matched,
        unmatchedTokens: attendeeRes.unmatched,
        notes: notesCell,
        leaks
      };

      tabData.activities.push(act);
      tabData.activityCount++;
      auditReport.totalActivities++;

      if (leaks.length > 0) {
        auditReport.privacyLeaksDetected.push({
          sheet: sheetName,
          row: rowNumber,
          title: titleCell,
          leaks
        });
      }

      // Multi-day tracker
      const normTitle = titleCell.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normTitle.length > 5) {
        if (!activityMapByTitle.has(normTitle)) {
          activityMapByTitle.set(normTitle, []);
        }
        activityMapByTitle.get(normTitle).push({ sheet: sheetName, row: rowNumber, title: titleCell, date: dateCell });
      }
    });

    if (tabData.activityCount > 0) {
      auditReport.activeDays++;
    } else {
      auditReport.emptyDays++;
    }

    auditReport.tabs.push(tabData);
  }

  // Analyze multi-day candidates
  for (const [titleNorm, occurrences] of activityMapByTitle.entries()) {
    if (occurrences.length > 1) {
      auditReport.multiDayCandidates.push({
        title: occurrences[0].title,
        count: occurrences.length,
        occurrences: occurrences.map(o => `${o.sheet} (Row ${o.row})`)
      });
    }
  }

  // Summary output
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Total Tabs Audited: ${auditReport.totalWorksheets}`);
  console.log(`Active Days (with activities): ${auditReport.activeDays}`);
  console.log(`Empty Days (weekends/holidays): ${auditReport.emptyDays}`);
  console.log(`Total Activity Records: ${auditReport.totalActivities}`);
  console.log(`Privacy Leaks Detected: ${auditReport.privacyLeaksDetected.length}`);
  console.log(`Multi-day candidate titles: ${auditReport.multiDayCandidates.length}`);
  console.log(`Unmatched/Ambiguous Attendee Tokens:`, Array.from(auditReport.unmatchedAttendeeRoles));

  console.log('\n--- TAB BREAKDOWN ---');
  for (const tab of auditReport.tabs) {
    console.log(`Tab ${tab.sheetName}: ${tab.activityCount} activities (Declared: ${tab.declaredDate || 'none'})`);
    for (const a of tab.activities) {
      console.log(`   [Row ${a.rowNumber}] ${a.rawTime} | ${a.title.slice(0, 45)}... | Loc: ${a.location.slice(0, 25)} | Att: ${a.rawAttendees.slice(0, 25)}`);
    }
  }

  if (auditReport.privacyLeaksDetected.length > 0) {
    console.log('\n--- PRIVACY LEAKS (SANITIZED LOG) ---');
    const sanitizedLeaks = auditReport.privacyLeaksDetected.map(l => ({
      ...l,
      value: String(l.value || '')
        .replace(/pwd=[a-zA-Z0-9._-]+/gi, 'pwd=[REDACTED]')
        .replace(/(Passcode|Kode Sandi|Sandi):\s*\S+/gi, '$1: [REDACTED]')
        .replace(/08\d{8,11}/g, '0812-****-****')
    }));
    console.log(JSON.stringify(sanitizedLeaks, null, 2));
  }

  if (auditReport.multiDayCandidates.length > 0) {
    console.log('\n--- MULTI-DAY ACTIVITIES ---');
    for (const m of auditReport.multiDayCandidates) {
      console.log(`- "${m.title}": ${m.count} days -> ${m.occurrences.join(', ')}`);
    }
  }

  // Write audit result to disk for complete reference
  fs.writeFileSync(
    path.resolve('scripts/auditResultsOctober.json'),
    JSON.stringify(auditReport, (key, value) => value instanceof Set ? Array.from(value) : value, 2)
  );
  console.log('\nFull audit results written to scripts/auditResultsOctober.json');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
