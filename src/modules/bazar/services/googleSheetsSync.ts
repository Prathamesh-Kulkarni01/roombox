import type { BazarProduct } from '../schemas';

export interface SheetRowProduct {
  name: string;
  nameMarathi?: string;
  category: string;
  unit: string;
  mrp: number;
  price: number;
  inStock: boolean;
  stockQuantity?: number;
  barcode?: string;
  sku?: string;
}

export interface SheetSyncResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

export class GoogleSheetsSyncBridge {
  /**
   * Generates public CSV export URL from Google Sheets URL or ID.
   * Format: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={SHEET_GID}
   */
  static extractSpreadsheetId(urlOrId: string): string {
    const trimmed = urlOrId.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
  }

  static getCsvExportUrl(spreadsheetId: string, gid?: string): string {
    // Google Visualization API is far more reliable and doesn't throw 400 on public sharing links
    if (gid && gid !== '0') {
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    }
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  }

  /**
   * Parse CSV content into structured SheetRowProduct rows
   */
  static parseCsv(csvText: string): SheetRowProduct[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Find column indexes
    const nameIdx = header.findIndex(h => h.includes('name') || h.includes('item') || h.includes('वस्तू'));
    const mrpIdx = header.findIndex(h => h.includes('mrp'));
    const priceIdx = header.findIndex(h => h.includes('price') || h.includes('दर') || h.includes('किंमत'));
    const unitIdx = header.findIndex(h => h.includes('unit') || h.includes('वजन') || h.includes('पॅक'));
    const categoryIdx = header.findIndex(h => h.includes('category') || h.includes('प्रकार'));
    const stockIdx = header.findIndex(h => h.includes('stock') || h.includes('स्टॉक') || h.includes('available'));
    const barcodeIdx = header.findIndex(h => h.includes('barcode') || h.includes('बारकोड'));
    const nameMrIdx = header.findIndex(h => h.includes('marathi') || h.includes('मराठी'));

    const products: SheetRowProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawCols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (nameIdx === -1 || !rawCols[nameIdx]) continue;

      const name = rawCols[nameIdx];
      const mrp = mrpIdx !== -1 && !isNaN(Number(rawCols[mrpIdx])) ? Number(rawCols[mrpIdx]) : 0;
      const price = priceIdx !== -1 && !isNaN(Number(rawCols[priceIdx])) ? Number(rawCols[priceIdx]) : mrp;
      const unit = unitIdx !== -1 && rawCols[unitIdx] ? rawCols[unitIdx] : '1 Pack';
      const category = categoryIdx !== -1 && rawCols[categoryIdx] ? rawCols[categoryIdx] : 'General';
      const nameMarathi = nameMrIdx !== -1 && rawCols[nameMrIdx] ? rawCols[nameMrIdx] : undefined;
      const barcode = barcodeIdx !== -1 && rawCols[barcodeIdx] ? rawCols[barcodeIdx] : undefined;
      
      const stockVal = stockIdx !== -1 ? rawCols[stockIdx]?.toLowerCase() : 'yes';
      const inStock = !(stockVal === 'no' || stockVal === '0' || stockVal === 'false' || stockVal === 'नाही');

      products.push({
        name,
        nameMarathi,
        category,
        unit,
        mrp,
        price,
        inStock,
        barcode,
      });
    }

    return products;
  }

  /**
   * Generates CSV template string for store owners to copy to Google Sheets
   */
  static getCsvTemplate(): string {
    return [
      'Item Name,Marathi Name,Category,Pack Unit,MRP,Sale Price,In Stock,Barcode',
      'Wada Kolam Rice 1kg,वाडा कोलम तांदूळ १ किलो,Grains & Flours,1 kg,85,74,YES,890103001002',
      'Gemini Sunflower Oil 1L,जेमिनी सूर्यफूल तेल १ लिटर,Edible Oils,1 L,155,138,YES,890103002001',
      'Latur Phatka Toor Dal 1kg,लातूर फटका तूर डाळ १ किलो,Dals & Pulses,1 kg,175,155,YES,890103003001',
      'Sangli Halad 200g,सांगली राजापुरी हळद २०० ग्रॅम,Spices,200 g,65,55,YES,890103004001',
      'Kolhapuri Gul 1kg,कोल्हापुरी गूळ ढेप १ किलो,Sweeteners,1 kg,75,62,YES,890103004003',
      'Parle-G 800g,पारले-जी बिस्किट ८०० ग्रॅम,Snacks,800 g,90,78,YES,890103005003',
    ].join('\n');
  }
}

