import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/modules/gym/services';
import { notificationDispatcher } from '@/core/notifications';

export class GymController {
  static async handleGet(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const gymId = searchParams.get('gymId') || 'default_gym';

    try {
      const members = await gymService.getMembers(gymId);
      return NextResponse.json({ success: true, members });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  static async handlePost(req: NextRequest) {
    try {
      const body = await req.json();
      const { action } = body;

      if (action === 'attendance') {
        const { gymId, memberId, method } = body;
        const attId = await gymService.markAttendance(gymId, memberId, method);
        return NextResponse.json({ success: true, attendanceId: attId });
      }

      if (action === 'add_member') {
        const { member } = body;
        const memberId = await gymService.addMember(member);

        await notificationDispatcher.send({
          channel: 'whatsapp',
          recipient: member.phone,
          templateId: 'GYM_WELCOME_PASS',
          variables: { memberName: member.name, planName: member.planId },
          module: 'core',
        });

        return NextResponse.json({ success: true, memberId });
      }

      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
}

