import ExcelJS from 'exceljs';
import path from 'path';

async function main() {
  const filePath = path.resolve('../temp_october_2026.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(`Loaded workbook with ${workbook.worksheets.length} worksheets.`);
  for (let i = 0; i < workbook.worksheets.length; i++) {
    const ws = workbook.worksheets[i];
    console.log(`[${i + 1}] Name: "${ws.name}", Rows: ${ws.rowCount}, Columns: ${ws.columnCount}`);
  }

  // Inspect the first sheet (011026) and second sheet (021026)
  const firstSheet = workbook.worksheets[0];
  console.log(`\n--- Inspecting first 15 rows of sheet: "${firstSheet.name}" ---`);
  firstSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 15) {
      const vals = row.values;
      console.log(`Row ${rowNumber}:`, JSON.stringify(vals));
    }
  });

  const secondSheet = workbook.worksheets[1];
  console.log(`\n--- Inspecting first 15 rows of sheet: "${secondSheet.name}" ---`);
  secondSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 15) {
      const vals = row.values;
      console.log(`Row ${rowNumber}:`, JSON.stringify(vals));
    }
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
