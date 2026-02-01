
import { create } from 'zustand'
import api, { StudentProfile, ApplicationStats, BatchStatus, TrackerSummary } from '../services/api'

interface AppState {
    profile: StudentProfile | null
    stats: ApplicationStats | null
    batchStatus: BatchStatus | null
    trackerSummary: TrackerSummary | null
    isLoading: boolean
    error: string | null

    // Onboarding
    hasProfile: boolean
    hasAppliedOnce: boolean
    hasSavedJob: boolean

    // Actions
    fetchInitialData: () => Promise<void>
    setProfile: (profile: StudentProfile | null) => void
    refreshBatchStatus: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
    profile: null,
    stats: null,
    batchStatus: null,
    trackerSummary: null,
    isLoading: false,
    error: null,

    hasProfile: false,
    hasAppliedOnce: false,
    hasSavedJob: false,

    setProfile: (profile) => set({
        profile,
        hasProfile: !!profile
    }),

    refreshBatchStatus: async () => {
        try {
            const res = await api.getBatchStatus()
            if (res.data) set({ batchStatus: res.data })
        } catch (err) {
            console.error('Failed to refresh batch status', err)
        }
    },

    fetchInitialData: async () => {
        set({ isLoading: true, error: null })
        try {
            // Parallel fetch
            const [profileRes, statsRes, batchRes, trackerRes] = await Promise.allSettled([
                api.getProfile(),
                api.getApplicationStats(),
                api.getBatchStatus(),
                api.getTrackerSummary()
            ])

            let profile = null
            let hasProfile = false
            if (profileRes.status === 'fulfilled' && profileRes.value.data) {
                profile = profileRes.value.data
                hasProfile = true
            }

            let stats = null
            let hasAppliedOnce = false
            if (statsRes.status === 'fulfilled' && statsRes.value.data) {
                stats = statsRes.value.data
                hasAppliedOnce = stats.total > 0
            }

            let batchStatus = null
            if (batchRes.status === 'fulfilled' && batchRes.value.data) {
                batchStatus = batchRes.value.data
            }

            let trackerSummary = null
            if (trackerRes.status === 'fulfilled' && trackerRes.value.data) {
                trackerSummary = trackerRes.value.data
            }

            set({
                profile,
                hasProfile,
                stats,
                batchStatus,
                trackerSummary,
                hasAppliedOnce,
                isLoading: false
            })

        } catch (err: any) {
            set({ error: err.message || 'Failed to initialize app', isLoading: false })
        }
    }
}))
