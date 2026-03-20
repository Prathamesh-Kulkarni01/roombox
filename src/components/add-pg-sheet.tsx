'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores'
import { canAccess } from '@/lib/permissions';
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
import { Switch } from '@/components/ui/switch'
import { useCreatePropertyMutation } from '@/lib/api/apiSlice'
import { useConfetti } from '@/context/confetti-provider'
import { ScrollArea } from '@/components/ui/scroll-area'

const pgSchema = z.object({
  name: z.string().min(3, "Property name must be at least 3 characters."),
  location: z.string().min(3, "Location is required."),
  city: z.string().min(2, "City is required."),
  gender: z.enum(['male', 'female', 'co-ed']),
  autoSetup: z.boolean().default(false),
  floorCount: z.coerce.number().min(1).max(10).default(1),
  roomsPerFloor: z.coerce.number().min(1).max(20).default(1),
  bedsPerRoom: z.coerce.number().min(1).max(10).default(1),
})

type PgFormValues = z.infer<typeof pgSchema>

interface AddPgSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPgAdded?: (pgId: string) => void
}

export default function AddPgSheet({ open, onOpenChange, onPgAdded }: AddPgSheetProps) {
  const { currentUser } = useAppSelector(state => state.user);
  const { featurePermissions } = usePermissionsStore();
  const { showConfetti } = useConfetti();
  const [createProperty, { isLoading: isCreating }] = useCreatePropertyMutation();

  const form = useForm<PgFormValues>({
    resolver: zodResolver(pgSchema),
    defaultValues: {
      name: '',
      location: '',
      city: '',
      gender: 'co-ed',
      autoSetup: false,
      floorCount: 1,
      roomsPerFloor: 4,
      bedsPerRoom: 2,
    },
  })

  const onSubmit = async (data: PgFormValues) => {
    if (!currentUser) return;

    try {
      const result = await createProperty({
        ownerId: currentUser.id,
        name: data.name,
        location: data.location,
        city: data.city,
        gender: data.gender === 'co-ed' ? 'co-living' : data.gender as any,
        autoSetup: data.autoSetup,
        floorCount: data.floorCount,
        roomsPerFloor: data.roomsPerFloor,
        bedsPerRoom: data.bedsPerRoom
      }).unwrap();

      if (result.success && result.pg) {
        form.reset()
        onOpenChange(false)
        if (onPgAdded) {
          onPgAdded(result.pg.id)
        }
        showConfetti({ particleCount: 200, spread: 100 });
      }
    } catch (error: any) {
      console.error('Failed to create property:', error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-tour="add-pg-sheet-content" className="sm:max-w-[425px] flex flex-col h-screen p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Add a New Property</SheetTitle>
          <SheetDescription>
            Fill in the basic details for your new property.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6">
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
                    <FormLabel>Gender Preference</FormLabel>
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

              <div className="space-y-4 pt-4 border-t mt-4">
                <FormField
                  control={form.control}
                  name="autoSetup"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-semibold">Auto-Setup Building</FormLabel>
                        <p className="text-[10px] text-muted-foreground leading-none">Auto-generate floors and rooms.</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('autoSetup') && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <FormField
                        control={form.control}
                        name="floorCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Floors</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                {...field}
                                value={field.value === undefined || field.value === null ? "" : field.value}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    field.onChange(val);
                                  }
                                }}
                                onBlur={() => {
                                  if (!field.value || Number(field.value) < 1) {
                                    field.onChange(1);
                                  }
                                }}
                                className="h-8 text-xs font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="roomsPerFloor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Rooms/Floor</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                {...field}
                                value={field.value === undefined || field.value === null ? "" : field.value}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    field.onChange(val);
                                  }
                                }}
                                onBlur={() => {
                                  if (!field.value || Number(field.value) < 1) {
                                    field.onChange(1);
                                  }
                                }}
                                className="h-8 text-xs font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="bedsPerRoom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Beds/Room</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                {...field}
                                value={field.value === undefined || field.value === null ? "" : field.value}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    field.onChange(val);
                                  }
                                }}
                                onBlur={() => {
                                  if (!field.value || Number(field.value) < 1) {
                                    field.onChange(1);
                                  }
                                }}
                                className="h-8 text-xs font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                )}
              </div>
            </form>
          </Form>
        </ScrollArea>
        <SheetFooter className="p-6 pt-2 h-auto flex-shrink-0 border-t">
          <SheetClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="add-pg-form" disabled={!canAccess(featurePermissions, currentUser?.role, 'properties', 'add') || isCreating}>
            {isCreating ? 'Adding...' : 'Add Property'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
