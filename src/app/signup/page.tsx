
'use client'

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up has Moved!</CardTitle>
          <CardDescription>
            We now use a simple phone-based login for both signing up and logging in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm mb-4">
            Please proceed to the login page to get started.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
