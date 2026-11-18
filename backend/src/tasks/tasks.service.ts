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

    const newTask = new this.taskModel({
      title: createDto.title.trim(),
      description: (createDto.description || '').trim(),
      assignedTo: new Types.ObjectId(createDto.assignedTo),
      assignedDate: createDto.assignedDate,
      type: createDto.type || TaskType.COMUN,
      status: TaskStatus.PENDIENTE,
      history: [
        {
          status: TaskStatus.PENDIENTE,
          changedAt: new Date(),
          changedBy: funcionario._id,
          justification: 'Creación inicial de la tarea',
        },
      ],
    });

    const saved = await newTask.save();

    // Disparar Notificación Push
    if (funcionario.pushSubscription) {
      this.pushService.sendNotification(funcionario.pushSubscription, {
        title: 'Nueva Tarea Asignada',
        body: `Se te ha asignado: ${saved.title}`,
        url: '/',
      }).catch((e) => this.logger.warn('Push error', e));
    }

    // Disparar WhatsApp al funcionario si cuenta con teléfono
    if (funcionario.phone) {
      const msg = `*TaskGood - Nueva Tarea Asignada*\n\nHola ${funcionario.name},\nse te ha asignado una nueva tarea para el día *${saved.assignedDate}*:\n📌 *${saved.title}*\n📝 _${saved.description || 'Sin descripción adicional'}_`;
      this.whatsappService.sendMessage(funcionario.phone, msg).catch((e) =>
        this.logger.warn('WhatsApp notification error', e),
      );
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

    // Si el usuario es funcionario, solo puede modificar sus propias tareas
    if (
      currentUser.role === UserRole.FUNCIONARIO &&
      task.assignedTo.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('No tienes autorización para modificar esta tarea.');
    }

    // Regla de Negocio Crítica: Si pasa a Finalizado o Rechazado, la justificación es obligatoria
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

    // Historial inmutable
    task.history.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: currentUser._id,
      justification: justification ? justification.trim() : `Cambio a ${newStatus}`,
    });

    await task.save();
    return this.findById(taskId);
  }

  // Estadísticas y Ranking de Carga Laboral para el Admin
  async getAdminStats() {
    const allTasks = await this.taskModel.find().exec();
    const total = allTasks.length;
    const pendientes = allTasks.filter((t) => t.status === TaskStatus.PENDIENTE).length;
    const enProceso = allTasks.filter((t) => t.status === TaskStatus.EN_PROCESO).length;
    const finalizadas = allTasks.filter((t) => t.status === TaskStatus.FINALIZADO).length;
    const rechazadas = allTasks.filter((t) => t.status === TaskStatus.RECHAZADO).length;

    // Ranking de carga laboral (incluye Funcionarios y Administradores)
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

  // Cron Job Diario: Busca tareas permanentes que deban ejecutarse mañana (24hs de antelación)
  // Se ejecuta todos los días a las 08:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyPermanentTaskReminders() {
    this.logger.log('Ejecutando Cron Job: Recordatorio de tareas permanentes para mañana...');
    const tomorrow = this.getTomorrowString();

    const tasksTomorrow = await this.taskModel
      .find({
        type: TaskType.PERMANENTE,
        assignedDate: tomorrow,
      })
      .populate('assignedTo')
      .exec();

    for (const task of tasksTomorrow) {
      const user = task.assignedTo as any;
      if (user && user.phone) {
        const message = `*Recordatorio TaskGood*\n\nTe hacemos recordar que tienes esta tarea para mañana:\n📌 *${task.title}*\n📝 ${task.description || 'Sin descripción'}`;
        await this.whatsappService.sendMessage(user.phone, message);
      }
    }
  }
}
