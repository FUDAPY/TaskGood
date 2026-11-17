import React from 'react';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur py-4 px-6 text-center text-xs text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="TaskGood Logo" className="w-5 h-5 rounded object-contain" />
          <span className="font-semibold text-slate-300">TaskGood</span>
          <span className="text-slate-600">|</span>
          <span>Plataforma Empresarial de Gestión</span>
        </div>
        <div>
          <a
            href="https://zetti.grupooh.online/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 font-medium transition-colors group"
          >
            <span>Todos los derechos reservados para ZETTI DIGITAL PY</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
};
