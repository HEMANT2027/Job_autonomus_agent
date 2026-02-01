import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import {
    ArrowUpTrayIcon,
    UserCircleIcon,
    AdjustmentsHorizontalIcon,
    BoltIcon,
    ChatBubbleLeftRightIcon,
    LinkIcon,
    CheckIcon,
    DocumentTextIcon,
    CloudArrowUpIcon,
    XMarkIcon,
    BriefcaseIcon,
    PresentationChartLineIcon,
    AcademicCapIcon,
    ArrowDownTrayIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const STEPS = [
    { id: 1, name: 'Upload Resume', Icon: ArrowUpTrayIcon },
    { id: 2, name: 'Review Profile', Icon: UserCircleIcon },
    { id: 3, name: 'Targeting', Icon: AdjustmentsHorizontalIcon },
    { id: 4, name: 'Bullet Bank', Icon: BoltIcon },
    { id: 5, name: 'Answer Library', Icon: ChatBubbleLeftRightIcon },
    { id: 6, name: 'Proof Pack', Icon: LinkIcon },
];

interface ProfileData {
    education?: any[];
    experience?: any[];
    projects?: any[];
    skills?: string[];
    links?: Record<string, string>;
    personal_info?: Record<string, string>;
    preferences?: Record<string, string>; // New field for targeting
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

            const response = await api.uploadResume(formData);

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
    const extractProfile = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await api.extractProfile(id);
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
            const response = await api.generateBullets(profileData);
            setBullets(response.data.bullets);
            setCompletedSteps(prev => new Set([...prev, 4])); // Step 4 complete (generated)
            setCurrentStep(4); // Go to Bullet Bank (Step 4)
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
            const response = await api.generateAnswers(profileData);
            // Convert answers object to array
            const answersArray = Object.values(response.data.answers) as Answer[];
            setAnswers(answersArray);
            setCompletedSteps(prev => new Set([...prev, 5])); // Step 5 complete
            setCurrentStep(5); // Go to Answer Library (Step 5)
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
            const response = await api.buildProofPack(profileData);
            setProofItems(response.data.items);
            setCompletedSteps(prev => new Set([...prev, 6])); // Step 6 complete
            setCurrentStep(6); // Go to Proof Pack (Step 6)
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
        <div className="mb-12">
            <div className="flex justify-between items-center relative">
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 transform -translate-y-1/2 rounded-full" />

                {STEPS.map((step) => {
                    const StepIcon = step.Icon;
                    const isCompleted = completedSteps.has(step.id);
                    const isActive = currentStep === step.id;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-3 bg-slate-50 px-2 z-10">
                            <button
                                onClick={() => goToStep(step.id)}
                                disabled={!isCompleted && !isActive && step.id > Math.max(...completedSteps, 0) + 1}
                                className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border-2
                                    ${isActive
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20 scale-110'
                                        : isCompleted
                                            ? 'bg-white border-slate-900 text-slate-900'
                                            : 'bg-white border-slate-200 text-slate-300'
                                    }
                                `}
                            >
                                {isCompleted ? <CheckIcon className="w-6 h-6" /> : <StepIcon className="w-6 h-6" />}
                            </button>
                            <span className={`text-xs font-bold tracking-wider uppercase transition-colors duration-300 ${isActive ? 'text-slate-900' : 'text-slate-400'
                                }`}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ========== Render Steps ==========
    const renderStep1 = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Upload Your Resume</h2>
                <p className="text-slate-500">Start by uploading your PDF resume to extract your profile.</p>
            </div>

            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer group ${resumeFile
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-900 hover:bg-white'
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
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-slate-900/20">
                            <DocumentTextIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-slate-900">{resumeFile.name}</p>
                            <p className="text-sm text-slate-500">
                                {(resumeFile.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    </div>
                ) : resumeId ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                            <DocumentTextIcon className="w-8 h-8 text-slate-900" />
                        </div>
                        <p className="text-lg font-bold text-slate-900">Resume Uploaded (Restored)</p>
                        <p className="text-sm text-slate-500">
                            Ready to re-process if needed
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                            <CloudArrowUpIcon className="w-8 h-8 text-slate-400 group-hover:text-slate-900 transition-colors" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-slate-900">Drop your resume here</p>
                            <p className="text-sm text-slate-500">or click to browse (PDF only)</p>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={uploadResume}
                disabled={(!resumeFile && !resumeId) || isLoading}
                className="w-full py-4 px-6 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:scale-[1.02]"
            >
                {isLoading ? 'Uploading...' : resumeId && !resumeFile ? 'Continue with Existing Resume' : 'Upload & Extract Profile'}
            </button>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Review Extracted Profile</h2>
                <p className="text-slate-500">Review and edit the extracted information from your resume.</p>
            </div>

            {profileData ? (
                <div className="space-y-6">
                    {/* Personal Info */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <UserCircleIcon className="w-5 h-5 text-slate-400" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['name', 'email', 'phone', 'location'].map(field => (
                                <div key={field}>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{field}</label>
                                    <input
                                        type="text"
                                        value={profileData.personal_info?.[field] || ''}
                                        onChange={(e) => handleProfileChange('personal_info', {
                                            ...profileData.personal_info,
                                            [field]: e.target.value
                                        })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-slate-900"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Education */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <AcademicCapIcon className="w-5 h-5 text-slate-400" />
                            Education
                        </h3>
                        {profileData.education?.map((edu, index) => (
                            <div key={index} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 last:mb-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-900 text-lg">{edu.institution}</p>
                                        <p className="text-slate-600 font-medium">{edu.degree}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500 font-medium">{edu.year}</p>
                                        {edu.score ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-800 mt-1">
                                                {edu.score}
                                            </span>
                                        ) : edu.gpa ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-800 mt-1">
                                                GPA: {edu.gpa}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Skills */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <BoltIcon className="w-5 h-5 text-slate-400" />
                            Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profileData.skills?.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-slate-900 text-white rounded-full text-sm font-medium shadow-sm"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Experience */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <BriefcaseIcon className="w-5 h-5 text-slate-400" />
                            Experience
                        </h3>
                        {profileData.experience?.map((exp: any, index: number) => (
                            <div key={index} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 last:mb-0">
                                <p className="font-bold text-slate-900 text-lg">{exp.role}</p>
                                <p className="text-slate-600 font-medium mb-1">{exp.company}</p>
                                <p className="text-sm text-slate-500">{exp.duration}</p>
                            </div>
                        ))}
                    </div>

                    {/* Projects */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <PresentationChartLineIcon className="w-5 h-5 text-slate-400" />
                            Projects
                        </h3>
                        {profileData.projects?.map((proj, index) => (
                            <div key={index} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 last:mb-0">
                                <p className="font-bold text-slate-900 text-lg mb-1">{proj.name}</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{proj.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-slate-500 text-lg">Extracting profile data from your resume...</p>
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-4 px-6 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!profileData || isLoading}
                    className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/20"
                >
                    Next: Targeting Preferences
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Targeting Preferences</h2>
                <p className="text-slate-500">Customize how your artifacts are generated.</p>
            </div>

            <div className="space-y-6">
                {/* Target Role */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Job Role</label>
                    <input
                        type="text"
                        value={profileData?.preferences?.target_role || ''}
                        onChange={(e) => handleProfileChange('preferences', {
                            ...profileData?.preferences,
                            target_role: e.target.value
                        })}
                        placeholder="e.g. Senior Backend Engineer"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                    />
                </div>

                {/* Tone */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Tone</label>
                    <select
                        value={profileData?.preferences?.tone || 'Professional'}
                        onChange={(e) => handleProfileChange('preferences', {
                            ...profileData?.preferences,
                            tone: e.target.value
                        })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all bg-white"
                    >
                        <option value="Professional">Professional</option>
                        <option value="Enthusiastic">Enthusiastic</option>
                        <option value="Analytical">Analytical</option>
                        <option value="Executive">Executive</option>
                    </select>
                </div>

                {/* Strengths */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Key Strengths to Highlight</label>
                    <textarea
                        value={profileData?.preferences?.strengths || ''}
                        onChange={(e) => handleProfileChange('preferences', {
                            ...profileData?.preferences,
                            strengths: e.target.value
                        })}
                        placeholder="e.g. System Design, Python Optimization, Team Leadership"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                        rows={3}
                    />
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-4 px-6 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={generateBullets}
                    disabled={!profileData || isLoading}
                    className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/20"
                >
                    {isLoading ? 'Generating...' : 'Save & Generate Bullets'}
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Review Bullet Bank</h2>
                <p className="text-slate-500">Edit or remove achievement bullets. These will be used in your applications.</p>
            </div>

            <div className="space-y-4">
                {bullets.map((bullet) => (
                    <div key={bullet.id} className="bg-white rounded-xl border border-slate-200 p-5 group hover:border-slate-300 transition-colors shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-3">
                                <textarea
                                    value={bullet.bullet}
                                    onChange={(e) => handleBulletEdit(bullet.id, e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all resize-none text-slate-700"
                                    rows={2}
                                />
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Source: {bullet.source_name}</span>
                                    {bullet.categories.map((cat) => (
                                        <span key={cat} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => handleBulletRemove(bullet.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                title="Remove Bullet"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {bullets.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No bullets generated yet. Go back and try again.</p>
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-4 px-6 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={generateAnswers}
                    disabled={!profileData || isLoading}
                    className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/20"
                >
                    {isLoading ? 'Generating...' : 'Save & Generate Answers'}
                </button>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Review Answer Library</h2>
                <p className="text-slate-500">Edit your answers to common application questions.</p>
            </div>

            <div className="space-y-4">
                {answers.map((answer) => (
                    <div key={answer.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b-2 border-slate-900 pb-0.5">
                                {answer.category.replace(/_/g, ' ')}
                            </span>
                            {answer.needs_editing && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                                    Needs Review
                                </span>
                            )}
                        </div>
                        <p className="text-slate-800 font-semibold mb-3">{answer.question}</p>
                        <textarea
                            value={answer.answer}
                            onChange={(e) => handleAnswerEdit(answer.id, e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all resize-none text-slate-600 leading-relaxed"
                            rows={4}
                        />
                    </div>
                ))}
            </div>

            {answers.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No answers generated yet.</p>
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-4 px-6 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={buildProofPack}
                    disabled={isLoading}
                    className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/20"
                >
                    {isLoading ? 'Building...' : 'Save & Build Proof Pack'}
                </button>
            </div>
        </div>
    );

    const renderStep6 = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Review Proof Pack</h2>
                <p className="text-slate-500">Review and manage your proof of work artifacts.</p>
            </div>

            <div className="space-y-4">
                {proofItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-6 group hover:border-slate-300 transition-colors shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-lg font-bold text-slate-900">{item.title}</span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold border border-slate-200">
                                        {item.category}
                                    </span>
                                </div>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-900 hover:text-black hover:underline text-sm font-bold flex items-center gap-1 mb-2"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    {item.url}
                                </a>
                                <p className="text-slate-600 text-sm mb-3">{item.description}</p>
                                <div className="flex gap-1 flex-wrap">
                                    {item.related_skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-0.5 bg-white text-slate-500 rounded text-xs border border-slate-200"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => handleProofItemRemove(item.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                title="Remove Item"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleProofItemAdd}
                className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:border-slate-900 hover:text-slate-900 transition-all font-bold"
            >
                + Add Proof Item
            </button>

            <div className="flex gap-4">
                <button
                    onClick={prevStep}
                    className="flex-1 py-4 px-6 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={saveArtifactPack}
                    disabled={isLoading}
                    className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl flex justify-center items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Save Artifact Pack
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col">
                    <Link to="/dashboard" className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest mb-1 mx-auto">
                        <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                            Artifact Builder
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                            Build your premium job application toolkit in simple, guided steps.
                        </p>
                    </div>
                </div>

                {/* Progress Indicator */}
                <ProgressIndicator />

                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
                        <XMarkIcon className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                    {currentStep === 6 && renderStep6()}
                </div>

                {/* Completion Status */}
                <div className="text-center">
                    <Link to="/dashboard" className="text-slate-400 hover:text-slate-900 text-sm font-medium transition-colors">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
