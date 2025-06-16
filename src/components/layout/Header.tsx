
'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Home, History as HistoryIcon } from 'lucide-react';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Analyze', icon: Home },
    { href: '/history', label: 'History', icon: HistoryIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Sparkles className="h-7 w-7 text-accent" />
          <span className="font-bold text-xl font-headline text-primary sm:inline-block">
            Feedback Lens
          </span>
        </Link>
        
        <nav className="flex items-center space-x-2 sm:space-x-4">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-0 h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
          <ThemeToggleButton />
        </nav>
      </div>
    </header>
  );
}
