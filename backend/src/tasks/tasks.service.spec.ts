import { TasksService } from './tasks.service';
import { TaskType } from './schemas/task.schema';

describe('TasksService - Recurrence Engine', () => {
  let service: TasksService;

  beforeEach(() => {
    // Instanciar con mocks mínimos para probar métodos puros de recurrencia
    const mockTaskModel: any = {};
    const mockUserModel: any = {};
    const mockWhatsappService: any = { sendMessage: jest.fn() };
    const mockPushService: any = { sendNotification: jest.fn() };

    service = new TasksService(
      mockTaskModel,
      mockUserModel,
      mockWhatsappService,
      mockPushService,
    );
  });

  describe('isDateMatchingRecurrence', () => {
    const startDate = '2026-11-21'; // Sábado 21 de Noviembre 2026

    it('debe rechazar fechas anteriores o iguales a la fecha de inicio', () => {
      expect(service.isDateMatchingRecurrence(TaskType.DIARIO, startDate, '2026-11-20')).toBe(false);
      expect(service.isDateMatchingRecurrence(TaskType.DIARIO, startDate, '2026-11-21')).toBe(false);
    });

    it('DIARIO: debe coincidir todos los días posteriores', () => {
      expect(service.isDateMatchingRecurrence(TaskType.DIARIO, startDate, '2026-11-22')).toBe(true);
      expect(service.isDateMatchingRecurrence(TaskType.DIARIO, startDate, '2026-11-23')).toBe(true);
      expect(service.isDateMatchingRecurrence(TaskType.DIARIO, startDate, '2026-12-01')).toBe(true);
    });

    it('SEMANAL: debe coincidir cada 7 días exactos (mismo día de la semana)', () => {
      expect(service.isDateMatchingRecurrence(TaskType.SEMANAL, startDate, '2026-11-28')).toBe(true); // +7 días
      expect(service.isDateMatchingRecurrence(TaskType.SEMANAL, startDate, '2026-12-05')).toBe(true); // +14 días
      expect(service.isDateMatchingRecurrence(TaskType.SEMANAL, startDate, '2026-12-12')).toBe(true); // +21 días
      expect(service.isDateMatchingRecurrence(TaskType.SEMANAL, startDate, '2026-11-29')).toBe(false); // +8 días
    });

    it('QUINCENAL: debe coincidir cada 15 días exactos', () => {
      expect(service.isDateMatchingRecurrence(TaskType.QUINCENAL, startDate, '2026-12-06')).toBe(true); // +15 días
      expect(service.isDateMatchingRecurrence(TaskType.QUINCENAL, startDate, '2026-12-21')).toBe(true); // +30 días
      expect(service.isDateMatchingRecurrence(TaskType.QUINCENAL, startDate, '2026-12-05')).toBe(false); // +14 días
      expect(service.isDateMatchingRecurrence(TaskType.QUINCENAL, startDate, '2026-12-07')).toBe(false); // +16 días
    });

    it('MENSUAL: debe coincidir el mismo día de cada mes', () => {
      expect(service.isDateMatchingRecurrence(TaskType.MENSUAL, startDate, '2026-12-21')).toBe(true);
      expect(service.isDateMatchingRecurrence(TaskType.MENSUAL, startDate, '2027-01-21')).toBe(true);
      expect(service.isDateMatchingRecurrence(TaskType.MENSUAL, startDate, '2026-12-22')).toBe(false);
    });

    it('COMUN: nunca debe generar recurrencia automática', () => {
      expect(service.isDateMatchingRecurrence(TaskType.COMUN, startDate, '2026-11-22')).toBe(false);
      expect(service.isDateMatchingRecurrence(TaskType.COMUN, startDate, '2026-11-28')).toBe(false);
    });
  });

  describe('Cálculo de fechas auxiliares', () => {
    it('getDaysDiff debe calcular la diferencia exacta en días', () => {
      expect(service.getDaysDiff('2026-11-21', '2026-11-28')).toBe(7);
      expect(service.getDaysDiff('2026-11-21', '2026-12-06')).toBe(15);
      expect(service.getDaysDiff('2026-11-28', '2026-11-21')).toBe(-7);
    });

    it('addDaysToDateString debe proyectar la fecha en formato YYYY-MM-DD', () => {
      expect(service.addDaysToDateString('2026-11-21', 7)).toBe('2026-11-28');
      expect(service.addDaysToDateString('2026-11-21', 15)).toBe('2026-12-06');
    });
  });
});
