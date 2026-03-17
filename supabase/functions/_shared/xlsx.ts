import ExcelJS from 'https://esm.sh/exceljs@4.4.0';

export interface XlsxColumn {
  key: string;
  header: string;
  width?: number;
  type?: 'text' | 'currency' | 'percent' | 'date' | 'id';
}

export interface BuildXlsxParams {
  sheetName: string;
  columns: XlsxColumn[];
  rows: Record<string, unknown>[];
  notes?: { sheetName: string; rows: unknown[][] };
  topHeaderRows?: unknown[][]; // For metadata like Generated At
}

const DEFAULT_WIDTHS = {
  text: 24,
  id: 16,
  currency: 16,
  percent: 12,
  date: 14
};

// Safe text padding to prevent CSV injection
export function sanitizeText(val: string): string {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@]/.test(val)) return `'${val}`;
  return val;
}

export async function buildXlsx({ sheetName, columns, rows, notes, topHeaderRows }: BuildXlsxParams): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EvoComp';
  workbook.created = new Date();

  // Primary Sheet
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }] // Frozen top row default
  });

  // If we have top header rows (metadata), we need to offset the actual headers
  let headerRowIndex = 1;

  if (topHeaderRows && topHeaderRows.length > 0) {
    topHeaderRows.forEach(tr => {
      const row = sheet.addRow(tr);
      row.font = { italic: true, color: { argb: 'FF6B7280' } }; // Slate 500
    });
    headerRowIndex += topHeaderRows.length;
    // Adjust freeze split if we added top header rows
    sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];
  }

  // Configure Columns
  sheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || DEFAULT_WIDTHS[col.type || 'text'] || 16,
    style: {
      numFmt: col.type === 'currency' ? '#,##0.00' 
        : col.type === 'percent' ? '0.00%' 
        : col.type === 'date' ? 'yyyy-mm-dd' 
        : undefined
    }
  }));

  // Format Header Row
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' } // tailwind gray-100
  };
  headerRow.border = {
    bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } }
  };

  // Add Data Rows
  rows.forEach(rData => {
    const rowObj: Record<string, unknown> = {};
    columns.forEach(col => {
      let val = rData[col.key];
      // Sanitize text fields
      if ((col.type === 'text' || col.type === 'id') && typeof val === 'string') {
        val = sanitizeText(val);
      }
      rowObj[col.key] = val;
    });
    sheet.addRow(rowObj);
  });

  // Auto filter
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex + rows.length, column: columns.length }
    };
  }

  // Notes sheet (optional)
  if (notes) {
    const notesSheet = workbook.addWorksheet(notes.sheetName);
    notes.rows.forEach(nr => notesSheet.addRow(nr));
    // Simple styling for notes header
    if (notes.rows.length > 0) {
       const noteHdr = notesSheet.getRow(1);
       noteHdr.font = { bold: true };
       noteHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    }
    notesSheet.getColumn(1).width = 30;
    notesSheet.getColumn(2).width = 60;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
