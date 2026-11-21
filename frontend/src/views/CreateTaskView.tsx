import React, { useState, useEffect } from 'react';
import { User, TaskType } from '../types';
import { apiFetch } from '../services/api';
import {
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Repeat,
  User as UserIcon,
  Clock,
  CalendarDays,
  Layers,
  CalendarRange,
} from 'lucide-react';

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
      .catch(() => {
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

  const taskTypeOptions = [
    {
      value: TaskType.COMUN,
      label: 'Común',
      subtitle: 'Única vez',
      desc: 'Se ejecuta una sola vez en la fecha fijada.',
      icon: Calendar,
      color: 'emerald',
      activeBorder: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    },
    {
      value: TaskType.DIARIO,
      label: 'Diario',
      subtitle: 'Todos los días',
      desc: 'Se repite todos los días a partir de la fecha fijada.',
      icon: Clock,
      color: 'amber',
      activeBorder: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    },
    {
      value: TaskType.SEMANAL,
      label: 'Semanal',
      subtitle: 'Mismo día cada semana',
      desc: 'Se repite el mismo día todas las semanas (cada 7 días).',
      icon: CalendarDays,
      color: 'cyan',
      activeBorder: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    },
    {
      value: TaskType.QUINCENAL,
      label: 'Quincenal',
      subtitle: 'Cada 15 días',
      desc: 'Se repite cada 15 días a partir de la fecha fijada.',
      icon: Layers,
      color: 'purple',
      activeBorder: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    },
    {
      value: TaskType.MENSUAL,
      label: 'Mensual',
      subtitle: 'Mismo día cada mes',
      desc: 'Se repite el mismo día de cada mes automáticamente.',
      icon: CalendarRange,
      color: 'blue',
      activeBorder: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    },
  ];

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
          Al guardar la tarea, el sistema disparará automáticamente una notificación Push y un mensaje de WhatsApp al usuario seleccionado.
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

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
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
              <span>Fecha de Inicio / Asignación *</span>
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

        {/* Modalidad de Tarea / Frecuencia de Recurrencia */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-emerald-400" />
            <span>Frecuencia y Recurrencia de la Tarea *</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {taskTypeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? opt.activeBorder + ' shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                      <Icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-900 border border-slate-800 text-slate-400">
                      {opt.subtitle}
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-400 leading-snug">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
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
