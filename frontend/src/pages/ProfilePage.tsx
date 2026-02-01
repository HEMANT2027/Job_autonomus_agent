
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    BriefcaseIcon,
    PencilSquareIcon,
    CheckIcon,
    GlobeAltIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store/useAppStore';
import api from '../services/api';

interface ProfileData {
    personal_info: {
        name: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
    };
    education: Array<{
        degree: string;
        institution: string;
        year: string;
        gpa: string | null;
    }>;
    experience: Array<{
        company: string;
        role: string;
        duration: string;
        responsibilities: string[];
    }>;
    skills: string[];
    links: {
        github: string | null;
        linkedin: string | null;
        portfolio: string | null;
    };
}

export default function ProfilePage() {
    const { profile, fetchInitialData } = useAppStore();
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<ProfileData['personal_info']>>({});

    useEffect(() => {
        fetchInitialData();
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            setIsLoading(true);
            const response = await api.getProfile();
            if (response.data) {
                // Map the API response to our ProfileData structure
                const data = response.data;
                setProfileData({
                    personal_info: {
                        name: data.name,
                        email: data.email,
                        phone: data.phone || null,
                        location: data.location || null,
                    },
                    education: data.education?.map(edu => ({
                        degree: edu.degree,
                        institution: edu.institution,
                        year: edu.end_year?.toString() || '',
                        gpa: edu.gpa?.toString() || null,
                    })) || [],
                    experience: data.experience?.map(exp => ({
                        company: exp.company,
                        role: exp.title,
                        duration: `${exp.start_date || ''} - ${exp.end_date || (exp.current ? 'Present' : '')}`,
                        responsibilities: exp.description ? [exp.description] : [],
                    })) || [],
                    skills: data.skills || [],
                    links: {
                        github: data.github_url || null,
                        linkedin: data.linkedin_url || null,
                        portfolio: data.portfolio_url || null,
                    },
                });
            }
        } catch (err: any) {
            console.error('Failed to load profile:', err);
            // Don't show error if profile just doesn't exist
            if (err.response?.status !== 404) {
                setError('Failed to load profile data.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditSave = async () => {
        // In a real app, this would save to the backend
        if (profileData) {
            setProfileData({
                ...profileData,
                personal_info: {
                    ...profileData.personal_info,
                    ...editForm,
                },
            });
        }
        setIsEditing(false);
        setEditForm({});
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    const personalInfo = profileData?.personal_info || profile;
    const displayName = personalInfo?.name || 'Your Name';
    const displayEmail = personalInfo?.email || 'Not set';
    const displayPhone = personalInfo?.phone || 'Not set';
    const displayLocation = personalInfo?.location || 'Not set';

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col">
                    <Link to="/dashboard" className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest mb-1">
                        <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Profile</h1>
                            <p className="mt-1 text-slate-500">Manage your personal information and resume data.</p>
                        </div>
                        <div className="flex gap-3">
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Personal Info Card */}
                <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-semibold leading-6 text-slate-900 flex items-center gap-2">
                            <UserCircleIcon className="w-5 h-5 text-slate-400" /> Personal Information
                        </h3>
                        {!isEditing && (
                            <button
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditForm({
                                        name: personalInfo?.name || '',
                                        email: personalInfo?.email || '',
                                        phone: personalInfo?.phone || '',
                                        location: personalInfo?.location || '',
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm"
                            >
                                <PencilSquareIcon className="w-4 h-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                    <div className="px-6 py-6">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={editForm.location || ''}
                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-full flex justify-end gap-3 mt-4">
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditForm({});
                                        }}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleEditSave}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <dt className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                        <UserCircleIcon className="w-4 h-4" /> Full Name
                                    </dt>
                                    <dd className="mt-1 text-lg font-medium text-slate-900">{displayName}</dd>
                                </div>
                                <div>
                                    <dt className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                        <EnvelopeIcon className="w-4 h-4" /> Email
                                    </dt>
                                    <dd className="mt-1 text-lg font-medium text-slate-900">{displayEmail}</dd>
                                </div>
                                <div>
                                    <dt className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                        <PhoneIcon className="w-4 h-4" /> Phone
                                    </dt>
                                    <dd className="mt-1 text-lg font-medium text-slate-900">{displayPhone}</dd>
                                </div>
                                <div>
                                    <dt className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                        <MapPinIcon className="w-4 h-4" /> Location
                                    </dt>
                                    <dd className="mt-1 text-lg font-medium text-slate-900">{displayLocation}</dd>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Professional Details Section */}
                <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-semibold leading-6 text-slate-900 flex items-center gap-2">
                            <BriefcaseIcon className="w-5 h-5 text-slate-400" /> Professional Details
                        </h3>
                        <p className="text-xs text-slate-400">Extracted from resume artifact</p>
                    </div>
                    <div className="px-6 py-6 space-y-8">
                        {!profileData ? (
                            <div className="text-center py-12">
                                <UserCircleIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Profile Data Yet</h3>
                                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                                    Upload your resume in the Artifact Pack section to automatically extract your profile information.
                                </p>
                                <a
                                    href="/artifact-pack"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-black transition-colors"
                                >
                                    Go to Artifact Pack
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* Skills */}
                                {profileData.skills && profileData.skills.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            Skills
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {profileData.skills.map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Experience */}
                                {profileData.experience && profileData.experience.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            Experience
                                        </h4>
                                        <div className="space-y-6">
                                            {profileData.experience.map((exp, index) => (
                                                <div key={index} className="relative pl-6 border-l-2 border-slate-100">
                                                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white"></div>
                                                    <h5 className="font-bold text-slate-900">{exp.role}</h5>
                                                    <p className="text-sm font-medium text-slate-600">{exp.company}</p>
                                                    <p className="text-xs text-slate-400 mt-1 mb-2 font-mono">{exp.duration}</p>
                                                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                                                        <ul className="list-disc list-inside text-sm text-slate-500 space-y-1 marker:text-slate-300">
                                                            {exp.responsibilities.slice(0, 3).map((resp, i) => (
                                                                <li key={i}>{resp}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Education */}
                                {profileData.education && profileData.education.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            Education
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {profileData.education.map((edu, index) => (
                                                <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                                    <h5 className="font-bold text-slate-900">{edu.degree}</h5>
                                                    <p className="text-sm text-slate-600">{edu.institution}</p>
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        {edu.year}
                                                        {edu.gpa && ` | GPA: ${edu.gpa}`}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Links */}
                                {profileData.links && (profileData.links.github || profileData.links.linkedin || profileData.links.portfolio) && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Links</h4>
                                        <div className="flex gap-4">
                                            {profileData.links.github && (
                                                <a
                                                    href={profileData.links.github}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                                    GitHub
                                                </a>
                                            )}
                                            {profileData.links.linkedin && (
                                                <a
                                                    href={profileData.links.linkedin}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                                    LinkedIn
                                                </a>
                                            )}
                                            {profileData.links.portfolio && (
                                                <a
                                                    href={profileData.links.portfolio}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                                                >
                                                    <GlobeAltIcon className="w-5 h-5" />
                                                    Portfolio
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Next Step CTA */}
            {(profileData || profile) && (
                <div className="fixed bottom-8 right-8 z-40 animate-bounce-subtle">
                    <button
                        onClick={() => window.location.href = '/job-search'}
                        className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/40 hover:bg-black hover:scale-105 transition-all font-bold text-lg"
                    >
                        Save & Start Job Search
                        <BriefcaseIcon className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
}
