import React, { useState } from 'react';
import { TaskStatus } from '../types';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface JustificationModalProps {
  isOpen: boolean;
  targetStatus: TaskStatus | null;
  taskTitle: string;
  onConfirm: (justification: string) => Promise<void>;
  onCancel: () => void;
}

export const JustificationModal: React.FC<JustificationModalProps> = ({
  isOpen,
  targetStatus,
  taskTitle,
  onConfirm,
  onCancel,
}) => {
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !targetStatus) return null;

  const isFinalizado = targetStatus === TaskStatus.FINALIZADO;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!justification || justification.trim().length < 5) {
      setError('La justificación es obligatoria y debe contener al menos 5 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(justification.trim());
      setJustification('');
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la justificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-7 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-3 rounded-xl border ${
              isFinalizado
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {isFinalizado ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Justificación Obligatoria
            </h3>
            <p className="text-xs text-slate-400">
              Transición de tarea a: <span className="font-semibold uppercase tracking-wider text-slate-200">{targetStatus}</span>
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
          <span className="font-semibold text-slate-400">Tarea:</span> {taskTitle}
        </div>

        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Para garantizar la transparencia e inmutabilidad de los registros, describa detalladamente el motivo de finalización o los impedimentos encontrados para el rechazo.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            required
            rows={4}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Escriba aquí la explicación detallada..."
            className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setJustification('');
                setError(null);
                onCancel();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                isFinalizado
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
              }`}
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <span>Registrar Justificación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
