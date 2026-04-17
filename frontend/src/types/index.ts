export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'ACTIVE' | 'COMPLETED';
export type Recurring = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Category {
  id: string;
  name: string;
  color: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  recurring?: Recurring;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ category: Category }>;
}

export interface User {
  id: string;
  email: string;
  username: string;
  totpEnabled: boolean;
  createdAt: string;
}

export interface Stats {
  total: number;
  completed: number;
  active: number;
  completionRate: number;
  byPriority: Array<{ priority: Priority; _count: number }>;
}

export interface PaginatedResponse<T> {
  tasks: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type Theme = 'light' | 'dark' | 'ocean' | 'forest';
