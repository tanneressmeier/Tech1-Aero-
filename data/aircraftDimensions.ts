// =============================================================================
// data/aircraftDimensions.ts
// Real-world aircraft dimensions for 2D hangar footprint rendering.
// Sources: manufacturer spec sheets, FAA type certificates, Jane's All The World's Aircraft.
// All measurements in feet. Used as fallback when Aircraft.wingspan_ft is not set.
// =============================================================================

export interface AircraftDimensions {
    wingspan_ft:    number;
    length_ft:      number;
    tail_height_ft: number;
}

// Key format: "MAKE:MODEL" — normalised to lowercase for lookup
const DIMENSION_TABLE: Record<string, AircraftDimensions> = {
    // ── Cessna Citation family ───────────────────────────────────────────
    'cessna citation:cj1':   { wingspan_ft: 47.2, length_ft: 42.6, tail_height_ft: 13.8 },
    'cessna citation:cj1+':  { wingspan_ft: 47.2, length_ft: 42.6, tail_height_ft: 13.8 },
    'cessna citation:cj2':   { wingspan_ft: 49.0, length_ft: 47.2, tail_height_ft: 14.2 },
    'cessna citation:cj2+':  { wingspan_ft: 49.0, length_ft: 47.2, tail_height_ft: 14.2 },
    'cessna citation:cj3':   { wingspan_ft: 53.3, length_ft: 51.2, tail_height_ft: 15.0 },
    'cessna citation:cj3+':  { wingspan_ft: 53.3, length_ft: 51.2, tail_height_ft: 15.0 },
    'cessna citation:cj4':   { wingspan_ft: 50.8, length_ft: 53.3, tail_height_ft: 15.4 },
    'cessna citation:xls':   { wingspan_ft: 56.3, length_ft: 52.6, tail_height_ft: 16.4 },
    'cessna citation:xls+':  { wingspan_ft: 56.3, length_ft: 52.6, tail_height_ft: 16.4 },
    'cessna citation:excel': { wingspan_ft: 56.3, length_ft: 52.6, tail_height_ft: 16.4 },
    'cessna citation:x':     { wingspan_ft: 63.9, length_ft: 56.3, tail_height_ft: 19.2 },
    'cessna citation:x+':    { wingspan_ft: 63.9, length_ft: 56.3, tail_height_ft: 19.2 },
    'cessna citation:sovereign': { wingspan_ft: 63.2, length_ft: 63.6, tail_height_ft: 20.4 },
    'cessna citation:latitude':  { wingspan_ft: 72.3, length_ft: 62.4, tail_height_ft: 21.0 },
    'cessna citation:longitude': { wingspan_ft: 72.3, length_ft: 66.0, tail_height_ft: 21.0 },

    // ── Gulfstream family ────────────────────────────────────────────────
    'gulfstream:g-v':   { wingspan_ft: 93.5, length_ft: 96.4, tail_height_ft: 25.7 },
    'gulfstream:gv':    { wingspan_ft: 93.5, length_ft: 96.4, tail_height_ft: 25.7 },
    'gulfstream:g500':  { wingspan_ft: 93.5, length_ft: 96.4, tail_height_ft: 25.8 },
    'gulfstream:g550':  { wingspan_ft: 93.5, length_ft: 96.4, tail_height_ft: 25.7 },
    'gulfstream:g600':  { wingspan_ft: 93.8, length_ft: 99.8, tail_height_ft: 25.8 },
    'gulfstream:g650':  { wingspan_ft: 99.7, length_ft: 99.8, tail_height_ft: 25.5 },
    'gulfstream:g650er':{ wingspan_ft: 99.7, length_ft: 99.8, tail_height_ft: 25.5 },
    'gulfstream:g700':  { wingspan_ft:103.0, length_ft:109.1, tail_height_ft: 26.0 },
    'gulfstream:g280':  { wingspan_ft: 65.0, length_ft: 66.0, tail_height_ft: 22.3 },
    'gulfstream:g200':  { wingspan_ft: 58.1, length_ft: 62.3, tail_height_ft: 21.3 },

    // ── Bombardier family ────────────────────────────────────────────────
    'bombardier:challenger 300':  { wingspan_ft: 63.9, length_ft: 68.4, tail_height_ft: 20.3 },
    'bombardier:challenger 350':  { wingspan_ft: 69.0, length_ft: 68.4, tail_height_ft: 20.3 },
    'bombardier:challenger 604':  { wingspan_ft: 64.3, length_ft: 68.4, tail_height_ft: 20.8 },
    'bombardier:challenger 605':  { wingspan_ft: 64.3, length_ft: 68.4, tail_height_ft: 20.8 },
    'bombardier:challenger 650':  { wingspan_ft: 69.3, length_ft: 68.4, tail_height_ft: 20.8 },
    'bombardier:global 5000':     { wingspan_ft: 94.0, length_ft: 96.8, tail_height_ft: 24.3 },
    'bombardier:global 6000':     { wingspan_ft: 94.0, length_ft: 99.4, tail_height_ft: 24.3 },
    'bombardier:global 7500':     { wingspan_ft:104.0, length_ft:111.0, tail_height_ft: 27.3 },
    'bombardier:global express':  { wingspan_ft: 94.0, length_ft: 99.4, tail_height_ft: 24.3 },

    // ── Dassault Falcon ──────────────────────────────────────────────────
    'dassault:falcon 2000':    { wingspan_ft: 63.5, length_ft: 63.3, tail_height_ft: 23.2 },
    'dassault:falcon 2000lx':  { wingspan_ft: 63.5, length_ft: 63.3, tail_height_ft: 23.2 },
    'dassault:falcon 7x':      { wingspan_ft: 86.3, length_ft: 76.8, tail_height_ft: 25.0 },
    'dassault:falcon 8x':      { wingspan_ft: 86.3, length_ft: 80.5, tail_height_ft: 25.0 },
    'dassault:falcon 900':     { wingspan_ft: 63.4, length_ft: 66.3, tail_height_ft: 24.8 },
    'dassault:falcon 900ex':   { wingspan_ft: 63.4, length_ft: 66.3, tail_height_ft: 24.8 },
    'dassault:falcon 50':      { wingspan_ft: 61.9, length_ft: 60.7, tail_height_ft: 22.9 },

    // ── Embraer family ───────────────────────────────────────────────────
    'embraer:phenom 100':  { wingspan_ft: 40.4, length_ft: 42.1, tail_height_ft: 14.4 },
    'embraer:phenom 300':  { wingspan_ft: 52.2, length_ft: 51.9, tail_height_ft: 17.2 },
    'embraer:phenom 300e': { wingspan_ft: 52.2, length_ft: 51.9, tail_height_ft: 17.2 },
    'embraer:legacy 500':  { wingspan_ft: 67.4, length_ft: 68.6, tail_height_ft: 21.2 },
    'embraer:legacy 600':  { wingspan_ft: 69.2, length_ft: 87.2, tail_height_ft: 26.0 },
    'embraer:praetor 500': { wingspan_ft: 67.4, length_ft: 68.6, tail_height_ft: 21.2 },
    'embraer:praetor 600': { wingspan_ft: 71.3, length_ft: 74.5, tail_height_ft: 23.1 },

    // ── Pilatus ──────────────────────────────────────────────────────────
    'pilatus:pc-12':     { wingspan_ft: 53.3, length_ft: 47.3, tail_height_ft: 14.0 },
    'pilatus:pc-12 ng':  { wingspan_ft: 53.3, length_ft: 47.3, tail_height_ft: 14.0 },
    'pilatus:pc-24':     { wingspan_ft: 55.8, length_ft: 55.8, tail_height_ft: 17.8 },

    // ── Beechcraft / King Air ────────────────────────────────────────────
    'beechcraft:king air 250':  { wingspan_ft: 57.9, length_ft: 46.8, tail_height_ft: 15.0 },
    'beechcraft:king air 350':  { wingspan_ft: 57.9, length_ft: 46.8, tail_height_ft: 15.0 },
    'beechcraft:king air 350i': { wingspan_ft: 57.9, length_ft: 46.8, tail_height_ft: 15.0 },
    'beechcraft:king air c90':  { wingspan_ft: 50.3, length_ft: 35.6, tail_height_ft: 14.3 },

    // ── Textron / HondaJet ───────────────────────────────────────────────
    'honda aircraft:hondajet':        { wingspan_ft: 39.8, length_ft: 42.6, tail_height_ft: 14.9 },
    'honda aircraft:hondajet elite':  { wingspan_ft: 39.8, length_ft: 42.6, tail_height_ft: 14.9 },
    'honda aircraft:hondajet elite s':{ wingspan_ft: 39.8, length_ft: 42.6, tail_height_ft: 14.9 },

    // ── Piper ────────────────────────────────────────────────────────────
    'piper:meridian':    { wingspan_ft: 43.0, length_ft: 29.6, tail_height_ft: 11.3 },
    'piper:pa-46':       { wingspan_ft: 43.0, length_ft: 29.6, tail_height_ft: 11.3 },
};

/**
 * Look up aircraft dimensions by make + model.
 * Falls back gracefully — returns undefined if not found.
 */
export function lookupDimensions(make: string, model: string): AircraftDimensions | undefined {
    const key = `${make.toLowerCase()}:${model.toLowerCase()}`;
    if (DIMENSION_TABLE[key]) return DIMENSION_TABLE[key];

    // Partial model match — e.g. "G650ER" matches "G650"
    const modelNorm = model.toLowerCase().replace(/[\s\-+]/g, '');
    for (const [k, v] of Object.entries(DIMENSION_TABLE)) {
        const [, tableModel] = k.split(':');
        if (tableModel && modelNorm.startsWith(tableModel.replace(/[\s\-+]/g, ''))) {
            return v;
        }
    }
    return undefined;
}

export default DIMENSION_TABLE;
