import { bazarService } from '../services';

export async function createBazarOrderAction(orderData: any) {
  'use server';
  try {
    const orderId = await bazarService.createOrder(orderData);
    return { success: true, orderId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

