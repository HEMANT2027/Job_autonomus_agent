import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

// API base URL
const API_BASE = '/api/v1/student';

// Step definitions
const STEPS = [
    { id: 1, name: 'Upload Resume', icon: '📄' },
    { id: 2, name: 'Review Profile', icon: '👤' },
    { id: 3, name: 'Bullet Bank', icon: '🎯' },
    { id: 4, name: 'Answer Library', icon: '💬' },
    { id: 5, name: 'Proof Pack', icon: '🔗' },
];

interface ProfileData {
    education?: any[];
    experience?: any[];
    projects?: any[];
    skills?: string[];
    links?: Record<string, string>;
    personal_info?: Record<string, string>;
}

interface Bullet {
    id: string;
    bullet: string;
    source_name: string;
    categories: string[];
}

interface Answer {
    id: string;
    category: string;
    question: string;
    answer: string;
    needs_editing: boolean;
}

interface ProofItem {
    id: string;
    title: string;
    url: string;
    category: string;
    description: string;
    related_skills: string[];
}

export default function ArtifactPackPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data state for each step
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeId, setResumeId] = useState<string | null>(null);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [proofItems, setProofItems] = useState<ProofItem[]>([]);

    // Completion status
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    // ========== Persistence Logic ==========
    const STORAGE_KEY = 'artifact_pack_builder_state_v1';

    // Load state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                if (parsed.resumeId) setResumeId(parsed.resumeId);
                if (parsed.profileData) setProfileData(parsed.profileData);
                if (parsed.bullets) setBullets(parsed.bullets);
                if (parsed.answers) setAnswers(parsed.answers);
                if (parsed.proofItems) setProofItems(parsed.proofItems);
                if (parsed.completedSteps) setCompletedSteps(new Set(parsed.completedSteps));
            } catch (e) {
                console.error('Failed to restore state', e);
            }
        }
    }, []);

    // Save state to localStorage on changes
    useEffect(() => {
        const stateToSave = {
            currentStep,
            resumeId, // We persist the ID, but not the file object
            profileData,
            bullets,
            answers,
            proofItems,
            completedSteps: Array.from(completedSteps)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [currentStep, resumeId, profileData, bullets, answers, proofItems, completedSteps]);

    // Clear state when explicitly starting over (optional helper)
    const clearSavedState = () => {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    };


    // ========== Step 1: Resume Upload ==========
    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setResumeFile(file);
            setError(null);
        } else {
            setError('Please upload a PDF file');
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setResumeFile(file);
            setError(null);
        } else {
            setError('Please upload a PDF file');
        }
    }, []);

    const uploadResume = async () => {
        if (!resumeFile) return;

        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', resumeFile);

            const response = await axios.post(`${API_BASE}/upload-resume`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResumeId(response.data.id);
            // Reset derived state for new resume
            setProfileData(null);
            setBullets([]);
            setAnswers([]);
            setProofItems([]);
            setCompletedSteps(new Set([1])); // Only step 1 is complete now
            setCurrentStep(2);

            // Auto-extract profile
            await extractProfile(response.data.id);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to upload resume');
        } finally {
            setIsLoading(false);
        }
    };



    // ========== Step 2: Extract Profile ==========
    // ... existing extractProfile function ...
    const extractProfile = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE}/extract-profile`, {
                resume_id: id
            });
            setProfileData(response.data.profile);
            setCompletedSteps(prev => new Set([...prev, 2]));
        } catch (err: any) {
            console.error('Profile extraction error:', err);
            let msg = 'Failed to extract profile';
            if (err.response) {
                const data = err.response.data;
                const backendMsg = data.error?.message || data.detail;

                if (err.response.status === 422) {
                    msg = `Extraction Failed: ${backendMsg || 'Validation error'}`;
                } else if (err.response.status === 400) {
                    msg = backendMsg || 'Resume file problem.';
                } else {
                    msg = `Server Error (${err.response.status}): ${backendMsg || 'Unknown error'}`;
                }
            } else if (err.request) {
                msg = 'Network error. Please check your connection.';
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileChange = (field: string, value: any) => {
        setProfileData(prev => prev ? { ...prev, [field]: value } : null);
    };

    // ========== Step 3: Generate Bullets ==========
    const generateBullets = async () => {
        if (!profileData) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/generate-bullets`, {
                profile_data: profileData,
                save_to_bank: true
            });
            setBullets(response.data.bullets);
            setCompletedSteps(prev => new Set([...prev, 3]));
            setCurrentStep(4);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to generate bullets');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulletEdit = (id: string, newText: string) => {
        setBullets(prev => prev.map(b => b.id === id ? { ...b, bullet: newText } : b));
    };

    const handleBulletRemove = (id: string) => {
        setBullets(prev => prev.filter(b => b.id !== id));
    };

    // ========== Step 4: Generate Answers ==========
    const generateAnswers = async () => {
        if (!profileData) {
            setError('Profile data is missing. Please restart the process.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/generate-answers`, {
                profile_data: profileData,
                save_to_library: true
            });
            // Convert answers object to array
            const answersArray = Object.values(response.data.answers) as Answer[];
            setAnswers(answersArray);
            setCompletedSteps(prev => new Set([...prev, 4]));
            setCurrentStep(5);
        } catch (err: any) {
            console.error('Answer generation failed:', err);
            setError(err.response?.data?.detail || 'Failed to generate answers. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerEdit = (id: string, newText: string) => {
        setAnswers(prev => prev.map(a => a.id === id ? { ...a, answer: newText, needs_editing: false } : a));
    };

    // ========== Step 5: Build Proof Pack ==========
    const buildProofPack = async () => {
        if (!profileData) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/build-proof-pack`, {
                profile_data: profileData,
                save_to_pack: true
            });
            setProofItems(response.data.items);
            setCompletedSteps(prev => new Set([...prev, 5]));
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to build proof pack');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProofItemRemove = (id: string) => {
        setProofItems(prev => prev.filter(item => item.id !== id));
    };

    const handleProofItemAdd = () => {
        setProofItems(prev => [...prev, {
            id: `new-${Date.now()}`,
            title: 'New Item',
            url: '',
            category: 'General',
            description: '',
            related_skills: []
        }]);
    };

    // ========== Save Complete Pack ==========
    const saveArtifactPack = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // All data is already saved via individual endpoints
            // Show success message
            alert('Artifact Pack saved successfully!');
        } catch (err: any) {
            setError('Failed to save artifact pack');
        } finally {
            setIsLoading(false);
        }
    };

    // ========== Navigation ==========
    const goToStep = (step: number) => {
        if (step <= Math.max(...completedSteps, 1) + 1) {
            setCurrentStep(step);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    // ========== Progress Indicator ==========
    const ProgressIndicator = () => (
        <div className="mb-8">
            <div className="flex justify-between items-center">
                {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                        <button
                            onClick={() => goToStep(step.id)}
                            className={`flex flex-col items-center transition-all ${currentStep === step.id
                                ? 'scale-110'
                                : completedSteps.has(step.id)
                                    ? 'opacity-100'
                                    : 'opacity-50'
                                }`}
                        >
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2 transition-all ${completedSteps.has(step.id)
                                    ? 'bg-green-500 text-white'
                                    : currentStep === step.id
                                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                                        : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                {completedSteps.has(step.id) ? '✓' : step.icon}
                            </div>
                            <span className={`text-xs font-medium ${currentStep === step.id ? 'text-indigo-600' : 'text-gray-500'
                                }`}>
                                {step.name}
                            </span>
                        </button>
                        {index < STEPS.length - 1 && (
                            <div className={`w-16 h-1 mx-2 rounded ${completedSteps.has(step.id) ? 'bg-green-500' : 'bg-gray-200'
                                }`} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    // ========== Render Steps ==========
    const renderStep1 = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Upload Your Resume</h2>
            <p className="text-gray-600">Drag and drop your resume (PDF only) or click to browse.</p>

            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${resumeFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'
                    }`}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                <input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {resumeFile ? (
                    <div className="space-y-2">
                        <div className="text-5xl">📄</div>
                        <p className="text-lg font-medium text-green-700">{resumeFile.name}</p>
                        <p className="text-sm text-green-600">
                            {(resumeFile.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                ) : resumeId ? (
                    // Restored state: We have an ID but lost the file object
                    <div className="space-y-2">
                        <div className="text-5xl text-blue-500">📄</div>
                        <p className="text-lg font-medium text-blue-700">Resume Uploaded (Restored)</p>
                        <p className="text-sm text-blue-600">
                            Ready to re-process if needed
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-5xl">📤</div>
                        <p className="text-lg font-medium text-gray-700">Drop your resume here</p>
                        <p className="text-sm text-gray-500">or click to browse</p>
                    </div>
                )}
            </div>

            <button
                onClick={uploadResume}
                disabled={(!resumeFile && !resumeId) || isLoading}
                className="w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {isLoading ? 'Uploading...' : resumeId && !resumeFile ? 'Continue with Existing Resume' : 'Upload & Extract Profile'}
            </button>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Review Extracted Profile</h2>
            <p className="text-gray-600">Review and edit the extracted information from your resume.</p>

            {profileData ? (
                <div className="space-y-4">
                    {/* Personal Info */}
                    <div className="bg-white rounded-lg border p-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Personal Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {['name', 'email', 'phone', 'location'].map(field => (
                                <div key={field}>
                                    <label className="text-sm text-gray-500 capitalize">{field}</label>
                                    <input
                                        type="text"
                                        value={profileData.personal_info?.[field] || ''}
                                        onChange={(e) => handleProfileChange('personal_info', {
                                            ...profileData.personal_info,
                                            [field]: e.target.value
                                        })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="bg-white rounded-lg border p-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {profileData.skills?.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Experience */}
                    <div className="bg-white rounded-lg border p-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Experience</h3>
                        {profileData.experience?.map((exp, index) => (
                            <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">{exp.role} at {exp.company}</p>
                                <p className="text-sm text-gray-500">{exp.duration}</p>
                            </div>
                        ))}
                    </div>

                    {/* Projects */}
                    <div className="bg-white rounded-lg border p-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Projects</h3>
                        {profileData.projects?.map((proj, index) => (
                            <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">{proj.name}</p>
                                <p className="text-sm text-gray-600">{proj.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">Extracting profile data...</p>
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={generateBullets}
                    disabled={!profileData || isLoading}
                    className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? 'Generating...' : 'Generate Bullets'}
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Review Bullet Bank</h2>
            <p className="text-gray-600">Edit or remove achievement bullets. These will be used in your applications.</p>

            <div className="space-y-3">
                {bullets.map((bullet) => (
                    <div key={bullet.id} className="bg-white rounded-lg border p-4 group">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <textarea
                                    value={bullet.bullet}
                                    onChange={(e) => handleBulletEdit(bullet.id, e.target.value)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    rows={2}
                                />
                                <div className="flex gap-2 mt-2">
                                    <span className="text-xs text-gray-500">Source: {bullet.source_name}</span>
                                    {bullet.categories.map((cat) => (
                                        <span key={cat} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => handleBulletRemove(bullet.id)}
                                className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {bullets.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No bullets generated yet. Go back and try again.</p>
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={generateAnswers}
                    disabled={!profileData || isLoading}
                    className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? 'Generating...' : 'Generate Answers'}
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Review Answer Library</h2>
            <p className="text-gray-600">Edit your answers to common application questions.</p>

            <div className="space-y-4">
                {answers.map((answer) => (
                    <div key={answer.id} className="bg-white rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-indigo-600 capitalize">
                                {answer.category.replace(/_/g, ' ')}
                            </span>
                            {answer.needs_editing && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                    Needs Review
                                </span>
                            )}
                        </div>
                        <p className="text-gray-700 font-medium mb-2">{answer.question}</p>
                        <textarea
                            value={answer.answer}
                            onChange={(e) => handleAnswerEdit(answer.id, e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            rows={3}
                        />
                    </div>
                ))}
            </div>

            {answers.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No answers generated yet.</p>
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={buildProofPack}
                    disabled={isLoading}
                    className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? 'Building...' : 'Build Proof Pack'}
                </button>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Review Proof Pack</h2>
            <p className="text-gray-600">Review and manage your proof of work artifacts.</p>

            <div className="space-y-4">
                {proofItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border p-4 group">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg font-medium text-gray-800">{item.title}</span>
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                                        {item.category}
                                    </span>
                                </div>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline text-sm"
                                >
                                    {item.url}
                                </a>
                                <p className="text-gray-600 text-sm mt-2">{item.description}</p>
                                <div className="flex gap-1 mt-2">
                                    {item.related_skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => handleProofItemRemove(item.id)}
                                className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleProofItemAdd}
                className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-indigo-500 hover:text-indigo-500 transition-all"
            >
                + Add Proof Item
            </button>

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={saveArtifactPack}
                    disabled={isLoading}
                    className="flex-1 py-3 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? 'Saving...' : '💾 Save Artifact Pack'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Artifact Pack Builder
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Build your complete job application toolkit in 5 simple steps
                    </p>
                </div>

                {/* Progress Indicator */}
                <ProgressIndicator />

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Step Content */}
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                </div>

                {/* Completion Status */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    {completedSteps.size} of 5 steps completed
                </div>
            </div>
        </div>
    );
}
