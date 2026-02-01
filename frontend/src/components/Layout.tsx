
import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    DocumentDuplicateIcon,
    BriefcaseIcon,
    QueueListIcon,
    ChartBarIcon,
    UserCircleIcon,
    Bars3Icon,
    XMarkIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: HomeIcon },
        { name: 'Search Jobs', href: '/job-search', icon: BriefcaseIcon },
        { name: 'Apply Queue', href: '/apply/queue', icon: QueueListIcon },
        { name: 'Tracker', href: '/tracker', icon: ChartBarIcon },
        { name: 'Artifact Pack', href: '/artifact-pack', icon: DocumentDuplicateIcon },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Premium Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto shadow-2xl md:shadow-none flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                {/* Brand Header */}
                <div className="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-900 box-content">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg shadow-white/10">
                            <SparklesIcon className="w-5 h-5 text-slate-900" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">AutoApply</span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden text-slate-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
                    <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        Main Menu
                    </div>
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `group flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-white text-slate-900 shadow-md transform scale-105'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`
                                }
                            >
                                <item.icon
                                    className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-white'
                                        }`}
                                />
                                {item.name}
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <NavLink
                        to="/profile"
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 ring-1 ring-slate-700 group-hover:ring-slate-600 transition-all">
                                <UserCircleIcon className="w-6 h-6" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-slate-300 transition-colors">My Profile</p>
                            <p className="text-xs text-slate-500 truncate group-hover:text-slate-400">View Settings</p>
                        </div>
                    </NavLink>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
                {/* Mobile Header */}
                <header className="md:hidden bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-4 h-16 flex items-center justify-between">
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                            <SparklesIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        AutoApply
                    </span>
                    <div className="w-8"></div> {/* Spacer for balance */}
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
                    <div className="max-w-7xl mx-auto animate-fadeIn">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
