import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsSyncBridge } from '@/modules/bazar/services/googleSheetsSync';
import { db } from '@/core/database';
import { doc, writeBatch } from 'firebase/firestore';
import type { BazarProduct } from '@/modules/bazar/schemas';
import { BAZAR_SCHEMA_VERSION } from '@/modules/bazar/schemas';
import { resolveProductImage } from '@/modules/bazar/services/imageResolver';

const PRODUCTS_COLLECTION = 'bazar_products';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const storeId = (formData.get('storeId') as string) || 'default_store';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No CSV file provided' }, { status: 400 });
    }

    const csvText = await file.text();
    const parsedItems = GoogleSheetsSyncBridge.parseCsv(csvText);

    if (parsedItems.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid rows found. Please ensure headers match Item Name, MRP, Sale Price, Unit.' 
      }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not connected' }, { status: 500 });
    }

    const batch = writeBatch(db);
    let count = 0;

    for (const item of parsedItems) {
      const cleanSlug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
      const prodId = `prod_${storeId}_${cleanSlug}`;
      const prodRef = doc(db, PRODUCTS_COLLECTION, prodId);

      const matchedImage = resolveProductImage(item.name, item.category, undefined, item.nameMarathi);

      const productData: Partial<BazarProduct> = {
        id: prodId,
        storeId,
        name: item.name,
        nameMarathi: item.nameMarathi,
        category: item.category || 'General',
        unit: item.unit || '1 unit',
        price: item.price,
        discountPrice: item.mrp > item.price ? item.mrp : undefined,
        inStock: item.inStock,
        barcode: item.barcode,
        images: [matchedImage],
        schemaVersion: BAZAR_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      };

      batch.set(prodRef, productData, { merge: true });
      count++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      importedCount: count,
      message: `Successfully imported ${count} items directly.`
    });
  } catch (e: any) {
    console.error('CSV direct upload error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Import failed' }, { status: 500 });
  }
}

