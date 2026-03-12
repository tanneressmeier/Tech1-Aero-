import React from 'react';
import { BaseModal } from './BaseModal.tsx';
import { SparklesIcon, WrenchScrewdriverIcon } from './icons.tsx';

interface TroubleshootingGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    guideContent: string;
}

// A simple component to render markdown content
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    const elements = lines.map((line, index) => {
        if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold text-cyan-300 mt-4 mb-2">{line.substring(3)}</h2>;
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
            return <li key={index} className="ml-5 text-slate-300">{line.substring(2)}</li>;
        }
        if (line.match(/^\d+\.\s/)) {
             return <li key={index} className="ml-5 text-slate-300">{line.substring(line.indexOf(' ') + 1)}</li>;
        }
        return <p key={index} className="text-slate-400">{line}</p>;
    });

    // Group list items
    const groupedElements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] | null = null;
    let listType: 'ul' | 'ol' | null = null;

    elements.forEach((el, index) => {
        if (React.isValidElement(el) && el.type === 'li') {
            const line = lines[index];
            const currentLineListType = (line.startsWith('* ') || line.startsWith('- ')) ? 'ul' : 'ol';
            if (currentList && listType === currentLineListType) {
                currentList.push(el);
            } else {
                if (currentList) {
                    groupedElements.push(React.createElement(listType!, { key: `list-${index-1}`, className: `list-disc list-inside space-y-1 my-2` }, ...currentList));
                }
                currentList = [el];
                listType = currentLineListType;
            }
        } else {
            if (currentList) {
                groupedElements.push(React.createElement(listType!, { key: `list-${index-1}`, className: `${listType === 'ul' ? 'list-disc' : 'list-decimal'} list-inside space-y-1 my-2` }, ...currentList));
                currentList = null;
                listType = null;
            }
            groupedElements.push(el);
        }
    });
     if (currentList) {
        groupedElements.push(React.createElement(listType!, { key: `list-final`, className: `${listType === 'ul' ? 'list-disc' : 'list-decimal'} list-inside space-y-1 my-2` }, ...currentList));
    }

    return <>{groupedElements}</>;
};


export const TroubleshootingGuideModal: React.FC<TroubleshootingGuideModalProps> = ({ isOpen, onClose, isLoading, guideContent }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="AI Troubleshooting Assistant"
            size="2xl"
            footer={
                <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    Close
                </button>
            }
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <SparklesIcon className="w-12 h-12 text-cyan-400 animate-pulse" />
                    <p className="mt-4 text-lg text-slate-300">Analyzing data and consulting maintenance manuals...</p>
                    <p className="text-sm text-slate-400">This may take a moment.</p>
                </div>
            ) : (
                <div className="prose prose-invert max-w-none">
                    <MarkdownRenderer content={guideContent} />
                </div>
            )}
        </BaseModal>
    );
};