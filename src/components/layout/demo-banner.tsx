import { Info } from "lucide-react";

interface DemoBannerProps {
  demoMode: boolean;
}

export function DemoBanner({ demoMode }: DemoBannerProps) {
  if (!demoMode) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-800 px-4 py-2 flex items-center justify-between text-xs font-medium">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4" />
        <span>DEMO MODE — In-memory backend. Data resets on reload.</span>
      </div>
      <span className="border border-amber-300 rounded px-1.5 py-0.5">Simulated real-time</span>
    </div>
  );
}
