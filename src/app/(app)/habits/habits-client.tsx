"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HabitsView } from "@/server/habits";
import { HabitDialog } from "./habit-dialog";
import { HabitRow } from "./habit-row";

export function HabitsClient({ view }: { view: HabitsView }) {
  const [creating, setCreating] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openCreate = () => {
    opener.current = document.activeElement as HTMLElement | null;
    setCreating(true);
  };
  const { active, profile } = view;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-4xl">Habits</h1>
        <Button onClick={openCreate}>New habit</Button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <h2 className="font-display text-2xl">No habits yet</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-ink-muted">
            Start with one small habit you can do every day. You can add more whenever you like.
          </p>
          <Button onClick={openCreate}>New habit</Button>
        </div>
      ) : (
        <ul aria-label="Habits">
          {active.map((habit) => (
            <HabitRow key={habit.id} habit={habit} />
          ))}
        </ul>
      )}

      {creating && (
        <HabitDialog
          today={profile.today}
          onClose={() => setCreating(false)}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
        />
      )}
    </>
  );
}
