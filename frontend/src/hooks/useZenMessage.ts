import { useMemo } from 'react';

export const ZEN_MESSAGES: string[] = [
  "Un paso a la vez, el progreso es constante.",
  "La serenidad es la herramienta más afilada del profesional.",
  "Respira profundo. Tu esfuerzo de hoy construye la tranquilidad de mañana.",
  "El trabajo ordenado es el reflejo de una mente clara.",
  "Haz lo que puedas, con lo que tengas, donde estés.",
  "La excelencia no es un acto, sino un hábito tranquilo.",
  "Pequeños avances diarios superan a las grandes prisas.",
  "La calma en la tormenta define al verdadero líder.",
  "El orden externo pacifica el ruido interno.",
  "Cada tarea completada es una victoria silenciosa.",
  "Concéntrate en el presente; el resto fluirá.",
  "La eficiencia nace de la claridad, no de la velocidad.",
  "Un espacio de trabajo limpio, una mente enfocada.",
  "La paciencia y el método resuelven cualquier bloqueo.",
  "Hazlo una vez, hazlo bien y respira.",
  "El caos se rinde ante la planificación.",
  "Tu energía es valiosa; inviértela con sabiduría.",
  "La tranquilidad es la base de las mejores decisiones.",
  "El silencio y el enfoque son tus mejores aliados hoy.",
  "Celebra el orden, disfruta el proceso.",
  "Menos prisa, más precisión.",
  "La verdadera productividad se siente ligera.",
  "Domina tu tiempo, domina tu paz.",
  "Fluye con el trabajo; no luches contra él.",
  "Cada detalle cuidado es un paso hacia la maestría.",
  "La calma multiplica tu capacidad de resolver problemas.",
  "El equilibrio perfecto entre acción y reflexión.",
  "Tu tranquilidad inspira a todo el equipo.",
  "Termina el día sabiendo que diste tu mejor esfuerzo.",
  "Mañana será otro día para brillar con calma.",
];

export const useZenMessage = () => {
  const dailyMessage = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = Math.abs(dayOfYear) % ZEN_MESSAGES.length;
    return ZEN_MESSAGES[index];
  }, []);

  return dailyMessage;
};
