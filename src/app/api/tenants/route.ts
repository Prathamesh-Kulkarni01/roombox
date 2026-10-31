import { NextRequest } from 'next/server';
import { RentTenantController } from '@/modules/rent/controllers';

// GET /api/tenants?[status=pending][&limit=10]
export async function GET(req: NextRequest) {
  return RentTenantController.listTenants(req);
}

// POST /api/tenants — onboard a new tenant
export async function POST(req: NextRequest) {
  return RentTenantController.createTenant(req);
}

// PATCH /api/tenants — update or perform actions on a tenant
export async function PATCH(req: NextRequest) {
  return RentTenantController.updateTenant(req);
}
