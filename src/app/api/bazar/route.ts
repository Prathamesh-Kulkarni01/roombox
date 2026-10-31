import { NextRequest } from 'next/server';
import { BazarController } from '@/modules/bazar/controllers';

export async function GET(req: NextRequest) {
  return BazarController.handleGet(req);
}

export async function POST(req: NextRequest) {
  return BazarController.handlePost(req);
}
