import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Search, MapPin, DollarSign, CheckCircle } from 'lucide-react';

// API Configuration
const API_BASE = '/api/v1/student';
const JOBS_API = '/api/jobs';

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

        // Poll status every 5s
        const interval = setInterval(fetchDiscoveryStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPolicy = async () => {
        try {
            const res = await axios.get('/api/v1/policy/');
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
            const res = await axios.get(`${JOBS_API}/discovery/status`);
            setDiscoveryStatus(res.data);
        } catch (err) {
            console.error('Failed to load discovery status', err);
        }
    };

    const toggleAutonomous = async () => {
        if (!policy) return;
        try {
            const newVal = !policy.auto_discovery_enabled;
            await axios.post('/api/v1/policy/set', { auto_discovery_enabled: newVal });
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
                await axios.post('/api/v1/policy/set', { discovery_min_match_score: score });
                setPolicy((prev: any) => ({ ...prev, discovery_min_match_score: score }));
            }
        } catch (err) {
            console.error('Failed to update threshold', err);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${API_BASE}/profile`);
            if (res.data) {
                setProfile(res.data);
                // Pre-fill form values just in case we need them
                if (res.data.skills) {
                    setValue('required_skills', res.data.skills.join(', '));
                }
            }
        } catch (err) {
            console.error('Failed to load profile', err);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        setSearchResults([]);

        try {
            // Use profile data directly since filters are removed
            const skills = profile?.skills || [];

            // 1. Search and store jobs from sandbox
            const searchPayload = {
                required_skills: skills,
                preferred_locations: [], // Could default to something or leave empty
                remote_only: false,
                visa_sponsorship_required: false,
                min_salary: null,
            };

            const searchRes = await axios.post(`${JOBS_API}/search`, searchPayload);

            if (searchRes.data.success) {
                setRanking(true);
                // 2. Rank the jobs
                const rankPayload = {
                    profile_data: profile || {},
                    remote_only: false,
                    visa_required: false,
                    preferred_locations: [],
                    limit: 50,
                    auto_queue: false
                };

                const rankRes = await axios.post(`${JOBS_API}/rank`, rankPayload);
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
            const res = await axios.post(`${JOBS_API}/queue/${job.id}`);
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
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Autonomous Control Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 bg-gradient-to-r from-white to-blue-50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="text-2xl">🤖</span> Autonomous Job Discovery
                            </h2>
                            <p className="text-gray-600 text-sm mt-1">
                                Automatically finds and queues relevant jobs in the background.
                            </p>
                        </div>

                        <div className="flex items-center gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            {/* Toggle */}
                            <div className="flex items-center gap-3">
                                <div className="text-sm font-medium text-gray-700">Autonomous Mode</div>
                                <button
                                    onClick={toggleAutonomous}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${policy?.auto_discovery_enabled ? 'bg-green-500' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy?.auto_discovery_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Threshold Input */}
                            <div className="flex items-center gap-2 border-l pl-6 border-gray-200">
                                <label className="text-sm font-medium text-gray-700">Min Score to Queue:</label>
                                <div className="relative w-20">
                                    <input
                                        type="number"
                                        defaultValue={policy?.discovery_min_match_score || 60}
                                        onBlur={(e) => updateThreshold(e.target.value)}
                                        className="w-full pl-2 pr-6 py-1 border rounded-md text-sm"
                                    />
                                    <span className="absolute right-2 top-1 text-gray-500 text-xs">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Status:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${!policy?.auto_discovery_enabled ? 'bg-gray-100 text-gray-600' :
                                    discoveryStatus?.last_run_status?.includes('running') ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                        'bg-green-100 text-green-700'
                                }`}>
                                {policy?.auto_discovery_enabled ? (discoveryStatus?.last_run_status || 'Active') : 'Paused'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Last Run:</span>
                            <span>{discoveryStatus?.last_run_time ? new Date(discoveryStatus.last_run_time).toLocaleTimeString() : 'Never'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Jobs Queued (This Session):</span>
                            <span className="font-mono bg-gray-100 px-2 rounded">{discoveryStatus?.total_jobs_queued || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Manual Search Header (Secondary) */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {searchResults.length > 0 ? `Manual Results (${searchResults.length})` : 'Job Browser'}
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                            <span className="font-medium">Queued Jobs</span>
                            <span className="bg-blue-200 px-2 py-0.5 rounded-full text-sm font-bold">{queueCount}</span>
                        </div>

                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            {loading ? (
                                ranking ? 'Ranking...' : 'Searching...'
                            ) : (
                                <>
                                    <Search className="w-4 h-4" /> Manual Refresh
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                    {!profile && !loading && (
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800">
                            Note: No profile found. <a href="/artifact-pack" className="underline font-bold">Please extract your profile first</a> for accurate ranking.
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p>{ranking ? 'AI is analyzing matches...' : 'Fetching jobs from sandbox...'}</p>
                        </div>
                    )}

                    {searchResults.length === 0 && !loading && (
                        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Broaden your reach</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mt-2">
                                Turn on Autonomous Discovery to automatically find matches, or click Manual Refresh.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {searchResults.map((job) => (
                            <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 line-clamp-1" title={job.title}>
                                            {job.title}
                                        </h2>
                                        <p className="text-gray-600 font-medium text-sm">{job.company}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-xl font-bold text-blue-600">{job.match_score}%</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {job.is_remote && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin className="w-3 h-3" /> Remote</span>}
                                    {job.location && !job.is_remote && <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                                    {job.salary_range && <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary_range}</span>}
                                </div>

                                {/* AI Reasoning */}
                                {job.match_reasoning && (
                                    <div className="bg-indigo-50 p-3 rounded-lg mb-4 text-xs text-indigo-800 border-l-4 border-indigo-200 flex-grow">
                                        <p className="font-semibold mb-1 flex items-center gap-1">
                                            ✨ AI Analysis
                                        </p>
                                        {job.match_reasoning}
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                                    <button className="flex-1 px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium">Skip</button>
                                    <button
                                        onClick={() => addToQueue(job)}
                                        className="flex-1 px-3 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Queue
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
