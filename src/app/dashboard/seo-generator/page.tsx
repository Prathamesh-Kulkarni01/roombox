'use client'

import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { generateSeoContent, type GenerateSeoContentInput } from '@/ai/flows/generate-seo-content'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Wand2, Copy } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from '@/components/ui/skeleton'

const formSchema = z.object({
  pgName: z.string().min(1, 'PG Name is required'),
  location: z.string().min(1, 'Location is required'),
  amenities: z.string().min(1, 'Amenities are required'),
  priceRange: z.string().min(1, 'Price range is required'),
  genderRestriction: z.string().min(1, 'Gender restriction is required'),
})

type FormValues = z.infer<typeof formSchema>

export default function SeoGeneratorPage() {
  const [loading, setLoading] = useState(false)
  const [seoResult, setSeoResult] = useState<{ title: string; description: string } | null>(null)
  const { toast } = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true)
    setSeoResult(null)
    try {
      const result = await generateSeoContent(data as GenerateSeoContentInput)
      setSeoResult(result)
    } catch (error) {
      console.error('Failed to generate SEO content:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate SEO content. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: `${field} has been copied to your clipboard.`,
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>PG Details</CardTitle>
              <CardDescription>Fill in the details of your PG to generate content.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pgName">PG Name</Label>
                <Input id="pgName" placeholder="e.g., Sunshine Living" {...register('pgName')} />
                {errors.pgName && <p className="text-sm text-destructive">{errors.pgName.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="e.g., Koramangala, Bangalore" {...register('location')} />
                {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amenities">Amenities</Label>
                <Input id="amenities" placeholder="e.g., WiFi, AC, Food" {...register('amenities')} />
                {errors.amenities && <p className="text-sm text-destructive">{errors.amenities.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priceRange">Price Range</Label>
                <Input id="priceRange" placeholder="e.g., 8000-15000" {...register('priceRange')} />
                {errors.priceRange && <p className="text-sm text-destructive">{errors.priceRange.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="genderRestriction">Gender Restriction</Label>
                <Input id="genderRestriction" placeholder="e.g., Female" {...register('genderRestriction')} />
                {errors.genderRestriction && <p className="text-sm text-destructive">{errors.genderRestriction.message}</p>}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Generating...' : 'Generate Content'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Your SEO-optimized title and description will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {loading && (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {seoResult && !loading && (
              <>
                <div className="grid gap-2">
                  <Label>Generated Title</Label>
                  <div className="relative">
                    <Input readOnly value={seoResult.title} className="pr-10" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8"
                      onClick={() => copyToClipboard(seoResult.title, 'Title')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Generated Description</Label>
                   <div className="relative">
                    <Textarea readOnly value={seoResult.description} rows={5} className="pr-10" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-1 h-8 w-8"
                      onClick={() => copyToClipboard(seoResult.description, 'Description')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
            {!seoResult && !loading && (
              <div className="flex items-center justify-center text-sm text-muted-foreground h-32 border-2 border-dashed rounded-lg">
                Fill out the form to generate content.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
