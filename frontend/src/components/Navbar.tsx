import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  MessageSquare,
  PlusCircle,
  LogOut,
  Bell,
  BellRing,
  UserCheck,
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { EditProfileModal } from './EditProfileModal';
import { PushNotificationPrompt } from './PushNotificationPrompt';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Tu navegador no soporta notificaciones push.');
      return;
    }
    const permission = await Notification.requestPermission();
    setPushStatus(permission);

    if (permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
        });
        await apiFetch('/users/push-subscription', {
          method: 'POST',
          body: JSON.stringify(sub),
        });
        alert('¡Notificaciones Push activadas con éxito!');
      } catch (err) {
        console.warn('Error registrando push subscription:', err);
      }
    }
  };

  return (
    <>
      <PushNotificationPrompt />
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Marca y Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="TaskGood"
              className="w-9 h-9 rounded-lg object-contain shadow-md shadow-emerald-950/40"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-1.5">
                Task<span className="text-emerald-400">Good</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase">
                by ZETTI
              </span>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            {user?.role === UserRole.ADMIN ? (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('create-task')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'create-task'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Crear Tarea</span>
                </button>
                <button
                  onClick={() => setActiveTab('my-tasks')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'my-tasks'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Mis Tareas</span>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Usuarios</span>
                </button>
                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'whatsapp'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('my-tasks')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Tareas de Hoy</span>
              </button>
            )}
          </nav>

          {/* Usuario y Acciones */}
          <div className="flex items-center gap-3">
            <button
              onClick={requestNotificationPermission}
              title="Permisos de Notificaciones"
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition-colors"
            >
              {pushStatus === 'granted' ? (
                <BellRing className="w-4 h-4 text-emerald-400" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </button>

            {/* Botón para editar perfil propio */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 p-1.5 px-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
              title="Haga clic para editar su perfil"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-500/20">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors leading-tight">
                  {user?.name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium capitalize">
                  {user?.role} (Editar)
                </span>
              </div>
            </button>

            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navegación Móvil */}
        <div className="flex md:hidden border-t border-slate-800 bg-slate-950 px-2 py-1.5 overflow-x-auto justify-around">
          {user?.role === UserRole.ADMIN ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`p-2 text-xs flex flex-col items-center gap-1 ${
                  activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('create-task')}
                className={`p-2 text-xs flex flex-col items-center gap-1 ${
                  activeTab === 'create-task' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear</span>
              </button>
              <button
                onClick={() => setActiveTab('my-tasks')}
                className={`p-2 text-xs flex flex-col items-center gap-1 ${
                  activeTab === 'my-tasks' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Mis Tareas</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`p-2 text-xs flex flex-col items-center gap-1 ${
                  activeTab === 'users' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Usuarios</span>
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`p-2 text-xs flex flex-col items-center gap-1 ${
                  activeTab === 'whatsapp' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveTab('my-tasks')}
              className="p-2 text-xs flex items-center gap-2 text-emerald-400 font-bold"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Mis Tareas de Hoy</span>
            </button>
          )}
        </div>
      </header>

      {/* Modal para editar mi propio perfil */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
