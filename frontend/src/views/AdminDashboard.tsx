import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskType, User } from '../types';
import { apiFetch } from '../services/api';
import {
  BarChart3,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  Users,
  Repeat,
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trash2,
} from 'lucide-react';

const renderTaskTypeBadge = (type: TaskType | string) => {
  switch (type) {
    case TaskType.DIARIO:
    case 'diario':
      return (
        <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1">
          <Repeat className="w-2.5 h-2.5" />
          Diario
        </span>
      );
    case TaskType.SEMANAL:
    case 'semanal':
    case TaskType.PERMANENTE:
    case 'permanente':
      return (
        <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1">
          <Repeat className="w-2.5 h-2.5" />
          Semanal
        </span>
      );
    case TaskType.QUINCENAL:
    case 'quincenal':
      return (
        <span className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1">
          <Repeat className="w-2.5 h-2.5" />
          Quincenal
        </span>
      );
    case TaskType.MENSUAL:
    case 'mensual':
      return (
        <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1">
          <Repeat className="w-2.5 h-2.5" />
          Mensual
        </span>
      );
    default:
      return <span className="text-slate-400 text-[10px]">Común</span>;
  }
};

interface StatsData {
  overview: {
    total: number;
    pendientes: number;
    enProceso: number;
    finalizadas: number;
    rechazadas: number;
  };
  ranking: Array<{
    id: string;
    name: string;
    email: string;
    role?: string;
    totalTasks: number;
    pendientes: number;
    enProceso: number;
    finalizadas: number;
    rechazadas: number;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [funcionarios, setFuncionarios] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>('');

  // Vista activa: 'calendar' o 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Mes de navegación para calendario
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal para detalle e historial de tarea
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (selectedStatus) queryParams.append('status', selectedStatus);
      if (selectedFuncionario) queryParams.append('funcionarioId', selectedFuncionario);

      const [tasksRes, statsRes, funcRes] = await Promise.all([
        apiFetch<Task[]>(`/tasks/admin/all?${queryParams.toString()}`),
        apiFetch<StatsData>('/tasks/admin/stats'),
        apiFetch<User[]>('/users/funcionarios'),
      ]);

      setTasks(tasksRes);
      setStats(statsRes);
      setFuncionarios(funcRes);
    } catch (err: any) {
      console.error('Error cargando panel de administración:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (
      !confirm(
        '¿Confirma que desea eliminar esta tarea? Si es una tarea recurrente raíz, se cancelarán también sus ocurrencias futuras pendientes.',
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la tarea');
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedStatus, selectedFuncionario]);

  // Generador de días del mes para el calendario
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 es domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ day: number | null; dateString: string }> = [];

    // Relleno previo
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateString: '' });
    }

    // Días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days.push({
        day: d,
        dateString: `${year}-${monthStr}-${dayStr}`,
      });
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Título de Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Visión Panorámica &bull; Administrador
          </span>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Panel de Control y Métricas
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Cuadrícula Mensual
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Vista en Lista
          </button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas Globales */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">Total Tareas</span>
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-slate-100 font-mono">
              {stats.overview.total}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">Pendientes</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black text-amber-400 font-mono">
              {stats.overview.pendientes}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">En Proceso</span>
              <PlayCircle className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-2xl font-black text-blue-400 font-mono">
              {stats.overview.enProceso}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">Finalizadas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {stats.overview.finalizadas}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">Rechazadas</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-2xl font-black text-rose-400 font-mono">
              {stats.overview.rechazadas}
            </span>
          </div>
        </div>
      )}

      {/* Ranking de Carga Laboral (Equipo Completo: Funcionarios y Administradores) */}
      {stats && stats.ranking.length > 0 && (
        <div className="mb-8 p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Ranking de Carga Laboral (Equipo Completo)
              </h2>
            </div>
            <span className="text-xs text-slate-400">Total miembros: {stats.ranking.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.ranking.map((func, index) => (
              <div
                key={func.id}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 block">
                        {func.name}
                      </span>
                      {func.role && (
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            func.role === 'admin'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {func.role}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {func.email}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {func.totalTasks}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {func.finalizadas} finalizadas
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros Avanzados */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase mr-2">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          <span>Filtros:</span>
        </div>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Desde"
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="Hasta"
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
        />

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos los Estados</option>
          <option value={TaskStatus.PENDIENTE}>Pendiente</option>
          <option value={TaskStatus.EN_PROCESO}>En Proceso</option>
          <option value={TaskStatus.FINALIZADO}>Finalizado</option>
          <option value={TaskStatus.RECHAZADO}>Rechazado</option>
        </select>

        <select
          value={selectedFuncionario}
          onChange={(e) => setSelectedFuncionario(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos los Usuarios (Admin / Funcionario)</option>
          {funcionarios.map((f) => {
            const uid = f._id || f.id || '';
            return (
              <option key={uid} value={uid}>
                {f.name} ({f.role.toUpperCase()})
              </option>
            );
          })}
        </select>

        {(startDate || endDate || selectedStatus || selectedFuncionario) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSelectedStatus('');
              setSelectedFuncionario('');
            }}
            className="text-xs text-rose-400 hover:underline font-semibold ml-auto"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Vista de Cuadrícula Mensual (Calendario en Desktop) */}
      {viewMode === 'calendar' ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          {/* Cabecera del Mes */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              <span>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/30 text-center text-[11px] font-bold text-slate-400 py-2.5">
            <span>DOM</span>
            <span>LUN</span>
            <span>MAR</span>
            <span>MIÉ</span>
            <span>JUE</span>
            <span>VIE</span>
            <span>SÁB</span>
          </div>

          {/* Celdas del Mes */}
          <div className="grid grid-cols-7 auto-rows-fr gap-px bg-slate-800">
            {getMonthDays().map((item, idx) => {
              const dayTasks = item.dateString
                ? tasks.filter((t) => t.assignedDate === item.dateString)
                : [];
              return (
                <div
                  key={idx}
                  className={`bg-slate-900 min-h-[110px] p-2 flex flex-col ${
                    item.day === null ? 'opacity-30 pointer-events-none' : ''
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-slate-400 mb-1.5">
                    {item.day}
                  </span>
                  <div className="space-y-1 overflow-y-auto flex-1">
                    {dayTasks.map((task) => (
                      <button
                        key={task._id}
                        onClick={() => setSelectedTask(task)}
                        className={`w-full text-left p-1.5 rounded-md text-[10px] font-semibold truncate block transition-all ${
                          task.status === TaskStatus.FINALIZADO
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : task.status === TaskStatus.RECHAZADO
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : task.status === TaskStatus.EN_PROCESO
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span className="truncate">{task.title}</span>
                          {task.type !== TaskType.COMUN && (
                            <Repeat className="w-2.5 h-2.5 shrink-0 opacity-75" />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Vista en Lista */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tarea</th>
                  <th className="py-3 px-4">Funcionario</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((task) => (
                  <tr
                    key={task._id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-300">{task.assignedDate}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">{task.title}</td>
                    <td className="py-3 px-4 text-slate-300">{task.assignedTo?.name || 'N/A'}</td>
                    <td className="py-3 px-4">{renderTaskTypeBadge(task.type)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          task.status === TaskStatus.FINALIZADO
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : task.status === TaskStatus.RECHAZADO
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : task.status === TaskStatus.EN_PROCESO
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold hover:underline">
                      Ver Ficha
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      No se encontraron tareas con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle e Historial Inmutable de la Tarea */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                  Ficha Histórica Inmutable
                </span>
                <h3 className="text-lg font-bold text-slate-100">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div>
                  <span className="text-slate-500 font-semibold mr-2">Funcionario Asignado:</span>
                  <span className="text-slate-200 font-medium">
                    {selectedTask.assignedTo?.name} ({selectedTask.assignedTo?.email})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold mr-2">Fecha Programada:</span>
                  <span className="text-slate-200 font-mono font-medium">{selectedTask.assignedDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold mr-2">Tipo de Tarea:</span>
                  <span className="text-slate-200 capitalize font-medium">
                    {selectedTask.type === TaskType.DIARIO
                      ? 'Diario (Se repite todos los días)'
                      : selectedTask.type === TaskType.SEMANAL || selectedTask.type === TaskType.PERMANENTE
                      ? 'Semanal (Mismo día cada semana)'
                      : selectedTask.type === TaskType.QUINCENAL
                      ? 'Quincenal (Cada 15 días)'
                      : selectedTask.type === TaskType.MENSUAL
                      ? 'Mensual (Mismo día cada mes)'
                      : 'Común (Única vez)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold mr-2">Estado Actual:</span>
                  <span className="text-slate-200 uppercase font-bold">{selectedTask.status}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">Descripción:</span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                  {selectedTask.description || 'Sin descripción ingresada.'}
                </p>
              </div>

              {/* Justificación del funcionario */}
              {selectedTask.justification && (
                <div>
                  <span className="text-emerald-400 font-bold block mb-1">
                     Justificación Registrada:
                  </span>
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 italic leading-relaxed">
                    "{selectedTask.justification}"
                  </div>
                </div>
              )}

              {/* Historial Inmutable de Cambios */}
              <div>
                <span className="text-slate-400 font-bold block mb-2">Trazabilidad de Estados:</span>
                <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-3">
                  {selectedTask.history?.map((h, i) => (
                    <div key={i} className="text-[11px] relative">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 uppercase">{h.status}</span>
                        <span className="text-slate-500 font-mono">
                          {new Date(h.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-400 italic mt-0.5">{h.justification}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleDeleteTask(selectedTask._id)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Eliminar tarea de la base de datos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Tarea</span>
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
