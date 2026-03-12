import React, { useState } from 'react';
import { Technician } from '../types.ts';
import { WrenchIcon, UserCircleIcon, ChevronRightIcon } from './icons.tsx';

interface LoginScreenProps {
    technicians: Technician[];
    onLogin: (technicianId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ technicians, onLogin }) => {
    const [selectedTechId, setSelectedTechId] = useState(technicians[0]?.id || '');
    const [isHovering, setIsHovering] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTechId) {
            onLogin(selectedTechId);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F17] relative overflow-hidden font-sans selection:bg-sky-500/30">
            {/* Ambient Lighting Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            <div className="w-full max-w-md mx-4 relative z-10">
                <div className="glass-panel rounded-2xl p-8 md:p-12 shadow-2xl border border-white/10 animate-fade-in-up">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-white/10 mb-6 shadow-[0_0_40px_-10px_rgba(14,165,233,0.3)]">
                            <WrenchIcon className="w-8 h-8 text-sky-400" />
                        </div>
                        <h1 className="text-4xl font-light text-white tracking-wide mb-2">TECH1 <span className="font-bold text-sky-400">AERO</span></h1>
                        <p className="text-slate-400 text-sm font-mono tracking-widest uppercase">Maintenance Optimization System</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label htmlFor="technician" className="block text-xs font-mono font-medium text-sky-400 uppercase tracking-widest mb-3 ml-1">
                                Identify User
                            </label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                    <UserCircleIcon className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition-colors duration-300" />
                                </span>
                                <select
                                    id="technician"
                                    value={selectedTechId}
                                    onChange={(e) => setSelectedTechId(e.target.value)}
                                    className="block w-full bg-[#0B0F17]/50 border border-white/10 rounded-xl py-4 pl-12 pr-10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all duration-300 appearance-none hover:bg-[#0B0F17]/80 cursor-pointer"
                                >
                                    {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id} className="bg-slate-900 text-slate-300">
                                            {tech.name} — {tech.role}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                            className="w-full relative group overflow-hidden rounded-xl bg-sky-500 p-[1px] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#0B0F17]"
                        >
                            <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#394556_50%,#E2E8F0_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center justify-center w-full h-full bg-[#0B0F17] group-hover:bg-slate-900 rounded-xl py-4 transition-colors duration-300">
                                <span className="text-sm font-bold text-white uppercase tracking-widest mr-2">Initialize Session</span>
                                <ChevronRightIcon className={`w-4 h-4 text-sky-400 transition-transform duration-300 ${isHovering ? 'translate-x-1' : ''}`} />
                            </div>
                        </button>
                    </form>
                    
                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-slate-600 font-mono">
                            SYSTEM V1.0.4 • SECURE CONNECTION
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};