import axios from 'axios'

// Use relative URL to leverage Vite proxy in development, or VITE_API_URL if provided
const API_URL = import.meta.env.VITE_API_URL || ''
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000')

export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
        }
        return Promise.reject(error)
    }
)

// ============================================================
// Types
// ============================================================

export interface StudentProfile {
    name: string
    email: string
    phone?: string
    location?: string
    linkedin_url?: string
    github_url?: string
    portfolio_url?: string
    summary?: string
    skills: string[]
    education: Education[]
    experience: Experience[]
    certifications: string[]
    languages: string[]
    preferred_job_types: string[]
    preferred_locations: string[]
    remote_preference?: string
    expected_salary_min?: number
    expected_salary_max?: number
    created_at?: string
    updated_at?: string
}

export interface Education {
    institution: string
    degree: string
    field_of_study?: string
    start_year?: number
    end_year?: number
    gpa?: number
}

export interface Experience {
    company: string
    title: string
    location?: string
    start_date?: string
    end_date?: string
    current: boolean
    description?: string
}

export interface Job {
    id: string
    title: string
    company: string
    location?: string
    description?: string
    requirements?: string
    url?: string
    salary_min?: number
    salary_max?: number
    job_type?: string
    remote: boolean
    posted_at?: string
    deadline?: string
    source?: string
    tags: string[]
    notes?: string
    is_favorite: boolean
    created_at?: string
}

export interface Application {
    id: string
    job_id?: string
    company_name: string
    job_title: string
    job_url?: string
    status: string
    applied_at?: string
    resume_used?: string
    cover_letter?: string
    notes?: string
    salary_offered?: number
    location?: string
    remote: boolean
    contact_name?: string
    contact_email?: string
    next_step?: string
    next_step_date?: string
    tags: string[]
    created_at?: string
    updated_at?: string
    submission_receipt?: {
        application_id: string
        job_id: string
        status: string
        submitted_at: string
        message: string
    }
}

export interface ApplicationStats {
    total: number
    pending: number
    applied: number
    interviewing: number
    offered: number
    rejected: number
    withdrawn: number
}

export interface QueuedJob extends Job {
    match_score?: number
    scores?: {
        skills: number
        experience: number
        constraints: number
    }
    match_reasoning?: string
    queued_at?: string
    status?: string
}

export interface BatchStatus {
    is_running: boolean
    current_status: string
    processed_count: number
    success_count: number
    failed_count: number
    total_jobs: number
    logs: string[]
}

export interface AuditLog {
    id: string
    timestamp: string
    event_type: 'snapshot' | 'generation' | 'policy_check' | 'submission' | 'verification'
    step: string
    details: any
}

export interface SandboxMessage {
    id: string
    sender: 'recruiter' | 'applicant'
    content: string
    sent_at: string
}

export interface TrackerSummary {
    total_applications: number
    success_rate: number
    submitted_count: number
    failed_count: number
    status_breakdown: Record<string, number>
    recent_activity: Application[]
}

export interface Policy {
    daily_limit: number
    min_match_score: number
    blocked_companies: string[]
    paused: boolean
    remote_only_enforced: boolean
    auto_discovery_enabled: boolean
    discovery_min_match_score: number
    global_autonomy_enabled: boolean
    updated_at?: string
}

// ============================================================
// API Functions
// ============================================================

export const api = {
    // Health
    health: () => apiClient.get('/api/health'),
    healthDb: () => apiClient.get('/api/health/db'),

    // Profile
    getProfile: () => apiClient.get<StudentProfile | null>('/api/profile'),
    saveProfile: (data: Partial<StudentProfile>) =>
        apiClient.post<StudentProfile>('/api/profile', data),
    updateProfile: (data: Partial<StudentProfile>) =>
        apiClient.patch<StudentProfile>('/api/profile', data),
    deleteProfile: () => apiClient.delete('/api/profile'),

    // Jobs
    getJobs: (params?: {
        search?: string
        company?: string
        location?: string
        remote?: boolean
        job_type?: string
        is_favorite?: boolean
    }) => apiClient.get<{ jobs: Job[]; total: number }>('/api/jobs', { params }),
    createJob: (data: Omit<Job, 'id' | 'created_at'>) =>
        apiClient.post<Job>('/api/jobs', data),
    getJob: (id: string) => apiClient.get<Job>(`/api/jobs/${id}`),
    updateJob: (id: string, data: Partial<Job>) =>
        apiClient.put<Job>(`/api/jobs/${id}`, data),
    deleteJob: (id: string) => apiClient.delete(`/api/jobs/${id}`),
    toggleFavorite: (id: string) =>
        apiClient.post<Job>(`/api/jobs/${id}/favorite`),
    bulkCreateJobs: (jobs: Omit<Job, 'id' | 'created_at'>[]) =>
        apiClient.post<{ jobs: Job[]; total: number }>('/api/jobs/bulk', jobs),

    // Applications
    getApplications: (params?: {
        status?: string
        search?: string
        company?: string
    }) => apiClient.get<{ applications: Application[]; total: number }>(
        '/api/applications', { params }
    ),
    getApplicationStats: () =>
        apiClient.get<ApplicationStats>('/api/applications/stats'),
    createApplication: (data: Omit<Application, 'id' | 'created_at' | 'updated_at'>) =>
        apiClient.post<Application>('/api/applications', data),
    getApplication: (id: string) =>
        apiClient.get<Application>(`/api/applications/${id}`),
    updateApplication: (id: string, data: Partial<Application>) =>
        apiClient.put<Application>(`/api/applications/${id}`, data),
    updateApplicationStatus: (id: string, status: string) =>
        apiClient.patch<Application>(`/api/applications/${id}/status?status=${status}`),
    deleteApplication: (id: string) =>
        apiClient.delete(`/api/applications/${id}`),
    createApplicationFromJob: (jobId: string, notes?: string) =>
        apiClient.post<Application>(`/api/applications/from-job/${jobId}`, null, {
            params: { notes }
        }),

    // Apply Queue & Batch
    getApplyQueue: () => apiClient.get<{ queue: QueuedJob[] }>('/api/v1/apply/queue'),
    removeFromApplyQueue: (jobId: string) => apiClient.delete(`/api/v1/apply/queue/${jobId}`),
    reorderApplyQueue: (jobIds: string[]) => apiClient.post('/api/v1/apply/queue/reorder', { job_ids: jobIds }),

    startBatchProcessing: (studentId?: string, limit?: number) => apiClient.post('/api/v1/apply/batch/start', { student_id: studentId, limit }),
    stopBatchProcessing: () => apiClient.post('/api/v1/apply/batch/stop'),
    getBatchStatus: () => apiClient.get<BatchStatus>('/api/v1/apply/batch/status'),

    // Tracker
    getTrackerSummary: () => apiClient.get<TrackerSummary>('/api/v1/tracker/summary'),
    getTrackerApplications: (params?: {
        status?: string
        company?: string
        date_from?: string
        date_to?: string
        limit?: number
    }) => apiClient.get<Application[]>('/api/v1/tracker/applications', { params }),
    getTrackerFailures: () => apiClient.get<Application[]>('/api/v1/tracker/failures'),
    retryApplication: (applicationId: string) => apiClient.post<{ status: string }>('/api/v1/tracker/retry', { application_id: applicationId }),

    // Audit
    getApplicationAudit: (applicationId: string) => apiClient.get<AuditLog[]>(`/api/v1/audit/application/${applicationId}`),

    // Sandbox Recruiter Feedback
    getSandboxFeedback: () => apiClient.get<any[]>('/api/v1/tracker/sandbox/feedback'),
    getSandboxFeedbackById: (applicationId: string) => apiClient.get<any>(`/api/v1/tracker/sandbox/feedback/${applicationId}`),
    sendMessageToSandbox: (applicationId: string, content: string) =>
        apiClient.post(`/api/v1/tracker/sandbox/feedback/${applicationId}/message`, { content }),

    // Policy
    getPolicy: () => apiClient.get<Policy>('/api/v1/policy/'),
    updatePolicy: (data: Partial<Policy>) => apiClient.post<Policy>('/api/v1/policy/set', data),

    // Advanced Job Actions (Discovery & Ranking)
    getDiscoveryStatus: () => apiClient.get('/api/jobs/discovery/status'),
    getQueueStats: () => apiClient.get<{ count: number }>('/api/jobs/queue/stats'),
    clearQueue: () => apiClient.delete('/api/jobs/queue'),
    searchJobs: (payload: any) => apiClient.post('/api/jobs/search', payload),
    rankJobs: (payload: any) => apiClient.post('/api/jobs/rank', payload),
    addToQueue: (jobId: string) => apiClient.post(`/api/jobs/queue/${jobId}`),

    // Student / Artifacts
    uploadResume: (formData: FormData) => apiClient.post('/api/v1/student/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    extractProfile: (resumeId: string) => apiClient.post('/api/v1/student/extract-profile', { resume_id: resumeId }),
    generateBullets: (profileData: any) => apiClient.post('/api/v1/student/generate-bullets', {
        profile_data: profileData,
        save_to_bank: true
    }),
    generateAnswers: (profileData: any) => apiClient.post('/api/v1/student/generate-answers', {
        profile_data: profileData,
        save_to_library: true
    }),
    buildProofPack: (profileData: any) => apiClient.post('/api/v1/student/build-proof-pack', {
        profile_data: profileData,
        save_to_pack: true
    }),
}

export default api
