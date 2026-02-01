import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    MagnifyingGlassIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    CpuChipIcon,
    ExclamationTriangleIcon,
    SparklesIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function JobSearchPage() {
    const [profile, setProfile] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [ranking, setRanking] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [policy, setPolicy] = useState<any>(null);
    const [discoveryStatus, setDiscoveryStatus] = useState<any>(null);

    const { setValue } = useForm({
        defaultValues: {
            required_skills: '',
            preferred_locations: '',
            remote_only: false,
            visa_sponsorship_required: false,
            min_salary: '',
            job_types: [],
            discovery_min_match_score: 60
        }
    });

    // Load profile and policy on mount
    useEffect(() => {
        fetchProfile();
        fetchPolicy();
        fetchDiscoveryStatus();
        fetchQueueCount();

        // Poll status every 5s
        const interval = setInterval(() => {
            fetchDiscoveryStatus();
            fetchQueueCount();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPolicy = async () => {
        try {
            const res = await api.getPolicy();
            setPolicy(res.data);
            if (res.data.discovery_min_match_score) {
                setValue('discovery_min_match_score', res.data.discovery_min_match_score);
            }
        } catch (err) {
            console.error('Failed to load policy', err);
        }
    };

    const fetchDiscoveryStatus = async () => {
        try {
            const res = await api.getDiscoveryStatus();
            setDiscoveryStatus(res.data);
        } catch (err) {
            console.error('Failed to load discovery status', err);
        }
    };

    const fetchQueueCount = async () => {
        try {
            const res = await api.getQueueStats();
            if (res.data && typeof res.data.count === 'number') {
                setQueueCount(res.data.count);
            }
        } catch (err) {
            console.error('Failed to load queue count', err);
        }
    };

    const toggleAutonomous = async () => {
        if (!policy) return;
        try {
            const newVal = !policy.auto_discovery_enabled;
            await api.updatePolicy({ auto_discovery_enabled: newVal });
            setPolicy((prev: any) => ({ ...prev, auto_discovery_enabled: newVal }));
            fetchDiscoveryStatus(); // Force update status
        } catch (err) {
            alert("Failed to update settings");
        }
    };

    const updateThreshold = async (val: string) => {
        try {
            const score = parseFloat(val);
            if (!isNaN(score)) {
                await api.updatePolicy({ discovery_min_match_score: score });
                setPolicy((prev: any) => ({ ...prev, discovery_min_match_score: score }));
            }
        } catch (err) {
            console.error('Failed to update threshold', err);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await api.getProfile();
            if (res.data) {
                setProfile(res.data);
                if (res.data.skills) {
                    setValue('required_skills', res.data.skills.join(', '));
                }
            }
        } catch (err) {
            console.error('Failed to load profile', err);
        }
    };

    const handleDeleteQueue = async () => {
        if (!confirm('Are you sure you want to delete ALL currently queued jobs? This cannot be undone.')) return;
        try {
            await api.clearQueue();
            setQueueCount(0);
        } catch (err) {
            console.error('Failed to clear queue', err);
            alert('Failed to clear queue.');
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        setSearchResults([]);

        try {
            const skills = profile?.skills || [];
            const searchPayload = {
                required_skills: skills,
                preferred_locations: [],
                remote_only: false,
                visa_sponsorship_required: false,
                min_salary: null,
            };

            const searchRes = await api.searchJobs(searchPayload);

            if (searchRes.data.success) {
                setRanking(true);
                const rankPayload = {
                    profile_data: profile || {},
                    remote_only: false,
                    visa_required: false,
                    preferred_locations: [],
                    limit: 50,
                    auto_queue: false
                };

                const rankRes = await api.rankJobs(rankPayload);
                setSearchResults(rankRes.data.ranked_jobs);
            }
        } catch (err) {
            console.error('Search failed', err);
            alert('Failed to search jobs. Please try again.');
        } finally {
            setLoading(false);
            setRanking(false);
        }
    };

    const addToQueue = async (job: any) => {
        try {
            const res = await api.addToQueue(job.id);
            if (res.data.success) {
                alert(`Successfully added ${job.title} to your application queue!`);
                setQueueCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to add to queue', err);
            alert('Failed to add job to queue.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-5 mb-8">
                <div className="max-w-7xl mx-auto flex flex-col">
                    <Link to="/dashboard" className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest mb-1">
                        <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Job Discovery</h1>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">

                {/* Autonomous Control Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <CpuChipIcon className="w-6 h-6 text-slate-900" /> Autonomous Job Discovery
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">
                                Automatically finds and queues relevant jobs in the background.
                            </p>
                        </div>

                        <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            {/* Toggle */}
                            <div className="flex items-center gap-3">
                                <div className="text-sm font-medium text-slate-700">Autonomous Mode</div>
                                <button
                                    onClick={toggleAutonomous}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${policy?.auto_discovery_enabled ? 'bg-slate-900' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy?.auto_discovery_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Threshold Input */}
                            <div className="flex items-center gap-2 border-l pl-6 border-slate-200">
                                <label className="text-sm font-medium text-slate-700">Min Score to Queue:</label>
                                <div className="relative w-20">
                                    <input
                                        type="number"
                                        defaultValue={policy?.discovery_min_match_score || 60}
                                        onBlur={(e) => updateThreshold(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                updateThreshold(e.currentTarget.value);
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="w-full pl-2 pr-6 py-1 border border-slate-300 rounded-md text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors"
                                    />
                                    <span className="absolute right-2 top-1 text-slate-400 text-xs">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-600 border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Status:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${!policy?.auto_discovery_enabled ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                discoveryStatus?.last_run_status?.includes('running') ? 'bg-slate-900 text-white border-slate-900 animate-pulse' :
                                    'bg-green-50 text-green-700 border-green-100'
                                }`}>
                                {policy?.auto_discovery_enabled ? (discoveryStatus?.last_run_status || 'Active') : 'Paused'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Last Run:</span>
                            <span className="font-mono">{discoveryStatus?.last_run_time ? new Date(discoveryStatus.last_run_time).toLocaleTimeString() : 'Never'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Jobs Queued (This Session):</span>
                            <span className="font-mono bg-slate-100 px-2 rounded">{discoveryStatus?.total_jobs_queued || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Manual Search Header (Secondary) */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {searchResults.length > 0 ? `Manual Results (${searchResults.length})` : 'Job Browser'}
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <span className="font-medium text-slate-700">Queued Jobs</span>
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-full text-sm font-bold">{queueCount}</span>
                        </div>

                        {queueCount > 0 && (
                            <button
                                onClick={handleDeleteQueue}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                title="Delete All Queued Jobs"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}

                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-black transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            {loading ? (
                                ranking ? 'Ranking...' : 'Searching...'
                            ) : (
                                <>
                                    <MagnifyingGlassIcon className="w-4 h-4" /> Manual Refresh
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                    {!profile && !loading && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <span className="font-bold">Missing Profile:</span> <a href="/artifact-pack" className="underline hover:text-amber-900">Please extract your profile first</a> for accurate ranking.
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
                            <p className="animate-pulse">{ranking ? 'AI is analyzing matches...' : 'Fetching jobs from sandbox...'}</p>
                        </div>
                    )}

                    {searchResults.length === 0 && !loading && (
                        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
                            <MagnifyingGlassIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">Broaden your reach</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                Turn on Autonomous Discovery to automatically find matches, or click Manual Refresh.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {searchResults
                            .filter(job => !policy?.auto_discovery_enabled || (job.match_score >= (policy?.discovery_min_match_score || 0)))
                            .map((job) => (
                                <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all flex flex-col h-full group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-slate-700 transition-colors" title={job.title}>
                                                {job.title}
                                            </h2>
                                            <p className="text-slate-600 font-medium text-sm">{job.company}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="text-xl font-bold text-slate-900">{job.match_score}%</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {job.is_remote && <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-200"><MapPinIcon className="w-3 h-3" /> Remote</span>}
                                        {job.location && !job.is_remote && <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-200"><MapPinIcon className="w-3 h-3" /> {job.location}</span>}
                                        {job.salary_range && <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-200"><CurrencyDollarIcon className="w-3 h-3" /> {job.salary_range}</span>}
                                    </div>

                                    {/* AI Reasoning */}
                                    {job.match_reasoning && (
                                        <div className="bg-slate-50 p-3 rounded-lg mb-4 text-xs text-slate-700 border-l-2 border-slate-400 flex-grow">
                                            <p className="font-bold mb-1 flex items-center gap-1 text-slate-900">
                                                <SparklesIcon className="w-4 h-4 text-slate-400" /> AI Analysis
                                            </p>
                                            {job.match_reasoning}
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                                        <button className="flex-1 px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">Skip</button>
                                        <button
                                            onClick={() => addToQueue(job)}
                                            className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" /> Queue
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Next Step CTA */}
            {queueCount > 0 && (
                <div className="fixed bottom-8 right-8 z-40 animate-bounce-subtle">
                    <button
                        onClick={() => window.location.href = '/apply/queue'}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-black hover:scale-105 transition-all font-bold text-lg ring-4 ring-white/50"
                    >
                        View Application Queue ({queueCount})
                        <div className="bg-white text-slate-900 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            <CheckCircleIcon className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
