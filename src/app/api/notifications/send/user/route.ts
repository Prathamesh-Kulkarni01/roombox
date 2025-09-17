import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminMessaging } from '@/lib/firebaseAdmin'

export async function POST(request: NextRequest) {
	try {
		const { userId, title, body, link } = await request.json()
		if (!userId || !title || !body) {
			return NextResponse.json({ error: 'userId, title, body required' }, { status: 400 })
		}

		const db = await getAdminDb()
		const userSnap = await db.collection('users').doc(userId).get()
		const token = userSnap.exists ? (userSnap.data() as any)?.fcmToken : undefined
		if (!token) return NextResponse.json({ error: 'No token for user' }, { status: 404 })

		const messaging = await getAdminMessaging()
		await messaging.send({
			token,
			notification: { title, body },
			webpush: link ? { fcm_options: { link } } : undefined
		})
		return NextResponse.json({ ok: true })
	} catch (err: any) {
		console.error('Send user error:', err)
		return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
	}
} 