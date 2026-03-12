import React from 'react';
import { Aircraft, WorkOrder, RepairOrder, Technician } from '../types.ts';
import { XMarkIcon } from './icons.tsx';

interface LogbookPDFModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: WorkOrder | RepairOrder | null;
    aircraft: Aircraft | null;
    technicians: Technician[];
}

export const LogbookPDFModal: React.FC<LogbookPDFModalProps> = ({ isOpen, onClose, order, aircraft, technicians }) => {
    if (!isOpen || !order || !aircraft) return null;

    const returnToServiceSignature = order.squawks
        .map(s => s.signatures.return_to_service)
        .find(sig => sig !== null);

    const signingTech = returnToServiceSignature
        ? technicians.find(t => t.id === returnToServiceSignature.technician_id)
        : null;

    const orderDate = 'scheduled_date' in order ? order.scheduled_date : order.created_date;
    const orderId = 'wo_id' in order ? order.wo_id : order.ro_id;

    const handlePrint = () => {
        const printContent = document.getElementById('logbook-print-content');
        if (printContent) {
            const newWindow = window.open('', '_blank', 'height=800,width=800');
            newWindow?.document.write('<html><head><title>Print Logbook Entry</title>');
            newWindow?.document.write('<style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } td { vertical-align: top; padding: 4px;} .header-table td { padding-bottom: 8px; } .entries-table td { padding-top: 12px; } .cert-footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 16px; font-size: 12px; } .signature-block { margin-top: 32px; }</style>');
            newWindow?.document.write('</head><body>');
            newWindow?.document.write(printContent.innerHTML);
            newWindow?.document.write('</body></html>');
            newWindow?.document.close();
            newWindow?.focus();
            setTimeout(() => {
                newWindow?.print();
                newWindow?.close();
            }, 250);
        }
    };

    const LogbookContent = () => (
        <div style={{ color: '#000', fontFamily: 'sans-serif', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Elevate MRO</h1>
                <div style={{ textAlign: 'right' }}>
                    <p><strong>W/O #:</strong> {orderId}</p>
                    <p><strong>DATE:</strong> {new Date(orderDate).toLocaleDateString()}</p>
                </div>
            </div>
            <table className="header-table" style={{ width: '100%', marginTop: '1rem' }}>
                <tbody>
                    <tr>
                        <td><strong>MAKE:</strong> {aircraft.make}</td>
                        <td><strong>MODEL:</strong> {aircraft.model}</td>
                        <td><strong>S/N:</strong> {aircraft.serial_number}</td>
                        <td><strong>REG. NO:</strong> {aircraft.tail_number}</td>
                        <td><strong>A/C TT:</strong> {aircraft.hours_total.toFixed(1)}</td>
                    </tr>
                </tbody>
            </table>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1.5rem', borderBottom: '1px solid #000', paddingBottom: '0.25rem' }}>Entries</h2>
            <table className="entries-table" style={{ width: '100%', marginTop: '0.5rem' }}>
                <tbody>
                    {order.squawks.map((squawk, index) => (
                        <tr key={squawk.squawk_id}>
                            <td style={{ width: '30px' }}>{index + 1}</td>
                            <td>
                                <p><strong>{squawk.description}</strong></p>
                                <p style={{ marginTop: '4px', paddingLeft: '1rem' }}>{squawk.resolution || "No resolution notes entered."}</p>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="cert-footer">
                <p>
                    I certify the airframe, engine and/or component identified herein was repaired and inspected in accordance with the current Elevate MRO Repair Manual System and the
                    Federal Aviation Regulations under which the operator is certified, and was determined to be in an Airworthy Condition at this date and time with regards to the
                    inspection(s) alterations and/or maintenance performed, and is approved for return to service as per those requirements. Pertinent details of the repair(s) are on file at
                    this facility.
                </p>
                <div className="signature-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <p><strong>DATE:</strong> {signingTech ? new Date(returnToServiceSignature!.signed_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ borderBottom: '1px solid #000', padding: '0 2rem' }}>{signingTech ? signingTech.name : '________________'}</p>
                        <p><strong>SIGNED:</strong></p>
                    </div>
                     <div>
                        <p><strong>WORK ORDER:</strong> {orderId}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Logbook Entry Preview</h2>
                        <p className="text-slate-400">Previewing entry for WO: {orderId}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4 bg-white max-h-[70vh] overflow-y-auto" id="logbook-print-content">
                    <LogbookContent />
                </div>
                <div className="p-6 bg-slate-900/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Close</button>
                    <button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">Print PDF</button>
                </div>
            </div>
        </div>
    );
};