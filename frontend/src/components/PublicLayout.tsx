import { ReactNode, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';
import { Menu, X, ArrowRight } from 'lucide-react';

interface PublicLayoutProps {
    children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans antialiased text-slate-900 selection:bg-slate-900 selection:text-white">
            {/* Navigation */}
            <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-white/90 backdrop-blur-xl border-slate-100 py-3' : 'bg-transparent border-transparent py-6'
                }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <img
                            src="/logo.png"
                            alt="Arjun AI"
                            className="h-12 w-auto object-contain transform group-hover:scale-105 transition-transform duration-200"
                        />
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-10">
                        <a href="#features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">How it Works</a>

                        <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                            <Link to="/dashboard" className="text-sm font-semibold text-slate-900 hover:text-slate-600 transition-colors">Login</Link>
                            <Link
                                to="/dashboard"
                                className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-xl flex items-center gap-2 group transform active:scale-95 duration-200"
                            >
                                Get Started
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden text-slate-900 p-2"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-white pt-28 px-6 md:hidden animate-in fade-in slide-in-from-top-10 duration-200">
                    <div className="flex flex-col gap-8 text-xl font-medium text-slate-900 text-center">
                        <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-600">Features</a>
                        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-600">How it Works</a>
                        <div className="h-px bg-slate-100 w-full my-2"></div>
                        <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-600">Login</Link>
                        <Link
                            to="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl shadow-xl active:scale-95 transition-transform"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="flex-grow pt-24">
                {children}
            </main>

            <Footer />
        </div>
    );
}
