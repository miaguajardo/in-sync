import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/workouts", label: "Workouts" },
  { href: "/oura", label: "Oura" },
  { href: "/link", label: "Link" },
] as const;

export function AppNav() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 sm:px-10">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">In Sync</span>
        <span className="hidden text-zinc-300 dark:text-zinc-700 sm:inline" aria-hidden>
          ·
        </span>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
