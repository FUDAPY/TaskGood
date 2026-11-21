import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Task,
  TaskDocument,
  TaskStatus,
  TaskType,
} from './schemas/task.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { PushService } from '../push/push.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private whatsappService: WhatsappService,
    private pushService: PushService,
  ) {}

  // Helper para obtener la fecha de hoy en formato local YYYY-MM-DD
  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper para obtener la fecha de mañana en formato YYYY-MM-DD
  private getTomorrowString(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Sumar días a una cadena de fecha YYYY-MM-DD
  addDaysToDateString(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Diferencia en días enteros UTC entre dos fechas YYYY-MM-DD
  getDaysDiff(date1Str: string, date2Str: string): number {
    const d1 = new Date(date1Str + 'T00:00:00Z');
    const d2 = new Date(date2Str + 'T00:00:00Z');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  // Evalúa si una fecha objetivo coincide con la regla de recurrencia
  isDateMatchingRecurrence(
    type: TaskType,
    startDateStr: string,
    targetDateStr: string,
  ): boolean {
    if (targetDateStr <= startDateStr) {
      return false;
    }

    const diffDays = this.getDaysDiff(startDateStr, targetDateStr);
    if (diffDays <= 0) return false;

    switch (type) {
      case TaskType.DIARIO:
        return true;

      case TaskType.SEMANAL:
      case TaskType.PERMANENTE:
        return diffDays % 7 === 0;

      case TaskType.QUINCENAL:
        return diffDays % 15 === 0;

      case TaskType.MENSUAL: {
        const [, , sD] = startDateStr.split('-').map(Number);
        const [tY, tM, tD] = targetDateStr.split('-').map(Number);
        const daysInTargetMonth = new Date(tY, tM, 0).getDate();
        const effectiveDay = Math.min(sD, daysInTargetMonth);
        return tD === effectiveDay;
      }

      default:
        return false;
    }
  }

  // Genera y materializa automáticamente las ocurrencias de tareas recurrentes en un rango de fechas
  async ensureRecurringTasksForRange(
    startDateStr: string,
    endDateStr: string,
  ): Promise<void> {
    const recurringRoots = await this.taskModel
      .find({
        type: {
          $in: [
            TaskType.DIARIO,
            TaskType.SEMANAL,
            TaskType.QUINCENAL,
            TaskType.MENSUAL,
            TaskType.PERMANENTE,
          ],
        },
        $or: [{ isRecurringRoot: true }, { recurringParentId: null }],
      })
      .exec();

    if (recurringRoots.length === 0) return;

    // Límite de seguridad: máximo 90 días por llamada
    const totalDays = Math.min(Math.max(this.getDaysDiff(startDateStr, endDateStr), 0), 90);

    for (const root of recurringRoots) {
      for (let i = 0; i <= totalDays; i++) {
        const targetDate = this.addDaysToDateString(startDateStr, i);

        if (this.isDateMatchingRecurrence(root.type, root.assignedDate, targetDate)) {
          const exists = await this.taskModel.findOne({
            $or: [
              { recurringParentId: root._id, assignedDate: targetDate },
              {
                title: root.title,
                assignedTo: root.assignedTo,
                assignedDate: targetDate,
              },
            ],
          });

          if (!exists) {
            const newInstance = new this.taskModel({
              title: root.title,
              description: root.description,
              assignedTo: root.assignedTo,
              assignedDate: targetDate,
              type: root.type,
              status: TaskStatus.PENDIENTE,
              recurringParentId: root._id,
              isRecurringRoot: false,
              history: [
                {
                  status: TaskStatus.PENDIENTE,
                  changedAt: new Date(),
                  changedBy: root.assignedTo,
                  justification: `Generación automática de recurrencia (${root.type})`,
                },
              ],
            });
            await newInstance.save();
          }
        }
      }
    }
  }

  async create(createDto: {
    title: string;
    description?: string;
    assignedTo: string;
    assignedDate: string;
    type?: TaskType;
  }): Promise<Task> {
    if (!createDto.title || !createDto.assignedTo || !createDto.assignedDate) {
      throw new BadRequestException('Título, funcionario y fecha de asignación son obligatorios.');
    }

    const funcionario = await this.userModel.findById(createDto.assignedTo);
    if (!funcionario) {
      throw new NotFoundException('Funcionario no encontrado');
    }

    const taskType = createDto.type || TaskType.COMUN;
    const isRecurring = taskType !== TaskType.COMUN;

    const newTask = new this.taskModel({
      title: createDto.title.trim(),
      description: (createDto.description || '').trim(),
      assignedTo: new Types.ObjectId(createDto.assignedTo),
      assignedDate: createDto.assignedDate,
      type: taskType,
      status: TaskStatus.PENDIENTE,
      isRecurringRoot: isRecurring,
      recurringParentId: null,
      history: [
        {
          status: TaskStatus.PENDIENTE,
          changedAt: new Date(),
          changedBy: funcionario._id,
          justification: isRecurring
            ? `Creación inicial de tarea recurrente (${taskType})`
            : 'Creación inicial de la tarea',
        },
      ],
    });

    const saved = await newTask.save();

    // Si es recurrente, pre-materializar ocurrencias iniciales para los próximos 45 días
    if (isRecurring) {
      const futureLimit = this.addDaysToDateString(createDto.assignedDate, 45);
      await this.ensureRecurringTasksForRange(createDto.assignedDate, futureLimit);
    }

    // Disparar Notificación Push
    if (funcionario.pushSubscription) {
      this.pushService
        .sendNotification(funcionario.pushSubscription, {
          title: 'Nueva Tarea Asignada',
          body: `Se te ha asignado: ${saved.title}`,
          url: '/',
        })
        .catch((e) => this.logger.warn('Push error', e));
    }

    // Disparar WhatsApp al funcionario si cuenta con teléfono
    if (funcionario.phone) {
      const typeLabel =
        saved.type === TaskType.DIARIO
          ? ' (Diaria)'
          : saved.type === TaskType.SEMANAL
          ? ' (Semanal)'
          : saved.type === TaskType.QUINCENAL
          ? ' (Quincenal)'
          : saved.type === TaskType.MENSUAL
          ? ' (Mensual)'
          : '';

      const msg = `*TaskGood - Nueva Tarea Asignada${typeLabel}*\n\nHola ${funcionario.name},\nse te ha asignado una nueva tarea para el día *${saved.assignedDate}*:\n📌 *${saved.title}*\n📝 _${saved.description || 'Sin descripción adicional'}_`;
      this.whatsappService
        .sendMessage(funcionario.phone, msg)
        .catch((e) => this.logger.warn('WhatsApp notification error', e));
    }

    return this.findById(saved._id.toString());
  }

  async findById(id: string): Promise<Task> {
    const task = await this.taskModel
      .findById(id)
      .populate('assignedTo', 'name email phone')
      .populate('history.changedBy', 'name email')
      .exec();
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return task;
  }

  // Visión efímera del Funcionario: Solo tareas asignadas a sí mismo para HOY
  async findTodayTasksForUser(userId: string): Promise<Task[]> {
    const today = this.getTodayString();

    // Asegurar que las tareas recurrentes de hoy estén materializadas
    await this.ensureRecurringTasksForRange(today, today);

    return this.taskModel
      .find({
        assignedTo: new Types.ObjectId(userId),
        assignedDate: today,
      })
      .populate('assignedTo', 'name email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Visión panorámica e histórica del Administrador con filtros
  async findAllAdmin(filters: {
    startDate?: string;
    endDate?: string;
    status?: TaskStatus;
    funcionarioId?: string;
  }): Promise<Task[]> {
    const today = this.getTodayString();
    const rangeStart = filters.startDate || this.addDaysToDateString(today, -15);
    const rangeEnd = filters.endDate || this.addDaysToDateString(today, 45);

    // Garantizar que las ocurrencias recurrentes dentro del rango visualizado existan
    await this.ensureRecurringTasksForRange(rangeStart, rangeEnd);

    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.funcionarioId) {
      query.assignedTo = new Types.ObjectId(filters.funcionarioId);
    }
    if (filters.startDate || filters.endDate) {
      query.assignedDate = {};
      if (filters.startDate) query.assignedDate.$gte = filters.startDate;
      if (filters.endDate) query.assignedDate.$lte = filters.endDate;
    }

    return this.taskModel
      .find(query)
      .populate('assignedTo', 'name email phone')
      .populate('history.changedBy', 'name email')
      .sort({ assignedDate: -1, createdAt: -1 })
      .exec();
  }

  // Transición de estado con Justificación Obligatoria para Finalizado / Rechazado
  async updateStatus(
    taskId: string,
    currentUser: UserDocument,
    newStatus: TaskStatus,
    justification?: string,
  ): Promise<Task> {
    const task = await this.taskModel.findById(taskId);
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    if (
      currentUser.role === UserRole.FUNCIONARIO &&
      task.assignedTo.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('No tienes autorización para modificar esta tarea.');
    }

    if (
      (newStatus === TaskStatus.FINALIZADO || newStatus === TaskStatus.RECHAZADO) &&
      (!justification || justification.trim().length < 5)
    ) {
      throw new BadRequestException(
        `Para marcar la tarea como "${newStatus}" es obligatorio ingresar una justificación detallada (mínimo 5 caracteres).`,
      );
    }

    task.status = newStatus;
    if (justification) {
      task.justification = justification.trim();
    }

    task.history.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: currentUser._id,
      justification: justification ? justification.trim() : `Cambio a ${newStatus}`,
    });

    await task.save();
    return this.findById(taskId);
  }

  // Eliminar tarea (si es raíz recurrente, purga ocurrencias pendientes futuras)
  async deleteTask(taskId: string): Promise<{ success: boolean; message: string }> {
    const task = await this.taskModel.findById(taskId);
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const today = this.getTodayString();

    if (task.isRecurringRoot) {
      await this.taskModel.deleteMany({
        recurringParentId: task._id,
        status: TaskStatus.PENDIENTE,
        assignedDate: { $gte: today },
      });
    }

    await this.taskModel.findByIdAndDelete(taskId);
    return { success: true, message: 'Tarea eliminada exitosamente.' };
  }

  // Estadísticas y Ranking de Carga Laboral para el Admin
  async getAdminStats() {
    const allTasks = await this.taskModel.find().exec();
    const total = allTasks.length;
    const pendientes = allTasks.filter((t) => t.status === TaskStatus.PENDIENTE).length;
    const enProceso = allTasks.filter((t) => t.status === TaskStatus.EN_PROCESO).length;
    const finalizadas = allTasks.filter((t) => t.status === TaskStatus.FINALIZADO).length;
    const rechazadas = allTasks.filter((t) => t.status === TaskStatus.RECHAZADO).length;

    const allUsers = await this.userModel.find().exec();
    const ranking = allUsers.map((u) => {
      const uTasks = allTasks.filter((t) => t.assignedTo.toString() === u._id.toString());
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        totalTasks: uTasks.length,
        pendientes: uTasks.filter((t) => t.status === TaskStatus.PENDIENTE).length,
        enProceso: uTasks.filter((t) => t.status === TaskStatus.EN_PROCESO).length,
        finalizadas: uTasks.filter((t) => t.status === TaskStatus.FINALIZADO).length,
        rechazadas: uTasks.filter((t) => t.status === TaskStatus.RECHAZADO).length,
      };
    });

    ranking.sort((a, b) => b.totalTasks - a.totalTasks);

    return {
      overview: {
        total,
        pendientes,
        enProceso,
        finalizadas,
        rechazadas,
      },
      ranking,
    };
  }

  // Cron Job de medianoche: materializa tareas recurrentes para los próximos 7 días
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMidnightRecurrenceSync() {
    const today = this.getTodayString();
    const nextWeek = this.addDaysToDateString(today, 7);
    this.logger.log(`Sincronizando tareas recurrentes desde ${today} hasta ${nextWeek}...`);
    await this.ensureRecurringTasksForRange(today, nextWeek);
  }

  // Cron Job Diario: Recordatorio de tareas programadas para mañana (24hs de antelación)
  // Se ejecuta todos los días a las 08:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyPermanentTaskReminders() {
    this.logger.log('Ejecutando Cron Job: Recordatorio de tareas para mañana...');
    const today = this.getTodayString();
    const tomorrow = this.getTomorrowString();

    await this.ensureRecurringTasksForRange(today, tomorrow);

    const recurringTypes = [
      TaskType.PERMANENTE,
      TaskType.DIARIO,
      TaskType.SEMANAL,
      TaskType.QUINCENAL,
      TaskType.MENSUAL,
    ];

    const tasksTomorrow = await this.taskModel
      .find({
        type: { $in: recurringTypes },
        assignedDate: tomorrow,
      })
      .populate('assignedTo')
      .exec();

    for (const task of tasksTomorrow) {
      const user = task.assignedTo as any;
      if (user && user.phone) {
        const typeLabel =
          task.type === TaskType.DIARIO
            ? 'Diaria'
            : task.type === TaskType.QUINCENAL
            ? 'Quincenal'
            : task.type === TaskType.MENSUAL
            ? 'Mensual'
            : 'Semanal';

        const message = `*Recordatorio TaskGood (${typeLabel})*\n\nTe recordamos que tienes esta tarea programada para mañana:\n📌 *${task.title}*\n📝 ${task.description || 'Sin descripción'}`;
        await this.whatsappService.sendMessage(user.phone, message);
      }
    }
  }
}
