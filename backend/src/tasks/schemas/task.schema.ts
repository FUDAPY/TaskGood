import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export enum TaskType {
  COMUN = 'comun',
  PERMANENTE = 'permanente',
}

export enum TaskStatus {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  FINALIZADO = 'finalizado',
  RECHAZADO = 'rechazado',
}

@Schema({ _id: false })
export class TaskHistoryItem {
  @Prop({ required: true, enum: TaskStatus })
  status: TaskStatus;

  @Prop({ default: Date.now })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  changedBy: Types.ObjectId;

  @Prop({ default: '' })
  justification: string;
}

export const TaskHistoryItemSchema = SchemaFactory.createForClass(TaskHistoryItem);

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  assignedTo: Types.ObjectId;

  @Prop({ required: true, index: true })
  assignedDate: string; // Formato YYYY-MM-DD para búsquedas efímeras exactas

  @Prop({ required: true, enum: TaskType, default: TaskType.COMUN })
  type: TaskType;

  @Prop({ required: true, enum: TaskStatus, default: TaskStatus.PENDIENTE, index: true })
  status: TaskStatus;

  @Prop({ default: '' })
  justification: string;

  @Prop({ type: [TaskHistoryItemSchema], default: [] })
  history: TaskHistoryItem[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ assignedTo: 1, assignedDate: 1 });
