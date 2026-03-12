import React, { useState } from 'react';
import { Tool } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { generateToolingReportPDF } from '../utils/pdfGenerator.ts';
import { useToast } from '../contexts/ToastContext.tsx';

interface ToolingReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tools: Tool[];
}

type ReportType = 'overdue' | '30days' | '90days';

export const ToolingReportModal: React.FC<ToolingReportModalProps> = ({ isOpen, onClose, tools }) => {
    const [reportType, setReportType] = useState<ReportType>('30days');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleGenerateReport = async () => {
        setIsLoading(true);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filteredTools: Tool[] = [];
        let reportTitle = '';

        if (reportType === 'overdue') {
            reportTitle = 'Overdue Calibration Report';
            filteredTools = tools.filter(t => t.calibrationRequired && t.calibrationDueDate && new Date(t.calibrationDueDate) < today);
        } else {
            const days = reportType === '30days' ? 30 : 90;
            reportTitle = `Calibration Due in Next ${days} Days`;
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + days);

            filteredTools = tools.filter(t => {
                if (!t.calibrationRequired || !t.calibrationDueDate) return false;
                const dueDate = new Date(t.calibrationDueDate);
                return dueDate >= today && dueDate <= futureDate;
            });
        }

        if (filteredTools.length === 0) {
            showToast({ message: 'No tools match the selected criteria for the report.', type: 'info' });
            setIsLoading(false);
            return;
        }

        try {
            await generateToolingReportPDF(filteredTools, reportTitle);
            showToast({ message: 'Report generated successfully!', type: 'success' });
        } catch (error) {
            console.error("PDF Generation Error: ", error);
            showToast({ message: 'Failed to generate report.', type: 'error' });
        } finally {
            setIsLoading(false);
            onClose();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Generate Tooling Report"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button onClick={handleGenerateReport} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md">
                        {isLoading ? 'Generating...' : 'Generate PDF'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-400">Select the criteria for the calibration report you want to generate.</p>
                <fieldset className="space-y-2">
                    <legend className="sr-only">Report Type</legend>
                    <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input id="30days" name="report-type" type="radio" value="30days" checked={reportType === '30days'} onChange={(e) => setReportType(e.target.value as ReportType)} className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="30days" className="font-medium text-slate-200">Due in Next 30 Days</label>
                        </div>
                    </div>
                    <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input id="90days" name="report-type" type="radio" value="90days" checked={reportType === '90days'} onChange={(e) => setReportType(e.target.value as ReportType)} className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="90days" className="font-medium text-slate-200">Due in Next 90 Days</label>
                        </div>
                    </div>
                     <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input id="overdue" name="report-type" type="radio" value="overdue" checked={reportType === 'overdue'} onChange={(e) => setReportType(e.target.value as ReportType)} className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="overdue" className="font-medium text-slate-200">Currently Overdue</label>
                        </div>
                    </div>
                </fieldset>
            </div>
        </BaseModal>
    );
};