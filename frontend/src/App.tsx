import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/DashboardPage' // Renamed Home to DashboardPage as new root
import ArtifactPackPage from './pages/ArtifactPackPage'
import JobSearchPage from './pages/JobSearchPage'
import ApplyQueuePage from './pages/ApplyQueuePage'
import TrackerPage from './pages/TrackerPage'
import ProfilePage from './pages/ProfilePage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './context/ToastContext'

function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <Layout>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/dashboard" element={<HomePage />} />
                        <Route path="/artifact-pack" element={<ArtifactPackPage />} />
                        <Route path="/job-search" element={<JobSearchPage />} />
                        <Route path="/apply/queue" element={<ApplyQueuePage />} />
                        <Route path="/tracker" element={<TrackerPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                    </Routes>
                </Layout>
            </ToastProvider>
        </ErrorBoundary>
    )
}

export default App
