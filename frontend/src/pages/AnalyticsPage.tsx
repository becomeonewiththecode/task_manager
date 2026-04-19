import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { usersService } from '@/services/users.service';
import type { AnalyticsData } from '@/types';

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#6366f1',
  COMPLETED: '#22c55e',
};

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function getCount(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) return val._all ?? 0;
  return 0;
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    setLoading(true);
    usersService.getAnalytics({ from, to })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h2>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mr-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mr-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Loading…</div>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Tasks" value={data.total} color="text-gray-900 dark:text-gray-100" />
            <StatCard label="Completion Rate" value={`${data.completionRate}%`} color="text-primary-600" />
            <StatCard
              label="Completed (period)"
              value={data.completionTimeSeries.reduce((s, r) => s + r.count, 0)}
              color="text-green-600"
            />
            <StatCard
              label="Avg / Day"
              value={
                data.completionTimeSeries.length > 0
                  ? (data.completionTimeSeries.reduce((s, r) => s + r.count, 0) / data.completionTimeSeries.length).toFixed(1)
                  : '0'
              }
              color="text-blue-600"
            />
          </div>

          {/* Completion over time */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Completions Over Time</h3>
            {data.completionTimeSeries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No completions in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.completionTimeSeries.map((d) => ({ ...d, date: format(new Date(d.date), 'MMM d') }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} name="Completed" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By priority */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Tasks by Priority</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byPriority.map((d) => ({ name: d.priority, count: getCount(d._count) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Tasks">
                    {data.byPriority.map((d, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[d.priority] ?? '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.byStatus.map((d) => ({ name: d.status, value: getCount(d._count) }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                    labelLine={false}
                  >
                    {data.byStatus.map((d, i) => (
                      <Cell key={i} fill={STATUS_COLORS[d.status] ?? '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
