"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COLOR_KEYS, habitColor, type ColorKey } from "@/lib/palette";
import { createHabitAction } from "./actions";
import { EmojiField } from "./emoji-field";

const DEFAULT_ICON = "🎯";

export function HabitDialog({
  today,
  onClose,
  onCloseAutoFocus,
}: {
  today: string;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<ColorKey>("moss");
  const [kind, setKind] = useState<"daily" | "weekly_count">("daily");
  const [timesPerWeek, setTimesPerWeek] = useState("3");
  const [startDate, setStartDate] = useState(today);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false); // guards against a double-click before React re-renders the disabled button

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await createHabitAction({
        name,
        description: description || undefined,
        icon,
        color,
        kind,
        timesPerWeek: kind === "weekly_count" ? Number(timesPerWeek) : undefined,
        startDate,
      });
      if (result.ok) {
        toast.success("Habit created");
        onClose();
        return;
      }
      submitting.current = false;
      setFieldErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors) setFormError(result.error);
    });
  }

  const error = (field: string) =>
    fieldErrors[field] && (
      <p id={`error-${field}`} role="alert" className="mt-1 text-sm text-clay">
        {fieldErrors[field]}
      </p>
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
        // Focus the name field here (not with autoFocus) so Radix remembers the opener and returns focus to it on close.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">New habit</DialogTitle>
          <DialogDescription className="sr-only">Choose an emoji, a name, a color and a schedule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="flex items-start gap-3">
            <EmojiField value={icon} onChange={setIcon} />
            <div className="flex-1">
              <Label htmlFor="habit-name" className="sr-only">
                Name
              </Label>
              <Input
                id="habit-name"
                aria-label="Name"
                placeholder="Name your habit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "error-name" : undefined}
                ref={nameRef}
                className="h-14 text-base"
              />
              {error("name")}
              {error("icon")}
            </div>
          </div>

          <div>
            <Label htmlFor="habit-description" className="mb-1.5">
              Description (optional)
            </Label>
            <Textarea
              id="habit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={Boolean(fieldErrors.description)}
              rows={2}
            />
            {error("description")}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Color</legend>
            <div className="flex gap-2.5">
              {COLOR_KEYS.map((key) => (
                <label key={key} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={key}
                    checked={color === key}
                    onChange={() => setColor(key)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="block size-7 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-clay"
                    style={{ backgroundColor: habitColor(key) }}
                  />
                  <span className="sr-only">{key}</span>
                </label>
              ))}
            </div>
            {error("color")}
          </fieldset>

          <div>
            <p className="mb-1.5 text-sm font-medium" id="schedule-label">
              Schedule
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup
                type="single"
                variant="outline"
                value={kind}
                onValueChange={(v) => v && setKind(v as typeof kind)}
                aria-labelledby="schedule-label"
              >
                <ToggleGroupItem value="daily" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Every day</ToggleGroupItem>
                <ToggleGroupItem value="weekly_count" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Times a week</ToggleGroupItem>
              </ToggleGroup>
              {kind === "weekly_count" && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="habit-times" className="sr-only">
                    Times per week
                  </Label>
                  <Input
                    id="habit-times"
                    type="number"
                    min={1}
                    max={6}
                    value={timesPerWeek}
                    onChange={(e) => setTimesPerWeek(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.timesPerWeek)}
                    className="w-20"
                  />
                  <span className="text-sm text-ink-muted">per week</span>
                </div>
              )}
            </div>
            {error("timesPerWeek")}
          </div>

          <div>
            <Label htmlFor="habit-start" className="mb-1.5">
              Starts
            </Label>
            <Input
              id="habit-start"
              type="date"
              max={today}
              min="2000-01-01"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-invalid={Boolean(fieldErrors.startDate)}
              className="w-44"
            />
            {error("startDate")}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-clay">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save habit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
