
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    CheckCircleIcon,
    ArrowRightIcon,
    BriefcaseIcon,
    DocumentTextIcon,
    QueueListIcon,
    SparklesIcon,
    UserCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline'
import { useAppStore } from '../store/useAppStore'
import api from '../services/api'
import { useState } from 'react'

export default function DashboardPage() {
    const {
        profile,
        stats,
        batchStatus,
        trackerSummary,
        hasProfile,
        hasAppliedOnce,
        isLoading,
        fetchInitialData,
        refreshBatchStatus
    } = useAppStore()

    const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null)

    useEffect(() => {
        fetchInitialData()
        checkHealth()

        // Refresh batch status every 10s if on dashboard
        const interval = setInterval(refreshBatchStatus, 10000)
        return () => clearInterval(interval)
    }, [])

    const checkHealth = async () => {
        try {
            const res = await api.health()
            setSystemHealthy(res.data.status === 'healthy')
        } catch (err) {
            setSystemHealthy(false)
        }
    }

    if (isLoading && !profile) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    // Onboarding Steps
    const steps = [
        {
            id: 'profile',
            title: 'Create Profile',
            description: 'Extract skills and experience from your resume.',
            completed: hasProfile,
            link: '/artifact-pack',
            icon: DocumentTextIcon
        },
        {
            id: 'search',
            title: 'Find Jobs',
            description: 'Search and queue jobs for the autonomous agent.',
            completed: hasAppliedOnce || (stats?.total || 0) > 0, // Loose proxy for "found jobs" if applications exist
            link: '/job-search',
            icon: BriefcaseIcon
        },
        {
            id: 'apply',
            title: 'Start Applying',
            description: 'Launch the batch processor to apply automatically.',
            completed: hasAppliedOnce,
            link: '/apply/queue',
            icon: QueueListIcon
        }
    ]

    const allStepsComplete = steps.every(s => s.completed)

    return (
        <div className="space-y-8">
            {/* Hero / Welcome */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            Welcome back{profile ? `, ${profile.name.split(' ')[0]}` : ''}!
                        </h1>
                        <p className="text-blue-100 max-w-2xl text-lg">
                            {allStepsComplete
                                ? "Your autonomous job search is running smoothly. Check the tracker for updates."
                                : "Let's get your autonomous agent set up and running."}
                        </p>
                    </div>
                    <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                    >
                        <UserCircleIcon className="w-6 h-6" />
                        <span className="hidden sm:inline font-medium">Profile</span>
                    </Link>
                </div>
                <SparklesIcon className="absolute right-0 top-0 w-64 h-64 text-white opacity-5 transform translate-x-12 -translate-y-12" />
            </div>

            {/* Onboarding Checklist / Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {steps.map((step, idx) => (
                    <Link
                        key={step.id}
                        to={step.link}
                        className={`p-6 rounded-xl border-2 transition-all hover:shadow-md group relative overflow-hidden bg-white ${step.completed
                            ? 'border-green-100 bg-green-50/30'
                            : idx === steps.findIndex(s => !s.completed)
                                ? 'border-blue-500 ring-4 ring-blue-50'
                                : 'border-gray-100'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-lg ${step.completed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                <step.icon className="w-6 h-6" />
                            </div>
                            {step.completed ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                            ) : (
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">STEP {idx + 1}</span>
                            )}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">{step.description}</p>

                        <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                            {step.completed ? 'View Details' : 'Start Now'} <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Stats Grid */}
            <h2 className="text-xl font-bold text-gray-900">Overview</h2>
            {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">Total Applied</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">Success Rate</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.total > 0 ? Math.round((stats.applied / stats.total) * 100) : 0}%</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">In Queue</p>
                        <p className="text-3xl font-bold text-blue-600">{trackerSummary?.submitted_count || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">Interviews</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.interviewing}</p>
                    </div>
                </div>
            ) : (
                <div className="p-8 bg-gray-50 rounded-xl text-center text-gray-500">
                    No stats available yet.
                </div>
            )}

            {/* Recent Activity / Next Steps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900">Next Steps</h3>
                    </div>
                    <ul className="space-y-4">
                        <li className="flex gap-4">
                            <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Review your resume artifacts</p>
                                <p className="text-xs text-gray-500">Ensure your extracted skills match your targets.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="w-2 h-2 mt-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Add 5 more jobs to queue</p>
                                <p className="text-xs text-gray-500">Keep the batch processor fed for continuous applying.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0"></div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Check tracker for failures</p>
                                <p className="text-xs text-gray-500">Retry any failed submissions to maximize chances.</p>
                            </div>
                        </li>
                    </ul>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <Link to="/job-search" className="text-blue-600 text-sm font-semibold hover:underline">
                            Go to Job Search &rarr;
                        </Link>
                    </div>
                </div>

                {/* Mini Activity Feed (Placeholder or reusing store data) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900">System Status</h3>
                        {systemHealthy === null ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded-full animate-pulse">CHECKING...</span>
                        ) : systemHealthy ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">ONLINE</span>
                        ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">OFFLINE</span>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded shadow-sm text-blue-500">
                                    <SparklesIcon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Autonomous Agent</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${batchStatus?.is_running ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                                {batchStatus?.is_running ? 'RUNNING' : 'IDLE'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded shadow-sm text-purple-500">
                                    <BriefcaseIcon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Database Connection</span>
                            </div>
                            {systemHealthy ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : (
                                <XMarkIcon className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
