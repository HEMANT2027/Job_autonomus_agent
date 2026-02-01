import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import ArtifactPackPage from './pages/ArtifactPackPage'
import JobSearchPage from './pages/JobSearchPage'
import ApplyQueuePage from './pages/ApplyQueuePage'
import TrackerPage from './pages/TrackerPage'
import ProfilePage from './pages/ProfilePage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './context/ToastContext'

function App() {
    return (
        <ToastProvider>
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/"
                    element={
                        <PublicLayout>
                            <LandingPage />
                        </PublicLayout>
                    }
                />

                {/* App Protected Routes */}
                <Route
                    path="/*"
                    element={
                        <Layout>
                            <ErrorBoundary>
                                <Routes>
                                    <Route path="/dashboard" element={<DashboardPage />} />
                                    <Route path="/artifact-pack" element={<ArtifactPackPage />} />
                                    <Route path="/job-search" element={<JobSearchPage />} />
                                    <Route path="/apply/queue" element={<ApplyQueuePage />} />
                                    <Route path="/tracker" element={<TrackerPage />} />
                                    <Route path="/profile" element={<ProfilePage />} />
                                    {/* Redirect old home to dashboard */}
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </ErrorBoundary>
                        </Layout>
                    }
                />
            </Routes>
        </ToastProvider>
    )
}

export default App
