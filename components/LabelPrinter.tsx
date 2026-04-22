// LabelPrinter — generates 4"×2" printable barcode labels from InventoryItem/Form8130 data
// Uses canvas to render Code 128 barcode (pure JS implementation, no external library needed)
import React, { useRef, useEffect, useState } from 'react';
import { InventoryItem, Form8130 } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { ActionButton } from './ui.tsx';
import { PrinterIcon } from './icons.tsx';

interface LabelPrinterProps {
    isOpen: boolean;
    onClose: () => void;
    parts:  InventoryItem[];
    forms:  Form8130[];
    selectedIds: string[];
}

// ── Simplified Code 128 B encoder ─────────────────────────────────────────────
// Returns an array of 0/1 values (bar widths as modules)
function encodeCode128(text: string): number[] {
    const CODE128_B: Record<string, number> = {};
    const chars = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
    chars.split('').forEach((c, i) => { CODE128_B[c] = i + 32; });

    // Code 128 bar patterns (indexed by value 0-105)
    const PATTERNS = [
        '11011001100','11001101100','11001100110','10010011000','10010001100',
        '10001001100','10011001000','10011000100','10001100100','11001001000',
        '11001000100','11000100100','10110011100','10011011100','10011001110',
        '10111001100','10011101100','10011100110','11001110010','11001011100',
        '11001001110','11011100100','11001110100','11101101110','11101001100',
        '11100101100','11100100110','11101100100','11100110100','11100110010',
        '11011011000','11011000110','11000110110','10100011000','10001011000',
        '10001000110','10110001000','10001101000','10001100010','11010001000',
        '11000101000','11000100010','10110111000','10110001110','10001101110',
        '10111011000','10111000110','10001110110','11101110110','11010001110',
        '11000101110','11011101000','11011100010','11011101110','11101011000',
        '11101000110','11100010110','11101101000','11101100010','11100011010',
        '11101111010','11001000010','11110001010','10100110000','10100001100',
        '10010110000','10010000110','10000101100','10000100110','10110010000',
        '10110000100','10011010000','10011000010','10000110100','10000110010',
        '11000010010','11001010000','11110111010','11000010100','10001111010',
        '10100111100','10010111100','10010011110','10111100100','10011110100',
        '10011110010','11110100100','11110010100','11110010010','11011011110',
        '11011110110','11110110110','10101111000','10100011110','10001011110',
        '10111101000','10111100010','11110101000','11110100010','10111011110',
        '10111101110','11101011110','11110101110','11010000100','11010010000',
        '11010011100','1100011101011',
    ];

    const startB = 104;
    const stopCode = 106;

    let checksum = startB;
    const values: number[] = [startB];

    text.split('').forEach((ch, i) => {
        const v = CODE128_B[ch] ?? 0;
        values.push(v);
        checksum += v * (i + 1);
    });
    values.push(checksum % 103);
    values.push(stopCode);

    const bits: number[] = [];
    values.forEach(v => {
        const p = PATTERNS[v] ?? '11011001100';
        p.split('').forEach(b => bits.push(parseInt(b)));
    });
    // Quiet zones
    return [0,0,0,0,0,0,0,0,0,0, ...bits, 0,0,0,0,0,0,0,0,0,0];
}

// ── Label canvas renderer ─────────────────────────────────────────────────────
function renderLabel(canvas: HTMLCanvasElement, part: InventoryItem, form?: Form8130) {
    const W = 384; // 4" @ 96dpi
    const H = 192; // 2" @ 96dpi
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Part number (bold, large)
    ctx.fillStyle = '#000000';
    ctx.font      = 'bold 22px monospace';
    ctx.fillText(part.part_no.slice(0, 18), 10, 30);

    // Description (truncated)
    ctx.font = '11px sans-serif';
    ctx.fillText(part.description.slice(0, 42), 10, 48);

    // Bin location
    ctx.font = 'bold 14px monospace';
    ctx.fillText(part.shelf_location.slice(0, 10), 10, 68);

    // Qty
    ctx.font = '11px sans-serif';
    ctx.fillText(`QTY: ${part.qty_on_hand} ${part.unit}`, 100, 68);

    // Condition badge
    if (part.condition) {
        ctx.fillStyle = part.condition === 'New' ? '#16a34a' : '#0284c7';
        ctx.fillRect(W - 80, 10, 70, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(part.condition, W - 75, 23);
        ctx.fillStyle = '#000000';
    }

    // 8130 indicator
    if (part.certification?.verified && part.certification.type === '8130-3') {
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(W - 80, 32, 70, 16);
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('8130-3 ✓', W - 76, 44);
        ctx.fillStyle = '#000000';
    }

    // Form tracking number
    if (part.form_tracking_no) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText(`Form: ${part.form_tracking_no.slice(0, 20)}`, 10, 82);
        ctx.fillStyle = '#000000';
    }

    // Divider
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth   = 0.5;
    ctx.beginPath(); ctx.moveTo(10, 90); ctx.lineTo(W - 10, 90); ctx.stroke();
    ctx.lineWidth = 2;

    // Barcode
    const barcodeText = part.form_tracking_no || part.part_no;
    const bits = encodeCode128(barcodeText.slice(0, 20).replace(/[^ -~]/g, ''));
    const moduleW = Math.floor((W - 20) / bits.length);
    const barcodeH = 55;
    const barcodeY = 93;

    ctx.fillStyle = '#000000';
    bits.forEach((b, i) => {
        if (b === 1) ctx.fillRect(10 + i * moduleW, barcodeY, moduleW, barcodeH);
    });

    // Barcode text
    ctx.font      = '9px monospace';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(barcodeText.slice(0, 24), W / 2, barcodeY + barcodeH + 11);
    ctx.textAlign = 'left';

    // Footer
    ctx.font      = '8px sans-serif';
    ctx.fillStyle = '#999999';
    ctx.fillText(`Tech1 Aero · ${new Date().toLocaleDateString()}`, 10, H - 6);
}

// ── Component ─────────────────────────────────────────────────────────────────
export const LabelPrinter: React.FC<LabelPrinterProps> = ({
    isOpen, onClose, parts, forms, selectedIds,
}) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const selectedParts = parts.filter(p => selectedIds.includes(p.id));
    const activePart    = selectedParts[activeIdx];

    useEffect(() => {
        if (!canvasRef.current || !activePart) return;
        const form = activePart.form_8130_id ? forms.find(f => f.id === activePart.form_8130_id) : undefined;
        renderLabel(canvasRef.current, activePart, form);
    }, [activePart, forms]);

    const printAll = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        const canvases: string[] = [];
        selectedParts.forEach(part => {
            const c = document.createElement('canvas');
            const form = part.form_8130_id ? forms.find(f => f.id === part.form_8130_id) : undefined;
            renderLabel(c, part, form);
            canvases.push(c.toDataURL('image/png'));
        });
        win.document.write(`
            <html><head><title>Tech1 Aero — Part Labels</title>
            <style>
                body { margin: 0; background: #fff; }
                .label { width: 4in; height: 2in; margin: 0.1in; display: inline-block; break-inside: avoid; }
                img { width: 100%; height: 100%; }
                @media print { .no-print { display: none; } }
            </style></head><body>
            <div class="no-print" style="padding:8px; background:#f0f0f0; font-family:sans-serif; font-size:12px">
                <button onclick="window.print()" style="padding:6px 16px; background:#0284c7; color:white; border:none; border-radius:4px; cursor:pointer">🖨 Print All ${canvases.length} Label${canvases.length>1?'s':''}</button>
                &nbsp; <button onclick="window.close()">Close</button>
            </div>
            ${canvases.map(src => `<div class="label"><img src="${src}" /></div>`).join('')}
            </body></html>
        `);
        win.document.close();
    };

    if (!selectedParts.length) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Print Labels"
            size="2xl"
            footer={
                <div className="flex justify-between w-full items-center">
                    <span className="text-xs text-slate-500">{selectedParts.length} label{selectedParts.length>1?'s':''} · 4" × 2" · Code 128</span>
                    <div className="flex gap-2">
                        <ActionButton onClick={onClose} variant="secondary">Cancel</ActionButton>
                        <ActionButton onClick={printAll} variant="primary"
                            icon={<PrinterIcon className="w-3.5 h-3.5" />}>
                            Print All Labels
                        </ActionButton>
                    </div>
                </div>
            }>
            <div className="space-y-4">
                {/* Part selector */}
                {selectedParts.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                        {selectedParts.map((p, i) => (
                            <button key={p.id} onClick={() => setActiveIdx(i)}
                                className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all ${
                                    activeIdx === i ? 'bg-sky-500/15 text-sky-200 border-sky-500/25' : 'text-slate-400 border-white/8 hover:border-white/15'
                                }`}>
                                {p.part_no}
                            </button>
                        ))}
                    </div>
                )}
                {/* Preview */}
                <div className="bg-slate-200 rounded-xl p-4 flex items-center justify-center">
                    <canvas ref={canvasRef} className="rounded shadow-lg" style={{ maxWidth: '100%' }} />
                </div>
                <p className="text-xs text-slate-500 text-center">
                    Preview of <span className="font-mono text-sky-300">{activePart?.part_no}</span> — click "Print All Labels" to open print dialog
                </p>
            </div>
        </BaseModal>
    );
};
