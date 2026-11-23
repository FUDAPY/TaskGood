import React, { useState, useEffect } from 'react';
import { WhatsAppStatus } from '../types';
import { apiFetch } from '../services/api';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  PowerOff,
  Radio,
  ExternalLink,
} from 'lucide-react';

export const WhatsappView: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<WhatsAppStatus>({
    isConnected: false,
    isConnecting: false,
    pairingCode: null,
    phoneNumber: null,
    lastError: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Carga inicial y polling de respaldo
  const fetchStatus = async () => {
    try {
      const res = await apiFetch<WhatsAppStatus>('/whatsapp/status');
      setStatus(res);
      if (res.phoneNumber && !phoneNumber) {
        setPhoneNumber(res.phoneNumber);
      }
    } catch (err: any) {
      console.warn('Error al consultar estado de WhatsApp:', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Conexión Socket con fallback a polling
    const socket: Socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    });

    socket.on('whatsapp:status', (newStatus: WhatsAppStatus) => {
      setStatus(newStatus);
    });

    socket.on('whatsapp:pairing_code', (data: { pairingCode: string }) => {
      setStatus((prev) => ({ ...prev, pairingCode: data.pairingCode, isConnecting: false }));
    });

    // Polling de respaldo cada 3 segundos si está en proceso de conexión
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleStartPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.trim().length < 8) {
      setFeedback('Ingrese un número de teléfono válido con código de país (ej. +595981234567).');
      return;
    }

    try {
      setIsLoading(true);
      setFeedback(null);
      setStatus((prev) => ({
        ...prev,
        isConnecting: true,
        pairingCode: null,
        qrCode: null,
        lastError: null,
      }));
      await apiFetch('/whatsapp/pair', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      setFeedback('Solicitud procesada por el servidor. Generando código de 8 dígitos y código QR...');
      await fetchStatus();
    } catch (err: any) {
      setFeedback(err?.message || 'Error al iniciar emparejamiento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        '¿Está seguro de que desea DESVINCULAR WhatsApp? Esto cerrará la sesión de WhatsApp en el servidor y requerirá vincular el teléfono nuevamente con código QR o Pairing Code.',
      )
    )
      return;
    try {
      setIsLoading(true);
      await apiFetch('/whatsapp/disconnect', { method: 'POST' });
      await fetchStatus();
      setFeedback('WhatsApp ha sido desvinculado exitosamente.');
    } catch (err: any) {
      setFeedback(err?.message || 'Error al desvincular.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Cabecera */}
      <div className="mb-6">
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
          Canal de Notificaciones &bull; Administrador
        </span>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
          <MessageSquare className="w-7 h-7 text-emerald-400" />
          <span>Integración de WhatsApp (Pairing Code)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Vincule el WhatsApp emisor sin necesidad de escanear código QR mediante el protocolo oficial de código de 8 dígitos.
        </p>
      </div>

      {feedback && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {status.lastError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{status.lastError}</span>
        </div>
      )}

      {/* Tarjeta de Estado del Servicio */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border ${
                status.isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : status.isConnecting
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                Estado del Bot Emisor
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">
                  {status.isConnected
                    ? 'Conectado y Operativo'
                    : status.isConnecting
                    ? 'Iniciando / Esperando Vinculación'
                    : 'Desconectado'}
                </span>
                {status.isConnected && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Online
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refrescar estado"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {status.isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-bold transition-colors"
                title="Desvincular WhatsApp"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Desvincular WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        {/* Sección de Generación de Pairing Code */}
        {!status.isConnected && (
          <div className="pt-6">
            <form onSubmit={handleStartPairing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Número de Teléfono Emisor (con código de país)</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ej: +595981234567"
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || status.isConnecting}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {status.isConnecting ? (
                      <span>Generando Código...</span>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        <span>Solicitar Pairing Code</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-1.5 block">
                  Asegúrese de incluir el código internacional sin espacios ni guiones (ej. +595 para Paraguay, +54 para Argentina, etc.).
                </span>
              </div>
            </form>

            {/* Visualización del Código de 8 Dígitos y Código QR */}
            {(status.pairingCode || status.qrCode) && (
              <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-emerald-500/40 shadow-2xl text-center animate-fade-in space-y-6">
                {status.pairingCode && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-2">
                      Opción 1: Código de Emparejamiento (Pairing Code)
                    </span>
                    <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                      Abra WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo &gt;{' '}
                      <span className="text-slate-200 font-semibold">Vincular con el número de teléfono</span>:
                    </p>

                    <div className="inline-flex items-center justify-center gap-4 bg-slate-950 px-8 py-5 rounded-2xl border border-emerald-500/50 shadow-inner mb-4">
                      <span className="text-3xl sm:text-5xl font-black font-mono tracking-widest text-emerald-400 select-all">
                        {status.pairingCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(status.pairingCode || '')}
                        className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors border border-slate-800"
                        title="Copiar código"
                      >
                        {copied ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                )}

                {status.qrCode && (
                  <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 block mb-2">
                      Opción 2: Escaneo de Código QR
                    </span>
                    <p className="text-xs text-slate-400 mb-3">
                      O si lo prefiere, apunte la cámara de WhatsApp al siguiente código:
                    </p>
                    <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
                      <img src={status.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Esperando confirmación en su teléfono móvil...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Información Técnica para Producción */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/70">
            <span className="text-slate-300 font-bold block mb-1">Recordatorio Automático Diario</span>
            <p className="leading-relaxed text-[11px]">
              El backend ejecuta un Cron Job diario a las 08:00 AM para notificar por WhatsApp las tareas permanentes con 24 horas de antelación.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/70">
            <span className="text-slate-300 font-bold block mb-1">Despliegue Dokploy &amp; Puppeteer</span>
            <p className="leading-relaxed text-[11px]">
              Configurado con los parámetros Chromium <code className="text-emerald-400">--no-sandbox</code> y sesión persistente en volumen para evitar desconexiones al reiniciar el contenedor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
