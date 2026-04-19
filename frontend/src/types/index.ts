export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'ACTIVE' | 'COMPLETED';
export type Recurring = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Category {
  id: string;
  name: string;
  color: string;
  _count?: { tasks: number };
}

export interface TaskDependency {
  taskId?: string;
  dependsOnId: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId?: string;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface TaskShare {
  id: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
  taskId?: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  priority: Priority;
  recurring: Recurring | null;
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AnalyticsData {
  completionTimeSeries: Array<{ date: string; count: number }>;
  byPriority: Array<{ priority: Priority; _count: { _all: number } | number }>;
  byStatus: Array<{ status: TaskStatus; _count: { _all: number } | number }>;
  completionRate: number;
  total: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  recurring?: Recurring;
  location?: string;
  webLink?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  tags: Array<{ category: Category }>;
  subtasks?: Task[];
  dependencies?: TaskDependency[];
  dependedOnBy?: Array<{ taskId: string }>;
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

export interface ShortcutConfig {
  newTask: string;
  focusSearch: string;
  toggleSidebar: string;
  openCalendar: string;
  openAnalytics: string;
}
