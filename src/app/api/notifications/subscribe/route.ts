import { NextRequest, NextResponse } from 'next/server'
import { getAdminMessaging, getAdminDb } from '@/lib/firebaseAdmin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
	try {
		const { token, topic, topics, userId } = await request.json()
		const list: string[] = Array.isArray(topics)
			? topics
			: (topic ? [topic] : [])
		if (!token || list.length === 0) return NextResponse.json({ error: 'token and topic(s) required' }, { status: 400 })

		const messaging = await getAdminMessaging()
		for (const t of list) {
			await messaging.subscribeToTopic([token], t)
		}

		// Persist topics
		const db = await getAdminDb()
		await db.collection('tokens').doc(token).set({
			token,
			topics: FieldValue.arrayUnion(...list),
			updatedAt: Timestamp.now(),
		}, { merge: true })
		if (userId) {
			await db.collection('users').doc(userId).set({
				subscribedTopics: FieldValue.arrayUnion(...list),
			}, { merge: true })
		}

		return NextResponse.json({ ok: true, subscribed: list })
	} catch (err: any) {
		console.error('Subscribe error:', err)
		return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
	}
} 