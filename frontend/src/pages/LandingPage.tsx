
import { Link } from 'react-router-dom';
import {
    Play,
    ArrowRight,
    FileText,
    Briefcase,
    PlayCircle,
    TrendingUp,
    Shield
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import api, { Policy } from '../services/api'; // Import API services

export default function LandingPage() {
    const {
        stats,
        hasProfile,
        hasAppliedOnce,
        fetchInitialData
    } = useAppStore();

    const [policy, setPolicy] = useState<Policy | null>(null);
    const [loadingPolicy, setLoadingPolicy] = useState(false);

    useEffect(() => {
        fetchInitialData();
        loadPolicy();
    }, []);

    const loadPolicy = async () => {
        try {
            const res = await api.getPolicy();
            setPolicy(res.data);
        } catch (err) {
            console.error("Failed to load policy", err);
        }
    };

    const toggleAutonomy = async () => {
        if (!policy || loadingPolicy) return;
        try {
            setLoadingPolicy(true);
            const newState = !policy.global_autonomy_enabled;
            await api.updatePolicy({ global_autonomy_enabled: newState });
            setPolicy({ ...policy, global_autonomy_enabled: newState });
        } catch (err) {
            console.error("Failed to update policy", err);
        } finally {
            setLoadingPolicy(false);
        }
    };

    const steps = [
        {
            icon: <FileText className="w-6 h-6 text-slate-900" />,
            title: "Build Profile",
            description: "Smart extraction from your resume.",
            link: "/artifact-pack",
            completed: hasProfile
        },
        {
            icon: <Briefcase className="w-6 h-6 text-slate-900" />,
            title: "Discover Jobs",
            description: "AI-ranked matching for your skillset.",
            link: "/job-search",
            completed: hasAppliedOnce || (stats?.total || 0) > 0
        },
        {
            icon: <PlayCircle className="w-6 h-6 text-slate-900" />,
            title: "Arjun",
            description: "Autonomous batch processing.",
            link: "/apply/queue",
            completed: hasAppliedOnce
        }
    ];

    return (
        <div className="overflow-hidden bg-white text-slate-900">
            {/* Hero Section */}
            <section className="relative pt-10 pb-20 md:pt-24 md:pb-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold mb-8 uppercase tracking-widest hover:border-slate-300 transition-colors cursor-default">
                            <span className="w-2 h-2 rounded-full bg-slate-900 animate-pulse"></span>
                            Version 2.0 Now Live
                        </div>

                        {/* Global Autonomy Toggle (Prominent) */}
                        {policy && (
                            <div className="mb-12 flex justify-center">
                                <button
                                    onClick={toggleAutonomy}
                                    disabled={loadingPolicy}
                                    className={`relative group flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all duration-300 ${policy.global_autonomy_enabled
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-200'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${policy.global_autonomy_enabled ? 'bg-black/20' : 'bg-slate-200'
                                        }`}>
                                        <div className={`w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${policy.global_autonomy_enabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white'
                                            }`} />
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-xs font-bold uppercase tracking-widest ${policy.global_autonomy_enabled ? 'text-indigo-100' : 'text-slate-400'
                                            }`}>
                                            Global Autonomy Mode
                                        </div>
                                        <div className={`text-lg font-black ${policy.global_autonomy_enabled ? 'text-white' : 'text-slate-700'
                                            }`}>
                                            {policy.global_autonomy_enabled ? 'ACTIVE' : 'INACTIVE'}
                                        </div>
                                    </div>
                                    {policy.global_autonomy_enabled && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                        <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-8 leading-[0.9] tracking-tight">
                            Job Hunt <br className="hidden md:block" />
                            <span className="text-slate-400">On Autopilot.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
                            The advanced AI agent that extracts your profile, finds fitting roles, and applies while you sleep.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20">
                            <Link
                                to="/dashboard"
                                className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"
                            >
                                Start Applying
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a
                                href="#how-it-works"
                                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3"
                            >
                                <Play size={18} fill="currentColor" />
                                Watch Demo
                            </a>
                        </div>

                        {/* Hero Image */}
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                            <div className="relative p-2 bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden ring-1 ring-white/10">
                                <img
                                    src="https://images.unsplash.com/photo-1481487484168-9b930d5b7d9d?q=80&w=2938&auto=format&fit=crop"
                                    alt="Dashboard Preview"
                                    className="rounded-[1.5rem] opacity-90 transition-opacity duration-500 border border-slate-800"
                                />
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Props Section */}
            <section id="features" className="py-32 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-slate-900 font-bold tracking-widest uppercase text-sm mb-4">Core Capabilities</h2>
                        <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Engineered for Efficiency</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {steps.map((feature, i) => (
                            <Link
                                key={i}
                                to={feature.link}
                                className="group p-10 bg-white rounded-3xl border border-slate-100 hover:border-slate-300 transition-all hover:shadow-2xl hover:shadow-slate-200/50 flex flex-col items-start"
                            >
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-8 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-slate-700 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-slate-500 leading-relaxed text-lg mb-8 flex-1">
                                    {feature.description}
                                </p>
                                <div className="flex items-center text-slate-900 font-bold group-hover:translate-x-2 transition-transform">
                                    {feature.completed ? 'Manage' : 'Explore'} <ArrowRight className="ml-2 w-5 h-5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>


            {/* Trust / Stats Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 divide-x divide-slate-100">
                        {[
                            { label: "Active Users", val: "10k+", icon: <Shield className="w-5 h-5 text-slate-400 mb-2" /> },
                            { label: "Applications Sent", val: "1.2M", icon: <FileText className="w-5 h-5 text-slate-400 mb-2" /> },
                            { label: "Hours Saved", val: "450k", icon: <TrendingUp className="w-5 h-5 text-slate-400 mb-2" /> },
                            { label: "Partner Companies", val: "500+", icon: <Briefcase className="w-5 h-5 text-slate-400 mb-2" /> }
                        ].map((stat, i) => (
                            <div key={i} className="text-center pl-6 first:pl-0">
                                <div className="flex justify-center">{stat.icon}</div>
                                <div className="text-4xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight">{stat.val}</div>
                                <div className="text-slate-500 font-medium uppercase text-xs tracking-widest">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works (Minimal) */}
            <section id="how-it-works" className="py-32 bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row gap-20 items-center">
                        <div className="md:w-1/2">
                            <h2 className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-4">Workflow</h2>
                            <h3 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                                Simply Intelligent.
                            </h3>
                            <p className="text-slate-400 text-xl leading-relaxed mb-12 max-w-lg">
                                We've stripped away the complexity. Connect your profile, define your criteria, and let the agent handle the redundant work.
                            </p>

                            <div className="flex flex-col gap-8">
                                {[
                                    { title: "Connect", desc: "One-time profile setup." },
                                    { title: "Target", desc: "Set strict ranking criteria." },
                                    { title: "Launch", desc: "Autonomous execution." }
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-6 group cursor-default">
                                        <div className="text-5xl font-black text-slate-800 group-hover:text-white transition-colors duration-500">
                                            0{i + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white">{step.title}</h4>
                                            <p className="text-slate-500">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="md:w-1/2 relative bg-slate-800/50 rounded-3xl p-10 border border-slate-700/50">
                            {/* Abstract UI Representation */}
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                                        <div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="h-px bg-slate-700 w-full my-4"></div>
                                <div className="space-y-3">
                                    <div className="h-12 w-full bg-slate-800 rounded-lg flex items-center px-4 border border-slate-700">
                                        <div className="w-4 h-4 rounded-full bg-green-500 mr-3"></div>
                                        <div className="h-2 w-24 bg-slate-600 rounded"></div>
                                    </div>
                                    <div className="h-12 w-full bg-slate-800 rounded-lg flex items-center px-4 border border-slate-700 opacity-50">
                                        <div className="w-4 h-4 rounded-full bg-slate-600 mr-3"></div>
                                        <div className="h-2 w-24 bg-slate-600 rounded"></div>
                                    </div>
                                </div>
                                <div className="pt-8 text-center text-slate-500 text-sm font-mono">
                                    &gt; process.start()<br />
                                    &gt; Searching... 24 matches found<br />
                                    &gt; Applying... SUCCESS
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 bg-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tight">
                        Stop Searching. <br /> Start Automating.
                    </h2>
                    <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto">
                        Join the professionals who have reclaimed their time.
                    </p>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-4 px-12 py-6 bg-slate-900 text-white rounded-full font-bold text-xl hover:bg-black hover:scale-105 transition-all shadow-2xl"
                    >
                        Get Started Now
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>
            </section>
        </div>
    );
}

