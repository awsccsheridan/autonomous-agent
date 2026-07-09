import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/AWS Student Builder Group_RGB_Program Icon_Blue.png"
            alt="AWS Student Builder Group"
            width={40}
            height={40}
            className="shrink-0"
            priority
          />
          <span className="sb-label truncate">AWS Student Builder Group</span>
        </Link>

        <nav className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-xl border border-[var(--sb-border)] px-4 py-2 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[var(--sb-text-muted)] transition hover:border-[var(--sb-cyan)] hover:text-[var(--sb-cyan)]"
          >
            Overview
          </Link>

          <Link
            href="/workspace"
            className="rounded-xl bg-[var(--sb-cyan)] px-4 py-2 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#071018] transition hover:bg-[var(--sb-cyan-bright)]"
          >
            Workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}