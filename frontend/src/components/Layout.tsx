
import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    DocumentDuplicateIcon,
    BriefcaseIcon,
    QueueListIcon,
    ChartBarIcon,
    UserCircleIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

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
<<<<<<< HEAD
        { name: 'Profile', href: '/profile', icon: UserCircleIcon },
=======
        { name: 'My Profile', href: '/profile', icon: UserCircleIcon },
>>>>>>> 1c4beb4fe261d7c6c97d9cda88d7e187f2ef04d9
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:shadow-none border-r border-gray-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                    <NavLink to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">AutoApply</NavLink>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col flex-1 h-0 overflow-y-auto">
                    <nav className="flex-1 px-4 py-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`
                                    }
                                >
                                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                    {item.name}
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* User Profile Snippet (Bottom) */}
                    <NavLink to="/profile" className="block p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <UserCircleIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">My Profile</p>
                                <p className="text-xs text-gray-500 truncate">View & Edit Profile</p>
                            </div>
                        </div>
                    </NavLink>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-4 h-16">
                    <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <NavLink to="/" className="font-bold text-gray-900 hover:text-blue-600 transition-colors">AutoApply</NavLink>
                    <div className="w-6"></div> {/* Spacer */}
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
