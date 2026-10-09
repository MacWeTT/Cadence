"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HabitListItem } from "@/server/habit-view";
import type { HabitsView } from "@/server/habits";
import { HabitDialog } from "./habit-dialog";
import { HabitRow } from "./habit-row";

export function HabitsClient({ view }: { view: HabitsView }) {
  // `dialog` is null when closed, `{}` to create, `{ habit }` to edit.
  const [dialog, setDialog] = useState<{ habit?: HabitListItem } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openDialog = (habit?: HabitListItem, from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
    setDialog({ habit });
  };
  const { active, profile } = view;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-4xl">Habits</h1>
        <Button onClick={() => openDialog()}>New habit</Button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <h2 className="font-display text-2xl">No habits yet</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-ink-muted">
            Start with one small habit you can do every day. You can add more whenever you like.
          </p>
          <Button onClick={() => openDialog()}>New habit</Button>
        </div>
      ) : (
        <ul aria-label="Habits">
          {active.map((habit) => (
            <HabitRow key={habit.id} habit={habit} onEdit={(from) => openDialog(habit, from)} />
          ))}
        </ul>
      )}

      {dialog && (
        <HabitDialog
          // A fresh form for each habit (or for create).
          key={dialog.habit?.id ?? "new"}
          habit={dialog.habit}
          today={profile.today}
          weekStartsOn={profile.weekStartsOn}
          onClose={() => setDialog(null)}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
        />
      )}
    </>
  );
}
