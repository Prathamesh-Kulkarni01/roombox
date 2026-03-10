'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TenantsPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/tenants/my-pg')
    }, [router])

    return null
}
