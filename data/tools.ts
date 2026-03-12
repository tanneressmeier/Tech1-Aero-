// FIX: Corrected import path for types by adding the file extension.
import { Tool } from '../types.ts';
// FIX: Corrected import path for CSV data by adding the file extension.
import { BJC_TOOLS_CSV } from './tools.csv.ts';
// FIX: Corrected import path for parser by adding the file extension.
import { parseToolsFromCSV } from '../utils/csvParser.ts';

// Parse the raw CSV string into an array of Tool objects to be used as the initial mock data.
export const MOCK_TOOLS: Tool[] = parseToolsFromCSV(BJC_TOOLS_CSV);