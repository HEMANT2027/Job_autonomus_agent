import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Briefcase,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle,
    Search,
    Menu,
    ShieldCheck,
    ArrowRight,
    Upload,
    Trash2,
    Building2,
    Plus,
    X,
    GraduationCap,
    User,
    Mail,
    Phone,
    MessageSquare,
    Calendar,
    Send,
    CheckCheck,
    XCircle
} from 'lucide-react'

// Resume Viewer Component to handle JSON artifacts
const ResumeViewer = ({ content, candidateName }: { content: string, candidateName?: string }) => {
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        // Fallback for Python-style dict strings (e.g. {'key': 'val', 'none': None})
        try {
            const sanitized = content
                .replace(/None/g, 'null')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false');
            data = new Function('return ' + sanitized)();
        } catch (e2) {
            data = null;
        }
    }

    try {
        // Basic check to see if it looks like a resume object
        if (!data || typeof data !== 'object') throw new Error('Not an object');

        return (
            <div className="bg-white p-8 shadow-sm border border-gray-200 mx-auto max-w-[21cm] min-h-[29.7cm] text-gray-800 font-sans">
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-6 mb-6">
                    <h1 className="text-4xl font-bold uppercase tracking-tight text-gray-900 mb-2">
                        {candidateName || data.name || data.fullName || data.candidate_name || data.personal_information?.name || data.header?.name || 'Candidate Name'}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 font-medium">
                        {data.email && (
                            <div className="flex items-center gap-1.5">
                                <Mail size={14} /> {data.email}
                            </div>
                        )}
                        {data.phone && (
                            <div className="flex items-center gap-1.5">
                                <Phone size={14} /> {data.phone}
                            </div>
                        )}
                        {data.location && (
                            <div className="flex items-center gap-1.5">
                                <MapPin size={14} /> {data.location}
                            </div>
                        )}
                        {data.linkedin && (
                            <a href={data.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                                <span className="font-bold">in</span> LinkedIn
                            </a>
                        )}
                    </div>
                </div>

                {/* Summary */}
                {data.summary && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-100 pb-1">Professional Summary</h2>
                        <p className="text-sm leading-relaxed text-gray-700">{data.summary}</p>
                    </div>
                )}

                {/* Experience */}
                {(data.experience || data.work_experience) && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-100 pb-1">Experience</h2>
                        <div className="space-y-4">
                            {(data.experience || data.work_experience).map((exp: any, i: number) => (
                                <div key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-900">{exp.role || exp.position || exp.title}</h3>
                                        <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{exp.duration || exp.dates || `${exp.startDate} - ${exp.endDate}`}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-sandbox-600 mb-2">{exp.company || exp.organization}</div>
                                    {Array.isArray(exp.description) ? (
                                        <ul className="list-disc ml-4 space-y-1">
                                            {exp.description.map((desc: string, j: number) => (
                                                <li key={j} className="text-sm text-gray-600 leading-snug pl-1 marker:text-gray-300">{desc}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Projects */}
                {data.projects && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-100 pb-1">Projects</h2>
                        <div className="space-y-4">
                            {data.projects.map((proj: any, i: number) => (
                                <div key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-900">{proj.name}</h3>
                                        {proj.technologies && (
                                            <span className="text-xs text-gray-500 italic">
                                                {Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{proj.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Skills */}
                {data.skills && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-100 pb-1">Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {(Array.isArray(data.skills) ? data.skills : data.skills.split(',')).map((skill: string, i: number) => (
                                <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                    {skill.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Education */}
                {data.education && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-100 pb-1">Education</h2>
                        <div className="space-y-3">
                            {data.education.map((edu: any, i: number) => (
                                <div key={i} className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-gray-900">{edu.institution || edu.school}</div>
                                        <div className="text-sm text-gray-600">{edu.degree}</div>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">{edu.year || edu.dates}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    } catch (e) {
        // Fallback for plain text
        return (
            <div className="bg-gray-50 rounded-xl p-6 font-mono text-xs text-gray-600 whitespace-pre-wrap border border-gray-200 shadow-inner h-96 overflow-y-auto">
                {content}
            </div>
        );
    }
};

const getSkillsFromResume = (content: string): string[] => {
    if (!content) return [];
    let data: any;
    try {
        data = JSON.parse(content);
    } catch (e) {
        try {
            const sanitized = content
                .replace(/None/g, 'null')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false');
            data = new Function('return ' + sanitized)();
        } catch (e2) {
            return [];
        }
    }

    if (!data || typeof data !== 'object') return [];

    if (Array.isArray(data.skills)) return data.skills;
    if (typeof data.skills === 'string') return data.skills.split(',').map((s: string) => s.trim());

    return [];
};

const SANDBOX_API = 'http://localhost:8001'
const API_KEY = 'sandbox_demo_key_2026'

interface Job {
    id: string
    title: string
    company: string
    location: string
    job_type: string
    experience_level: string
    salary_range?: string
    description?: string
    requirements?: string[]
    responsibilities?: string[]
    skills_required: string[]
    benefits?: string[]
    posted_date: string
    is_remote: boolean
}

interface ApplicationForm {
    applicant_name: string
    email: string
    phone: string
    resume_text: string
    cover_letter: string
    work_authorization: string
    availability: string
}

interface Application {
    id: string
    job_id: string
    job_title: string
    company: string
    submitted_at: string
    status: string
    status_updated_at?: string
    applicant: ApplicationForm
    messages?: Message[]
    meetings?: Meeting[]
    scheduled_messages?: ScheduledMessage[]
}

interface Message {
    id: string
    application_id: string
    sender: string
    content: string
    sent_at: string
    read: boolean
}

interface ScheduledMessage {
    id: string
    application_id: string
    content: string
    scheduled_for: string
    created_at: string
    status: string
}

interface Meeting {
    id: string
    application_id: string
    applicant_name: string
    job_title: string
    company: string
    date: string
    time: string
    duration: number
    meeting_type: string
    notes?: string
    status: string
    created_at?: string
}

interface Company {
    name: string
    location: string
    description: string
    requirements: string[]
    responsibilities: string[]
    skills_required: string[]
    job_details: {
        status: string
        salary_range: string
        is_remote: boolean
        posted_date: string
    }
}

function App() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [companies, setCompanies] = useState<Company[]>([])
    const [view, setView] = useState<'public' | 'admin' | 'job_detail' | 'apply_form' | 'artifact_detail' | 'companies' | 'add_company'>('public')
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [addingCompany, setAddingCompany] = useState(false)
    const [resumeFile, setResumeFile] = useState<string | null>(null)
    const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({})

    // Recruiter response state
    const [messageModalApp, setMessageModalApp] = useState<Application | null>(null)
    const [scheduleModalApp, setScheduleModalApp] = useState<Application | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [scheduledMessage, setScheduledMessage] = useState('')
    const [scheduledTime, setScheduledTime] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)
    const [schedulingMessage, setSchedulingMessage] = useState(false)
    const [schedulingMeeting, setSchedulingMeeting] = useState(false)

    const fetchJobs = async (pageToFetch = 1, append = false, currentSearch = searchTerm) => {
        try {
            if (append) setLoadingMore(true);
            const res = await axios.get(`${SANDBOX_API}/sandbox/jobs`, {
                params: {
                    page: pageToFetch,
                    per_page: 20,
                    search: currentSearch || undefined
                }
            })

            const newJobs = res.data.jobs;
            if (append) {
                setJobs(prev => [...prev, ...newJobs]);
            } else {
                setJobs(newJobs);
            }

            setHasMore(res.data.page * res.data.per_page < res.data.total);
            setPage(pageToFetch);
        } catch (err) {
            console.error('Failed to fetch jobs', err)
        } finally {
            setLoadingMore(false);
        }
    }

    const fetchApplications = async () => {
        try {
            const res = await axios.get(`${SANDBOX_API}/sandbox/applications`, {
                headers: { 'X-API-Key': API_KEY }
            })
            setApplications(res.data)
        } catch (err) {
            console.error('Failed to fetch applications', err)
        }
    }

    const fetchCompanies = async () => {
        try {
            const res = await axios.get(`${SANDBOX_API}/sandbox/companies`)
            setCompanies(res.data)
        } catch (err) {
            console.error('Failed to fetch companies', err)
        }
    }

    const handleAddCompany = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string
        const location = formData.get('location') as string
        const description = formData.get('description') as string
        const requirements = (formData.get('requirements') as string).split(',').map(s => s.trim()).filter(Boolean)
        const responsibilities = (formData.get('responsibilities') as string).split(',').map(s => s.trim()).filter(Boolean)
        const skills_required = (formData.get('skills_required') as string).split(',').map(s => s.trim()).filter(Boolean)

        const job_details = {
            status: formData.get('status') as string,
            salary_range: formData.get('salary_range') as string,
            is_remote: formData.get('is_remote') === 'on',
            posted_date: formData.get('posted_date') as string || new Date().toISOString().split('T')[0]
        }

        if (!name || !location) return

        try {
            setAddingCompany(true)
            await axios.post(`${SANDBOX_API}/sandbox/companies`, {
                name,
                location,
                description,
                requirements,
                responsibilities,
                skills_required,
                job_details
            }, {
                headers: { 'X-API-Key': API_KEY }
            })
            await fetchCompanies()
            alert('Company added successfully!')
            setView('companies')
        } catch (err) {
            console.error('Failed to add company', err)
            alert('Failed to add company. It might already exist.')
        } finally {
            setAddingCompany(false)
        }
    }

    const handleLoadMore = () => {
        fetchJobs(page + 1, true);
    };

    const handleViewJob = async (id: string) => {
        try {
            setLoading(true)
            const res = await axios.get(`${SANDBOX_API}/sandbox/jobs/${id}`)
            setSelectedJob(res.data)
            setView('job_detail')
        } catch (err) {
            console.error('Failed to fetch job details', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitApplication = async (formData: ApplicationForm) => {
        if (!selectedJob) return

        try {
            setSubmitting(true)
            const res = await axios.post(`${SANDBOX_API}/sandbox/jobs/${selectedJob.id}/apply`, formData, {
                headers: { 'X-API-Key': API_KEY }
            })

            if (res.data.application_id) {
                alert(`Application submitted successfully! Tracking ID: ${res.data.application_id}`)
                await fetchApplications()
                setResumeFile(null)
                setView('admin')
            }
        } catch (err) {
            console.error('Application failed', err)
            alert('Failed to submit application. Please check your network or API key.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteApplication = async (appId: string) => {
        try {
            await axios.delete(`${SANDBOX_API}/sandbox/applications/${appId}`, {
                headers: { 'X-API-Key': API_KEY }
            })
            setApplications(applications.filter(a => a.id !== appId))
        } catch (err) {
            console.error('Failed to delete application', err)
        }
    }

    // Recruiter Response Functions
    const handleUpdateStatus = async (appId: string, newStatus: string) => {
        try {
            await axios.patch(`${SANDBOX_API}/sandbox/applications/${appId}/status`,
                { status: newStatus },
                { headers: { 'X-API-Key': API_KEY } }
            )
            setApplications(prev => prev.map(a =>
                a.id === appId ? { ...a, status: newStatus } : a
            ))
        } catch (err) {
            console.error('Failed to update status', err)
            alert('Failed to update status')
        }
    }

    const loadMessages = async (appId: string) => {
        try {
            const res = await axios.get(`${SANDBOX_API}/sandbox/applications/${appId}/messages`, {
                headers: { 'X-API-Key': API_KEY }
            })
            setMessages(res.data.messages || [])
        } catch (err) {
            console.error('Failed to load messages', err)
        }
    }

    const handleSendMessage = async () => {
        if (!messageModalApp || !newMessage.trim()) return
        try {
            setSendingMessage(true)
            await axios.post(`${SANDBOX_API}/sandbox/applications/${messageModalApp.id}/messages`,
                { sender: 'recruiter', content: newMessage.trim() },
                { headers: { 'X-API-Key': API_KEY } }
            )
            setNewMessage('')
            await loadMessages(messageModalApp.id)
        } catch (err) {
            console.error('Failed to send message', err)
            alert('Failed to send message')
        } finally {
            setSendingMessage(false)
        }
    }

    const handleScheduleMessage = async () => {
        if (!selectedApplication || !scheduledMessage.trim() || !scheduledTime) return
        try {
            setSchedulingMessage(true)
            await axios.post(`${SANDBOX_API}/sandbox/applications/${selectedApplication.id}/messages/schedule`,
                { content: scheduledMessage.trim(), scheduled_for: new Date(scheduledTime).toISOString() },
                { headers: { 'X-API-Key': API_KEY } }
            )
            setScheduledMessage('')
            setScheduledTime('')
            alert('Message scheduled successfully!')
            // Refresh application details
            const res = await axios.get(`${SANDBOX_API}/sandbox/applications/${selectedApplication.id}`, {
                headers: { 'X-API-Key': API_KEY }
            })
            setSelectedApplication(res.data)
        } catch (err) {
            console.error('Failed to schedule message', err)
            alert('Failed to schedule message')
        } finally {
            setSchedulingMessage(false)
        }
    }

    const reloadApplicationDetails = async (id: string) => {
        try {
            const res = await axios.get(`${SANDBOX_API}/sandbox/applications/${id}`, {
                headers: { 'X-API-Key': API_KEY }
            })
            setSelectedApplication(res.data)
        } catch (err) {
            console.error('Failed to reload details', err)
        }
    }

    const handleScheduleMeeting = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!scheduleModalApp) return

        const formData = new FormData(e.currentTarget)
        try {
            setSchedulingMeeting(true)
            await axios.post(`${SANDBOX_API}/sandbox/applications/${scheduleModalApp.id}/schedule`, {
                date: formData.get('date'),
                time: formData.get('time'),
                duration: parseInt(formData.get('duration') as string) || 30,
                meeting_type: formData.get('meeting_type'),
                notes: formData.get('notes')
            }, { headers: { 'X-API-Key': API_KEY } })

            alert('Meeting scheduled successfully!')
            setScheduleModalApp(null)
            await fetchApplications() // Refresh to show updated status
        } catch (err) {
            console.error('Failed to schedule meeting', err)
            alert('Failed to schedule meeting')
        } finally {
            setSchedulingMeeting(false)
        }
    }

    const openMessageModal = async (app: Application) => {
        setMessageModalApp(app)
        await loadMessages(app.id)
    }

    useEffect(() => {
        if (!messageModalApp) return

        const interval = setInterval(() => {
            loadMessages(messageModalApp.id)
        }, 5000)

        return () => clearInterval(interval)
    }, [messageModalApp?.id])

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [view])

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            await fetchJobs(1, false)
            await fetchApplications()
            await fetchCompanies()
            setLoading(false)
        }
        init()

        // Poll for new applications every 5 seconds for the "Real-time" effect
        const interval = setInterval(fetchApplications, 5000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            // Only search if we are on the public view
            if (view === 'public') {
                fetchJobs(1, false, searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const filteredJobs = jobs

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-sandbox-600 p-2 rounded-lg text-white">
                                <ShieldCheck size={24} />
                            </div>
                            <span className="text-xl font-bold text-gray-900 tracking-tight">RecruiterPortal</span>
                            <span className="bg-sandbox-100 text-sandbox-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ml-1">Mock Interface</span>
                        </div>

                        <div className="hidden md:flex items-center gap-6">
                            <button
                                onClick={() => setView('public')}
                                className={`text-sm font-medium ${view === 'public' || view === 'job_detail' || view === 'apply_form' ? 'text-sandbox-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Job Listings
                            </button>
                            <button
                                onClick={() => setView('admin')}
                                className={`text-sm font-medium ${view === 'admin' ? 'text-sandbox-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Incoming Applications
                                {applications.length > 0 && (
                                    <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {applications.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setView('companies')}
                                className={`text-sm font-medium ${view === 'companies' ? 'text-sandbox-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Companies
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-xs text-gray-400 hidden sm:block">
                                API: localhost:8001
                            </div>
                            <button className="md:hidden p-2 text-gray-500">
                                <Menu size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Sub-header / Search */}
            {view === 'public' && (
                <div className="bg-sandbox-900 py-12 px-4 shadow-inner">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                            Find your next career move.
                        </h1>
                        <p className="mt-3 text-lg text-sandbox-200 max-w-2xl mx-auto">
                            The sandbox environment simulates a real production job board to stress-test your autonomous agent.
                        </p>

                        <div className="mt-8 flex max-w-lg mx-auto bg-white rounded-xl shadow-2xl overflow-hidden focus-within:ring-2 focus-within:ring-sandbox-500">
                            <div className="pl-4 flex items-center text-gray-400">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by job title or company..."
                                className="flex-1 px-4 py-4 text-gray-900 focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {view === 'companies' && (
                <div className="bg-sandbox-900 py-12 px-4 shadow-inner">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                            Partner Companies
                        </h1>
                        <p className="mt-3 text-lg text-sandbox-200 max-w-2xl mx-auto">
                            Manage the list of companies available for job simulation.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                {view === 'public' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
                                Showing {filteredJobs.length} Job Postings
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {filteredJobs.map(job => (
                                <div key={job.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-sandbox-600 transition-colors">
                                                {job.title}
                                            </h3>
                                            <div className="text-sandbox-600 font-medium text-sm flex items-center gap-1 mt-1">
                                                <Briefcase size={14} />
                                                {job.company}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${job.job_type === 'internship' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {job.job_type}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-500 mb-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-gray-300" />
                                            {job.location}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-gray-300" />
                                            Posted {job.posted_date}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {job.skills_required.map(skill => (
                                            <span key={skill} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <div className="text-xs text-gray-400 font-mono">ID: {job.id.substring(0, 8)}...</div>
                                        <button
                                            onClick={() => handleViewJob(job.id)}
                                            className="bg-sandbox-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sandbox-700 transition-colors flex items-center gap-2"
                                        >
                                            Apply Now <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {hasMore && (
                            <div className="flex justify-center py-8">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-sandbox-300 transition-all shadow-sm flex items-center gap-2 group disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <div className="w-4 h-4 border-2 border-sandbox-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Show More Opportunities
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform text-sandbox-500" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                ) : view === 'job_detail' && selectedJob ? (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => setView('public')}
                            className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                            &larr; Back to Listings
                        </button>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-8 border-b border-gray-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-sandbox-100 text-sandbox-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{selectedJob.job_type}</span>
                                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{selectedJob.experience_level}</span>
                                        </div>
                                        <h1 className="text-3xl font-bold text-gray-900">{selectedJob.title}</h1>
                                        <div className="flex items-center gap-4 mt-2 text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Briefcase size={16} className="text-sandbox-500" />
                                                <span className="font-semibold">{selectedJob.company}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin size={16} className="text-gray-400" />
                                                <span>{selectedJob.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setView('apply_form')}
                                        className="w-full sm:w-auto bg-sandbox-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-sandbox-700 transition-all shadow-lg shadow-sandbox-200 flex items-center justify-center gap-2"
                                    >
                                        Apply Now <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-12">
                                <div className="md:col-span-2 space-y-8">
                                    <section>
                                        <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                            {selectedJob.description || "No description provided."}
                                        </p>
                                    </section>

                                    {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                                        <section>
                                            <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
                                            <ul className="space-y-3">
                                                {selectedJob.requirements.map((req, i) => (
                                                    <li key={i} className="flex gap-3 text-gray-600">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sandbox-500 shrink-0"></div>
                                                        {req}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

                                    {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
                                        <section>
                                            <h2 className="text-xl font-bold text-gray-900 mb-4">Responsibilities</h2>
                                            <ul className="space-y-3">
                                                {selectedJob.responsibilities.map((res, i) => (
                                                    <li key={i} className="flex gap-3 text-gray-600">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sandbox-500 shrink-0"></div>
                                                        {res}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-4">Job Details</h3>
                                        <dl className="space-y-4 text-sm">
                                            <div>
                                                <dt className="text-gray-500 mb-1">Status</dt>
                                                <dd className="font-medium text-green-600 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    Accepting Applications
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500 mb-1">Salary Range</dt>
                                                <dd className="font-medium">{selectedJob.salary_range || "Competitive"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500 mb-1">Remote Available</dt>
                                                <dd className="font-medium">{selectedJob.is_remote ? "Yes" : "No"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500 mb-1">Posted Date</dt>
                                                <dd className="font-medium">{selectedJob.posted_date}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-4">Required Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedJob.skills_required.map(skill => (
                                                <span key={skill} className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : view === 'apply_form' && selectedJob ? (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                            <div className="bg-sandbox-900 p-8 text-white relative">
                                <button
                                    onClick={() => setView('job_detail')}
                                    className="absolute left-4 top-4 text-white/50 hover:text-white transition-colors"
                                >
                                    &larr; Cancel
                                </button>
                                <div className="text-center">
                                    <p className="text-sandbox-300 text-xs font-bold uppercase tracking-widest mb-1">Application for</p>
                                    <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
                                    <p className="text-white/70 text-sm mt-1">{selectedJob.company}</p>
                                </div>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const data: any = {};
                                    formData.forEach((value, key) => data[key] = value);
                                    handleSubmitApplication(data as ApplicationForm);
                                }}
                                className="p-8 space-y-6"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                                        <input
                                            name="applicant_name"
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Upload Resume (PDF/DOCX)</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => setResumeFile(e.target.files?.[0]?.name || null)}
                                        />
                                        <div className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all ${resumeFile ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 group-hover:border-sandbox-300'}`}>
                                            <Upload size={24} className={`mx-auto mb-2 ${resumeFile ? 'text-green-500' : 'text-gray-400 group-hover:text-sandbox-500'}`} />
                                            <p className={`text-sm font-medium ${resumeFile ? 'text-green-700' : 'text-gray-500'}`}>
                                                {resumeFile || 'Drag & drop or click to upload resume'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Mock field: File stays on your device</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Brief Resume Text</label>
                                    <textarea
                                        name="resume_text"
                                        rows={4}
                                        required
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all"
                                        placeholder="Paste your professional summary or key skills here..."
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Work Authorization</label>
                                        <select
                                            name="work_authorization"
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all"
                                        >
                                            <option value="US Citizen/Permanent Resident">US Citizen / Green Card</option>
                                            <option value="Visa Required">Visa Required (F-1/H1-B)</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Availability</label>
                                        <input
                                            name="availability"
                                            required
                                            placeholder="Immediately / 2 weeks notice"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-sandbox-600 text-white py-4 rounded-xl font-bold hover:bg-sandbox-700 transition-all shadow-lg shadow-sandbox-100 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>Finalize & Submit Application <ArrowRight size={18} /></>
                                    )}
                                </button>

                                <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest leading-relaxed">
                                    Submission will be transmitted to the Sandbox API on port 8001. <br /> Authentication verified via X-API-Key.
                                </p>
                            </form>
                        </div>
                    </div>
                ) : view === 'artifact_detail' && selectedApplication ? (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => setView('admin')}
                            className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                            &larr; Back to Feed
                        </button>

                        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gray-900 p-8 text-white">
                                <span className="bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">
                                    {selectedApplication.status}
                                </span>
                                <h2 className="text-2xl font-bold font-mono">Artifact Block: {selectedApplication.id}</h2>
                                <p className="text-white/60 font-mono text-sm mt-1">
                                    Received: {new Date(selectedApplication.submitted_at).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Applicant Data</h3>
                                        <dl className="space-y-3 text-sm">
                                            <div>
                                                <dt className="text-gray-500">Name</dt>
                                                <dd className="font-medium text-gray-900">{selectedApplication.applicant?.applicant_name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500">Email</dt>
                                                <dd className="font-medium text-gray-900">{selectedApplication.applicant?.email}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500">Phone</dt>
                                                <dd className="font-medium text-gray-900">{selectedApplication.applicant?.phone}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500">Work Auth</dt>
                                                <dd className="font-medium text-gray-900">{selectedApplication.applicant?.work_authorization}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500">Availability</dt>
                                                <dd className="font-medium text-gray-900">{selectedApplication.applicant?.availability}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Target Role</h3>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="font-bold text-gray-900 text-lg">{selectedApplication.job_title}</p>
                                            <div className="flex items-center gap-2 text-sandbox-600 font-medium text-sm mt-1">
                                                <Briefcase size={14} />
                                                {selectedApplication.company}
                                            </div>
                                            <p className="text-xs text-gray-400 font-mono mt-3">Job ID: {selectedApplication.job_id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-8">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Tailored Resume Artifact</h3>
                                    <ResumeViewer
                                        content={selectedApplication.applicant?.resume_text}
                                        candidateName={selectedApplication.applicant?.applicant_name}
                                    />
                                </div>

                                {selectedApplication.applicant?.cover_letter && (
                                    <div className="border-t border-gray-100 pt-8">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Cover Letter Artifact</h3>
                                        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {selectedApplication.applicant?.cover_letter}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recruiter Action Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                {/* Messaging Center */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <MessageSquare size={18} className="text-sandbox-600" />
                                            Recruiter Chat Center
                                        </h3>
                                        <span className="text-xs text-gray-400 font-mono">APP_ID: {selectedApplication.id.substring(0, 8)}</span>
                                    </div>
                                    <div className="p-0">
                                        <div className="h-80 overflow-y-auto p-6 space-y-4">
                                            {(!selectedApplication.messages || selectedApplication.messages.length === 0) ? (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                                    <Mail size={32} className="mb-2 opacity-20" />
                                                    <p className="text-sm">No communication history</p>
                                                </div>
                                            ) : (
                                                selectedApplication.messages.map(msg => (
                                                    <div key={msg.id} className={`flex ${msg.sender === 'recruiter' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.sender === 'recruiter'
                                                            ? 'bg-sandbox-600 text-white rounded-tr-none'
                                                            : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                                                            }`}>
                                                            <div className="text-[10px] font-bold uppercase opacity-60 mb-1">
                                                                {msg.sender === 'recruiter' ? 'You' : 'Candidate'}
                                                            </div>
                                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                                            <div className="text-[9px] mt-2 opacity-50 flex items-center gap-1 justify-end">
                                                                <Clock size={10} />
                                                                {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (async () => {
                                                    if (!newMessage.trim() || sendingMessage) return;
                                                    setSendingMessage(true);
                                                    await axios.post(`${SANDBOX_API}/sandbox/applications/${selectedApplication.id}/messages`,
                                                        { sender: 'recruiter', content: newMessage.trim() },
                                                        { headers: { 'X-API-Key': API_KEY } }
                                                    );
                                                    setNewMessage('');
                                                    await reloadApplicationDetails(selectedApplication.id);
                                                    setSendingMessage(false);
                                                })()}
                                                placeholder="Type a message to the candidate..."
                                                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sandbox-500 outline-none transition-all shadow-inner"
                                            />
                                            <button
                                                onClick={async () => {
                                                    if (!newMessage.trim() || sendingMessage) return;
                                                    setSendingMessage(true);
                                                    await axios.post(`${SANDBOX_API}/sandbox/applications/${selectedApplication.id}/messages`,
                                                        { sender: 'recruiter', content: newMessage.trim() },
                                                        { headers: { 'X-API-Key': API_KEY } }
                                                    );
                                                    setNewMessage('');
                                                    await reloadApplicationDetails(selectedApplication.id);
                                                    setSendingMessage(false);
                                                }}
                                                disabled={sendingMessage || !newMessage.trim()}
                                                className="bg-sandbox-600 text-white p-3 rounded-xl hover:bg-sandbox-700 transition-all disabled:opacity-50 shadow-md"
                                            >
                                                {sendingMessage ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Message Scheduler */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                                        <Clock size={18} className="text-orange-500" />
                                        <h3 className="font-bold text-gray-900">Message Scheduler (Simulation)</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Release Time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={scheduledTime}
                                                    onChange={(e) => setScheduledTime(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sandbox-500 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Template</label>
                                                <select
                                                    onChange={(e) => setScheduledMessage(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sandbox-500 outline-none"
                                                >
                                                    <option value="">Custom Message...</option>
                                                    <option value="Hi, we loved your profile! Can you talk tomorrow?">Interview Request</option>
                                                    <option value="Thank you for applying, but we've decided to move forward with other candidates.">Rejection (Delayed)</option>
                                                    <option value="We are currently reviewing your application and will get back to you soon.">Auto-Response</option>
                                                </select>
                                            </div>
                                        </div>
                                        <textarea
                                            value={scheduledMessage}
                                            onChange={(e) => setScheduledMessage(e.target.value)}
                                            placeholder="Write the message to be sent at the scheduled time..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-sandbox-500 outline-none h-24 resize-none shadow-inner"
                                        />
                                        <button
                                            onClick={handleScheduleMessage}
                                            disabled={schedulingMessage || !scheduledMessage.trim() || !scheduledTime}
                                            className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <Calendar size={18} />
                                            {schedulingMessage ? 'Scheduling...' : 'Queue Message for Release'}
                                        </button>

                                        {/* Scheduled Queue Items */}
                                        {selectedApplication.scheduled_messages && selectedApplication.scheduled_messages.length > 0 && (
                                            <div className="mt-6 space-y-3">
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scheduled Queue</h4>
                                                {selectedApplication.scheduled_messages.map(sm => (
                                                    <div key={sm.id} className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="text-xs text-orange-900 line-clamp-2">{sm.content}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase transition-all">
                                                                    {sm.status}
                                                                </span>
                                                                <span className="text-[10px] text-orange-400 font-mono">
                                                                    Release: {new Date(sm.scheduled_for).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            disabled
                                                            className="p-1 px-2 text-[10px] font-bold text-orange-300 border border-orange-100 rounded"
                                                        >
                                                            X
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Workflow Progress (Status) */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                                        <GraduationCap size={18} className="text-sandbox-600" />
                                        <h3 className="font-bold text-gray-900">Application Pipeline</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            {[
                                                { id: 'submitted', label: 'Applied', color: 'blue' },
                                                { id: 'interviewing', label: 'Interview Process', color: 'purple' },
                                                { id: 'accepted', label: 'Offer Extended', color: 'green' },
                                                { id: 'rejected', label: 'Candidate Rejected', color: 'red' }
                                            ].map((step, idx) => (
                                                <button
                                                    key={step.id}
                                                    onClick={() => handleUpdateStatus(selectedApplication.id, step.id).then(() => reloadApplicationDetails(selectedApplication.id))}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedApplication.status === step.id
                                                        ? `bg-${step.color}-600 text-white border-${step.color}-600 shadow-lg shadow-${step.color}-100`
                                                        : 'bg-white text-gray-600 border-gray-100 hover:border-sandbox-200'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedApplication.status === step.id ? 'bg-white/20' : 'bg-gray-100'
                                                        }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-sm font-bold flex-1 text-left">{step.label}</span>
                                                    {selectedApplication.status === step.id && <CheckCircle size={16} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Direct Actions */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 bg-gray-50">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <ShieldCheck size={18} className="text-sandbox-600" />
                                            Fast-Track Actions
                                        </h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setScheduleModalApp(selectedApplication)}
                                            className="flex flex-col items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100 hover:bg-purple-100 transition-all gap-2"
                                        >
                                            <Calendar size={24} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Book Zoom</span>
                                        </button>
                                        <button
                                            onClick={() => setView('admin')}
                                            className="flex flex-col items-center justify-center p-4 bg-gray-50 text-gray-700 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all gap-2"
                                        >
                                            <ArrowRight size={24} className="rotate-180" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Archive</span>
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApplication.id, 'accepted').then(() => reloadApplicationDetails(selectedApplication.id))}
                                            className="flex flex-col items-center justify-center p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 hover:bg-green-100 transition-all gap-2"
                                        >
                                            <CheckCheck size={24} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Quick Offer</span>
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected').then(() => reloadApplicationDetails(selectedApplication.id))}
                                            className="flex flex-col items-center justify-center p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 hover:bg-red-100 transition-all gap-2"
                                        >
                                            <XCircle size={24} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Reject</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Application Pipeline Log (Queue) */}
                                <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden text-white border border-gray-800">
                                    <div className="p-4 border-b border-white/10 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Audit log / action queue</h3>
                                    </div>
                                    <div className="p-4 space-y-4 max-h-64 overflow-y-auto font-mono text-[10px]">
                                        <div className="flex gap-3">
                                            <span className="text-sandbox-400">[{new Date(selectedApplication.submitted_at).toLocaleTimeString()}]</span>
                                            <span className="text-green-400">EVENT_RECEIVED: Application submitted via API</span>
                                        </div>
                                        {selectedApplication.messages?.map(m => (
                                            <div key={m.id} className="flex gap-3">
                                                <span className="text-sandbox-400">[{new Date(m.sent_at).toLocaleTimeString()}]</span>
                                                <span className={m.sender === 'recruiter' ? 'text-blue-400' : 'text-purple-400'}>
                                                    {m.sender.toUpperCase()}_MSG: {m.content.substring(0, 30)}...
                                                </span>
                                            </div>
                                        ))}
                                        {selectedApplication.meetings?.map(m => (
                                            <div key={m.id} className="flex gap-3">
                                                <span className="text-sandbox-400">[{new Date(m.created_at || Date.now()).toLocaleTimeString()}]</span>
                                                <span className="text-orange-400">MEETING_BOOKED: {m.meeting_type.toUpperCase()} scheduled for {m.date}</span>
                                            </div>
                                        ))}
                                        {selectedApplication.status_updated_at && (
                                            <div className="flex gap-3">
                                                <span className="text-sandbox-400">[{new Date(selectedApplication.status_updated_at).toLocaleTimeString()}]</span>
                                                <span className="text-yellow-400">STATUS_CHANGED: Moved to {selectedApplication.status.toUpperCase()}</span>
                                            </div>
                                        )}
                                        <div className="pt-2 border-t border-white/5 text-white/30 italic">End of live log. Polling active...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : view === 'companies' ? (
                    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <Building2 size={24} className="text-sandbox-600" />
                                    Job Simulation Companies
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">Manage the database of companies available for your autonomous agent.</p>
                            </div>
                            <button
                                onClick={() => setView('add_company')}
                                className="bg-sandbox-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-sandbox-700 transition-all shadow-md flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Register New Company
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {companies.map((company, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-all group">
                                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-sandbox-600 font-bold text-2xl border border-gray-100 group-hover:bg-sandbox-50 transition-colors">
                                        {company.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">{company.name}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                                            <MapPin size={14} className="text-gray-400" />
                                            {company.location}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                                {company.job_details?.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : view === 'add_company' ? (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => setView('companies')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                            >
                                <ArrowRight size={20} className="rotate-180" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Register New Company</h2>
                                <p className="text-gray-500 text-sm">Fill in the details to add a new entity to the simulation pool.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gray-900 p-8 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="bg-sandbox-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-sandbox-500/20">
                                        <Plus size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold">Company Profile & Mock Posting</h3>
                                    <p className="text-white/60 text-sm mt-1">This data will be used to generate realistic application targets for testing.</p>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-sandbox-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            </div>

                            <form onSubmit={handleAddCompany} className="p-8 space-y-8">
                                <section className="space-y-6">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        的基础信息 <span className="h-px bg-gray-100 flex-1"></span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Company Name</label>
                                            <input
                                                name="name"
                                                required
                                                placeholder="e.g. Acme Innovations"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Primary Location (HQ)</label>
                                            <input
                                                name="location"
                                                required
                                                placeholder="e.g. San Francisco, CA"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Company Description</label>
                                        <textarea
                                            name="description"
                                            rows={3}
                                            placeholder="Tell us about the company's mission and culture..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sandbox-500 focus:bg-white transition-all resize-none"
                                        />
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Mock Job Configuration <span className="h-px bg-gray-100 flex-1"></span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Industry-Specific Requirements</label>
                                            <input name="requirements" placeholder="Comma separated: BS Computer Science, 5+ yrs Ruby..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sandbox-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Typical Responsibilities</label>
                                            <input name="responsibilities" placeholder="Comma separated: Maintain CI/CD, Design databases..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sandbox-500" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Tech Stack / Core Skills</label>
                                            <input name="skills_required" placeholder="Comma separated: React, Tailwind, VPC, AWS S3..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sandbox-500" />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border border-gray-100">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Recruiting Status</label>
                                            <select name="status" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-sandbox-500 text-sm font-medium">
                                                <option>Accepting Applications</option>
                                                <option>Closing Soon</option>
                                                <option>Paused</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Target Salary Package</label>
                                            <input name="salary_range" placeholder="e.g. $120,000 - $180,000" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-sandbox-500 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Posting Date</label>
                                            <input type="date" name="posted_date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-sandbox-500 text-sm" />
                                        </div>
                                        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 md:col-span-3">
                                            <input type="checkbox" name="is_remote" id="is_remote_separate" defaultChecked className="w-5 h-5 text-sandbox-600 border-gray-300 rounded focus:ring-sandbox-500" />
                                            <label htmlFor="is_remote_separate" className="text-sm text-gray-700 font-bold">This company supports Remote Work / Distributed teams</label>
                                        </div>
                                    </div>
                                </section>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setView('companies')}
                                        className="flex-1 bg-white border border-gray-200 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all font-sans"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addingCompany}
                                        className="flex-[2] bg-sandbox-600 text-white py-4 rounded-xl font-bold hover:bg-sandbox-700 transition-all shadow-lg shadow-sandbox-600/20 flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
                                    >
                                        {addingCompany ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>Confirm Registration <CheckCircle size={20} /></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Admin View / Applications Log */
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Application Feed (Incoming)</h2>
                                    <p className="text-sm text-gray-500">Watch your autonomous agent submit applications to port 8001.</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    Live Updates Active
                                </div>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {applications.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ShieldCheck size={32} className="text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">No applications received yet</h3>
                                        <p className="text-gray-500 max-w-sm mx-auto mt-2">
                                            Start your Agent in the main dashboard to see entries appear here in real-time.
                                        </p>
                                    </div>
                                ) : (
                                    [...applications].reverse().map(app => {
                                        const statusColors: Record<string, string> = {
                                            'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                            'submitted': 'bg-blue-100 text-blue-800 border-blue-200',
                                            'interviewing': 'bg-purple-100 text-purple-800 border-purple-200',
                                            'accepted': 'bg-green-100 text-green-800 border-green-200',
                                            'rejected': 'bg-red-100 text-red-800 border-red-200'
                                        };
                                        const borderColors: Record<string, string> = {
                                            'pending': 'border-l-yellow-500',
                                            'submitted': 'border-l-blue-500',
                                            'interviewing': 'border-l-purple-500',
                                            'accepted': 'border-l-green-500',
                                            'rejected': 'border-l-red-500'
                                        };
                                        return (
                                            <div key={app.id} className={`p-6 hover:bg-gray-50 transition-colors border-l-4 ${borderColors[app.status] || 'border-l-green-500'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-mono text-gray-400">ID: {app.id.substring(0, 8)}</span>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs text-gray-400">Received at {new Date(app.submitted_at).toLocaleTimeString()}</span>
                                                        </div>
                                                        <h4 className="text-lg font-bold text-gray-900">
                                                            {app.applicant?.applicant_name || 'Anonymous Submission'}
                                                        </h4>
                                                        <p className="text-sandbox-700 font-medium">
                                                            Applied for <span className="text-gray-900 font-semibold">{app.job_title}</span> at {app.company}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-3">
                                                        {/* Status Dropdown */}
                                                        <select
                                                            value={app.status}
                                                            onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${statusColors[app.status] || 'bg-gray-100 text-gray-800'}`}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="interviewing">Interviewing</option>
                                                            <option value="accepted">Accepted</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>

                                                        {/* Action Buttons */}
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => openMessageModal(app)}
                                                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Send Message"
                                                            >
                                                                <MessageSquare size={14} />
                                                                Message
                                                            </button>
                                                            <button
                                                                onClick={() => setScheduleModalApp(app)}
                                                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                title="Schedule Meeting"
                                                            >
                                                                <Calendar size={14} />
                                                                Schedule
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedApplication(app);
                                                                    setView('artifact_detail');
                                                                }}
                                                                className="text-xs text-sandbox-600 hover:text-sandbox-800 font-semibold underline underline-offset-4"
                                                            >
                                                                View Details
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteApplication(app.id)}
                                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete application"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 bg-gray-900 rounded-lg p-3 overflow-hidden">
                                                    <div className="text-[10px] text-sandbox-400 uppercase font-bold tracking-widest mb-2 opacity-50">Transmitted Skills</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(() => {
                                                            const skills = getSkillsFromResume(app.applicant?.resume_text || '');
                                                            const isExpanded = expandedSkills[app.id] || false;

                                                            if (skills.length > 0) {
                                                                const displayedSkills = isExpanded ? skills : skills.slice(0, 8);
                                                                return (
                                                                    <>
                                                                        {displayedSkills.map((skill, i) => (
                                                                            <span key={i} className="text-[10px] text-white/70 bg-white/10 px-1.5 py-0.5 rounded">
                                                                                {skill}
                                                                            </span>
                                                                        ))}
                                                                        {skills.length > 8 && (
                                                                            <button
                                                                                onClick={() => setExpandedSkills(prev => ({ ...prev, [app.id]: !isExpanded }))}
                                                                                className="text-[10px] text-white/50 px-1.5 py-0.5 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                                                                            >
                                                                                {isExpanded ? 'Show less' : `+${skills.length - 8} more`}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            }
                                                            return <span className="text-[10px] text-gray-500 italic">No explicit skills data detected</span>;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Message Modal */}
            {messageModalApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">Message Applicant</h3>
                                <p className="text-sm text-white/60">{messageModalApp.applicant?.applicant_name}</p>
                            </div>
                            <button
                                onClick={() => { setMessageModalApp(null); setMessages([]); setNewMessage(''); }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="h-64 overflow-y-auto p-4 bg-gray-50 space-y-3">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender === 'recruiter'
                                            ? 'bg-sandbox-600 text-white ml-auto'
                                            : 'bg-white border border-gray-200'
                                            }`}
                                    >
                                        <p>{msg.content}</p>
                                        <p className={`text-[10px] mt-1 ${msg.sender === 'recruiter' ? 'text-white/60' : 'text-gray-400'}`}>
                                            {new Date(msg.sent_at).toLocaleString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type your message..."
                                className="flex-1 bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sandbox-500"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={sendingMessage || !newMessage.trim()}
                                className="bg-sandbox-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-sandbox-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {sendingMessage ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Meeting Modal */}
            {scheduleModalApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-purple-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Calendar size={20} />
                                    Schedule Interview
                                </h3>
                                <p className="text-sm text-white/80">{scheduleModalApp.applicant?.applicant_name}</p>
                            </div>
                            <button
                                onClick={() => setScheduleModalApp(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleScheduleMeeting} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Date</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Time</label>
                                    <input
                                        name="time"
                                        type="time"
                                        required
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Duration</label>
                                    <select
                                        name="duration"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="45">45 minutes</option>
                                        <option value="60">60 minutes</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Type</label>
                                    <select
                                        name="meeting_type"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="phone_screen">Phone Screen</option>
                                        <option value="interview">Interview</option>
                                        <option value="technical">Technical</option>
                                        <option value="final">Final Round</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    rows={2}
                                    placeholder="Any additional details for the candidate..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setScheduleModalApp(null)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={schedulingMeeting}
                                    className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {schedulingMeeting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCheck size={18} />
                                            Schedule
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-8 text-center text-sm text-gray-400">
                <div className="mb-2 uppercase tracking-widest text-[10px] font-bold">Sandbox Environment</div>
                <p>&copy; 2026 SandboxPortal • Simulated Job Application Flow</p>
            </footer>
        </div>
    )
}

export default App
