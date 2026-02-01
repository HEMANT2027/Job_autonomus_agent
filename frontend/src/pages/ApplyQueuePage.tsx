
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrashIcon, ArrowUpIcon, ArrowDownIcon, PlayIcon, StopIcon, Cog6ToothIcon, NoSymbolIcon, ChartBarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import api, { QueuedJob, BatchStatus } from '../services/api'

export default function ApplyQueuePage() {
    const [queue, setQueue] = useState<QueuedJob[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)

    useEffect(() => {
        loadQueue()
        loadBatchStatus()

        // Start polling for status
        const interval = window.setInterval(loadBatchStatus, 2000)

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [])

    const loadQueue = async () => {
        try {
            setLoading(true)
            const res = await api.getApplyQueue()
            setQueue(res.data.queue)
        } catch (err) {
            console.error('Failed to load queue', err)
            setError('Failed to load application queue')
        } finally {
            setLoading(false)
        }
    }

    const loadBatchStatus = async () => {
        try {
            const res = await api.getBatchStatus()
            setBatchStatus(res.data)

            // Reload queue if processed count changes to reflect removals
            // Ideally we'd compare state, for now simple reload is okay or we can rely on manual refresh
            // But if batch is running, queue is shrinking.
            if (res.data.is_running) {
                // api.getApplyQueue().then(r => setQueue(r.data.queue)) 
                // Don't reload queue too aggressively to avoid flickering during user interaction?
                // Let's reload queue every 5s if running? Or just on status change?
            }
        } catch (err) {
            console.error('Failed to load batch status', err)
        }
    }

    const handleStartBatch = async () => {
        try {
            await api.startBatchProcessing()
            loadBatchStatus()
        } catch (err) {
            setError('Failed to start batch processing')
        }
    }

    const handleStopBatch = async () => {
        try {
            await api.stopBatchProcessing()
            loadBatchStatus()
        } catch (err) {
            setError('Failed to stop batch processing')
        }
    }

    const handleRemoveFromQueue = async (jobId: string) => {
        try {
            await api.removeFromApplyQueue(jobId)
            setQueue(queue.filter(j => j.id !== jobId))
        } catch (err) {
            setError('Failed to remove job from queue')
        }
    }

    // Move item up/down locally then sync? 
    // Backend `reorderApplyQueue` accepts full list of IDs.
    const moveItem = async (index: number, direction: 'up' | 'down') => {
        const newQueue = [...queue]
        if (direction === 'up' && index > 0) {
            [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]]
        } else if (direction === 'down' && index < newQueue.length - 1) {
            [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]]
        } else {
            return
        }

        setQueue(newQueue)

        try {
            const ids = newQueue.map(j => j.id)
            await api.reorderApplyQueue(ids)
        } catch (err) {
            console.error("Failed to sync queue order", err)
            // Revert on failure?
            loadQueue()
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex flex-col">
                        <Link to="/job-search" className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest mb-1">
                            <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                            Back to Job Search
                        </Link>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Application Queue</h1>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm w-fit">
                        <div className="w-2 h-2 rounded-full bg-slate-900 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Stream</span>
                    </div>
                </div>
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                        <NoSymbolIcon className="w-5 h-5" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-sm underline">Dismiss</button>
                    </div>
                )}

                {/* Batch Controls */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1 w-full">
                            <h2 className="text-lg font-semibold text-slate-900 mb-2">Autonomous Batch Processor</h2>
                            <p className="text-sm text-slate-500 mb-4">
                                Automatically process jobs in the queue. Checks policies, assembles packages, and submits applications while you sleep.
                            </p>

                            {/* Progress Bar */}
                            {batchStatus && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={`font-medium ${batchStatus.is_running ? 'text-green-600 animate-pulse' : 'text-slate-500'}`}>
                                            Status: {batchStatus.current_status}
                                        </span>
                                        <span className="text-slate-500">
                                            Processed: {batchStatus.processed_count} | Success: {batchStatus.success_count} | Failed: {batchStatus.failed_count}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className={`h-2.5 rounded-full ${batchStatus.is_running ? 'bg-slate-900 animate-pulse-slow' : 'bg-slate-400'}`}
                                            style={{ width: batchStatus.is_running ? '100%' : '0%' }}
                                        ></div>
                                    </div>

                                    {/* Latest Log */}
                                    <div className="h-24 bg-slate-900 rounded-lg p-3 overflow-y-auto font-mono text-xs text-white border border-slate-800">
                                        {batchStatus.logs.length > 0 ? (
                                            batchStatus.logs.slice().reverse().map((log, i) => (
                                                <div key={i} className="border-l-2 border-slate-700 pl-2 mb-1">{log}</div>
                                            ))
                                        ) : (
                                            <span className="text-slate-600 opacity-50">Waiting for logs...</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px]">
                            {batchStatus?.is_running ? (
                                <button
                                    onClick={handleStopBatch}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-md transition-all active:scale-95"
                                >
                                    <StopIcon className="w-5 h-5" />
                                    STOP MATCH
                                </button>
                            ) : (
                                <button
                                    onClick={handleStartBatch}
                                    disabled={queue.length === 0}
                                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-md transition-all active:scale-95 ${queue.length === 0
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-900 hover:bg-black text-white'
                                        }`}
                                >
                                    <PlayIcon className="w-5 h-5" />
                                    START BATCH
                                </button>
                            )}

                            {/* Policy / Kill Switch placeholder */}
                            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                <Cog6ToothIcon className="w-4 h-4" />
                                Policy Settings
                            </button>
                        </div>
                    </div>
                </div>

                {/* Queue Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Queued Jobs ({queue.length})</h3>
                        <div className="text-sm text-slate-500">
                            Drag or use arrows to reorder priority.
                        </div>
                    </div>

                    {loading && queue.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">Loading queue...</div>
                    ) : queue.length === 0 ? (
                        <div className="p-12 text-center">
                            <NoSymbolIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 text-lg mb-4">Queue is empty</p>
                            <div className="flex gap-3 justify-center">
                                <Link to="/job-search" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                                    <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                    Search for Jobs
                                </Link>
                                <Link to="/tracker" className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                                    <ChartBarIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                    View Tracker
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Priority</th>
                                        <th className="px-6 py-3 font-medium">Job Details</th>
                                        <th className="px-6 py-3 font-medium">Match Score</th>
                                        <th className="px-6 py-3 font-medium">Added</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {queue.map((job, index) => (
                                        <tr key={job.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 text-center">{index + 1}</span>
                                                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => moveItem(index, 'up')}
                                                            disabled={index === 0}
                                                            className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30"
                                                        >
                                                            <ArrowUpIcon className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => moveItem(index, 'down')}
                                                            disabled={index === queue.length - 1}
                                                            className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30"
                                                        >
                                                            <ArrowDownIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-semibold text-slate-900">{job.title}</div>
                                                    <div className="text-sm text-slate-500">{job.company} | {job.location || 'Remote'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-1.5 rounded-full ${(job.match_score || 0) > 80 ? 'bg-green-500' :
                                                                (job.match_score || 0) > 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${job.match_score || 0}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700">{job.match_score}%</span>
                                                </div>
                                                {job.match_reasoning && (
                                                    <p className="text-xs text-slate-400 mt-1 truncate max-w-xs" title={job.match_reasoning}>
                                                        {job.match_reasoning}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {job.queued_at ? new Date(job.queued_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleRemoveFromQueue(job.id)}
                                                    className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Remove from queue"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Next Step CTA */}
            <div className="fixed bottom-8 right-8 z-40 animate-bounce-subtle">
                <Link
                    to="/tracker"
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-black hover:scale-105 transition-all font-bold text-lg ring-4 ring-white/50"
                >
                    Track Progress
                    <ChartBarIcon className="w-6 h-6" />
                </Link>
            </div>
        </div>
    )
}
