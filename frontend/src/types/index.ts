export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
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
  durationMinutes?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  tags: Array<{ category: Category }>;
  subtasks?: Task[];
  dependencies?: TaskDependency[];
  dependedOnBy?: Array<{ taskId: string }>;
  recurringCompletions?: Array<{ date: string }>;
}

export interface User {
  id: string;
  email: string;
  username: string;
  totpEnabled: boolean;
  isBanned?: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  failedLoginCount?: number;
  lockedUntil?: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { tasks: number; sessions: number; auditLogs: number; timeEntries: number };
}

export interface AdminUser extends User {
  recentActivity?: AuditLogEntry[];
  taskStats?: Array<{ status: TaskStatus; _count: number }>;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MailConfig {
  id: string;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
}

export interface MailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  updatedAt: string;
}

export interface SystemStats {
  users: { total: number; active: number; banned: number };
  tasks: { total: number; active: number; completed: number };
  categories: number;
  templates: number;
  sessions: number;
  recentUsers: Array<{ id: string; email: string; username: string; createdAt: string; _count: { tasks: number } }>;
  recentTasks: Array<{ id: string; title: string; status: TaskStatus; createdAt: string; user: { email: string } }>;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    database: { status: string; responseTime: number };
    redis: { status: string; responseTime: number };
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  systemMemory?: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
  };
  nodeVersion?: string;
  platform?: string;
  arch?: string;
}

export interface ServiceInfo {
  id: string;
  name: string;
  containerName: string;
  state: string;
  status: string;
  image: string;
  createdAt: string;
}

export interface ContainerStats {
  serviceName: string;
  containerName: string;
  containerId: string;
  state: string;
  status: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
}

export interface RestartRecord {
  id: string;
  serviceName: string;
  triggeredBy: string;
  reason: string | null;
  createdAt: string;
  user: { id: string; email: string; username: string };
}

export interface AppMonitoring {
  health: HealthStatus;
  containers: ContainerStats[];
  restartCounts: Record<string, number>;
  diskUsage: { total: number; used: number; available: number; percent: number };
  cpuLoad: [number, number, number];
}

export interface UserSession {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'scheduled';
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  logs: (AuditLogEntry & { user: { id: string; email: string; username: string } })[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByAction: Array<{ action: string; count: number }>;
  logsByEntity: Array<{ entity: string; count: number }>;
  dailyCounts: Array<{ date: string; count: number }>;
}

export interface SystemSettings {
  backupRetentionDays: string;
  logRetentionDays: string;
  maintenanceWindowEnabled: string;
  maintenanceWindowStart: string;
  maintenanceWindowEnd: string;
  maintenanceMessage: string;
  [key: string]: string;
}

export interface RestartHistory {
  logs: RestartRecord[];
  total: number;
  page: number;
  totalPages: number;
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
