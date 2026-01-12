# IRP Cab Card Processing Setup Guide

This guide explains how to set up and use IRP Cab Card document processing in RoadReady.

## 🎯 Overview

IRP Cab Card processing automatically:
1. Extracts text from uploaded PDFs/images using OCR
2. Parses key fields (expiration date, VIN, plate number, etc.)
3. Stores extracted data in `document_extractions` table
4. Updates document status and expiration dates
5. Flags low-confidence extractions for manual review

## 📋 Prerequisites

### 1. Database Migration

Run the migration in Supabase SQL Editor:

```sql
-- See SUPABASE_IRP_MIGRATION.sql for complete migration
```

This creates:
- `document_extractions` table
- `processing_status` field on `documents` table
- `expiration_date` field on `documents` table
- RLS policies for security

### 2. OCR Provider Setup

Choose one OCR provider:

#### Option A: Google Document AI (Recommended)

1. Go to https://console.cloud.google.com/
2. Create a project or select existing
3. Enable Document AI API
4. Create a processor:
   - Go to Document AI → Processors
   - Create processor → "Form Parser" or "OCR Processor"
   - Note the Processor ID

5. Create service account:
   - IAM & Admin → Service Accounts
   - Create service account
   - Grant "Document AI API User" role
   - Create JSON key and download

6. Add to `.env.local`:
   ```bash
   GOOGLE_DOCUMENT_AI_PROJECT_ID=your-project-id
   GOOGLE_DOCUMENT_AI_LOCATION=us
   GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   ```

#### Option B: AWS Textract (Alternative)

1. Go to https://console.aws.amazon.com/textract/
2. Create IAM user with Textract access
3. Get access key and secret
4. Add to `.env.local`:
   ```bash
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_REGION=us-east-1
   ```

#### Option C: Basic PDF Parsing (Fallback)

For PDFs with embedded text (not scanned):
1. Install pdf-parse: `npm install pdf-parse`
2. No additional setup needed
3. Works for text-based PDFs only (not scanned images)

### 3. Install Dependencies

```bash
npm install pdf-parse
```

## 🚀 Usage

### Upload IRP Cab Card

1. Navigate to a vehicle detail page
2. Click "Upload Document"
3. Select document type: **"IRP Cab Card"**
4. Upload PDF or image file
5. Document status will show "Processing..."
6. Wait for processing to complete (usually 10-30 seconds)

### View Extracted Fields

1. Go to vehicle detail page
2. Find the IRP Cab Card in documents list
3. Click "View Details" (for IRP_CAB_CARD) or document name
4. See all extracted fields with confidence scores

### Manual Review

If document status is "Needs Review":
1. Go to document detail page
2. Click "Edit Fields" button
3. Correct any incorrect fields
4. Click "Save Changes"
5. Document status updates to "Complete"

## 📊 Extracted Fields

The parser extracts:

### Required Fields
- **Expiration Date** - Normalized to YYYY-MM-DD
- **VIN** - 17 characters, validated
- **USDOT Number** - 6-8 digits, validated
- **Plate Number** - Alphanumeric

### Vehicle Information
- **Vehicle Type** - e.g., "TT"
- **Unit Number**
- **Make** - e.g., "FREIGHTLINER"
- **Model Year**
- **Fuel Type**

### Weights
- **Unladen Weight** - lbs
- **Gross Weight** - lbs
- **Axles** - Number of axles
- **Seats** - Number of seats

### Registration Information
- **Registrant Name**
- **Registrant Address** - Multi-line
- **Document Number**

### Carrier Information
- **Carrier Responsible for Safety Name**
- **Carrier Address** - Multi-line
- **Owner/Lessor Name**

### Jurisdiction Weights
- **Jurisdiction Weights** - Map of state/province → max weight
- Handles special case: "QC: 5 AXLES" for Quebec

## 🧪 Testing

### Test with Sample Document

1. **Create test document:**
   - Upload a Texas IRP Cab Card PDF
   - Select "IRP Cab Card" as document type

2. **Check processing:**
   - Document should show "Processing..." status
   - Wait for completion (check server logs)

3. **Verify extraction:**
   - Go to document detail page
   - Check all fields are extracted correctly
   - Verify confidence scores

### Test Parser Directly

Unit tests are in `lib/parsers/__tests__/irpCabCard.test.ts`:

```bash
npm test lib/parsers/__tests__/irpCabCard.test.ts
```

## 🔍 Troubleshooting

### Document Stuck in "Processing"

1. **Check server logs:**
   - Look for errors in terminal
   - Check for OCR provider errors

2. **Check processing endpoint:**
   - Manually trigger: `POST /api/documents/process/[documentId]`
   - Check response for errors

3. **Verify OCR setup:**
   - Check environment variables
   - Test OCR provider directly

### Low Extraction Accuracy

1. **Image Quality:**
   - Ensure document is clear and readable
   - Avoid blurry or low-resolution images
   - Use PDF when possible

2. **OCR Provider:**
   - Google Document AI generally has better accuracy
   - Consider upgrading OCR provider

3. **Manual Review:**
   - Use "Edit Fields" to correct errors
   - System learns from corrections

### Processing Fails

1. **Check file format:**
   - Supported: PDF, JPG, PNG
   - Ensure file is not corrupted

2. **Check file size:**
   - Max 10MB
   - Large files may timeout

3. **Check OCR provider:**
   - Verify credentials are correct
   - Check API quotas/limits

## 📝 Field Mapping

### Date Formats Supported
- "Expires: March 31, 2025"
- "EXP 03/31/2025"
- "Expiration: 2025-03-31"
- "03/31/2025 EXP"

### Weight Formats Supported
- "80,000 lbs"
- "80000 lbs"
- "36287K" (special format: K = thousands, converted to lbs)

### VIN Validation
- Must be 17 characters
- No I, O, or Q (common OCR errors)
- Alphanumeric only

### USDOT Validation
- Must be 6-8 digits
- Numeric only

## 🔒 Security

- All extractions are protected by RLS
- Users can only see extractions for their fleet
- Processing uses admin client (server-side only)
- No sensitive data exposed to client

## 📈 Performance

- Processing time: 10-30 seconds per document
- OCR: 5-15 seconds
- Parsing: <1 second
- Database write: <1 second

## ✅ Checklist

- [ ] Database migration run
- [ ] OCR provider configured (Google Document AI or AWS Textract)
- [ ] Environment variables set
- [ ] `pdf-parse` installed (if using fallback)
- [ ] Test upload successful
- [ ] Extraction fields display correctly
- [ ] Manual edit works
- [ ] Alerts trigger correctly

## 🎯 Next Steps

1. **Monitor accuracy** - Track which fields extract correctly
2. **Adjust parser** - Fine-tune regex patterns based on real documents
3. **Add more document types** - Extend parser for other IRP documents
4. **Improve OCR** - Consider upgrading to better OCR provider

---

**Note:** IRP Cab Card processing is fully integrated into the compliance system. Documents automatically appear in the dashboard and trigger alerts based on expiration dates.
