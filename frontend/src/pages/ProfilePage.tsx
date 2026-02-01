import { useEffect, useState } from 'react';
import {
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    BriefcaseIcon,
    AcademicCapIcon,
    PencilSquareIcon,
    CheckIcon,
    XMarkIcon,
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const personalInfo = profileData?.personal_info || profile;
    const displayName = personalInfo?.name || 'Your Name';
    const displayEmail = personalInfo?.email || 'Not set';
    const displayPhone = personalInfo?.phone || 'Not set';
    const displayLocation = personalInfo?.location || 'Not set';

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                        Edit Profile
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Cover / Avatar Section */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                    <div className="absolute -bottom-12 left-8">
                        <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-gray-300">
                            <UserCircleIcon className="w-16 h-16" />
                        </div>
                    </div>
                </div>

                {/* Personal Info */}
                <div className="pt-16 pb-8 px-8">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={editForm.location || ''}
                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleEditSave}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditForm({});
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayName}</h2>
                            <div className="flex flex-wrap gap-4 mt-4 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">{displayEmail}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">{displayPhone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">{displayLocation}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Skills Section */}
            {profileData?.skills && profileData.skills.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                        {profileData.skills.map((skill, index) => (
                            <span
                                key={index}
                                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Education Section */}
            {profileData?.education && profileData.education.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AcademicCapIcon className="w-5 h-5 text-gray-400" />
                        Education
                    </h3>
                    <div className="space-y-4">
                        {profileData.education.map((edu, index) => (
                            <div key={index} className="border-l-2 border-blue-200 pl-4">
                                <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                                <p className="text-gray-600">{edu.institution}</p>
                                <p className="text-sm text-gray-500">
                                    {edu.year}
                                    {edu.gpa && ` • GPA: ${edu.gpa}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Experience Section */}
            {profileData?.experience && profileData.experience.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                        Experience
                    </h3>
                    <div className="space-y-6">
                        {profileData.experience.map((exp, index) => (
                            <div key={index} className="border-l-2 border-purple-200 pl-4">
                                <h4 className="font-semibold text-gray-900">{exp.role}</h4>
                                <p className="text-gray-600">{exp.company}</p>
                                <p className="text-sm text-gray-500 mb-2">{exp.duration}</p>
                                {exp.responsibilities && exp.responsibilities.length > 0 && (
                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
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

            {/* Links Section */}
            {profileData?.links && (profileData.links.github || profileData.links.linkedin || profileData.links.portfolio) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Links</h3>
                    <div className="flex flex-wrap gap-4">
                        {profileData.links.github && (
                            <a
                                href={profileData.links.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                GitHub
                            </a>
                        )}
                        {profileData.links.linkedin && (
                            <a
                                href={profileData.links.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
                            >
                                LinkedIn
                            </a>
                        )}
                        {profileData.links.portfolio && (
                            <a
                                href={profileData.links.portfolio}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Portfolio
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!profileData && !profile && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <UserCircleIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Profile Data Yet</h3>
                    <p className="text-gray-500 mb-6">
                        Upload your resume in the Artifact Pack section to automatically extract your profile information.
                    </p>
                    <a
                        href="/artifact-pack"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Go to Artifact Pack
                    </a>
                </div>
            )}
        </div>
    );
}