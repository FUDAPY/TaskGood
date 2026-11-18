import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, MoreVertical, Share } from 'lucide-react';

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Verificar si ya está corriendo como PWA independiente
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 2. Detectar plataforma móvil
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Verificar si el evento fue capturado anticipadamente en index.html
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
      setIsInstallable(true);
    }

    // 4. Listeners para eventos de instalación
    const handleReady = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
        setIsInstallable(true);
      }
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    };

    const handleCustomTrigger = () => {
      handleInstallClick();
    };

    window.addEventListener('pwa-ready-to-install', handleReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-trigger-install', handleCustomTrigger);

    return () => {
      window.removeEventListener('pwa-ready-to-install', handleReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-trigger-install', handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    // Si es iOS Safari
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // Si tenemos el prompt nativo de Chromium / Android
    const activePrompt = deferredPrompt || (window as any).deferredPwaPrompt;
    if (activePrompt) {
      try {
        activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalled(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredPwaPrompt = null;
        setIsInstallable(false);
      } catch (err) {
        console.warn('Error al procesar instalación nativa PWA:', err);
      }
      return;
    }

    // Si estamos en Android / navegador móvil y no se disparó el prompt automático
    if (isAndroid || /mobile/.test(window.navigator.userAgent.toLowerCase())) {
      setShowAndroidGuide(true);
      return;
    }

    // Navegadores de escritorio sin prompt disponible
    setShowAndroidGuide(true);
  };

  if (installed || dismissed) return null;

  // Mostrar si es instalable, si es iOS, o si es Android/Móvil
  const shouldShow = isInstallable || isIOS || isAndroid;
  if (!shouldShow) return null;

  return (
    <>
      {/* Banner / Botón flotante de Instalación */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-40 max-w-sm ml-auto animate-fade-in">
        <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl shadow-emerald-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/50 flex-shrink-0">
              <Download className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                Instalar TaskGood
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  App Web
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                Acceso rápido desde tu pantalla de inicio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all"
            >
              Instalar
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar sugerencia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guía para Android / Otros Navegadores */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Instalar en Android / Chrome
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Sigue estos 2 sencillos pasos para agregar TaskGood a tus aplicaciones:
            </p>
            <div className="space-y-3 mb-5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="p-1 rounded-lg bg-slate-800 text-slate-300 flex-shrink-0 mt-0.5">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">1. Abre el menú</strong>
                  Toca los <strong>tres puntos ⋮</strong> en la esquina superior derecha del navegador.
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">2. Selecciona Instalar</strong>
                  Elige <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Guía para iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Instalar en iPhone / iPad
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              En Safari para iOS, instala la app en dos toques:
            </p>
            <div className="space-y-3 mb-5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="p-1 rounded-lg bg-slate-800 text-slate-300 flex-shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">1. Pulsa Compartir</strong>
                  Toca el botón <strong>Compartir</strong> (cuadrado con flecha ⎋) en la barra inferior de Safari.
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">2. Añadir a Inicio</strong>
                  Desliza hacia abajo y pulsa <strong>"Añadir a la pantalla de inicio"</strong>.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
