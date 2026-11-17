import React, { useState, useEffect } from 'react';
import { User, TaskType } from '../types';
import { apiFetch } from '../services/api';
import { PlusCircle, CheckCircle2, AlertCircle, Calendar, Repeat, User as UserIcon } from 'lucide-react';

interface CreateTaskViewProps {
  onTaskCreated?: () => void;
}

export const CreateTaskView: React.FC<CreateTaskViewProps> = ({ onTaskCreated }) => {
  const [funcionarios, setFuncionarios] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedDate, setAssignedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [type, setType] = useState<TaskType>(TaskType.COMUN);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<User[]>('/users/funcionarios')
      .then((data) => {
        setFuncionarios(data);
        if (data.length > 0) {
          setAssignedTo(data[0]._id || data[0].id || '');
        }
      })
      .catch((err) => {
        setErrorMsg('Error al cargar la lista de usuarios para asignación');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          assignedTo,
          assignedDate,
          type,
        }),
      });

      setSuccessMsg('Tarea creada y asignada exitosamente. Se ha disparado la notificación.');
      setTitle('');
      setDescription('');
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al crear la tarea.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
          Módulo de Asignación &bull; Administrador
        </span>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Crear y Asignar Tarea
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Al guardar la tarea, el sistema disparará automáticamente una notificación Push y un mensaje de WhatsApp al funcionario seleccionado.
        </p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Título de la Tarea *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Auditoría de Inventario y Conciliación"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Descripción Detallada
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Especifique las directrices o entregables esperados..."
            className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Usuario Asignado (Funcionario o Administrador) *</span>
            </label>
            <select
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {funcionarios.map((f) => {
                const uid = f._id || f.id || '';
                return (
                  <option key={uid} value={uid}>
                    {f.name} [{f.role.toUpperCase()}] {f.phone ? `(WhatsApp: ${f.phone})` : `(${f.email})`}
                  </option>
                );
              })}
            </select>
            {funcionarios.length === 0 && (
              <span className="text-[11px] text-amber-400 mt-1 block">
                No hay usuarios registrados todavía.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fecha de Asignación *</span>
            </label>
            <input
              type="date"
              required
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-cyan-400" />
            <span>Modalidad de Tarea</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType(TaskType.COMUN)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                type === TaskType.COMUN
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="block text-xs font-bold mb-0.5">Tarea Común</span>
              <span className="block text-[11px] opacity-75">Se ejecuta una única vez en la fecha fijada.</span>
            </button>

            <button
              type="button"
              onClick={() => setType(TaskType.PERMANENTE)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                type === TaskType.PERMANENTE
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="block text-xs font-bold mb-0.5">Tarea Permanente</span>
              <span className="block text-[11px] opacity-75">Se repite semanalmente y dispara recordatorios 24h antes.</span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || funcionarios.length === 0}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 mt-4"
        >
          {isLoading ? (
            <span>Guardando y Notificando...</span>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Guardar Tarea y Enviar Notificaciones</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
