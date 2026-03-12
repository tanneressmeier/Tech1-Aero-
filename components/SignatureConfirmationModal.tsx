import React from 'react';
import { BaseModal } from './BaseModal.tsx';
import { QuestionMarkCircleIcon } from './icons.tsx';

interface SignatureConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    signatureTypeLabel: string;
}

export const SignatureConfirmationModal: React.FC<SignatureConfirmationModalProps> = ({ isOpen, onClose, onConfirm, signatureTypeLabel }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Signature"
            size="md"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Confirm & Sign
                    </button>
                </>
            }
        >
            <div className="text-center p-4">
                <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-yellow-400" />
                <h3 className="mt-2 text-lg font-medium text-white">Are you sure?</h3>
                <p className="mt-2 text-sm text-slate-400">
                    You are about to sign off for "{signatureTypeLabel}". This action will be recorded with your name and the current time.
                </p>
            </div>
        </BaseModal>
    );
};
