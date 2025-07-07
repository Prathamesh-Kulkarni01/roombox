
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PG } from '@/lib/types'
import { addPg as addPgAction } from '@/lib/slices/pgsSlice'

const pgSchema = z.object({
  name: z.string().min(3, "Property name must be at least 3 characters."),
  location: z.string().min(3, "Location is required."),
  city: z.string().min(2, "City is required."),
  gender: z.enum(['male', 'female', 'co-ed']),
})

type PgFormValues = z.infer<typeof pgSchema>

interface AddPgSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPgAdded?: (pgId: string) => void
}

export default function AddPgSheet({ open, onOpenChange, onPgAdded }: AddPgSheetProps) {
  const dispatch = useAppDispatch()

  const form = useForm<PgFormValues>({
    resolver: zodResolver(pgSchema),
    defaultValues: {
      name: '',
      location: '',
      city: '',
      gender: 'co-ed',
    },
  })

  const onSubmit = async (data: PgFormValues) => {
    const resultAction = await dispatch(addPgAction(data))
    if (addPgAction.fulfilled.match(resultAction)) {
      const newPgId = resultAction.payload.id;
      form.reset()
      onOpenChange(false)
      if(onPgAdded && newPgId) {
          onPgAdded(newPgId)
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add a New Property</SheetTitle>
          <SheetDescription>
            Fill in the basic details for your new property. You can add more details later.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4" id="add-pg-form">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Happy Homes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location / Area</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Koramangala 5th Block" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bangalore" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender restriction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="co-ed">Co-ed</SelectItem>
                      <SelectItem value="male">Male only</SelectItem>
                      <SelectItem value="female">Female only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="add-pg-form">Add Property</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
