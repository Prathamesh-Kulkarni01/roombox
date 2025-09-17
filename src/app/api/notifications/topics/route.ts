import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebaseAdmin'

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const userId = searchParams.get('userId') || ''
		const token = searchParams.get('token') || ''
		const db = await getAdminDb()

		if (userId) {
			const userSnap = await db.collection('users').doc(userId).get()
			const data = userSnap.exists ? (userSnap.data() as any) : {}
			return NextResponse.json({ topics: data.subscribedTopics || [] })
		}
		if (token) {
			const tokenSnap = await db.collection('tokens').doc(token).get()
			const data = tokenSnap.exists ? (tokenSnap.data() as any) : {}
			return NextResponse.json({ topics: data.topics || [] })
		}
		return NextResponse.json({ error: 'userId or token is required' }, { status: 400 })
	} catch (err: any) {
		console.error('Get topics error:', err)
		return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
	}
} 