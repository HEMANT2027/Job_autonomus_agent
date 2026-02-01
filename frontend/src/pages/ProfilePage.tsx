import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import {
    UserIcon,
    BriefcaseIcon,
    AcademicCapIcon,
    CodeBracketIcon,
    RocketLaunchIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

// API Base URL
const API_BASE = '/api/v1/student';

interface ProfileData {
    personal_info?: Record<string, string>;
    experience?: any[];
    education?: any[];
    projects?: any[];
    skills?: string[];
    links?: Record<string, string>;
    preferences?: Record<string, string>;
}

export default function ProfilePage() {
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Fetch Profile on Mount
    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${API_BASE}/profile`);
            if (response.data) {
                setProfileData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch profile', error);
            showToast('Failed to load profile data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!profileData) return;
        setIsSaving(true);
        try {
            await axios.put(`${API_BASE}/profile`, profileData);
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to save profile', error);
            showToast('Failed to save profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (section: keyof ProfileData, value: any) => {
        setProfileData(prev => prev ? ({ ...prev, [section]: value }) : null);
    };

    const updateNestedField = (section: keyof ProfileData, key: string, value: string) => {
        if (!profileData) return;
        const currentSection = (profileData[section] as Record<string, string>) || {};
        updateField(section, { ...currentSection, [key]: value });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No profile data found. Please upload a resume first.</p>
                <a href="/artifact-pack" className="text-indigo-600 hover:underline mt-2 inline-block">Go to Upload</a>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserIcon className="w-7 h-7 text-indigo-600" />
                        Student Profile
                    </h1>
                    <p className="text-gray-500 mt-1">Manage your resume data and targeting preferences.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                        <CheckCircleIcon className="w-5 h-5" />
                    )}
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Preferences & Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Targeting Preferences */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <RocketLaunchIcon className="w-5 h-5 text-indigo-500" />
                            Targeting
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
                                <input
                                    type="text"
                                    value={profileData.preferences?.target_role || ''}
                                    onChange={(e) => updateNestedField('preferences', 'target_role', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="e.g. Backend Engineer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                                <select
                                    value={profileData.preferences?.tone || 'Professional'}
                                    onChange={(e) => updateNestedField('preferences', 'tone', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="Professional">Professional</option>
                                    <option value="Enthusiastic">Enthusiastic</option>
                                    <option value="Analytical">Analytical</option>
                                    <option value="Executive">Executive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Key Strengths</label>
                                <textarea
                                    value={profileData.preferences?.strengths || ''}
                                    onChange={(e) => updateNestedField('preferences', 'strengths', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="e.g. Python, Leadership"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Personal Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-gray-500" />
                            Personal Info
                        </h2>
                        <div className="space-y-4">
                            {['name', 'email', 'phone', 'location', 'linkedin', 'github'].map((field) => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                                    <input
                                        type="text"
                                        value={profileData.personal_info?.[field] || profileData.links?.[field] || ''}
                                        onChange={(e) => {
                                            if (['linkedin', 'github', 'portfolio'].includes(field)) {
                                                updateNestedField('links', field, e.target.value);
                                            } else {
                                                updateNestedField('personal_info', field, e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Experience, Education, Projects */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Experience */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <BriefcaseIcon className="w-5 h-5 text-blue-500" />
                            Experience
                        </h2>
                        <div className="space-y-4">
                            {profileData.experience?.map((exp, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <input
                                            value={exp.role || ''}
                                            onChange={(e) => {
                                                const newExp = [...(profileData.experience || [])];
                                                newExp[idx] = { ...exp, role: e.target.value };
                                                updateField('experience', newExp);
                                            }}
                                            className="font-medium bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full"
                                            placeholder="Role"
                                        />
                                        <input
                                            value={exp.company || ''}
                                            onChange={(e) => {
                                                const newExp = [...(profileData.experience || [])];
                                                newExp[idx] = { ...exp, company: e.target.value };
                                                updateField('experience', newExp);
                                            }}
                                            className="text-right text-gray-600 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full"
                                            placeholder="Company"
                                        />
                                    </div>
                                    <textarea
                                        value={Array.isArray(exp.responsibilities) ? exp.responsibilities.join('\n') : exp.responsibilities || ''}
                                        onChange={(e) => {
                                            const newExp = [...(profileData.experience || [])];
                                            newExp[idx] = { ...exp, responsibilities: e.target.value.split('\n') };
                                            updateField('experience', newExp);
                                        }}
                                        rows={3}
                                        className="w-full text-sm text-gray-600 bg-transparent border rounded p-2 focus:border-indigo-500 focus:outline-none resize-none"
                                        placeholder="Responsibilities (one per line)"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Projects */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <CodeBracketIcon className="w-5 h-5 text-green-500" />
                            Projects
                        </h2>
                        <div className="space-y-4">
                            {profileData.projects?.map((proj, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <input
                                        value={proj.name || ''}
                                        onChange={(e) => {
                                            const newProjs = [...(profileData.projects || [])];
                                            newProjs[idx] = { ...proj, name: e.target.value };
                                            updateField('projects', newProjs);
                                        }}
                                        className="font-medium bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full mb-2"
                                        placeholder="Project Name"
                                    />
                                    <textarea
                                        value={proj.description || ''}
                                        onChange={(e) => {
                                            const newProjs = [...(profileData.projects || [])];
                                            newProjs[idx] = { ...proj, description: e.target.value };
                                            updateField('projects', newProjs);
                                        }}
                                        rows={2}
                                        className="w-full text-sm text-gray-600 bg-transparent border rounded p-2 focus:border-indigo-500 focus:outline-none resize-none"
                                        placeholder="Description"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Education */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <AcademicCapIcon className="w-5 h-5 text-purple-500" />
                            Education
                        </h2>
                        <div className="space-y-4">
                            {profileData.education?.map((edu, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex justify-between gap-4">
                                    <div className="flex-1">
                                        <input
                                            value={edu.degree || ''}
                                            onChange={(e) => {
                                                const newEdu = [...(profileData.education || [])];
                                                newEdu[idx] = { ...edu, degree: e.target.value };
                                                updateField('education', newEdu);
                                            }}
                                            className="font-medium bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full"
                                            placeholder="Degree"
                                        />
                                        <input
                                            value={edu.institution || ''}
                                            onChange={(e) => {
                                                const newEdu = [...(profileData.education || [])];
                                                newEdu[idx] = { ...edu, institution: e.target.value };
                                                updateField('education', newEdu);
                                            }}
                                            className="text-sm text-gray-600 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full mt-1"
                                            placeholder="Institution"
                                        />
                                    </div>
                                    <div className="w-32 text-right">
                                        <input
                                            value={edu.year || ''}
                                            onChange={(e) => {
                                                const newEdu = [...(profileData.education || [])];
                                                newEdu[idx] = { ...edu, year: e.target.value };
                                                updateField('education', newEdu);
                                            }}
                                            className="text-sm text-gray-500 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full text-right"
                                            placeholder="Year"
                                        />
                                        <input
                                            value={edu.score || ''}
                                            onChange={(e) => {
                                                const newEdu = [...(profileData.education || [])];
                                                newEdu[idx] = { ...edu, score: e.target.value };
                                                updateField('education', newEdu);
                                            }}
                                            className="text-sm text-gray-400 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full text-right mt-1"
                                            placeholder="Grade/GPA"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
