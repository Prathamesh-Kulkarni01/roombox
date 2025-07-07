
'use client'

import { useState } from 'react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useData } from '@/context/data-provider'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useData()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsSubmitting(true)
    const user = await login(data.email, data.password)
    if (user) {
      toast({ title: "Login Successful", description: "Welcome back!" })
      if (user.role === 'tenant') {
        router.push('/tenants/my-pg');
      } else {
        router.push('/dashboard');
      }
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
        <Tabs defaultValue="owner" className="w-full max-w-sm">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="owner">Owner / Staff</TabsTrigger>
                <TabsTrigger value="guest">Guest</TabsTrigger>
            </TabsList>
            <TabsContent value="owner">
                 <Card>
                    <CardHeader>
                    <CardTitle className="text-2xl">Owner Login</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your owner dashboard.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input type="email" placeholder="m@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center">
                                <FormLabel>Password</FormLabel>
                                <Link href="#" className="ml-auto inline-block text-sm underline">
                                    Forgot your password?
                                </Link>
                                </div>
                                <FormControl>
                                <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                            {isSubmitting ? 'Logging in...' : 'Login'}
                        </Button>
                        </form>
                    </Form>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="underline">
                        Sign up
                        </Link>
                    </div>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="guest">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Guest Login</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the guest portal.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input type="email" placeholder="m@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                            {isSubmitting ? 'Logging in...' : 'Login'}
                        </Button>
                        </form>
                    </Form>
                     <div className="mt-4 text-center text-sm">
                        PG owner or staff?{" "}
                        <TabsTrigger value="owner" className="underline p-0 h-auto">Login here</TabsTrigger>
                    </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  )
}
