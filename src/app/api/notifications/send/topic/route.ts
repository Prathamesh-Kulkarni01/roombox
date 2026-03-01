import { NextRequest, NextResponse } from 'next/server'
import { getAdminMessaging } from '@/lib/firebaseAdmin'

export async function POST(request: NextRequest) {
	try {
		const { topic, title, body, link } = await request.json()
		if (!topic || !title || !body) {
			return NextResponse.json({ error: 'topic, title, body required' }, { status: 400 })
		}

		const messaging = await getAdminMessaging()
		await messaging.send({
			topic,
			notification: { title, body },
			webpush: link ? { fcm_options: { link } } : undefined
		})
		return NextResponse.json({ ok: true })
	} catch (err: any) {
		console.error('Send topic error:', err)
		return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
	}
} 