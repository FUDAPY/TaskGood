import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { TaskStatus, TaskType } from './schemas/task.schema';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      assignedTo: string;
      assignedDate: string;
      type?: TaskType;
    },
  ) {
    return this.tasksService.create(body);
  }

  // Vista efímera del Funcionario: Solo tareas de HOY
  @Get('today')
  async getTodayTasks(@Request() req: any) {
    return this.tasksService.findTodayTasksForUser(req.user._id);
  }

  // Vista panorámica e histórica del Admin
  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async getAllAdmin(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: TaskStatus,
    @Query('funcionarioId') funcionarioId?: string,
  ) {
    return this.tasksService.findAllAdmin({
      startDate,
      endDate,
      status,
      funcionarioId,
    });
  }

  // Métricas y ranking de funcionarios para el Admin
  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  async getAdminStats() {
    return this.tasksService.getAdminStats();
  }

  // Cambio de estado (Finalizado / Rechazado requiere justificación obligatoria)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { status: TaskStatus; justification?: string },
  ) {
    return this.tasksService.updateStatus(id, req.user, body.status, body.justification);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }
}
