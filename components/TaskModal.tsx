import React, { useState } from 'react';
// FIX: Add file extension to imports
import { BaseModal } from './BaseModal.tsx';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTask: (description: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onAddTask }) => {
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description.trim()) {
            onAddTask(description.trim());
            setDescription('');
            onClose();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Task"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button type="submit" form="add-task-form" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">Add Task</button>
                </>
            }
        >
            <form id="add-task-form" onSubmit={handleSubmit}>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300">Task Description</label>
                <textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3 text-sm"
                    required
                />
            </form>
        </BaseModal>
    );
};
