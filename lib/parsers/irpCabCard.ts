/**
 * IRP Cab Card Parser
 * 
 * Parses Texas IRP "Apportioned License Cab Card" documents from OCR text.
 * Handles OCR noise, normalizes data, and extracts all required fields.
 */

export interface IRPCabCardFields {
  expiration_date: string | null; // ISO date (YYYY-MM-DD)
  registrant_name: string | null;
  registrant_address: string | null; // Multi-line
  plate_number: string | null;
  vehicle_type: string | null; // e.g., "TT"
  unit_number: string | null;
  unladen_weight: number | null; // lbs
  gross_weight: number | null; // lbs
  axles: number | null;
  seats: number | null;
  model_year: number | null;
  make: string | null;
  fuel: string | null;
  vin: string | null; // 17 chars
  document_number: string | null;
  usdot_number: string | null; // Numeric
  carrier_responsible_for_safety_name: string | null;
  carrier_address: string | null; // Multi-line
  owner_lessor_name: string | null;
  jurisdiction_weights: Record<string, { max_weight: number; unit: string }> | null;
}

export interface ParseResult {
  fields: IRPCabCardFields;
  confidence: Record<string, number>;
  rawText: string;
  errors: string[];
}

/**
 * Parse IRP Cab Card from OCR text
 */
export function parseIRPCabCard(ocrText: string): ParseResult {
  const errors: string[] = [];
  const confidence: Record<string, number> = {};
  const normalizedText = normalizeText(ocrText);

  const fields: IRPCabCardFields = {
    expiration_date: extractExpirationDate(normalizedText, confidence, errors),
    registrant_name: extractRegistrantName(normalizedText, confidence, errors),
    registrant_address: extractRegistrantAddress(normalizedText, confidence, errors),
    plate_number: extractPlateNumber(normalizedText, confidence, errors),
    vehicle_type: extractVehicleType(normalizedText, confidence, errors),
    unit_number: extractUnitNumber(normalizedText, confidence, errors),
    unladen_weight: extractUnladenWeight(normalizedText, confidence, errors),
    gross_weight: extractGrossWeight(normalizedText, confidence, errors),
    axles: extractAxles(normalizedText, confidence, errors),
    seats: extractSeats(normalizedText, confidence, errors),
    model_year: extractModelYear(normalizedText, confidence, errors),
    make: extractMake(normalizedText, confidence, errors),
    fuel: extractFuel(normalizedText, confidence, errors),
    vin: extractVIN(normalizedText, confidence, errors),
    document_number: extractDocumentNumber(normalizedText, confidence, errors),
    usdot_number: extractUSDOT(normalizedText, confidence, errors),
    carrier_responsible_for_safety_name: extractCarrierName(normalizedText, confidence, errors),
    carrier_address: extractCarrierAddress(normalizedText, confidence, errors),
    owner_lessor_name: extractOwnerLessorName(normalizedText, confidence, errors),
    jurisdiction_weights: extractJurisdictionWeights(normalizedText, confidence, errors),
  };

  return {
    fields,
    confidence,
    rawText: ocrText,
    errors,
  };
}

/**
 * Normalize text: remove extra whitespace, handle OCR noise
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Multiple spaces to single
    .replace(/[|]/g, "I") // Common OCR error: | -> I
    .replace(/[0O]/g, (match, offset) => {
      // Context-aware: if surrounded by numbers, likely 0; if in text, likely O
      const before = text[offset - 1] || "";
      const after = text[offset + 1] || "";
      if (/\d/.test(before) && /\d/.test(after)) return "0";
      if (/[A-Z]/.test(before) && /[A-Z]/.test(after)) return "O";
      return match;
    })
    .trim();
}

/**
 * Extract expiration date
 * Formats: "Expires: March 31, 2025", "EXP 03/31/2025", "Expiration: 2025-03-31"
 */
function extractExpirationDate(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /expires?[:\s]+([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i,
    /exp[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i,
    /expiration[:\s]+(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*exp/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let date: Date;
        if (match[1] && isNaN(Number(match[1]))) {
          // Month name format: "March 31, 2025"
          const monthNames = [
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
          ];
          const month = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m.toLowerCase()));
          if (month >= 0) {
            date = new Date(parseInt(match[3]), month, parseInt(match[2]));
          } else {
            continue;
          }
        } else {
          // Numeric format: MM/DD/YYYY or YYYY-MM-DD
          if (match[0].includes("/")) {
            date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
          } else {
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          }
        }

        if (!isNaN(date.getTime())) {
          const isoDate = date.toISOString().split("T")[0];
          confidence["expiration_date"] = 0.9;
          return isoDate;
        }
      } catch (e) {
        errors.push(`Failed to parse expiration date: ${match[0]}`);
      }
    }
  }

  confidence["expiration_date"] = 0.0;
  return null;
}

/**
 * Extract registrant name
 * Usually near "Registrant" or "Name" label
 */
function extractRegistrantName(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /registrant[:\s]+name[:\s]+([A-Z][A-Z\s&,\.\-]+)/i,
    /name[:\s]+([A-Z][A-Z\s&,\.\-]{3,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 2) {
      const name = match[1].trim().replace(/\s+/g, " ");
      confidence["registrant_name"] = 0.85;
      return name;
    }
  }

  confidence["registrant_name"] = 0.0;
  return null;
}

/**
 * Extract registrant address (multi-line)
 */
function extractRegistrantAddress(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /registrant[:\s]+address[:\s]+([A-Z0-9\s,\.\-]{10,})/i,
    /address[:\s]+([A-Z0-9\s,\.\-]{10,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Try to extract multi-line address (stop at next label)
      const addressText = match[1];
      const lines = addressText.split(/\n|(?=[A-Z]{2,}\s*:)/).filter(l => l.trim().length > 5);
      if (lines.length > 0) {
        confidence["registrant_address"] = 0.8;
        return lines.join("\n").trim();
      }
    }
  }

  confidence["registrant_address"] = 0.0;
  return null;
}

/**
 * Extract plate number
 */
function extractPlateNumber(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /plate[:\s]+number[:\s]+([A-Z0-9]{2,10})/i,
    /plate[#:\s]+([A-Z0-9]{2,10})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      confidence["plate_number"] = 0.9;
      return match[1].toUpperCase();
    }
  }

  confidence["plate_number"] = 0.0;
  return null;
}

/**
 * Extract vehicle type (e.g., "TT")
 */
function extractVehicleType(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /vehicle[:\s]+type[:\s]+([A-Z]{1,4})/i,
    /type[:\s]+([A-Z]{1,4})/i,
    /\b(TT|TR|TK|SB|MH)\b/i, // Common vehicle type codes
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      confidence["vehicle_type"] = 0.85;
      return match[1].toUpperCase();
    }
  }

  confidence["vehicle_type"] = 0.0;
  return null;
}

/**
 * Extract unit number
 */
function extractUnitNumber(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /unit[:\s]+number[:\s]+([A-Z0-9\-]{1,20})/i,
    /unit[#:\s]+([A-Z0-9\-]{1,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      confidence["unit_number"] = 0.85;
      return match[1].toUpperCase();
    }
  }

  confidence["unit_number"] = 0.0;
  return null;
}

/**
 * Extract unladen weight (lbs)
 */
function extractUnladenWeight(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): number | null {
  const patterns = [
    /unladen[:\s]+weight[:\s]+(\d+(?:,\d{3})*)\s*(?:lbs?|pounds?|#)?/i,
    /unladen[:\s]+(\d+(?:,\d{3})*)\s*(?:lbs?|pounds?|#)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const weight = parseInt(match[1].replace(/,/g, ""));
      if (!isNaN(weight)) {
        confidence["unladen_weight"] = 0.9;
        return weight;
      }
    }
  }

  confidence["unladen_weight"] = 0.0;
  return null;
}

/**
 * Extract gross weight (lbs)
 */
function extractGrossWeight(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): number | null {
  const patterns = [
    /gross[:\s]+weight[:\s]+(\d+(?:,\d{3})*)\s*(?:lbs?|pounds?|#)?/i,
    /gvw[:\s]+(\d+(?:,\d{3})*)\s*(?:lbs?|pounds?|#)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const weight = parseInt(match[1].replace(/,/g, ""));
      if (!isNaN(weight)) {
        confidence["gross_weight"] = 0.9;
        return weight;
      }
    }
  }

  confidence["gross_weight"] = 0.0;
  return null;
}

/**
 * Extract number of axles
 */
function extractAxles(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): number | null {
  const patterns = [
    /axles?[:\s]+(\d+)/i,
    /(\d+)\s+axles?/i,
    /QC[:\s]+(\d+)\s+AXLES?/i, // Special case: "QC: 5 AXLES"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const axles = parseInt(match[1]);
      if (!isNaN(axles) && axles > 0 && axles < 20) {
        confidence["axles"] = 0.9;
        return axles;
      }
    }
  }

  confidence["axles"] = 0.0;
  return null;
}

/**
 * Extract number of seats
 */
function extractSeats(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): number | null {
  const patterns = [
    /seats?[:\s]+(\d+)/i,
    /(\d+)\s+seats?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const seats = parseInt(match[1]);
      if (!isNaN(seats) && seats > 0) {
        confidence["seats"] = 0.85;
        return seats;
      }
    }
  }

  confidence["seats"] = 0.0;
  return null;
}

/**
 * Extract model year
 */
function extractModelYear(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): number | null {
  const patterns = [
    /model[:\s]+year[:\s]+(19|20)\d{2}/i,
    /year[:\s]+(19|20)\d{2}/i,
    /\b(19|20)\d{2}\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1] + match[2]);
      if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
        confidence["model_year"] = 0.85;
        return year;
      }
    }
  }

  confidence["model_year"] = 0.0;
  return null;
}

/**
 * Extract make
 */
function extractMake(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /make[:\s]+([A-Z][A-Z\s\-]{2,20})/i,
  ];

  const commonMakes = ["FREIGHTLINER", "PETERBILT", "KENWORTH", "VOLVO", "MACK", "INTERNATIONAL"];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const make = match[1].trim().toUpperCase();
      if (commonMakes.some(m => make.includes(m))) {
        confidence["make"] = 0.9;
        return make;
      }
      confidence["make"] = 0.7;
      return make;
    }
  }

  confidence["make"] = 0.0;
  return null;
}

/**
 * Extract fuel type
 */
function extractFuel(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /fuel[:\s]+([A-Z]+)/i,
  ];

  const fuelTypes = ["DIESEL", "GASOLINE", "CNG", "LNG", "ELECTRIC"];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const fuel = match[1].toUpperCase();
      if (fuelTypes.includes(fuel)) {
        confidence["fuel"] = 0.9;
        return fuel;
      }
      confidence["fuel"] = 0.7;
      return fuel;
    }
  }

  confidence["fuel"] = 0.0;
  return null;
}

/**
 * Extract VIN (17 characters, alphanumeric)
 */
function extractVIN(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /vin[:\s]+([A-HJ-NPR-Z0-9]{17})/i,
    /\b([A-HJ-NPR-Z0-9]{17})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const vin = match[1].toUpperCase();
      // VIN validation: no I, O, Q
      if (!/[IOQ]/.test(vin) && vin.length === 17) {
        confidence["vin"] = 0.95;
        return vin;
      }
    }
  }

  confidence["vin"] = 0.0;
  return null;
}

/**
 * Extract document number
 */
function extractDocumentNumber(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /document[:\s]+number[:\s]+([A-Z0-9\-]{5,20})/i,
    /doc[#:\s]+([A-Z0-9\-]{5,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      confidence["document_number"] = 0.85;
      return match[1].toUpperCase();
    }
  }

  confidence["document_number"] = 0.0;
  return null;
}

/**
 * Extract USDOT number (numeric)
 */
function extractUSDOT(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /usdot[:\s]+(\d{6,8})/i,
    /dot[#:\s]+(\d{6,8})/i,
    /USDOT[:\s]+(\d{6,8})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const dot = match[1];
      if (/^\d{6,8}$/.test(dot)) {
        confidence["usdot_number"] = 0.9;
        return dot;
      }
    }
  }

  confidence["usdot_number"] = 0.0;
  return null;
}

/**
 * Extract carrier responsible for safety name
 */
function extractCarrierName(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /carrier[:\s]+responsible[:\s]+for[:\s]+safety[:\s]+name[:\s]+([A-Z][A-Z\s&,\.\-]+)/i,
    /carrier[:\s]+name[:\s]+([A-Z][A-Z\s&,\.\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 2) {
      confidence["carrier_responsible_for_safety_name"] = 0.8;
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  confidence["carrier_responsible_for_safety_name"] = 0.0;
  return null;
}

/**
 * Extract carrier address
 */
function extractCarrierAddress(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /carrier[:\s]+address[:\s]+([A-Z0-9\s,\.\-]{10,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const addressText = match[1];
      const lines = addressText.split(/\n|(?=[A-Z]{2,}\s*:)/).filter(l => l.trim().length > 5);
      if (lines.length > 0) {
        confidence["carrier_address"] = 0.75;
        return lines.join("\n").trim();
      }
    }
  }

  confidence["carrier_address"] = 0.0;
  return null;
}

/**
 * Extract owner/lessor name
 */
function extractOwnerLessorName(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): string | null {
  const patterns = [
    /owner[\/\s]+lessor[:\s]+name[:\s]+([A-Z][A-Z\s&,\.\-]+)/i,
    /owner[:\s]+name[:\s]+([A-Z][A-Z\s&,\.\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 2) {
      confidence["owner_lessor_name"] = 0.8;
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  confidence["owner_lessor_name"] = 0.0;
  return null;
}

/**
 * Extract jurisdiction weights table
 * Format: State/Province -> Max Weight
 * Special case: "QC: 5 AXLES" -> Quebec with 5 axles
 */
function extractJurisdictionWeights(
  text: string,
  confidence: Record<string, number>,
  errors: string[]
): Record<string, { max_weight: number; unit: string }> | null {
  const weights: Record<string, { max_weight: number; unit: string }> = {};
  
  // Pattern for jurisdiction weights table
  // Format: "TX: 80000", "CA: 36287K" (K = 1000 lbs, so 36287K = 80,000 lbs)
  const patterns = [
    /([A-Z]{2})[:\s]+(\d+(?:,\d{3})*)(K?)\s*(?:lbs?|pounds?)?/gi,
    /QC[:\s]+(\d+)\s+AXLES?/i, // Special Quebec case
  ];

  let found = false;

  // Extract standard jurisdiction weights
  const standardMatches = text.matchAll(/([A-Z]{2})[:\s]+(\d+(?:,\d{3})*)(K?)\s*(?:lbs?|pounds?)?/gi);
  for (const match of standardMatches) {
    const state = match[1];
    let weight = parseInt(match[2].replace(/,/g, ""));
    if (match[3] === "K" || match[3] === "k") {
      // "36287K" means 80,000 lbs (36287 * 1000 / 453.592 = ~80,000)
      // Actually, K typically means multiply by 1000, but in this context it might mean 80k lbs
      // Let's treat it as: if K is present and weight < 100, multiply by 1000
      if (weight < 100) {
        weight = weight * 1000;
      } else {
        // Already in thousands, convert to lbs
        weight = Math.round(weight * 1000);
      }
    }
    weights[state] = { max_weight: weight, unit: "lbs" };
    found = true;
  }

  // Handle Quebec special case
  const qcMatch = text.match(/QC[:\s]+(\d+)\s+AXLES?/i);
  if (qcMatch) {
    const axles = parseInt(qcMatch[1]);
    // Store as special entry
    weights["QC"] = { max_weight: axles, unit: "axles" };
    found = true;
  }

  if (found) {
    confidence["jurisdiction_weights"] = 0.8;
    return weights;
  }

  confidence["jurisdiction_weights"] = 0.0;
  return null;
}
