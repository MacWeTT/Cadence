import { TopBar } from "@/components/top-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-[1180px] px-8 py-10">{children}</main>
    </>
  );
}
