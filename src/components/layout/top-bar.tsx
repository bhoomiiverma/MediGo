"use client";

import { Link } from "wouter";
import { User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Facility } from "@/types";

interface TopBarProps {
  profile: Profile;
  facility: Facility;
  onSignOut: () => void;
}

export function TopBar({ profile, facility, onSignOut }: TopBarProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-600">☰</button>
        <Link
          href="/dashboard"
          className={(isActive: boolean) => cn("flex items-center gap-2 text-sm font-semibold", isActive ? "text-blue-600" : "text-slate-900")}
        >
          <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">MD</div>
          MedDrop
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600">
          <User className="h-3.5 w-3.5" /> {facility.name}
        </div>
        <button className="text-slate-500 hover:text-blue-600 transition-colors" title="Notifications">
          <Bell className="h-5 w-5" />
        </button>
        <button className="text-xs font-medium text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-md hover:bg-slate-100" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
