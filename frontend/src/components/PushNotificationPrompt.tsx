import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { apiFetch } from '../services/api';

export const PushNotificationPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    // Verificar si el navegador soporta notificaciones y si aún no se ha otorgado permiso
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      const dismissed = localStorage.getItem('taskgood_push_dismissed');
      if (Notification.permission === 'default' && !dismissed) {
        setShowPrompt(true);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Tu navegador no admite notificaciones push.');
      return;
    }

    try {
      setIsSubscribing(true);
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
          });

          await apiFetch('/users/push-subscription', {
            method: 'POST',
            body: JSON.stringify(subscription),
          });

          setStatusMsg('¡Notificaciones push activadas exitosamente!');
          setTimeout(() => {
            setShowPrompt(false);
          }, 2500);
        } catch (swErr) {
          console.warn('Error suscribiendo al service worker:', swErr);
          setStatusMsg('Permiso concedido.');
          setTimeout(() => setShowPrompt(false), 2000);
        }
      } else {
        setShowPrompt(false);
      }
    } catch (err) {
      console.warn('Error solicitando permisos:', err);
      setShowPrompt(false);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('taskgood_push_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="w-full bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/80 border-b border-emerald-500/30 px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 text-slate-200">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <span>
            {statusMsg || (
              <>
                <strong className="text-emerald-400">Notificaciones en tiempo real:</strong>{' '}
                Activa las notificaciones web para recibir alertas instantáneas de tareas asignadas.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!statusMsg && (
            <>
              <button
                onClick={handleRequestPermission}
                disabled={isSubscribing}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-950/40"
              >
                {isSubscribing ? 'Activando...' : 'Activar Notificaciones'}
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                title="Descartar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
