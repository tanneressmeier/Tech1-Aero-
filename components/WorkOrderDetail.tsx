
import React, { useState } from 'react';
import { WorkOrder, Aircraft, Technician, InventoryItem, Tool, Squawk, Signature } from '../types.ts';
import { SquawkDetailView } from './SquawkDetailView.tsx';
import { SquawkKanbanBoard } from './SquawkKanbanBoard.tsx';
import { SquawkGantt } from './SquawkGantt.tsx';
import { Permissions } from '../hooks/usePermissions.ts';
import { QuoteModal } from './QuoteModal.tsx';
import { SignatureConfirmationModal } from './SignatureConfirmationModal.tsx';
import { CurrencyDollarIcon, ClipboardListIcon, CircleStackIcon, ChartBarIcon } from './icons.tsx';

interface WorkOrderDetailProps {
  order: WorkOrder;
  aircraft: Aircraft;
  technicians: Technician[];
  inventory: InventoryItem[];
  tools: Tool[];
  onBack: () => void;
  onUpdateOrder: (updatedOrder: WorkOrder) => void;
  permissions: Permissions;
  initialViewMode?: 'list' | 'board' | 'gantt';
}

// Mock current user ID for Kanban signature (in a real app, this comes from context/auth)
const CURRENT_USER_ID = 'tech-1'; 

export const WorkOrderDetail: React.FC<WorkOrderDetailProps> = ({
  order,
  aircraft,
  technicians,
  inventory,
  tools,
  onBack,
  onUpdateOrder,
  permissions,
  initialViewMode = 'list',
}) => {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'gantt'>(initialViewMode);
  const [pendingCompletionSquawkId, setPendingCompletionSquawkId] = useState<string | null>(null);

  const handleKanbanStatusUpdate = (squawkId: string, newStatus: Squawk['status']) => {
      const updatedSquawks = order.squawks.map(s => 
          s.squawk_id === squawkId ? { ...s, status: newStatus } : s
      );
      onUpdateOrder({ ...order, squawks: updatedSquawks });
  };

  const handleKanbanCompleteRequest = (squawkId: string) => {
      setPendingCompletionSquawkId(squawkId);
  };

  const handleSignatureConfirm = () => {
      if (!pendingCompletionSquawkId) return;

      const newSignature: Signature = {
          technician_id: CURRENT_USER_ID,
          signed_at: new Date().toISOString(),
      };

      const updatedSquawks = order.squawks.map(s => {
          if (s.squawk_id === pendingCompletionSquawkId) {
              return {
                  ...s,
                  status: 'completed' as const,
                  signatures: {
                      ...s.signatures,
                      work_complete: newSignature
                  }
              };
          }
          return s;
      });

      onUpdateOrder({ ...order, squawks: updatedSquawks });
      setPendingCompletionSquawkId(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <button onClick={onBack} className="text-sm font-medium text-slate-400 hover:text-white transition-colors w-fit flex items-center gap-1">
        &larr; Back to Work Orders
      </button>
      <div className="glass-panel rounded-xl p-8 border border-white/5 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
            <div>
                <h2 className="text-3xl font-light text-white tracking-wide">WO: <span className="font-mono font-normal">{order.wo_id}</span></h2>
                <p className="text-slate-400 mt-1">{order.visit_name}</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="bg-white/5 rounded-lg p-1 border border-white/10 flex items-center">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all duration-300 ${viewMode === 'list' ? 'bg-indigo-500/20 text-white shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <ClipboardListIcon className="w-4 h-4" /> List
                    </button>
                    <button 
                        onClick={() => setViewMode('board')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all duration-300 ${viewMode === 'board' ? 'bg-indigo-500/20 text-white shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <CircleStackIcon className="w-4 h-4" /> Board
                    </button>
                    <button 
                        onClick={() => setViewMode('gantt')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all duration-300 ${viewMode === 'gantt' ? 'bg-indigo-500/20 text-white shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <ChartBarIcon className="w-4 h-4" /> Gantt
                    </button>
                </div>
                {permissions.canEditBilling && (
                    <button onClick={() => setIsQuoteModalOpen(true)} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300">
                        <CurrencyDollarIcon className="w-4 h-4"/> Generate Quote
                    </button>
                )}
            </div>
        </div>
         <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Aircraft</p>
                <p className="text-xl font-light text-white">{order.aircraft_tail_number}</p>
            </div>
            <div>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Scheduled</p>
                <p className="text-xl font-light text-white font-mono">{new Date(order.scheduled_date).toLocaleDateString()}</p>
            </div>
            <div>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Status</p>
                <p className="text-xl font-light text-white">{order.status}</p>
            </div>
             <div>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Priority</p>
                <p className="text-xl font-light text-white uppercase">{order.priority}</p>
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {viewMode === 'list' && (
            <div className="space-y-4 pb-10">
                <h3 className="text-lg font-light text-white uppercase tracking-wider mb-4">Tasks / Squawks</h3>
                {order.squawks.map((squawk) => (
                    <SquawkDetailView
                        key={squawk.squawk_id}
                        squawk={squawk}
                        order={order}
                        aircraft={aircraft}
                        technicians={technicians}
                        inventory={inventory}
                        tools={tools}
                        onUpdateOrder={onUpdateOrder}
                        permissions={permissions}
                    />
                ))}
            </div>
        )}
        {viewMode === 'board' && (
            <SquawkKanbanBoard 
                squawks={order.squawks}
                technicians={technicians}
                onUpdateStatus={handleKanbanStatusUpdate}
                onComplete={handleKanbanCompleteRequest}
            />
        )}
        {viewMode === 'gantt' && (
            <SquawkGantt workOrder={order} />
        )}
      </div>

      <QuoteModal 
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        order={order}
        aircraft={aircraft}
        inventory={inventory}
      />

      <SignatureConfirmationModal 
        isOpen={!!pendingCompletionSquawkId}
        onClose={() => setPendingCompletionSquawkId(null)}
        onConfirm={handleSignatureConfirm}
        signatureTypeLabel="Work Complete"
      />
    </div>
  );
};
