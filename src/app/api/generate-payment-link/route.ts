
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const tokenRequestSchema = z.object({
  guestId: z.string(),
  ownerId: z.string(),
});

export async function POST(req: NextRequest) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return NextResponse.json({ success: false, error: 'Server misconfiguration: JWT secret missing.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const validation = tokenRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid request: guestId and ownerId are required.' }, { status: 400 });
    }

    const { guestId, ownerId } = validation.data;

    const token = jwt.sign({ guestId, ownerId }, secret, { expiresIn: '7d' });

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Error generating payment link token:', error);
    return NextResponse.json({ success: false, error: 'Could not generate payment link.' }, { status: 500 });
  }
}
