
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowPathIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    DocumentTextIcon,
    XMarkIcon,
    ArrowLeftIcon,
    ChatBubbleLeftRightIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import api, { TrackerSummary, Application, AuditLog, SandboxMessage } from '../services/api'
import { useToast } from '../context/ToastContext'

// Sandbox Feedback Types
interface SandboxMeeting {
    id: string
    date: string
    time: string
    duration: number
    meeting_type: string
    notes?: string
}

interface SandboxFeedback {
    id: string
    job_id?: string
    job_title: string
    company: string
    status: string
    submitted_at: string
    messages: SandboxMessage[]
    meetings: SandboxMeeting[]
    applicant?: {
        applicant_name?: string
    }
}

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

    // Sandbox Feedback
    const [sandboxFeedback, setSandboxFeedback] = useState<SandboxFeedback[]>([])
    const [selectedFeedback, setSelectedFeedback] = useState<SandboxFeedback | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)

    const { showToast } = useToast()

    useEffect(() => {
        loadData()

        // Start polling for sandbox feedback every 5 seconds
        const interval = setInterval(() => {
            loadSandboxFeedback()
        }, 5000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        loadApplications()
    }, [statusFilter, companyFilter])

    const loadData = async () => {
        try {
            const sumRes = await api.getTrackerSummary()
            setSummary(sumRes.data)
            await loadApplications()
            await loadSandboxFeedback()
        } catch (err) {
            setError('Failed to load tracker data')
            showToast('Failed to load tracker data', 'error')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const loadSandboxFeedback = async () => {
        try {
            const res = await api.getSandboxFeedback()
            const feedbackData = res.data || []
            setSandboxFeedback(feedbackData)

            // If a chat is open, update its state with the latest messages
            if (selectedFeedback) {
                const updated = feedbackData.find((f: SandboxFeedback) => f.id === selectedFeedback.id)
                if (updated) {
                    setSelectedFeedback(updated)
                }
            }

            if (applications.length > 0 && feedbackData.length > 0) {
                syncApplicationStatuses(applications, feedbackData)
            }
            return feedbackData
        } catch (err) {
            console.error('Failed to load sandbox feedback', err)
            return []
        }
    }

    const syncApplicationStatuses = async (apps: Application[], feedbackItems: SandboxFeedback[]) => {
        for (const app of apps) {
            const feedback = getSandboxFeedbackForApp(app, feedbackItems)
            if (feedback && feedback.status && feedback.status !== app.status) {
                const significantStatuses = ['interviewing', 'accepted', 'rejected']
                if (significantStatuses.includes(feedback.status)) {
                    try {
                        await api.updateApplicationStatus(app.id, feedback.status)
                        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: feedback.status } : a))
                    } catch (err) {
                        console.error(`Failed to sync status for ${app.id}`, err)
                    }
                }
            }
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

    const getSandboxFeedbackForApp = (app: Application, feedbackList: SandboxFeedback[] = sandboxFeedback): SandboxFeedback | undefined => {
        const sandboxId = app.submission_receipt?.application_id
        if (sandboxId) {
            const match = feedbackList.find(fb => fb.id === sandboxId)
            if (match) return match
        }

        const jobId = app.submission_receipt?.job_id || app.job_id
        if (jobId) {
            const match = feedbackList.find(fb => fb.job_id === jobId)
            if (match) return match
        }

        return feedbackList.find(fb => {
            const fbTitle = fb.job_title?.toLowerCase().trim() || ""
            const appTitle = app.job_title?.toLowerCase().trim() || ""
            const fbCompany = fb.company?.toLowerCase().trim() || ""
            const appCompany = app.company_name?.toLowerCase().trim() || ""
            return fbTitle === appTitle && fbCompany === appCompany
        })
    }

    const handleRetry = async (appId: string) => {
        if (!confirm('Retry this application?')) return
        try {
            await api.retryApplication(appId)
            showToast('Application queued for retry', 'success')
            loadData()
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
        } finally {
            setLoadingAudit(false)
        }
    }

    const closeAudit = () => {
        setSelectedJobId(null)
        setAuditLogs([])
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedFeedback || !newMessage.trim() || sendingMessage) return

        const sentMsg = newMessage.trim()
        setSendingMessage(true)
        try {
            await api.sendMessageToSandbox(selectedFeedback.id, sentMsg)
            setNewMessage('')
            const feedbackData = await loadSandboxFeedback()

            // Explicitly sync the selected feedback from the fresh data
            const freshFeedback = feedbackData.find(f => f.id === selectedFeedback.id)
            if (freshFeedback) {
                setSelectedFeedback(freshFeedback)
            }

            showToast('Message sent', 'success')
        } catch (err) {
            console.error('Failed to send message', err)
            showToast('Failed to send message', 'error')
        } finally {
            setSendingMessage(false)
        }
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
                                        {summary.recent_activity.filter(a => a.updated_at && new Date(a.updated_at).toDateString() === new Date().toDateString()).length}
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
                                        value={companyFilter}
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
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Chat</th>
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
                                            applications.map((app) => {
                                                const feedback = getSandboxFeedbackForApp(app)
                                                const recruiterStatus = feedback?.status
                                                const messageCount = feedback?.messages?.length || 0

                                                const recruiterStatusColors: Record<string, string> = {
                                                    'pending': 'bg-yellow-100 text-yellow-800',
                                                    'interviewing': 'bg-purple-100 text-purple-800',
                                                    'accepted': 'bg-green-100 text-green-800',
                                                    'rejected': 'bg-red-100 text-red-800',
                                                    'submitted': 'bg-blue-100 text-blue-800'
                                                }

                                                return (
                                                    <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-6 py-4 font-medium text-slate-900">{app.company_name}</td>
                                                        <td className="px-6 py-4 text-slate-600">{app.job_title}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1">
                                                                {recruiterStatus ? (
                                                                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full w-fit tracking-tighter shadow-sm ${recruiterStatusColors[recruiterStatus] || 'bg-gray-100 text-gray-800'}`}>
                                                                        {recruiterStatus}
                                                                    </span>
                                                                ) : (
                                                                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full w-fit tracking-tighter opacity-50 bg-slate-100 text-slate-500`}>
                                                                        {app.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">
                                                            {new Date(app.updated_at || Date.now()).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {feedback ? (
                                                                    <button
                                                                        onClick={() => setSelectedFeedback(feedback)}
                                                                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-[10px] font-bold transition-all shadow-md active:scale-95 border border-blue-500"
                                                                        title="Open Chat"
                                                                    >
                                                                        <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                                                        Chat {messageCount > 0 && <span className="bg-white text-blue-600 rounded-full px-1 min-w-[1rem]">{messageCount}</span>}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 italic mr-2 border border-slate-200 px-2 py-1 rounded">Tracking...</span>
                                                                )}

                                                                <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                                                <button
                                                                    onClick={() => viewAudit(app.job_id || app.id)}
                                                                    className="text-slate-400 hover:text-slate-900 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                                                                    title="View Audit Logs"
                                                                >
                                                                    <DocumentTextIcon className="w-5 h-5" />
                                                                </button>
                                                                {app.status === 'failed' && (
                                                                    <button
                                                                        onClick={() => handleRetry(app.id)}
                                                                        className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                                                        title="Retry Application"
                                                                    >
                                                                        <ArrowPathIcon className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
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
                    <div className="absolute inset-0" onClick={closeAudit}></div>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden z-10 animate-bounce-subtle">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Application Audit Trail</h3>
                                <p className="text-xs text-slate-500 mt-1">Tracing execution steps for this job.</p>
                            </div>
                            <button onClick={closeAudit} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors">
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
                            <button onClick={closeAudit} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium shadow-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Two-Way Chat Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={() => setSelectedFeedback(null)}></div>
                    <div className="inline-block align-bottom bg-white rounded-2xl text-left shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full h-[80vh] flex flex-col z-50 overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">
                                    {selectedFeedback.company}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    {selectedFeedback.job_title}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={loadSandboxFeedback}
                                    className="text-slate-400 hover:text-blue-600 p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                                    title="Refresh Content"
                                >
                                    <ArrowPathIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setSelectedFeedback(null)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
                            {/* Meeting Notification (if any) */}
                            {selectedFeedback.meetings?.map((mtg) => (
                                <div key={mtg.id} className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-4 shadow-sm">
                                    <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                                        <CalendarDaysIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Meeting Scheduled</h4>
                                        <p className="text-xs text-indigo-700 mt-1 font-medium">
                                            {mtg.meeting_type.replace('_', ' ')}: <b className="text-indigo-900">{mtg.date}</b> at <b className="text-indigo-900">{mtg.time}</b> ({mtg.duration} min)
                                        </p>
                                        {mtg.notes && <p className="text-[10px] text-indigo-500 mt-2 bg-white/60 p-3 rounded-lg border border-indigo-50 italic font-serif">"{mtg.notes}"</p>}
                                    </div>
                                </div>
                            ))}

                            {/* Messages */}
                            {(!selectedFeedback.messages || selectedFeedback.messages.length === 0) ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-30">
                                    <ChatBubbleLeftRightIcon className="w-20 h-20 text-slate-300" />
                                    <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">No activity yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {selectedFeedback.messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'applicant' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm ${msg.sender === 'applicant'
                                                ? 'bg-slate-900 text-white rounded-tr-none'
                                                : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                                                }`}>
                                                <div className="flex flex-col">
                                                    <p className="font-medium leading-relaxed">{msg.content}</p>
                                                    <span className={`text-[9px] mt-2 self-end font-bold uppercase tracking-tighter opacity-60 ${msg.sender === 'applicant' ? 'text-slate-300' : 'text-slate-500'}`}>
                                                        {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50">
                            <form onSubmit={handleSendMessage} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Reply to the recruiter..."
                                    className="flex-1 rounded-xl border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-900 text-sm py-3 px-5 transition-all outline-none"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={sendingMessage}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sendingMessage}
                                    className={`p-3 rounded-xl shadow-xl flex items-center justify-center transition-all ${!newMessage.trim() || sendingMessage
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-slate-900 text-white hover:bg-black active:scale-95 shadow-slate-900/20'
                                        }`}
                                >
                                    {sendingMessage ? (
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </form>
                            <p className="text-[9px] text-slate-400 text-center mt-3 font-bold uppercase tracking-[0.2em]">
                                Encrypted Direct Message Link
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
