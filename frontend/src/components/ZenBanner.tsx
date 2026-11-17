import React from 'react';
import { Sparkles, Compass } from 'lucide-react';
import { useZenMessage } from '../hooks/useZenMessage';

interface ZenBannerProps {
  emptyState?: boolean;
}

export const ZenBanner: React.FC<ZenBannerProps> = ({ emptyState = false }) => {
  const message = useZenMessage();

  if (emptyState) {
    return (
      <div className="w-full max-w-xl mx-auto my-8 p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-emerald-500/20 shadow-xl shadow-emerald-950/20 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
          <Compass className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          Jornada al Día
        </h3>
        <p className="text-base text-emerald-300/90 italic font-medium leading-relaxed max-w-md">
          "{message}"
        </p>
        <span className="mt-4 text-xs text-slate-400 tracking-wider uppercase font-medium">
          Mente Clara &bull; Trabajo Impecable
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-cyan-950/30 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm mb-6">
      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="text-xs sm:text-sm text-slate-300 font-medium italic">
        <span className="text-emerald-400 font-bold not-italic mr-2">Serenidad del día:</span>
        "{message}"
      </div>
    </div>
  );
};
