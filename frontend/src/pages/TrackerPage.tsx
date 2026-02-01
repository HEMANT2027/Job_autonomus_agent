
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    DocumentTextIcon,
    XMarkIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline'
import api, { TrackerSummary, Application, AuditLog } from '../services/api'
import { useToast } from '../context/ToastContext'

export default function TrackerPage() {
    const [summary, setSummary] = useState<TrackerSummary | null>(null)
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [companyFilter, setCompanyFilter] = useState<string>('')

    // Audit Modal
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [loadingAudit, setLoadingAudit] = useState(false)

    const { showToast } = useToast()

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        loadApplications()
    }, [statusFilter, companyFilter])

    const loadData = async () => {
        try {
            const sumRes = await api.getTrackerSummary()
            setSummary(sumRes.data)
            await loadApplications()
        } catch (err) {
            setError('Failed to load tracker data')
            showToast('Failed to load tracker data', 'error')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const loadApplications = async () => {
        try {
            const filters: any = {}
            if (statusFilter) filters.status = statusFilter
            if (companyFilter) filters.company = companyFilter

            const appsRes = await api.getTrackerApplications(filters)
            setApplications(appsRes.data)
        } catch (err) {
            console.error('Failed to load applications', err)
            showToast('Failed to load applications', 'error')
        }
    }

    const handleRetry = async (appId: string) => {
        if (!confirm('Retry this application?')) return
        try {
            await api.retryApplication(appId)
            showToast('Application queued for retry', 'success')
            loadData() // Reload to see status change
        } catch (err) {
            showToast('Retry failed', 'error')
        }
    }

    const viewAudit = async (jobId: string) => {
        setSelectedJobId(jobId)
        setLoadingAudit(true)
        setAuditLogs([])
        try {
            const res = await api.getApplicationAudit(jobId)
            setAuditLogs(res.data)
        } catch (err) {
            console.error('Failed to load audit logs', err)
            setAuditLogs([])
        } finally {
            setLoadingAudit(false)
        }
    }

    const closeAudit = () => {
        setSelectedJobId(null)
        setAuditLogs([])
    }

    const exportCSV = () => {
        const headers = ['Company', 'Job Title', 'Status', 'Date', 'Notes']
        const csvContent = [
            headers.join(','),
            ...applications.map(app => [
                app.company_name,
                app.job_title,
                app.status,
                new Date(app.updated_at || Date.now()).toLocaleDateString(),
                `"${(app.notes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `applications_export_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex flex-col">
                        <Link to="/dashboard" className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest mb-1">
                            <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Application Tracker</h1>
                    </div>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
                        <p className="animate-pulse">Loading tracking data...</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                {error}
                            </div>
                        )}

                        {/* Summary Cards */}
                        {summary && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg shadow-slate-900/10 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-slate-400 text-sm mb-1">Total Applications</p>
                                        <p className="text-4xl font-bold">{summary.total_applications}</p>
                                    </div>
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-slate-800 rounded-full blur-2xl transform translate-x-8 -translate-y-8 opacity-50"></div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <p className="text-sm text-slate-500">Success Rate</p>
                                    <p className="text-3xl font-bold text-green-600">{Math.round(summary.success_rate * 100)}%</p>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <p className="text-sm text-slate-500">Submitted Today</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {summary.recent_activity.filter(a => new Date(a.updated_at).toDateString() === new Date().toDateString()).length}
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <p className="text-sm text-slate-500">Failed</p>
                                    <p className="text-3xl font-bold text-red-600">{summary.status_breakdown['failed'] || 0}</p>
                                </div>
                            </div>
                        )}

                        {/* Filters and Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search company or role..."
                                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full sm:w-64 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none text-sm transition-all"
                                        value={companyFilter} // Using companyFilter for search term as per logic
                                        onChange={(e) => setCompanyFilter(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="border-slate-300 rounded-lg text-sm focus:ring-slate-900 focus:border-slate-900 py-2 pl-3 pr-8 outline-none cursor-pointer"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="failed">Failed</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                            <div className="text-sm text-slate-500">
                                Showing {applications.length} applications
                            </div>
                        </div>

                        {/* Applications Table */}
                        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 top-0">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {applications.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    No applications found matching your criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            applications.map((app) => (
                                                <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4 font-medium text-slate-900">
                                                        {app.company_name}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {app.job_title}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${app.status === 'submitted' ? 'bg-green-100 text-green-800 border-green-200' :
                                                            app.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                'bg-amber-100 text-amber-800 border-amber-200'
                                                            }`}>
                                                            {app.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {new Date(app.updated_at || Date.now()).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => viewAudit(app.job_id || app.id)}
                                                                className="text-slate-400 hover:text-slate-900 p-1"
                                                                title="View Logs"
                                                            >
                                                                <DocumentTextIcon className="w-5 h-5" />
                                                            </button>
                                                            {app.status === 'failed' && (
                                                                <button
                                                                    onClick={() => handleRetry(app.id)}
                                                                    className="text-red-400 hover:text-red-600 p-1"
                                                                    title="Retry Application"
                                                                >
                                                                    <ArrowPathIcon className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Audit Log Modal */}
            {selectedJobId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    {/* Modal Overlay */}
                    <div className="absolute inset-0" onClick={closeAudit}></div>

                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-bounce-subtle z-10">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Application Audit Trail</h3>
                                <p className="text-xs text-slate-500 mt-1">Tracing execution steps for this job.</p>
                            </div>
                            <button onClick={closeAudit} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {loadingAudit ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="text-center text-slate-500 py-8">
                                    No audit logs found for this application.
                                </div>
                            ) : (
                                <div className="space-y-6 relative border-l-2 border-slate-100 ml-4 pl-8 py-2">
                                    {auditLogs.map((log) => (
                                        <div key={log.id} className="relative">
                                            <div className="absolute -left-[39px] mt-1.5 w-4 h-4 rounded-full bg-slate-900 border-4 border-white shadow-sm"></div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide px-2 py-0.5 bg-slate-100 rounded">
                                                        {log.step}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">
                                                        {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-semibold text-slate-700 capitalize mb-2">
                                                    {log.event_type.replace('_', ' ')}
                                                </h4>
                                                <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600 overflow-x-auto border border-slate-100">
                                                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                            <button
                                onClick={closeAudit}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
