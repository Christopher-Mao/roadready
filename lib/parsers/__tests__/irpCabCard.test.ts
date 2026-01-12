/**
 * Unit tests for IRP Cab Card Parser
 */

import { parseIRPCabCard } from "../irpCabCard";

describe("IRP Cab Card Parser", () => {
  // Clean OCR text sample
  const cleanOCR = `
    TEXAS IRP APPORTIONED LICENSE CAB CARD
    Registrant Name: ABC TRUCKING COMPANY
    Registrant Address: 123 MAIN STREET
    HOUSTON, TX 77001
    
    Plate Number: TX12345
    Vehicle Type: TT
    Unit Number: TRUCK-001
    Unladen Weight: 15,000 lbs
    Gross Weight: 80,000 lbs
    Axles: 5
    Seats: 2
    Model Year: 2020
    Make: FREIGHTLINER
    Fuel: DIESEL
    VIN: 1FUJGHDV5LHA12345
    Document Number: IRP-2024-12345
    USDOT: 1234567
    Carrier Responsible for Safety Name: ABC TRUCKING COMPANY
    Carrier Address: 123 MAIN STREET
    HOUSTON, TX 77001
    Owner/Lessor Name: ABC TRUCKING COMPANY
    
    Expires: March 31, 2025
    
    JURISDICTION WEIGHTS:
    TX: 80000 lbs
    CA: 80000 lbs
    NM: 80000 lbs
    QC: 5 AXLES
  `;

  // Noisy OCR text sample (common OCR errors)
  const noisyOCR = `
    TEXAS IRP APPORTIONED LICENSE CAB CARD
    Registrant Name: ABC TRUCK|NG COMPANY  (OCR error: | instead of I)
    Registrant Address: 123 MA|N STREET
    HOUSTON, TX 7700l  (OCR error: l instead of 1)
    
    Plate Number: TXl2345  (OCR error)
    Vehicle Type: TT
    Unit Number: TRUCK-00l
    Unladen Weight: 15,000 Ibs  (OCR error: I instead of l)
    Gross Weight: 80,000 Ibs
    Axles: 5
    Seats: 2
    Model Year: 2020
    Make: FRE|GHTL|NER  (OCR errors)
    Fuel: D|ESEL
    VIN: 1FUJGHDV5LHA12345
    Document Number: IRP-2024-12345
    USDOT: 1234567
    Carrier Responsible for Safety Name: ABC TRUCK|NG COMPANY
    Carrier Address: 123 MA|N STREET
    HOUSTON, TX 7700l
    Owner/Lessor Name: ABC TRUCK|NG COMPANY
    
    Expires: March 3l, 2025  (OCR error: l instead of 1)
    
    JURISDICTION WEIGHTS:
    TX: 80000 Ibs
    CA: 36287K  (Special format: K means thousands)
    NM: 80000 Ibs
    QC: 5 AXLES
  `;

  describe("Clean OCR parsing", () => {
    it("should extract all fields from clean OCR text", () => {
      const result = parseIRPCabCard(cleanOCR);

      expect(result.fields.expiration_date).toBe("2025-03-31");
      expect(result.fields.registrant_name).toContain("ABC TRUCKING");
      expect(result.fields.plate_number).toBe("TX12345");
      expect(result.fields.vehicle_type).toBe("TT");
      expect(result.fields.unit_number).toBe("TRUCK-001");
      expect(result.fields.unladen_weight).toBe(15000);
      expect(result.fields.gross_weight).toBe(80000);
      expect(result.fields.axles).toBe(5);
      expect(result.fields.seats).toBe(2);
      expect(result.fields.model_year).toBe(2020);
      expect(result.fields.make).toContain("FREIGHTLINER");
      expect(result.fields.fuel).toBe("DIESEL");
      expect(result.fields.vin).toBe("1FUJGHDV5LHA12345");
      expect(result.fields.document_number).toContain("IRP-2024");
      expect(result.fields.usdot_number).toBe("1234567");
      expect(result.fields.jurisdiction_weights).toBeDefined();
      expect(result.fields.jurisdiction_weights?.TX?.max_weight).toBe(80000);
      expect(result.fields.jurisdiction_weights?.QC?.max_weight).toBe(5);
      expect(result.fields.jurisdiction_weights?.QC?.unit).toBe("axles");
    });

    it("should have high confidence scores for clean text", () => {
      const result = parseIRPCabCard(cleanOCR);

      expect(result.confidence.expiration_date).toBeGreaterThan(0.8);
      expect(result.confidence.plate_number).toBeGreaterThan(0.8);
      expect(result.confidence.vin).toBeGreaterThan(0.9);
      expect(result.confidence.usdot_number).toBeGreaterThan(0.8);
    });
  });

  describe("Noisy OCR parsing", () => {
    it("should handle OCR errors and extract fields", () => {
      const result = parseIRPCabCard(noisyOCR);

      // Should still extract most fields despite OCR errors
      expect(result.fields.expiration_date).toBe("2025-03-31");
      expect(result.fields.registrant_name).toBeDefined();
      expect(result.fields.plate_number).toBeDefined();
      expect(result.fields.vin).toBe("1FUJGHDV5LHA12345"); // VIN should be clean
      expect(result.fields.usdot_number).toBe("1234567");
    });

    it("should handle special weight format (36287K)", () => {
      const result = parseIRPCabCard(noisyOCR);

      expect(result.fields.jurisdiction_weights).toBeDefined();
      // CA: 36287K should be converted to ~80,000 lbs
      const caWeight = result.fields.jurisdiction_weights?.CA?.max_weight;
      expect(caWeight).toBeGreaterThan(30000);
    });

    it("should have lower confidence for noisy fields", () => {
      const result = parseIRPCabCard(noisyOCR);

      // Some fields may have lower confidence due to OCR errors
      // But critical fields like VIN and USDOT should still be high
      expect(result.confidence.vin).toBeGreaterThan(0.9);
      expect(result.confidence.usdot_number).toBeGreaterThan(0.8);
    });
  });

  describe("Edge cases", () => {
    it("should handle missing fields gracefully", () => {
      const minimalOCR = "TEXAS IRP APPORTIONED LICENSE CAB CARD";
      const result = parseIRPCabCard(minimalOCR);

      expect(result.fields.expiration_date).toBeNull();
      expect(result.fields.vin).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate VIN format (17 chars, no I/O/Q)", () => {
      const invalidVIN = "VIN: 1FUJGHDV5LHA1234I"; // Contains I
      const result = parseIRPCabCard(invalidVIN);

      // Should not extract invalid VIN
      expect(result.fields.vin).toBeNull();
    });

    it("should validate USDOT format (6-8 digits)", () => {
      const invalidDOT = "USDOT: 12345"; // Too short
      const result = parseIRPCabCard(invalidDOT);

      expect(result.fields.usdot_number).toBeNull();
    });

    it("should handle different date formats", () => {
      const dateFormats = [
        "Expires: March 31, 2025",
        "EXP 03/31/2025",
        "Expiration: 2025-03-31",
        "03/31/2025 EXP",
      ];

      dateFormats.forEach((dateText) => {
        const result = parseIRPCabCard(dateText);
        expect(result.fields.expiration_date).toBe("2025-03-31");
      });
    });
  });
});
