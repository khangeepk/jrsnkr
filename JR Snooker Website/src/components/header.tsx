import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center px-4 md:px-8 mx-auto">
                <div className="mr-4 flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        {/* Logo Placeholder */}
                        <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold hover-glow">
                            JR
                        </div>
                        <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
                            Snooker Lounge
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link
                            href="/tables"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Tables
                        </Link>
                        <Link
                            href="/players"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Players
                        </Link>
                        <Link
                            href="/booking"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Booking
                        </Link>
                        <Link
                            href="/pos"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            POS
                        </Link>
                        <Link
                            href="/tournaments"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Tournaments
                        </Link>
                        <Link
                            href="/admin"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Admin
                        </Link>
                    </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <nav className="flex items-center space-x-2">
                        <ThemeToggle />
                    </nav>
                </div>
            </div>
        </header>
    )
}
