"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { demoStore } from "@/lib/demo-store";
import { demoMode } from "@/lib/demo-mode";
import { supabase } from "@/lib/supabase";

export function useRealtime(channels: string[], handler: (event: { type: string; payload: unknown }) => void) {
  const { profile, facility } = useAuth();

  useEffect(() => {
    if (demoMode()) {
      const unsubscribe = demoStore.subscribe(channels, handler);
      return unsubscribe;
    }

    const subs: any[] = [];
    for (const channelName of channels) {
      const channel = supabase!.channel(channelName);
      channel
        .on("postgres_changes", { event: "*", schema: "public" }, (payload: any) => {
          handler({ type: channelName, payload });
        })
        .subscribe();
      subs.push(channel);
    }
    return () => {
      for (const channel of subs) {
        supabase!.removeChannel(channel);
      }
    };
  }, [channels, handler, profile, facility]);
}
