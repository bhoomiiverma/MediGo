"use client";

import { Link } from "wouter";
import { LogOut, ShieldAlert, Building2, Users, MapPin, ClipboardList, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Profile, Facility } from "@/types";

interface SidebarProps {
  profile: Profile;
  facility: Facility;
  onSignOut: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/inventory", label: "Live Inventory", icon: ClipboardList },
  { href: "/request", label: "Request Supply", icon: ShieldAlert },
  { href: "/alerts", label: "Incoming Alerts", icon: Users },
  { href: "/map", label: "Operations Map", icon: MapPin },
  { href: "/dispatch", label: "Dispatches", icon: ClipboardList },
  { href: "/tracking", label: "Request Tracking", icon: Building2 },
  { href: "/transactions", label: "Transactions", icon: ShieldAlert },
];

export function Sidebar({ profile, facility, onSignOut }: SidebarProps) {
  const isAdmin = profile.role === "administrator";
  const isSupplier = profile.role === "supplier";

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-slate-300 shrink-0">
      <div className="flex h-16 items-center gap-3 px-4 border-b border-slate-800">
        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">MD</div>
        <div className="text-sm font-bold text-white leading-tight">MedDrop</div>
        <div className="text-xs text-slate-500 leading-tight">Emergency Logistics</div>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const showAdmin = item.href === "/transactions" || item.href === "/dispatch";
          if (showAdmin && !isAdmin && !isSupplier) return null;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={(isActive: boolean) => cn("sidebar-link", isActive ? "active" : "inactive")}>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 mb-2">{facility.name}</div>
        <div className="text-xs font-medium text-slate-300 capitalize">{profile.role}</div>
        <Button variant="outline" size="sm" onClick={onSignOut} className="w-full mt-3 text-slate-400 hover:text-white border-slate-600 hover:border-slate-400">
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
