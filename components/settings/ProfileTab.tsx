import React from 'react';
import { Technician } from '../../types.ts';

interface ProfileTabProps {
    currentUser: Technician | null;
    email: string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ currentUser, email }) => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl font-bold text-slate-500 dark:text-slate-400">
                {currentUser?.name.charAt(0)}
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser?.name}</h3>
                <p className="text-slate-500 dark:text-slate-400">{currentUser?.role}</p>
                <div className="mt-2 flex gap-2">
                    {currentUser?.certifications.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs text-slate-700 dark:text-sky-400 font-mono">{c}</span>
                    ))}
                </div>
            </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 mb-4 uppercase tracking-wider">Account Security</h4>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
                    <input type="email" value={email} disabled className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 cursor-not-allowed" />
                </div>
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium">Change Password</button>
            </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 mb-4 uppercase tracking-wider">Digital Signature</h4>
            <div className="h-32 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 border-dashed rounded-md flex items-center justify-center text-slate-500 text-sm">
                No signature on file. Click to upload.
            </div>
        </div>
    </div>
);
