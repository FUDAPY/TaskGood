export enum UserRole {
  ADMIN = 'admin',
  FUNCIONARIO = 'funcionario',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isFirstLogin: boolean;
}

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

export interface TaskHistoryItem {
  status: TaskStatus;
  changedAt: string;
  changedBy: {
    _id: string;
    name: string;
    email: string;
  };
  justification: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assignedDate: string;
  type: TaskType;
  status: TaskStatus;
  justification: string;
  history: TaskHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppStatus {
  isConnected: boolean;
  isConnecting: boolean;
  pairingCode: string | null;
  phoneNumber: string | null;
  lastError: string | null;
}
