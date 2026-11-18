import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Verificar si ya está corriendo como PWA independiente
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Detectar iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      alert('Para instalar la app, abre el menú de opciones de tu navegador (los tres puntos arriba a la derecha) y selecciona "Instalar aplicación" o "Añadir a pantalla de inicio".');
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.warn('Error durante la instalación PWA:', err);
    }
  };

  if (installed) return null;

  return (
    <>
      {/* Botón flotante o banner de instalación */}
      {(isInstallable || isIOS) && (
        <div className="fixed bottom-4 right-4 z-40 animate-bounce">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-2xl shadow-emerald-950/60 border border-emerald-400/30 transition-all hover:scale-105"
            title="Instalar TaskGood como aplicación en tu dispositivo"
          >
            <Download className="w-4 h-4" />
            <span>Instalar Aplicación</span>
          </button>
        </div>
      )}

      {/* Modal Guía para iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2">Instalar en iPhone / iPad</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              1. En Safari, pulsa el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba ⎋ en la barra inferior).<br /><br />
              2. Desplázate hacia abajo y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
