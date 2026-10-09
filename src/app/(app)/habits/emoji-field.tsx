"use client";

import { EmojiPicker } from "frimousse";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** The emoji button of the habit dialog. Opens a searchable grid; picking an emoji closes it. */
export function EmojiField({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose emoji"
          className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-line bg-bg text-3xl focus-visible:outline-2 focus-visible:outline-clay"
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <EmojiPicker.Root
          className="flex h-80 flex-col"
          onEmojiSelect={({ emoji }) => {
            onChange(emoji);
            setOpen(false);
          }}
        >
          <EmojiPicker.Search
            placeholder="Search emoji"
            aria-label="Search emoji"
            autoFocus
            className="m-2 rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus-visible:border-clay"
          />
          <EmojiPicker.Viewport className="flex-1 outline-none">
            <EmojiPicker.Loading className="flex h-full items-center justify-center text-sm text-ink-muted">
              Loading…
            </EmojiPicker.Loading>
            <EmojiPicker.Empty className="flex h-full items-center justify-center text-sm text-ink-muted">
              No emoji found.
            </EmojiPicker.Empty>
            <EmojiPicker.List
              className="select-none pb-2"
              components={{
                CategoryHeader: ({ category, ...props }) => (
                  <div className="bg-popover px-3 pb-1.5 pt-3 text-xs font-medium text-ink-muted" {...props}>
                    {category.label}
                  </div>
                ),
                Row: ({ children, ...props }) => (
                  <div className="scroll-my-1.5 px-1.5" {...props}>
                    {children}
                  </div>
                ),
                Emoji: ({ emoji, ...props }) => (
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-md text-xl data-[active]:bg-line"
                    {...props}
                  >
                    {emoji.emoji}
                  </button>
                ),
              }}
            />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}
