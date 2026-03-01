
'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { format, subMonths, getYear, getMonth, parseISO } from 'date-fns'
import type { Guest, PG } from '@/lib/types'
import { IndianRupee, Users, TrendingUp, WalletCards } from 'lucide-react'

interface RentAnalyticsProps {
    guests: Guest[];
    pgs: PG[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function RentAnalytics({ guests, pgs }: RentAnalyticsProps) {

    const monthlyCollectionData = useMemo(() => {
        const data: { month: string; total: number }[] = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = subMonths(today, i);
            const monthKey = format(date, 'MMM yy');
            data.push({ month: monthKey, total: 0 });
        }

        guests.forEach(guest => {
            (guest.paymentHistory || []).forEach(payment => {
                const paymentDate = parseISO(payment.date);
                const monthKey = format(paymentDate, 'MMM yy');
                const monthData = data.find(d => d.month === monthKey);
                if (monthData) {
                    monthData.total += payment.amount;
                }
            });
        });

        return data;
    }, [guests]);

    const paymentMethodData = useMemo(() => {
        const methodCounts: { [key: string]: number } = { cash: 0, upi: 0, 'in-app': 0, other: 0 };
        guests.forEach(guest => {
            (guest.paymentHistory || []).forEach(payment => {
                if (methodCounts[payment.method] !== undefined) {
                    methodCounts[payment.method]++;
                }
            });
        });
        return Object.entries(methodCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).filter(d => d.value > 0);
    }, [guests]);

    const kpiData = useMemo(() => {
        const totalBeds = pgs.reduce((acc, pg) => acc + pg.totalBeds, 0);
        const activeGuests = guests.filter(g => !g.isVacated);
        const occupancyRate = totalBeds > 0 ? (activeGuests.length / totalBeds) * 100 : 0;

        const totalOutstanding = activeGuests
            .filter(g => g.rentStatus === 'unpaid' || g.rentStatus === 'partial')
            .reduce((sum, g) => {
                 const balanceBf = g.balanceBroughtForward || 0;
                 const currentMonthRent = g.rentAmount;
                 const chargesDue = (g.additionalCharges || []).reduce((s, charge) => s + charge.amount, 0);
                 const totalOwed = balanceBf + currentMonthRent + chargesDue;
                 const totalPaid = g.rentPaidAmount || 0;
                 return sum + (totalOwed - totalPaid);
            }, 0);
            
        const ytdCollection = guests.flatMap(g => g.paymentHistory || [])
            .filter(p => getYear(parseISO(p.date)) === getYear(new Date()))
            .reduce((sum, p) => sum + p.amount, 0);

        return {
            occupancyRate,
            totalOutstanding,
            ytdCollection,
        };
    }, [guests, pgs]);

    return (
        <div className="space-y-6">
             <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">YTD Collections</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center">
                            <IndianRupee className="h-6 w-6 mr-1" />{kpiData.ytdCollection.toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding Dues</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{kpiData.totalOutstanding.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Occupancy</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.occupancyRate.toFixed(1)}%</div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Monthly Rent Collection</CardTitle>
                        <CardDescription>Total rent collected over the last 12 months.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{ total: { label: 'Collection', color: 'hsl(var(--primary))' } }} className="h-72 w-full">
                            <BarChart data={monthlyCollectionData} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Methods</CardTitle>
                        <CardDescription>Breakdown of how tenants pay rent.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <ChartContainer config={{}} className="h-60 w-full">
                             <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {paymentMethodData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent />} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
