import { Mail, Github, Linkedin, Twitter, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-slate-100 py-24">
            <div className="max-w-5xl mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-16">
                    {/* Brand Section */}
                    <div className="flex flex-col items-center gap-4">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200 shadow-xl shadow-slate-900/10">
                                <Zap className="w-5 h-5 text-white fill-white" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 tracking-tight">AutoApply</span>
                        </Link>
                        <p className="text-slate-500 text-sm max-w-sm leading-relaxed font-medium">
                            Autonomous AI agent that finds and applies to jobs for you. <br />
                            Stop scrolling, start interviewing.
                        </p>
                    </div>

                    {/* Links - Horizontal Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 w-full max-w-4xl">
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Product</h3>
                            <div className="flex flex-col gap-3.5 items-center sm:items-start">
                                <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Features</a>
                                <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">How it Works</a>
                                <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Company</h3>
                            <div className="flex flex-col gap-3.5 items-center sm:items-start">
                                <a href="#" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">About Us</a>
                                <a href="#" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Careers</a>
                                <a href="#" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Blog</a>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Privacy & Terms</h3>
                            <div className="flex flex-col gap-3.5 items-center sm:items-start">
                                <a href="#" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Privacy Policy</a>
                                <a href="#" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Terms of Service</a>
                                <a href="#" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Cookie Policy</a>
                            </div>
                        </div>
                    </div>

                    {/* Socials & Copyright */}
                    <div className="pt-16 border-t border-slate-100 w-full flex flex-col items-center gap-8">
                        <div className="flex items-center gap-10">
                            <a href="#" className="text-slate-300 hover:text-slate-900 transition-all transform hover:scale-110">
                                <Twitter size={20} strokeWidth={2.5} />
                                <span className="sr-only">Twitter</span>
                            </a>
                            <a href="#" className="text-slate-300 hover:text-slate-900 transition-all transform hover:scale-110">
                                <Github size={20} strokeWidth={2.5} />
                                <span className="sr-only">GitHub</span>
                            </a>
                            <a href="#" className="text-slate-300 hover:text-slate-900 transition-all transform hover:scale-110">
                                <Linkedin size={20} strokeWidth={2.5} />
                                <span className="sr-only">LinkedIn</span>
                            </a>
                            <a href="#" className="text-slate-300 hover:text-slate-900 transition-all transform hover:scale-110">
                                <Mail size={20} strokeWidth={2.5} />
                                <span className="sr-only">Email</span>
                            </a>
                        </div>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                            &copy; {new Date().getFullYear()} AutoApply AI. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
