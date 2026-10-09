import { Suspense } from "react";
import { TopBar } from "@/components/top-bar";
import { UserMenu } from "@/components/user-menu";
import { TimezoneSync } from "./timezone-sync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The session read streams in behind the boundary so the rest of the page isn't blocked. */}
      <TopBar
        menu={
          <Suspense fallback={<span className="size-9 rounded-full bg-line" />}>
            <UserMenu />
          </Suspense>
        }
      />
      <TimezoneSync />
      <main className="mx-auto w-full max-w-[1180px] px-8 py-10">{children}</main>
    </>
  );
}
