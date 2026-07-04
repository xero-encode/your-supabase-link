import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { createDeal, listDeals, type DealWithRefs } from "@/lib/services/deals";
import { listTitles } from "@/lib/services/titles";
import { listVenues } from "@/lib/services/venues";

const dealsQueryOptions = queryOptions({
  queryKey: ["deals", "list"],
  queryFn: listDeals,
});
const titlesQueryOptions = queryOptions({
  queryKey: ["titles"],
  queryFn: listTitles,
});
const venuesQueryOptions = queryOptions({
  queryKey: ["venues"],
  queryFn: listVenues,
});

export const Route = createFileRoute("/deals")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(dealsQueryOptions),
      context.queryClient.ensureQueryData(titlesQueryOptions),
      context.queryClient.ensureQueryData(venuesQueryOptions),
    ]);
  },
  component: DealsPage,
});

function DealsPage() {
  const { data: deals } = useSuspenseQuery(dealsQueryOptions);

  const grouped = new Map<string, { title: DealWithRefs["title"]; items: DealWithRefs[] }>();
  for (const d of deals) {
    const key = d.title?.id ?? "unknown";
    const existing = grouped.get(key);
    if (existing) existing.items.push(d);
    else grouped.set(key, { title: d.title, items: [d] });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Deals</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The split you've agreed with each venue for each film.
            </p>
          </div>
          <AddDealDialog />
        </div>

        {deals.length === 0 ? (
          <EmptyState
            title="No deals yet"
            description="Add a deal so ReelTake can calculate what you're owed."
            action={<AddDealDialog />}
          />
        ) : (
          <div className="space-y-8">
            {[...grouped.values()].map(({ title, items }) => (
              <section
                key={title?.id ?? "unknown"}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <header className="flex items-center gap-4 border-b border-border px-5 py-4">
                  <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                    Reel
                  </div>
                  <h2 className="font-serif text-xl text-foreground">
                    {title?.name ?? "Unknown title"}
                  </h2>
                </header>
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Venue</th>
                      <th className="px-5 py-3 font-medium">Split</th>
                      <th className="px-5 py-3 font-medium">Valid from</th>
                      <th className="px-5 py-3 font-medium">Valid to</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((d) => (
                      <tr key={d.id}>
                        <td className="px-5 py-3">{d.venue?.name ?? "All venues"}</td>
                        <td className="px-5 py-3 tabular-nums">{d.split_percentage}%</td>
                        <td className="px-5 py-3 tabular-nums text-muted-foreground">
                          {formatDate(d.valid_from)}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-muted-foreground">
                          {d.valid_to ? formatDate(d.valid_to) : "ongoing"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const formSchema = z
  .object({
    title_id: z.string().min(1, "Choose a title"),
    venue_id: z.string().min(1, "Choose a venue"),
    split_percentage: z
      .number({ invalid_type_error: "Enter a number" })
      .min(0, "0 or more")
      .max(100, "100 or less"),
    valid_from: z.date({ required_error: "Pick a start date" }),
    valid_to: z.date().optional().nullable(),
  })
  .refine(
    (v) => !v.valid_to || v.valid_to >= v.valid_from,
    { message: "End must be on or after start", path: ["valid_to"] },
  );

type FormValues = z.infer<typeof formSchema>;

function AddDealDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: titles } = useSuspenseQuery(titlesQueryOptions);
  const { data: venues } = useSuspenseQuery(venuesQueryOptions);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_id: "",
      venue_id: "",
      split_percentage: 40,
      valid_from: new Date(),
      valid_to: null,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createDeal({
        title_id: values.title_id,
        venue_id: values.venue_id || null,
        split_percentage: values.split_percentage,
        valid_from: values.valid_from.toISOString().slice(0, 10),
        valid_to: values.valid_to ? values.valid_to.toISOString().slice(0, 10) : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal added");
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add deal</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add deal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a film" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {titles.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venue_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a venue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {venues.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="split_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Split (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid from</FormLabel>
                    <DateInput value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid to (optional)</FormLabel>
                    <DateInput
                      value={field.value ?? undefined}
                      onChange={(d) => field.onChange(d ?? null)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save deal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : "Pick a date"}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
