import { NextResponse } from 'next/server';
import { SANGLI_REGIONAL_MASTER_CATALOG } from '@/modules/bazar/services/masterCatalog';

/**
 * Generates an instantly downloadable & Google Sheet-ready CSV file
 * containing the official, production-ready Bazar Inventory template
 * pre-populated with 25+ real Palus/Sangli Kirana & Grocery items.
 */
export async function GET() {
  const headers = [
    'Item Name',
    'Marathi Name',
    'Category',
    'Pack Unit',
    'MRP',
    'Sale Price',
    'In Stock',
    'Barcode'
  ];

  const rows = SANGLI_REGIONAL_MASTER_CATALOG.map(item => {
    return [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.nameMarathi.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${item.unit.replace(/"/g, '""')}"`,
      item.mrp,
      item.defaultPrice,
      'YES',
      `"${item.barcode || ''}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');

  // Return as downloadable CSV with UTF-8 BOM so Excel & Google Sheets preserve Marathi fonts
  const utf8Bom = '\uFEFF';
  return new NextResponse(utf8Bom + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="roombox_bazar_inventory_master.csv"',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

