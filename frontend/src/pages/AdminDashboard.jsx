import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, 
  FileText, 
  Database, 
  Cpu, 
  Trash2, 
  ShieldCheck, 
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  Fingerprint
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logPagesCount, setLogPagesCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  // 1. Fetch Analytics & Users
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users')
      ]);
      setAnalytics(analyticsRes.data.analytics);
      setUsers(usersRes.data.users);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch System Logs
  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await api.get(`/admin/logs?page=${page}&limit=10`);
      setLogs(res.data.logs);
      setLogPagesCount(res.data.totalPages);
      setLogPage(res.data.currentPage);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchLogs(1);
  }, []);

  // Update user role
  const handleToggleRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${nextRole.toUpperCase()}?`)) return;
    try {
      await api.put(`/admin/users/${userId}/role`, { role: nextRole });
      setUsers(users.map(u => u._id === userId ? { ...u, role: nextRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role');
    }
  };

  // Delete user account
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete user account? This will permanently delete all of their uploaded documents, chunks, and metadata.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      fetchAdminData(); // update metrics
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Bytes converter
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-dark-400 font-medium">Aggregating database statistics and logs...</p>
      </div>
    );
  }

  // Setup Charts configurations
  const trendsChartData = {
    labels: analytics?.uploadTrends.map(t => t.month) || [],
    datasets: [
      {
        label: 'Documents Uploaded',
        data: analytics?.uploadTrends.map(t => t.documents) || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#7c3aed'
      }
    ]
  };

  const typesChartData = {
    labels: analytics?.popularTypes.map(t => t.name) || [],
    datasets: [
      {
        data: analytics?.popularTypes.map(t => t.value) || [],
        backgroundColor: ['#6366f1', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#6b7280'],
        borderWidth: 1,
        borderColor: '#1e293b'
      }
    ]
  };

  const categoriesChartData = {
    labels: analytics?.popularCategories.map(c => c.name) || [],
    datasets: [
      {
        label: 'Documents',
        data: analytics?.popularCategories.map(c => c.value) || [],
        backgroundColor: '#8b5cf6',
        borderRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Outfit' } }
      }
    },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.2)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Administration Control Panel</h1>
          <p className="text-dark-400 mt-1">Audit security logs, configure server states, and manage databases.</p>
        </div>
        <button 
          onClick={() => { fetchAdminData(); fetchLogs(1); }}
          className="p-2.5 text-dark-300 hover:text-white bg-dark-800/50 hover:bg-dark-800 border border-dark-700/50 rounded-xl transition-all"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Analytics grid widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs text-dark-400 font-semibold uppercase tracking-wider">Total Users</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{analytics?.totalUsers}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs text-dark-400 font-semibold uppercase tracking-wider">Total Files</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{analytics?.totalDocuments}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs text-dark-400 font-semibold uppercase tracking-wider">Storage Used</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{formatBytes(analytics?.storageUsage)}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-brand-500/20 rounded-xl text-blue-400">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs text-dark-400 font-semibold uppercase tracking-wider">AI API Requests</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{analytics?.totalAIRequests}</span>
          </div>
        </div>
      </div>

      {/* Chart visualization panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-brand-500" />
            <h3 className="font-bold text-white text-sm">Monthly Document Upload Volume</h3>
          </div>
          <div className="h-64">
            <Line data={trendsChartData} options={chartOptions} />
          </div>
        </div>

        {/* Extensions Pie */}
        <div className="glass-panel rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-brand-500" />
            <h3 className="font-bold text-white text-sm">File Extensions Share</h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={typesChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } } }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Users Control Panel */}
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-500" /> User Accounts
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-dark-300">
            <thead className="text-xs text-dark-400 uppercase tracking-wider border-b border-dark-800">
              <tr>
                <th className="pb-3 pt-2 pl-4">User</th>
                <th className="pb-3 pt-2">Email</th>
                <th className="pb-3 pt-2">Role</th>
                <th className="pb-3 pt-2">Created Date</th>
                <th className="pb-3 pt-2 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/40">
              {users.map((item) => (
                <tr key={item._id} className="hover:bg-dark-900/10">
                  <td className="py-3 pl-4 flex items-center gap-3">
                    <img src={item.avatar} className="h-8 w-8 rounded-full border border-dark-700" alt={item.fullName} />
                    <span className="font-bold text-white">{item.fullName}</span>
                  </td>
                  <td className="py-3 font-mono text-xs text-dark-400">{item.email}</td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${item.role === 'admin' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'bg-dark-800 text-dark-400 border-dark-700'}`}>
                      {item.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-dark-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-right pr-4 space-x-2">
                    <button
                      onClick={() => handleToggleRole(item._id, item.role)}
                      className="p-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg border border-brand-500/10"
                    >
                      Toggle Role
                    </button>
                    <button
                      onClick={() => handleDeleteUser(item._id)}
                      className="p-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit logs */}
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-brand-500" /> Security Audit logs
        </h3>

        {logsLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 text-brand-500 animate-spin mx-auto" />
            <p className="text-dark-400 text-xs mt-2">Loading audit logs...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-dark-400">
                <thead className="text-dark-500 uppercase tracking-wider border-b border-dark-800">
                  <tr>
                    <th className="pb-3 pt-2 pl-4">Timestamp</th>
                    <th className="pb-3 pt-2">Action</th>
                    <th className="pb-3 pt-2">Performed By</th>
                    <th className="pb-3 pt-2">Details</th>
                    <th className="pb-3 pt-2 pr-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/40">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-dark-900/10">
                      <td className="py-2.5 pl-4 text-dark-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-2.5">
                        <span className="font-bold text-white">{log.action}</span>
                      </td>
                      <td className="py-2.5 text-brand-400">
                        {log.performedBy ? `${log.performedBy.fullName} (${log.performedBy.role})` : 'System'}
                      </td>
                      <td className="py-2.5 text-dark-300 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-2.5 pr-4 text-dark-500">{log.ipAddress || 'localhost'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-dark-850">
              <span className="text-xs text-dark-500">
                Page {logPage} of {logPagesCount}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={logPage === 1}
                  onClick={() => fetchLogs(logPage - 1)}
                  className="py-1 px-3 bg-dark-800 hover:bg-dark-700 disabled:bg-dark-900 text-white disabled:text-dark-500 border border-dark-700 rounded-lg transition-colors text-xs font-semibold"
                >
                  Previous
                </button>
                <button
                  disabled={logPage === logPagesCount}
                  onClick={() => fetchLogs(logPage + 1)}
                  className="py-1 px-3 bg-dark-800 hover:bg-dark-700 disabled:bg-dark-900 text-white disabled:text-dark-500 border border-dark-700 rounded-lg transition-colors text-xs font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
