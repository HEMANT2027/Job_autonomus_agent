
import { Link } from 'react-router-dom';
import {
    CheckCircle,
    Play,
    ArrowRight,
    Zap,
    FileText,
    Briefcase,
    PlayCircle
} from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function LandingPage() {
    const {
        stats,
        hasProfile,
        hasAppliedOnce,
        fetchInitialData
    } = useAppStore();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const steps = [
        {
            icon: <FileText className="w-8 h-8 text-blue-500" />,
            title: "Create Profile",
            description: "Extract skills and experience from your resume.",
            link: "/artifact-pack",
            completed: hasProfile
        },
        {
            icon: <Briefcase className="w-8 h-8 text-purple-500" />,
            title: "Find Jobs",
            description: "Search and queue jobs for the autonomous agent.",
            link: "/job-search",
            completed: hasAppliedOnce || (stats?.total || 0) > 0
        },
        {
            icon: <PlayCircle className="w-8 h-8 text-orange-500" />,
            title: "Start Applying",
            description: "Launch the batch processor to apply automatically.",
            link: "/apply/queue",
            completed: hasAppliedOnce
        }
    ];

    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 bg-mesh overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-6 tracking-wide animate-pulse uppercase">
                            <Zap size={14} />
                            Version 2.0 is live
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
                            Apply to Jobs <span className="text-gradient">Autonomously</span> with AI
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                            AutoApply uses advanced AI to extract your profile, find matching jobs, and handle applications while you focus on interview prep.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <Link
                                to="/dashboard"
                                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-200/50 flex items-center justify-center gap-2 group"
                            >
                                Start Applying for Free
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#how-it-works"
                                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Play size={18} fill="currentColor" />
                                See How it Works
                            </a>
                        </div>

                        <div className="mt-16 relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent opacity-60 z-20"></div>
                            <div className="p-2 bg-gray-900/5 rounded-3xl backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden animate-float">
                                <img
                                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                                    alt="Dashboard Preview"
                                    className="rounded-2xl shadow-inner border border-gray-800/10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-purple-100 rounded-full blur-[100px] opacity-50 animate-pulse transition-all"></div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3 text-center">Features</h2>
                        <p className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 ">Built for Modern Job Seekers</p>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">Everything you need to automate your job application funnel from start to finish.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {steps.map((feature, i) => (
                            <Link
                                key={i}
                                to={feature.link}
                                className={`p-8 rounded-3xl border transition-all group block relative overflow-hidden ${feature.completed
                                    ? 'bg-green-50/50 border-green-200 hover:shadow-green-100/50'
                                    : 'bg-white/50 border-gray-100 backdrop-blur-sm hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50'
                                    }`}
                            >
                                <div className="p-4 rounded-2xl bg-white shadow-sm group-hover:scale-110 transition-transform inline-block mb-6 relative">
                                    {feature.icon}
                                    {feature.completed && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                            <CheckCircle className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    {feature.title}
                                    {feature.completed ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Done</span> : null}
                                </h3>
                                <p className="text-gray-500 leading-relaxed">{feature.description}</p>

                                <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                                    {feature.completed ? 'Manage' : 'Start Now'} <ArrowRight className="ml-2 w-4 h-4" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>


            {/* Stats / Social Proof */}
            <section className="py-20 bg-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { label: "Applications Sent", val: "500K+" },
                            { label: "Successful Hires", val: "12K+" },
                            { label: "Time Saved/User", val: "40 hrs" },
                            { label: "Average Salary Boost", val: "22%" }
                        ].map((stat, i) => (
                            <div key={i}>
                                <div className="text-4xl md:text-5xl font-black mb-2">{stat.val}</div>
                                <div className="text-blue-100 font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3">Workflow</h2>
                            <p className="text-4xl font-extrabold text-gray-900 mb-8 tracking-tight">How AutoApply Works</p>

                            <div className="space-y-8">
                                {[
                                    { step: 1, title: "Connect", desc: "Upload your resume and set your job preferences." },
                                    { step: 2, title: "Curate", desc: "Search through aggregated jobs and add interesting ones to your queue." },
                                    { step: 3, title: "Automate", desc: "Start the AI agent. It handles the form filling, research, and submission." },
                                    { step: 4, title: "Interview", desc: "Receive email notifications for interview requests and track progress." }
                                ].map((step, i) => (
                                    <div key={i} className="flex gap-6 items-start">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-bold shadow-lg shadow-blue-200">
                                            {step.step}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900 mb-1">{step.title}</h4>
                                            <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:w-1/2 relative">
                            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                            <div className="bg-white p-4 rounded-3xl shadow-2xl relative border border-gray-100">
                                <img
                                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                    alt="User Interview"
                                    className="rounded-2xl"
                                />
                                <div className="absolute bottom-10 -left-10 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-float transition-all cursor-default">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                            <CheckCircle size={18} />
                                        </div>
                                        <span className="font-bold text-gray-900">Application Success!</span>
                                    </div>
                                    <p className="text-sm text-gray-500">Google Inc. - Software Engineer</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gray-900 rounded-[3rem] p-8 md:p-16 text-center text-white relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">Ready to Land Your Next Big Role?</h2>
                            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Join 50,000+ job seekers who are beating the manual application grind with AutoApply.</p>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-gray-900 rounded-2xl font-black text-xl hover:bg-blue-50 transition-all shadow-xl hover:shadow-white/20 group"
                            >
                                Get Started for Free
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {/* Abstract Background for CTA */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_-20%,_#3b82f6,_transparent_70%)]"></div>
                    </div>
                </div>
            </section>
        </div>
    );
}
