// FIX: Replaced placeholder content with a functional component.
import React, { useState } from 'react';
import { RepairOrder, Aircraft, Technician, InventoryItem, Tool } from '../types.ts';
import { SquawkDetailView } from './SquawkDetailView.tsx';
import { Permissions } from '../hooks/usePermissions.ts';
import { QuoteModal } from './QuoteModal.tsx';
import { CurrencyDollarIcon } from './icons.tsx';

interface RepairOrderDetailProps {
  order: RepairOrder;
  aircraft: Aircraft;
  technicians: Technician[];
  inventory: InventoryItem[];
  tools: Tool[];
  onBack: () => void;
  onUpdateOrder: (updatedOrder: RepairOrder) => void;
  permissions: Permissions;
}

export const RepairOrderDetail: React.FC<RepairOrderDetailProps> = ({
  order,
  aircraft,
  technicians,
  inventory,
  tools,
  onBack,
  onUpdateOrder,
  permissions,
}) => {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full space-y-6">
      <button onClick={onBack} className="text-sm font-medium text-slate-400 hover:text-white transition-colors w-fit flex items-center gap-1">
        &larr; Back to Repair Orders
      </button>
      <div className="glass-panel rounded-xl p-8 border border-white/5">
        <div className="flex justify-between items-start border-b border-white/5 pb-6">
            <div>
                <h2 className="text-3xl font-light text-white tracking-wide">RO: <span className="font-mono font-normal text-amber-400">{order.ro_id}</span></h2>
                <p className="text-slate-400 mt-1">{order.description}</p>
            </div>
             {permissions.canEditBilling && (
                 <button onClick={() => setIsQuoteModalOpen(true)} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300">
                    <CurrencyDollarIcon className="w-4 h-4"/> Generate Quote
                </button>
            )}
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Aircraft</p>
                <p className="text-xl font-light text-white">{order.aircraft_tail_number}</p>
            </div>
            <div>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Created</p>
                <p className="text-xl font-light text-white font-mono">{new Date(order.created_date).toLocaleDateString()}</p>
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
      <div className="mt-6">
        <h3 className="text-lg font-light text-white uppercase tracking-wider mb-4">Tasks / Squawks</h3>
        <div className="space-y-4 pb-10">
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
      </div>
       <QuoteModal 
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        order={order}
        aircraft={aircraft}
        inventory={inventory}
      />
    </div>
  );
};