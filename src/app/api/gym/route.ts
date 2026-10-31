import { NextRequest } from 'next/server';
import { GymController } from '@/modules/gym/controllers';

export async function GET(req: NextRequest) {
  return GymController.handleGet(req);
}

export async function POST(req: NextRequest) {
  return GymController.handlePost(req);
}
