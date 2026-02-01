
import { Mail, Github, Linkedin, Twitter } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-1">
                        <span className="text-xl font-bold text-blue-600">AutoApply</span>
                        <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                            Revolutionizing job searches with autonomous AI agents. We help you find and apply to your dream jobs while you sleep.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Product</h3>
                        <ul className="mt-4 space-y-2 text-sm text-gray-600">
                            <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
                            <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                            <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it Works</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Company</h3>
                        <ul className="mt-4 space-y-2 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-blue-600 transition-colors">About Us</a></li>
                            <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Connect</h3>
                        <div className="flex space-x-4 mt-4">
                            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-gray-900 transition-colors"><Github size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-blue-700 transition-colors"><Linkedin size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-red-500 transition-colors"><Mail size={20} /></a>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">
                        &copy; {new Date().getFullYear()} AutoApply AI. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-gray-400">
                        <a href="#" className="hover:text-gray-600">Status</a>
                        <a href="#" className="hover:text-gray-600">Help Center</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
