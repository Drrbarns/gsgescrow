'use client';

import { SIMULATION_MODE } from '@/lib/constants';
import { FlaskConical } from 'lucide-react';

export function SimulationBanner() {
  if (!SIMULATION_MODE) return null;
  return (
    <div className="sticky top-0 z-[100] bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md">
      <FlaskConical className="h-4 w-4" />
      Simulation mode — no real payments. Full flow available for testing. Turn off for production.
    </div>
  );
}
