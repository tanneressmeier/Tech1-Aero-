import React from 'react';
import { InventoryItem } from '../../types.ts';
import { AlertBanner } from '../ui.tsx';

interface ConsumablesTabProps {
    items:    InventoryItem[];
    onUpdate: (i: InventoryItem) => void;
}

export const ConsumablesTab: React.FC<ConsumablesTabProps> = ({ items }) => {
    const today  = new Date();
    const warn30 = new Date(); warn30.setDate(today.getDate() + 30);
    const sorted = [...items].sort((a, b) => {
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    });
    const expired  = items.filter(i => i.expiration_date && new Date(i.expiration_date) < today);
    const expiring = items.filter(i => i.expiration_date && new Date(i.expiration_date) >= today && new Date(i.expiration_date) <= warn30);

    return (
        <div className="space-y-4">
            {expired.length  > 0 && <AlertBanner severity="critical" title={`${expired.length} expired consumable${expired.length > 1 ? 's' : ''} — remove from stock immediately`} />}
            {expiring.length > 0 && <AlertBanner severity="warning"  title={`${expiring.length} consumable${expiring.length > 1 ? 's' : ''} expiring within 30 days`} />}
            <div className="space-y-2">
                {sorted.map(item => {
                    const isExpired  = item.expiration_date && new Date(item.expiration_date) < today;
                    const isExpiring = item.expiration_date && new Date(item.expiration_date) >= today && new Date(item.expiration_date) <= warn30;
                    const daysLeft   = item.expiration_date ? Math.round((new Date(item.expiration_date).getTime() - today.getTime()) / 86400000) : null;
                    return (
                        <div key={item.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${isExpired ? 'bg-red-500/10 border-red-500/25' : isExpiring ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/3 border-white/8'}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-white truncate">{item.description}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{item.part_no}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{item.shelf_location} · {item.qty_on_hand} {item.unit}{item.dom ? ` · DOM: ${item.dom}` : ''}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                {item.expiration_date ? (
                                    <>
                                        <p className={`text-xs font-semibold font-mono ${isExpired ? 'text-red-400' : isExpiring ? 'text-amber-400' : 'text-slate-300'}`}>
                                            {isExpired ? `Expired ${Math.abs(daysLeft!)}d ago` : `${daysLeft}d remaining`}
                                        </p>
                                        <p className="text-[10px] text-slate-600">{item.expiration_date}</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-slate-600 italic">No expiry set</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
