import { gymService } from '../services';

export async function checkinMemberAction(gymId: string, memberId: string) {
  'use server';
  try {
    const attendanceId = await gymService.markAttendance(gymId, memberId, 'qr_scan');
    return { success: true, attendanceId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

