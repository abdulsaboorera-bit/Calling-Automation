"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: "campaigns" },
  { name: "Customers", href: "/dashboard/customers", icon: "customers" },
  { name: "Calls", href: "/dashboard/calls", icon: "calls" },
  { name: "Reports", href: "/dashboard/reports", icon: "reports" },
  { name: "Phone Numbers", href: "/dashboard/phone-numbers", icon: "phone" },
  { name: "Agent Config", href: "/dashboard/agent", icon: "agent" },
  { name: "Team", href: "/dashboard/team", icon: "team" },
  { name: "Billing", href: "/dashboard/billing", icon: "billing" },
  { name: "Settings", href: "/dashboard/settings", icon: "settings" },
];

const iconMap: Record<string, string> = {
  dashboard: "📊",
  campaigns: "📞",
  customers: "👥",
  calls: "📱",
  reports: "📋",
  phone: "☎️",
  agent: "🤖",
  team: "👨‍👩‍👧‍👦",
  billing: "💳",
  settings: "⚙️",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; firstName: string; lastName: string } | null>(null);
  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          if (data.tenant) {
            setTenant(data.tenant);
          }
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <SidebarContent pathname={pathname} />
        </div>
      </div>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto border-r bg-white">
          <SidebarContent pathname={pathname} />
        </div>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">{tenant?.name || "CallPulse"}</span>
            </div>
          </div>

          <div className="flex items-center gap-x-4">
            <div className="text-sm font-medium text-gray-700">
              {user.firstName} {user.lastName}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <>
      <div className="flex h-16 items-center px-6 border-b">
        <span className="text-xl font-bold text-gray-900">CallPulse</span>
      </div>
      <nav className="flex flex-1 flex-col px-3 py-4">
        <ul className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span>{iconMap[item.icon]}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
