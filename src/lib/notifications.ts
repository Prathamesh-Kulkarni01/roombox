
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app, db, isFirebaseConfigured } from './firebase'
import { doc, setDoc } from 'firebase/firestore'

export type InitPushResult = {
	token?: string
	subscribedTopics?: string[]
}

export async function initPushAndSaveToken(userId: string): Promise<InitPushResult> {
	if (!isFirebaseConfigured() || typeof window === 'undefined' || !userId) return {}
	if (!(await isSupported())) return {}
	if (!app || !db) return {}

	const permission = await Notification.requestPermission()
	if (permission !== 'granted') return {}

	const raw = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''
	const vapidKey = raw.trim().replace(/\s+/g, '')
	if (!vapidKey || !/^B[A-Za-z0-9_-]+$/.test(vapidKey)) {
		console.error('[Push] Invalid VAPID key')
		return {}
	}

	const messaging = getMessaging(app)
	const token = await getToken(messaging, { vapidKey })
	if (!token) return {}

	await setDoc(doc(db, 'users', userId), { fcmToken: token }, { merge: true })
	return { token, subscribedTopics: [] }
}

export async function subscribeToTopic({token, topic,topics,userId}: {token: string, topic?: string, topics?: string[], userId?: string}): Promise<boolean> {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	try {
		const res = await fetch(`${appUrl}/api/notifications/subscribe`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, topic, topics, userId })
		})
		return res.ok
	} catch {
		return false
	}
}

export async function subscribeToTopics(token: string, topics: string[]): Promise<{ ok: boolean; subscribed?: string[] }> {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	try {
		const res = await fetch(`${appUrl}/api/notifications/subscribe`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, topics })
		})
		if (!res.ok) return { ok: false }
		const data = await res.json().catch(() => ({}))
		return { ok: true, subscribed: data.subscribed }
	} catch {
		return { ok: false }
	}
}

export async function getSubscribedTopics(opts: { userId?: string; token?: string }): Promise<string[]> {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const params = new URLSearchParams()
	if (opts.userId) params.set('userId', opts.userId)
	if (opts.token) params.set('token', opts.token)
	const res = await fetch(`${appUrl}/api/notifications/topics?${params.toString()}`)
	if (!res.ok) return []
	const data = await res.json().catch(() => ({}))
	return Array.isArray(data.topics) ? data.topics : []
}

export async function sendPushToUser(params: { userId: string; title: string; body: string; link?: string }): Promise<{ ok: boolean; error?: string }>{
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	try {
		const res = await fetch(`${appUrl}/api/notifications/send/user`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params)
		})
		if (!res.ok) {
			const data = await res.json().catch(() => ({}))
			return { ok: false, error: data?.error || 'Failed to send' }
		}
		return { ok: true }
	} catch (err: any) {
		return { ok: false, error: err?.message || 'Network error' }
	}
}

export async function sendPushToTopic(params: { topic: string; title: string; body: string; link?: string }): Promise<{ ok: boolean; error?: string }>{
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	try {
		const res = await fetch(`${appUrl}/api/notifications/send/topic`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params)
		})
		if (!res.ok) {
			const data = await res.json().catch(() => ({}))
			return { ok: false, error: data?.error || 'Failed to send' }
		}
		return { ok: true }
	} catch (err: any) {
		return { ok: false, error: err?.message || 'Network error' }
	}
} 
