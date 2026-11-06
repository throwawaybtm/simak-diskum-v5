/**
 * Client-Side Schedule Image Generator (PNG & JPG)
 * Generates high-resolution (~1920px wide) civic schedule graphics via HTML5 Canvas 2D
 * matching the legacy Indonesian department activity schedule layout (S01-QA-R2).
 * 
 * Features:
 * - Crisp 1920px wide canvas suitable for WhatsApp / messaging sharing.
 * - 3-line centered title, 8-column layout, Arial typography, thin black borders.
 * - Multi-page pagination: splits large schedules cleanly without clipping rows.
 * - Solid white background (prevents JPEG black-transparency artifacts).
 * - Prominent staging watermark banner & faint diagonal overlay.
 * - Names-only attendees.
 */

import type { EightColumnReportRow } from './eightColumnReport';
import { formatDynamicScheduleTitlePeriod } from '../scheduling/timeUtils';

export interface GenerateImageOptions {
  departmentName?: string;
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
  rows: EightColumnReportRow[];
  isStaging?: boolean;
  watermarkText?: string;
  format?: 'png' | 'jpg' | 'jpeg';
  quality?: number; // 0.0 - 1.0 (default: 0.94 for JPG)
}

export interface GeneratedImageFile {
  filename: string;
  blob: Blob;
  dataUrl: string;
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
}

const CANVAS_WIDTH = 1920;
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 60;
const TABLE_WIDTH = CANVAS_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 1800px

// Column widths matching proportions: [6, 25, 18, 36, 25, 25, 28, 22] => total 1800px
const COL_WIDTHS = [
  70,  // 1: No
  240, // 2: Hari / Tanggal
  180, // 3: Pukul
  370, // 4: Kegiatan
  240, // 5: Tempat
  240, // 6: Penyelenggara
  270, // 7: Dihadiri Oleh
  190  // 8: Keterangan
];

const COL_NAMES = [
  'No',
  'Hari / Tanggal',
  'Pukul',
  'Kegiatan',
  'Tempat',
  'Penyelenggara',
  'Dihadiri Oleh',
  'Keterangan'
];

const MAX_PAGE_HEIGHT = 1600; // Optimal height before creating a new page

/**
 * Wraps text into lines that fit within maxWidth on a 2D canvas context.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return ['-'];
  const paragraphs = text.split('\n');
  const resultLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      resultLines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        resultLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines.length > 0 ? resultLines : ['-'];
}

/**
 * Calculates row heights and breaks rows into pages to prevent row-splitting.
 */
interface MeasuredRow {
  row: EightColumnReportRow;
  height: number;
  cellLines: string[][];
}

function measureAndPaginateRows(
  ctx: CanvasRenderingContext2D,
  rows: EightColumnReportRow[],
  firstPageHeaderHeight: number,
  subsequentPageHeaderHeight: number
): MeasuredRow[][] {
  ctx.font = '15px Arial';

  const measured: MeasuredRow[] = rows.map(r => {
    // Wrap each of the 8 columns
    const colTexts = [
      String(r.no),
      r.hariTanggal || '-',
      r.pukul || '-',
      r.kegiatan || '-',
      r.tempat || '-',
      r.penyelenggara || '-',
      r.dihadiriOleh || '-',
      r.keterangan || '-'
    ];

    const cellLines = colTexts.map((txt, colIdx) => {
      const colW = COL_WIDTHS[colIdx] - 16; // 8px padding each side
      return wrapText(ctx, txt, colW);
    });

    const maxLines = Math.max(...cellLines.map(lines => lines.length), 1);
    const height = Math.max(42, maxLines * 22 + 16);

    return { row: r, height, cellLines };
  });

  // Distribute into pages
  const pages: MeasuredRow[][] = [];
  let currentPage: MeasuredRow[] = [];
  let currentHeight = firstPageHeaderHeight + MARGIN_BOTTOM;

  for (const mRow of measured) {
    const isFirstPage = pages.length === 0;
    const headerHeight = isFirstPage ? firstPageHeaderHeight : subsequentPageHeaderHeight;
    const limit = MAX_PAGE_HEIGHT;

    if (currentPage.length > 0 && currentHeight + mRow.height > limit) {
      pages.push(currentPage);
      currentPage = [mRow];
      currentHeight = subsequentPageHeaderHeight + mRow.height + MARGIN_BOTTOM;
    } else {
      currentPage.push(mRow);
      currentHeight += mRow.height;
    }
  }

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * Draws faint diagonal watermark across canvas
 */
function drawDiagonalWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string
): void {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-25 * (Math.PI / 180));
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, 0);
  ctx.restore();
}

/**
 * Generates schedule image files (PNG or JPG).
 * Splits long schedules across multiple images when required.
 */
export async function generateScheduleImages(
  options: GenerateImageOptions
): Promise<GeneratedImageFile[]> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas image generator requires DOM canvas support.');
  }

  const deptName = options.departmentName || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM';
  const periodTitle = (options.startDate && options.endDate)
    ? formatDynamicScheduleTitlePeriod(options.startDate, options.endDate)
    : (options.periodLabel || 'BULAN OKTOBER 2026').toUpperCase();

  const isStaging = options.isStaging ?? false;
  const watermarkText = options.watermarkText || (isStaging ? 'DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI' : '');
  const format = options.format === 'jpg' || options.format === 'jpeg' ? 'jpeg' : 'png';
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = options.quality ?? 0.94;

  // Measurement canvas
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = CANVAS_WIDTH;
  measureCanvas.height = 100;
  const mCtx = measureCanvas.getContext('2d')!;

  // Estimate header heights
  // First page: Margin(50) + Title(28+24+24+gap) + Staging(36 if any) + Gap(20) + TableHeader(48)
  const stagingBannerHeight = watermarkText ? 42 : 0;
  const firstPageHeaderHeight = MARGIN_TOP + 110 + stagingBannerHeight + 20 + 48;
  // Subsequent pages: Margin(50) + ContinuationTitle(30+24) + Staging(28 if any) + TableHeader(48)
  const subsequentPageHeaderHeight = MARGIN_TOP + 70 + (watermarkText ? 30 : 0) + 16 + 48;

  const paginatedPages = measureAndPaginateRows(
    mCtx,
    options.rows,
    firstPageHeaderHeight,
    subsequentPageHeaderHeight
  );

  const totalPages = paginatedPages.length;
  const generatedFiles: GeneratedImageFile[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageRows = paginatedPages[pageIdx];
    const isFirst = pageIdx === 0;

    // Calculate total height for this page
    const headerH = isFirst ? firstPageHeaderHeight : subsequentPageHeaderHeight;
    const rowsTotalH = pageRows.reduce((acc, r) => acc + r.height, 0);
    const canvasHeight = Math.max(600, headerH + rowsTotalH + MARGIN_BOTTOM);

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // 1. Fill pure white background (crucial for JPEG to avoid black background)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    // 2. Faint diagonal watermark if staging
    if (watermarkText) {
      drawDiagonalWatermark(ctx, CANVAS_WIDTH, canvasHeight, watermarkText);
    }

    let currentY = MARGIN_TOP;

    // 3. Staging warning banner at top if staging
    if (watermarkText) {
      ctx.fillStyle = '#FEE2E2';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      const bannerH = 32;
      ctx.fillRect(MARGIN_LEFT, currentY, TABLE_WIDTH, bannerH);
      ctx.strokeRect(MARGIN_LEFT, currentY, TABLE_WIDTH, bannerH);

      ctx.font = 'bold 13px Arial';
      ctx.fillStyle = '#991B1B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚠️ ${watermarkText} (LINGKUNGAN STAGING) ⚠️`, CANVAS_WIDTH / 2, currentY + bannerH / 2);

      currentY += bannerH + 16;
    }

    // 4. Title Header
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';

    if (isFirst) {
      // 3 centered title lines
      ctx.font = 'bold 24px Arial';
      ctx.fillText('JADWAL KEGIATAN', CANVAS_WIDTH / 2, currentY);
      currentY += 30;

      ctx.font = 'bold 20px Arial';
      ctx.fillText(deptName, CANVAS_WIDTH / 2, currentY);
      currentY += 26;

      ctx.font = 'bold 20px Arial';
      ctx.fillText(periodTitle, CANVAS_WIDTH / 2, currentY);
      currentY += 36;
    } else {
      // Continuation title
      ctx.font = 'bold 22px Arial';
      ctx.fillText('JADWAL KEGIATAN (LANJUTAN)', CANVAS_WIDTH / 2, currentY);
      currentY += 28;

      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${deptName} - ${periodTitle}`, CANVAS_WIDTH / 2, currentY);
      currentY += 32;
    }

    // 5. Draw Table Headers (white background, thin black border)
    const headerHeight = 44;
    let colX = MARGIN_LEFT;

    for (let c = 0; c < 8; c++) {
      const colW = COL_WIDTHS[c];

      // White fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(colX, currentY, colW, headerHeight);

      // 1px black border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX, currentY, colW, headerHeight);

      // Centered bold header text
      ctx.font = 'bold 15px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(COL_NAMES[c], colX + colW / 2, currentY + headerHeight / 2);

      colX += colW;
    }

    currentY += headerHeight;

    // 6. Draw Table Rows
    if (pageRows.length === 0) {
      // Empty state row
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(MARGIN_LEFT, currentY, TABLE_WIDTH, 50);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(MARGIN_LEFT, currentY, TABLE_WIDTH, 50);

      ctx.font = '15px Arial';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tidak ada agenda kegiatan pada periode ini.', CANVAS_WIDTH / 2, currentY + 25);
      currentY += 50;
    } else {
      for (const mRow of pageRows) {
        const rowH = mRow.height;
        const isCancelled = mRow.row.isCancelled;
        let cX = MARGIN_LEFT;

        for (let c = 0; c < 8; c++) {
          const colW = COL_WIDTHS[c];

          // Background fill (pink tint if cancelled, white otherwise)
          ctx.fillStyle = isCancelled ? '#FFF1F2' : '#FFFFFF';
          ctx.fillRect(cX, currentY, colW, rowH);

          // Border: 1px black
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(cX, currentY, colW, rowH);

          // Text content
          const lines = mRow.cellLines[c];
          const lineHeight = 20;
          const totalTextHeight = lines.length * lineHeight;
          const startY = currentY + (rowH - totalTextHeight) / 2 + 10;

          ctx.font = isCancelled
            ? 'italic 14px Arial'
            : (c === 3 ? 'bold 14px Arial' : '14px Arial');
          ctx.fillStyle = isCancelled ? '#991B1B' : '#000000';

          if (c === 6) {
            // Dihadiri Oleh: left-aligned with 10px indent
            ctx.textAlign = 'left';
            lines.forEach((line, lIdx) => {
              ctx.fillText(line, cX + 10, startY + lIdx * lineHeight);
            });
          } else {
            // All other columns: centered
            ctx.textAlign = 'center';
            lines.forEach((line, lIdx) => {
              ctx.fillText(line, cX + colW / 2, startY + lIdx * lineHeight);
            });
          }

          cX += colW;
        }

        currentY += rowH;
      }
    }

    // 7. Footer: Page numbers and disclaimer
    currentY += 16;
    ctx.font = '13px Arial';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`Halaman ${pageIdx + 1} dari ${totalPages}`, CANVAS_WIDTH - MARGIN_RIGHT, currentY);

    if (watermarkText) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#991B1B';
      ctx.font = 'italic 12px Arial';
      ctx.fillText(`* Dokumen simulasi dibuat dari Lingkungan Uji Coba SIMAK DISKUM. ${watermarkText}.`, MARGIN_LEFT, currentY);
    }

    // 8. Generate Blob and DataURL
    const dataUrl = canvas.toDataURL(mimeType, quality);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), mimeType, quality);
    });

    // Filename per Section 9.8
    let filename = '';
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const periodSlug = (options.startDate && options.endDate && options.startDate !== options.endDate)
      ? `${options.startDate}_sd_${options.endDate}`
      : 'Oktober_2026';

    if (totalPages === 1) {
      filename = `Jadwal_Kegiatan_${periodSlug}.${ext}`;
    } else {
      const pageStr = String(pageIdx + 1).padStart(2, '0');
      filename = `Jadwal_Kegiatan_${periodSlug}_Halaman_${pageStr}.${ext}`;
    }

    generatedFiles.push({
      filename,
      blob,
      dataUrl,
      pageNumber: pageIdx + 1,
      totalPages,
      width: CANVAS_WIDTH,
      height: canvasHeight
    });
  }

  return generatedFiles;
}
