import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';
import { apiFetch } from '../services/api';
import { ZenBanner } from '../components/ZenBanner';
import { JustificationModal } from '../components/JustificationModal';
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  RefreshCw,
  Repeat,
} from 'lucide-react';

const STATUS_COLUMNS = [
  { id: TaskStatus.PENDIENTE, label: 'Pendiente', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  { id: TaskStatus.EN_PROCESO, label: 'En Proceso', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  { id: TaskStatus.FINALIZADO, label: 'Finalizado', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { id: TaskStatus.RECHAZADO, label: 'Rechazado', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
];

export const FuncionarioPipeline: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de justificación
  const [justificationModal, setJustificationModal] = useState<{
    isOpen: boolean;
    taskId: string | null;
    targetStatus: TaskStatus | null;
    taskTitle: string;
  }>({
    isOpen: false,
    taskId: null,
    targetStatus: null,
    taskTitle: '',
  });

  // Filtro móvil activo
  const [mobileStatusTab, setMobileStatusTab] = useState<TaskStatus>(TaskStatus.PENDIENTE);

  const fetchTodayTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<Task[]>('/tasks/today');
      setTasks(data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las tareas del día.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  const handleStatusChangeRequest = (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;

    if (newStatus === TaskStatus.FINALIZADO || newStatus === TaskStatus.RECHAZADO) {
      setJustificationModal({
        isOpen: true,
        taskId: task._id,
        targetStatus: newStatus,
        taskTitle: task.title,
      });
    } else {
      executeStatusChange(task._id, newStatus);
    }
  };

  const executeStatusChange = async (taskId: string, newStatus: TaskStatus, justification?: string) => {
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, justification }),
      });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
      setJustificationModal({ isOpen: false, taskId: null, targetStatus: null, taskTitle: '' });
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar el estado de la tarea.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Cabecera y Zen Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Visión Efímera &bull; Jornada de Hoy</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Pipeline de Tareas
          </h1>
        </div>
        <button
          onClick={fetchTodayTasks}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <ZenBanner />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Si no hay tareas en todo el día */}
      {!isLoading && tasks.length === 0 ? (
        <ZenBanner emptyState={true} />
      ) : (
        <>
          {/* Pestañas Móviles (<768px) */}
          <div className="flex md:hidden items-center justify-between gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 mb-6 overflow-x-auto">
            {STATUS_COLUMNS.map((col) => {
              const count = tasks.filter((t) => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileStatusTab(col.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    mobileStatusTab === col.id
                      ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{col.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Vista Móvil (<768px): Tarjetas Apiladas según la pestaña seleccionada */}
          <div className="md:hidden space-y-4">
            {tasks
              .filter((t) => t.status === mobileStatusTab)
              .map((task) => (
                <div
                  key={task._id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md relative"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-100 text-sm">{task.title}</h3>
                    {task.type === 'permanente' && (
                      <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md font-medium">
                        <Repeat className="w-3 h-3" />
                        Semanal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {task.description || 'Sin descripción detallada.'}
                  </p>

                  {task.justification && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-400 block mb-1">Justificación registrada:</span>
                      <p className="text-slate-300 italic">{task.justification}</p>
                    </div>
                  )}

                  {/* Acciones de cambio de estado en Móvil */}
                  <div className="border-t border-slate-800/80 pt-3 flex flex-wrap gap-2">
                    {STATUS_COLUMNS.map((col) => (
                      <button
                        key={col.id}
                        disabled={task.status === col.id}
                        onClick={() => handleStatusChangeRequest(task, col.id)}
                        className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          task.status === col.id
                            ? 'bg-slate-800 text-slate-500 cursor-default'
                            : 'bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40'
                        }`}
                      >
                        Pasar a {col.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {tasks.filter((t) => t.status === mobileStatusTab).length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No hay tareas en esta columna actualmente.
              </div>
            )}
          </div>

          {/* Vista Escritorio (>768px): Tablero Kanban Horizontal */}
          <div className="hidden md:grid md:grid-cols-4 gap-4 items-start">
            {STATUS_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col min-h-[500px]"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.map((task) => (
                      <div
                        key={task._id}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800/90 shadow hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {task.title}
                          </h4>
                          {task.type === 'permanente' && (
                            <span title="Tarea Permanente (Semanal)" className="text-cyan-400 shrink-0">
                              <Repeat className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-3 mb-3 leading-relaxed">
                          {task.description || 'Sin descripción'}
                        </p>

                        {task.justification && (
                          <div className="mb-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px]">
                            <span className="text-slate-400 font-semibold block mb-0.5">Justificación:</span>
                            <span className="text-slate-300 italic">{task.justification}</span>
                          </div>
                        )}

                        {/* Selectores rápidos de transición */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-500 font-medium">Mover a:</span>
                          <div className="flex items-center gap-1">
                            {col.id !== TaskStatus.PENDIENTE && (
                              <button
                                onClick={() => handleStatusChangeRequest(task, TaskStatus.PENDIENTE)}
                                title="Mover a Pendiente"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 text-[10px]"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.id !== TaskStatus.EN_PROCESO && (
                              <button
                                onClick={() => handleStatusChangeRequest(task, TaskStatus.EN_PROCESO)}
                                title="Mover a En Proceso"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 text-[10px]"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.id !== TaskStatus.FINALIZADO && (
                              <button
                                onClick={() => handleStatusChangeRequest(task, TaskStatus.FINALIZADO)}
                                title="Finalizar (Requiere Justificación)"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 text-[10px]"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.id !== TaskStatus.RECHAZADO && (
                              <button
                                onClick={() => handleStatusChangeRequest(task, TaskStatus.RECHAZADO)}
                                title="Rechazar (Requiere Justificación)"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-[10px]"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="h-32 flex items-center justify-center text-[11px] text-slate-600 border border-dashed border-slate-800/70 rounded-xl">
                        Sin tareas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de Justificación Obligatoria */}
      <JustificationModal
        isOpen={justificationModal.isOpen}
        targetStatus={justificationModal.targetStatus}
        taskTitle={justificationModal.taskTitle}
        onConfirm={async (justification) => {
          if (justificationModal.taskId && justificationModal.targetStatus) {
            await executeStatusChange(
              justificationModal.taskId,
              justificationModal.targetStatus,
              justification,
            );
          }
        }}
        onCancel={() => {
          setJustificationModal({
            isOpen: false,
            taskId: null,
            targetStatus: null,
            taskTitle: '',
          });
        }}
      />
    </div>
  );
};
