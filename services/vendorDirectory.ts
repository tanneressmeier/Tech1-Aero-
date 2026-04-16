// =============================================================================
// services/vendorDirectory.ts
// Static aviation vendor directory — replaces paid Google Search grounding.
// Generates zero-cost vendor search links for tool sourcing.
// =============================================================================
import { Tool, VendorLink, SourcingInfo } from '../types.ts';

const VENDORS = [
    { name: 'Aircraft Spruce',    url: 'https://www.aircraftspruce.com/search/search.php?q={Q}' },
    { name: 'SkyGeek',            url: 'https://www.skygeek.com/search?q={Q}' },
    { name: 'Tronair',            url: 'https://www.tronair.com/search?q={Q}' },
    { name: 'Aircraft Tool Supply',url: 'https://www.aircrafttool.com/search?q={Q}' },
    { name: 'Aviall (Boeing)',    url: 'https://www.aviall.com/en/search#q={Q}' },
    { name: 'McMaster-Carr',      url: 'https://www.mcmaster.com/search/{Q}' },
];

export function getVendorSourcingInfo(tool: Tool): SourcingInfo {
    const q = encodeURIComponent([tool.make, tool.model, tool.name].filter(Boolean).join(' '));
    const vendorLinks: VendorLink[] = VENDORS.map(v => ({
        vendor: v.name,
        url:    v.url.replace('{Q}', q),
    }));
    const notes = [
        `Search links for: ${tool.name}${tool.make ? ` (${tool.make})` : ''}`,
        'Click any vendor to see current stock and pricing.',
        tool.calibrationRequired ? 'Cal-required tool — confirm calibration services with vendor.' : '',
    ].filter(Boolean).join(' ');
    return { vendorLinks, sourcingNotes: notes };
}
