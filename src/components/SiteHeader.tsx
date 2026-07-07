import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/AWS Student Builder Group_RGB_Program Icon_Blue.png"
            alt="AWS Student Builder Group"
            width={40}
            height={40}
            className="shrink-0"
            priority
          />
          <span className="sb-label truncate">AWS Student Builder Group</span>
        </div>
      </div>
    </header>
  );
}
