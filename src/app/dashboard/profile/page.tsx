'use client'

import React, { useMemo } from "react"
import { useAppSelector } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    User, 
    Phone, 
    Shield, 
    Building, 
    Calendar, 
    CreditCard, 
    CheckCircle2, 
    AlertCircle,
    Copy,
    LogOut,
    Lock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch } from "@/lib/hooks"
import { logoutUser } from "@/lib/slices/userSlice"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
    const { currentUser, currentPlan } = useAppSelector((state) => state.user)
    const { pgs } = useAppSelector((state) => state.pgs)
    const { toast } = useToast()
    const dispatch = useAppDispatch()
    const router = useRouter()

    const assignedPg = useMemo(() => {
        if (!currentUser?.pgId) return null
        return pgs.find(p => p.id === currentUser.pgId)
    }, [currentUser, pgs])

    if (!currentUser) return null

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast({
            title: `${label} Copied`,
            description: "Copied to clipboard successfully.",
        })
    }

    const handleLogout = () => {
        dispatch(logoutUser())
        router.push("/login")
    }

    const isStaff = ['manager', 'cook', 'cleaner', 'security', 'other'].includes(currentUser.role)

    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-10">
            {/* Header Section */}
            <div className="flex flex-col items-center gap-4 py-6 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl border border-primary/10">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">
                        {currentUser.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h1 className="text-2xl font-black tracking-tight">{currentUser.name}</h1>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize font-bold px-3 py-0.5 rounded-full">
                            {currentUser.role}
                        </Badge>
                        {currentUser.status === 'active' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-bold rounded-full">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="rounded-full">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {currentUser.status}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Account Details */}
            <Card className="border-border/40 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Account Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/5 rounded-xl text-primary">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground opacity-50">Phone Number</p>
                                <p className="font-bold text-sm">{currentUser.phone}</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(currentUser.phone, "Phone Number")}
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/5 rounded-xl text-primary">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground opacity-50">Account Role</p>
                                <p className="font-bold text-sm capitalize">{currentUser.role}</p>
                            </div>
                        </div>
                    </div>

                    {isStaff && (
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/5 rounded-xl text-primary">
                                    <Building className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground opacity-50">Assigned PG</p>
                                    <p className="font-bold text-sm">{assignedPg?.name || 'All Properties'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isStaff && currentPlan && (
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/5 rounded-xl text-primary">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground opacity-50">Subscription Plan</p>
                                    <p className="font-bold text-sm capitalize">{currentPlan.name} Plan</p>
                                </div>
                            </div>
                            <Button variant="link" className="text-xs font-bold text-primary" onClick={() => router.push("/dashboard/settings")}>
                                Manage
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Permissions Overview (Only for Staff) */}
            {isStaff && currentUser.permissions && currentUser.permissions.length > 0 && (
                <Card className="border-border/40 shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Workplace Permissions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {currentUser.permissions.map((p: string) => (
                                <Badge key={p} variant="outline" className="bg-primary/5 text-primary border-primary/20 font-semibold px-3 py-1 rounded-lg">
                                    {p.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </Badge>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-4 italic font-medium">
                            * Permissions are managed by the property owner. Contact them for changes.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-3 mt-4">
                <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 border-border/60 hover:bg-muted"
                    onClick={() => toast({ title: "Coming Soon", description: "Password change feature is being developed." })}
                >
                    <Lock className="w-4 h-4" />
                    Change Password
                </Button>
                <Button 
                    variant="destructive" 
                    className="w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4" />
                    Logout from Session
                </Button>
            </div>

            <div className="text-center mt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-30">
                    RoomBox v2.4.0 • Build 2026.03.31
                </p>
            </div>
        </div>
    )
}
