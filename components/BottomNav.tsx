"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Search, TrendingUp, Wallet } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      active: pathname === "/search",
    },
    {
      href: "/breaking",
      label: "Breaking",
      icon: TrendingUp,
      active: pathname === "/breaking",
    },
    {
      href: "/wallet",
      label: "Wallet",
      icon: Wallet,
      active: pathname === "/wallet",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 dark:bg-slate-900 border-t border-slate-700 dark:border-slate-800 z-50 safe-area-inset-bottom">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-2 px-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-slate-700 dark:bg-slate-700"
                    : "hover:bg-slate-700/50 dark:hover:bg-slate-700/50"
                }`}
              >
                <Icon
                  className={`h-6 w-6 mb-1 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

