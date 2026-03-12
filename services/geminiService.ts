
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
// FIX: Corrected import path for types by adding file extension.
import { Aircraft, OptimizedSchedule, StagedConsumable, StagedTool, StagedWorkOrder, ParsedPOHeader, ParsedPackingSlipItem, MaintenanceForecast, OptimizedVisit, RepairOrder, WorkOrder, Quote, InventoryItem, ADCompliance } from '../types.ts';

// Note: As per instructions, the API key is handled externally via process.env.API_KEY.
// The GoogleGenAI instance should be created just before an API call when API key selection is involved (e.g., Veo).
// For simplicity in this mock, we create one instance here.
const getAI = () => new GoogleGenAI({apiKey: process.env.API_KEY!});

export interface SearchIntent {
    view: 'tooling' | 'inventory' | 'personnel' | 'aircraft' | 'work_orders' | 'repair_orders' | 'purchase_orders' | 'unknown';
    filters: {
        searchTerm?: string;
        aircraftTail?: string;
        status?: string;
        calibrationStatus?: 'valid' | 'due_soon' | 'overdue';
        technicianName?: string;
        partNumber?: string;
    };
}

// Replaced mock function to use a live Gemini API call for generating an optimal schedule
export async function generateOptimalSchedule(aircraft: Aircraft, allSchedules: Record<string, OptimizedSchedule | null>): Promise<OptimizedSchedule> {
    console.log("Generating optimal schedule with Gemini for:", aircraft.tail_number);
    const ai = getAI();

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            aircraftId: {
                type: Type.STRING,
                description: 'The ID of the aircraft for which the schedule was generated.'
            },
            schedule: {
                type: Type.ARRAY,
                description: 'A list of optimized maintenance visits.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        visitName: {
                            type: Type.STRING,
                            description: 'A descriptive name for the maintenance visit, e.g., "A-Check & Avionics Update".'
                        },
                        scheduledDate: {
                            type: Type.STRING,
                            description: 'The proposed start date for the visit in YYYY-MM-DD format.'
                        },
                        totalManHours: {
                            type: Type.NUMBER,
                            description: 'The total estimated man-hours for all events in this visit.'
                        },
                        hangarAssignment: {
                            type: Type.STRING,
                            description: 'The recommended hangar for this visit, e.g., "Hangar 1" or "Hangar 2".'
                        },
                        events: {
                            type: Type.ARRAY,
                            description: 'A list of maintenance events grouped into this visit.',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    eventName: {
                                        type: Type.STRING,
                                        description: 'The name of the specific maintenance event or task.'
                                    },
                                    reasonForScheduling: {
                                        type: Type.STRING,
                                        description: 'A brief reason why this event was included, e.g., "Due in 50 flight hours." or "Calendar limit approaching."'
                                    }
                                },
                                required: ['eventName', 'reasonForScheduling']
                            }
                        },
                        requiredTooling: {
                            type: Type.ARRAY,
                            description: 'A list of critical tools required for this visit.',
                            items: { type: Type.STRING }
                        },
                        requiredConsumables: {
                            type: Type.ARRAY,
                            description: 'A list of key consumables required for this visit.',
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['visitName', 'scheduledDate', 'totalManHours', 'hangarAssignment', 'events', 'requiredTooling', 'requiredConsumables']
                }
            },
            summary: {
                type: Type.STRING,
                description: 'A human-readable summary explaining the scheduling logic, including any conflicts resolved or efficiencies gained.'
            }
        },
        required: ['aircraftId', 'schedule', 'summary']
    };

    const otherSchedulesContext = Object.entries(allSchedules)
        .filter(([id, sched]) => id !== aircraft.id && sched && sched.schedule.length > 0)
        .map(([id, sched]) => {
            const scheduleDetails = sched!.schedule.map(visit => `  - Visit: "${visit.visitName}" in ${visit.hangarAssignment} from ${visit.scheduledDate}`).join('\n');
            return `Aircraft ID ${id}:\n${scheduleDetails}`;
        }).join('\n\n');

    const prompt = `
Today's date is ${new Date().toISOString().split('T')[0]}.

**Objective:**
Generate an optimal maintenance schedule for the aircraft with the following details:
- ID: ${aircraft.id}
- Tail Number: ${aircraft.tail_number}
- Model: ${aircraft.model}
- Current Hours: ${aircraft.hours_total}

**Upcoming Maintenance Events for ${aircraft.tail_number}:**
${aircraft.maintenance_events.map(e => `- ${e.name}: Due every ${e.intervalValue} ${e.intervalType}. Last performed at ${e.lastPerformedHours ? e.lastPerformedHours + ' hours' : e.lastPerformedDate}. Estimated man-hours: ${e.manHours}.`).join('\n')}
(Note: Assume an average of 20 flight hours per week for projecting hour-based events.)


**Constraints & Resources:**
1.  **Hangar Availability:** There are two available hangars: "Hangar 1" and "Hangar 2". Try to balance the load between them.
2.  **Technician Availability:** Assume a standard crew of 4 technicians is available on weekdays. Weekend work should be avoided unless necessary for AOG situations.
3.  **Existing Schedules for Other Aircraft (Conflicts to avoid):**
${otherSchedulesContext || 'No other aircraft have conflicting schedules.'}

**Task:**
Analyze the due dates/hours for all upcoming maintenance events for ${aircraft.tail_number}. Group events into logical visits to minimize aircraft downtime and operational disruption. Consider the existing schedules of other aircraft to avoid hangar conflicts. For each visit, assign a start date and a hangar. Calculate the total man-hours for each visit. For tooling and consumables, list some plausible examples based on the events. Provide a summary explaining your reasoning, highlighting how you combined tasks for efficiency and avoided conflicts. The aircraft ID in the response MUST match the aircraft ID provided in this prompt.
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction: "You are an expert MRO (Maintenance, Repair, and Overhaul) scheduler for a business aviation fleet. Your primary goal is to create the most efficient maintenance schedule for a target aircraft by grouping upcoming maintenance events into visits. You must minimize aircraft downtime, de-conflict resource allocation (hangars, technicians), and ensure all maintenance is performed within its due limits. Your output must be a structured JSON object that strictly adheres to the provided schema."
            }
        });

        const jsonText = response.text.trim();
        const optimizedSchedule = JSON.parse(jsonText) as OptimizedSchedule;

        // A quick validation to ensure the AI returned the correct ID
        if (optimizedSchedule.aircraftId !== aircraft.id) {
            console.warn("AI returned a schedule for the wrong aircraft ID. Correcting it.", { returned: optimizedSchedule.aircraftId, expected: aircraft.id });
            optimizedSchedule.aircraftId = aircraft.id;
        }

        console.log("Gemini generated schedule:", optimizedSchedule);
        return optimizedSchedule;

    } catch (error) {
        console.error("Error generating optimal schedule with Gemini:", error);
        throw new Error("AI failed to generate a schedule. The model may be temporarily unavailable.");
    }
}


export async function analyzeMaintenanceHistory(aircraft: Aircraft, workOrders: WorkOrder[], repairOrders: RepairOrder[]): Promise<MaintenanceForecast> {
    console.log("Analyzing maintenance history for:", aircraft.tail_number);
    // This function would send aircraft logbooks, historical WOs/ROs to Gemini for analysis.
    await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate API delay

    return {
        aircraftId: aircraft.id,
        summary: "Based on historical data, there is a recurring issue with the #2 communication radio reported every 200-250 flight hours. Proactive inspection is recommended.",
        insights: [
            {
                severity: 'medium',
                pattern: "Recurrent write-ups for 'COM 2 static' found in logbook entries.",
                prediction: "High probability of COM 2 failure within the next 50 flight hours.",
                recommendation: "Perform a detailed inspection of the COM 2 antenna and wiring during the next scheduled maintenance visit. Consider replacing the coaxial cable as a preventative measure."
            },
            {
                severity: 'low',
                pattern: "Slightly increased hydraulic fluid consumption noted over the last 3 unscheduled repairs.",
                prediction: "A minor, slow leak may be present in the landing gear hydraulic system.",
                recommendation: "Add a task to the next work order to specifically check all hydraulic lines around the main landing gear for signs of seepage."
            }
        ]
    };
}


// Mock function for data validation
export async function cleanAndValidateDataWithAI(
    csvText: string,
    dataType: 'workOrders' | 'tooling' | 'consumables',
    aircraftList: Aircraft[]
): Promise<{ records: (StagedWorkOrder | StagedTool | StagedConsumable)[] }> {
    console.log(`Validating ${dataType} CSV data...`);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API delay

    // This is where a complex Gemini prompt with function calling or structured output would be used.
    // We'll just return some mock validated data.

    if (dataType === 'workOrders') {
        const records: StagedWorkOrder[] = [
            { wo_id: 'WO-OLD-001', aircraft_tail_number: 'N12345', visit_name: 'Annual Inspection', scheduled_date: '2023-05-15', status: 'Completed', priority: 'routine', tasks: 'Engine oil change;Tire pressure check;ADSB check', validationStatus: 'valid', validationNotes: [] },
            { wo_id: 'WO-OLD-002', aircraft_tail_number: 'N999XX', visit_name: '100-Hour', scheduled_date: '2023-06-20', status: 'Completed', priority: 'routine', tasks: 'Inspect spark plugs;Clean injectors', validationStatus: 'valid', validationNotes: [] },
            { wo_id: 'WO-OLD-003', aircraft_tail_number: 'N120G', visit_name: 'Avionics Upgrade', scheduled_date: '2023-07-01', status: 'Completed', priority: 'urgent', tasks: 'Install new GPS;Calibrate autopilot', validationStatus: 'invalid', validationNotes: ['Aircraft tail number N120G not found in fleet.'] },
        ];
        return { records: records as any };
    }
    // Add similar mock logic for tooling and consumables
    return { records: [] };
}


// Implemented the parsePackingSlipWithAI function with a real Gemini API call
export async function parsePackingSlipWithAI(imageBase64: string, mimeType: string): Promise<{ header: ParsedPOHeader, items: ParsedPackingSlipItem[] }> {
    console.log("Parsing packing slip image with Gemini...");
    const ai = getAI();

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            header: {
                type: Type.OBJECT,
                description: 'The header information from the packing slip.',
                properties: {
                    po_number: {
                        type: Type.STRING,
                        description: 'The purchase order number.'
                    },
                    supplier_name: {
                        type: Type.STRING,
                        description: 'The name of the supplier or vendor.'
                    },
                    order_date: {
                        type: Type.STRING,
                        description: 'The date of the order in YYYY-MM-DD format.'
                    }
                },
                required: ['po_number', 'supplier_name', 'order_date']
            },
            items: {
                type: Type.ARRAY,
                description: 'A list of all line items on the packing slip.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        model_number: {
                            type: Type.STRING,
                            description: 'The part number, model number, or SKU of the item.'
                        },
                        description: {
                            type: Type.STRING,
                            description: 'The description of the item.'
                        },
                        quantity: {
                            type: Type.INTEGER,
                            description: 'The quantity of the item received.'
                        }
                    },
                    required: ['model_number', 'description', 'quantity']
                }
            }
        },
        required: ['header', 'items']
    };

    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: imageBase64,
        },
    };

    const textPart = {
        text: 'Analyze this image of a packing slip. Perform OCR to extract the purchase order number, supplier name, order date, and a list of all line items including their model/part number, description, and quantity. Provide the output in the requested JSON format.'
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction: 'You are an expert logistics and receiving clerk. Your task is to accurately parse shipping documents and return structured data.'
            }
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as { header: ParsedPOHeader, items: Omit<ParsedPackingSlipItem, 'category'>[] };
        
        const itemsWithCategory = parsedData.items.map(item => ({
            ...item,
            category: 'unassigned' as const
        }));

        console.log("Parsed packing slip data:", { header: parsedData.header, items: itemsWithCategory });
        
        return { header: parsedData.header, items: itemsWithCategory };

    } catch (error) {
        console.error("Error parsing packing slip with Gemini:", error);
        throw new Error("AI failed to parse the packing slip. Please check the image quality and try again.");
    }
}

// Replaced mock function for global search with a real Gemini implementation
export async function getSearchIntent(query: string): Promise<SearchIntent> {
    console.log("Getting search intent for:", query);
    const ai = getAI();

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            view: {
                type: Type.STRING,
                enum: ['tooling', 'inventory', 'personnel', 'aircraft', 'work_orders', 'repair_orders', 'purchase_orders', 'unknown'],
                description: 'The target dashboard the user wants to see. If the query is ambiguous, default to "unknown".',
            },
            filters: {
                type: Type.OBJECT,
                properties: {
                    searchTerm: {
                        type: Type.STRING,
                        description: 'The primary subject of the search, extracted from the query. For example, in "show me overdue torque wrenches", the term is "torque wrenches".'
                    },
                    aircraftTail: {
                        type: Type.STRING,
                        description: 'An aircraft tail number like "N12345" if mentioned.'
                    },
                    status: {
                        type: Type.STRING,
                        description: 'A status keyword like "pending", "in progress", "completed", "open", or "closed" if mentioned.'
                    },
                    calibrationStatus: {
                        type: Type.STRING,
                        enum: ['valid', 'due_soon', 'overdue'],
                        description: 'The calibration status for a tool, derived from keywords like "overdue", "due soon", or "needs calibration".'
                    },
                    technicianName: {
                        type: Type.STRING,
                        description: 'The name of a person if mentioned.'
                    },
                    partNumber: {
                        type: Type.STRING,
                        description: 'A specific part number if mentioned.'
                    },
                },
                description: 'Any filters extracted from the user\'s query.'
            },
        },
        required: ['view', 'filters'],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following user query and determine their intent. The user is interacting with an aircraft maintenance application. Query: "${query}"`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction: `You are an intelligent search assistant for an aviation maintenance application. Your job is to parse a user's natural language query and translate it into a structured JSON object representing their intent. The application has the following views: 'tooling', 'inventory', 'personnel', 'aircraft', 'work_orders', 'repair_orders', 'purchase_orders'. Based on keywords in the query, determine the most appropriate view and extract any relevant filters. For example, "show me torque wrenches that need calibration" should map to the 'tooling' view with a searchTerm of "torque wrenches" and a calibrationStatus of "due_soon". "Work orders for N12345" should map to 'work_orders' view with an aircraftTail filter. If the intent is unclear, set the view to 'unknown'.`,
            },
        });

        const jsonText = response.text.trim();
        const intent = JSON.parse(jsonText) as SearchIntent;
        console.log("Parsed intent:", intent);
        return intent;

    } catch (error) {
        console.error("Error getting search intent from Gemini:", error);
        // Fallback to a safe default
        return { view: 'unknown', filters: {} };
    }
}

export async function generateQuoteForOrder(
    order: WorkOrder | RepairOrder,
    aircraft: Aircraft,
    inventory: InventoryItem[],
    rates: { laborRate: number; shopSupplyRate: number; taxRate: number }
): Promise<Quote> {
    console.log("Generating quote for order:", 'wo_id' in order ? order.wo_id : order.ro_id);
    const ai = getAI();

    // Use dynamic rates passed from settings
    const LABOR_RATE = rates.laborRate; 
    const SHOP_SUPPLY_RATE = rates.shopSupplyRate; 
    const TAX_RATE = rates.taxRate; 

    // Aggregate data for the prompt
    const totalManHours = order.squawks.reduce((sum, sq) => sum + sq.hours_estimate, 0);
    const usedPartIds = new Set(order.squawks.flatMap(sq => sq.used_parts.map(p => p.inventory_item_id)));
    const partsContext = Array.from(usedPartIds).map(partId => {
        const partInfo = inventory.find(p => p.id === partId);
        if (!partInfo) return null;
        // Sum quantities for the same part used across different squawks
        const totalQuantity = order.squawks
            .flatMap(sq => sq.used_parts)
            .filter(p => p.inventory_item_id === partId)
            .reduce((sum, p) => sum + p.quantity_used, 0);
        
        const cost = partInfo.suppliers[0]?.cost || 0; // Use first supplier's cost
        return {
            description: partInfo.description,
            part_no: partInfo.part_no,
            quantity: totalQuantity,
            unitPrice: cost,
            total: totalQuantity * cost,
        };
    }).filter((p): p is NonNullable<typeof p> => p !== null);

    const squawkSummary = order.squawks.map(sq => `- ${sq.description} (Est: ${sq.hours_estimate} hours)`).join('\n');

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            customerDescription: { type: Type.STRING, description: 'A professional, customer-facing summary of all work performed, written in a friendly and clear tone.' },
            lineItems: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        unitPrice: { type: Type.NUMBER },
                        total: { type: Type.NUMBER }
                    },
                    required: ['description', 'quantity', 'unitPrice', 'total']
                }
            },
            subtotal: { type: Type.NUMBER },
            tax: { type: Type.NUMBER },
            total: { type: Type.NUMBER }
        },
        required: ['customerDescription', 'lineItems', 'subtotal', 'tax', 'total']
    };

    const prompt = `
Generate a customer quote based on the following aircraft maintenance order.

**System Rules:**
- Labor Rate: $${LABOR_RATE.toFixed(2)} per hour.
- Shop Supply Fee: ${(SHOP_SUPPLY_RATE * 100).toFixed(2)}% of the total labor cost.
- Sales Tax Rate: ${(TAX_RATE * 100).toFixed(2)}%. Tax is applied to the subtotal (labor + parts + supplies).

**Order Details:**
- Order ID: ${'wo_id' in order ? order.wo_id : order.ro_id}
- Aircraft: ${aircraft.tail_number} (${aircraft.model})
- Work Description: ${'visit_name' in order ? order.visit_name : order.description}

**Tasks Performed:**
${squawkSummary}
- **Total Estimated Man-Hours:** ${totalManHours}

**Parts Used:**
${partsContext.map(p => `- ${p.description} (Qty: ${p.quantity}, Unit Price: $${p.unitPrice.toFixed(2)})`).join('\n') || 'No specific parts were logged.'}

**Task:**
1.  **Generate Customer Description:** Write a professional, friendly summary of the work performed suitable for a customer. Mention the key tasks.
2.  **Create Line Items:** Create a JSON array of line items for the quote. It MUST include:
    a. A line item for 'Labor' based on the total man-hours and labor rate.
    b. A line item for 'Shop Supplies' based on the shop supply fee rule.
    c. A separate line item for EACH part used.
3.  **Calculate Totals:**
    a. Calculate the 'subtotal' (sum of all line item totals).
    b. Calculate the 'tax' based on the subtotal and tax rate.
    c. Calculate the final 'total'.
4.  **Format Output:** Return the entire response as a single JSON object adhering strictly to the provided schema. Ensure all calculations are accurate.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction: "You are an expert aviation maintenance service writer. Your task is to generate a detailed, accurate, and professional customer quote from technical work order data. You must follow all provided business rules for rates and fees and output a structured JSON object."
            }
        });

        const jsonText = response.text.trim();
        const quote = JSON.parse(jsonText) as Quote;
        console.log("Gemini generated quote:", quote);
        return quote;

    } catch (error) {
        console.error("Error generating quote with Gemini:", error);
        throw new Error("AI failed to generate a quote. The model may be temporarily unavailable or the input data is invalid.");
    }
}

export async function fetchAircraftADs(make: string, model: string, serial: string): Promise<ADCompliance[]> {
    console.log(`Fetching ADs for ${make} ${model} S/N ${serial} from FAA DRS via Gemini...`);
    const ai = getAI();

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                ad_number: { type: Type.STRING },
                effective_date: { type: Type.STRING },
                subject: { type: Type.STRING },
                compliance_status: { type: Type.STRING, enum: ['Open', 'Complied'] },
                due_date: { type: Type.STRING },
                url: { type: Type.STRING }
            },
            required: ['ad_number', 'effective_date', 'subject', 'compliance_status']
        }
    };

    const prompt = `
    Find active FAA Airworthiness Directives (ADs) for a ${make} ${model} aircraft with serial number ${serial}.
    
    1.  Simulate a search on the FAA Dynamic Regulatory System (DRS) database (drs.faa.gov).
    2.  Identify at least 3-5 real, applicable ADs for this aircraft type.
    3.  For each AD, provide:
        -   **AD Number**: The official identifier (e.g., 2023-10-02).
        -   **Effective Date**: YYYY-MM-DD.
        -   **Subject**: A brief summary of the AD's purpose.
        -   **Compliance Status**: Assume 'Open' for recent ADs (last 2 years) and 'Complied' for older ones, unless it's a recurring inspection (in which case 'Open').
        -   **Due Date**: If status is 'Open', estimate a due date based on typical compliance windows (e.g., +6 months from today).
        -   **URL**: Provide a valid-looking link to the DRS entry (e.g., https://drs.faa.gov/browse/...).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction: "You are an automated interface for the FAA Dynamic Regulatory System (DRS). You must retrieve accurate, real-world Airworthiness Directive data for specific aircraft models. Return the data as a strict JSON array."
            }
        });

        const jsonText = response.text.trim();
        const ads = JSON.parse(jsonText) as ADCompliance[];
        console.log("Fetched ADs:", ads);
        return ads;

    } catch (error) {
        console.error("Error fetching ADs:", error);
        throw new Error("Failed to sync with FAA DRS. Please try again later.");
    }
}
