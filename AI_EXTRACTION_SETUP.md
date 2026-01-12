# AI Document Extraction Setup Guide

This guide explains how to set up AI document extraction for RoadReady Phase 2.5.

## 🎯 Overview

AI document extraction automatically identifies document types and extracts expiration dates from uploaded documents using OpenAI's Vision API. Low-confidence extractions are flagged for manual review.

## 🔑 Setup Steps

### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (you won't see it again!)

### Step 2: Add Environment Variable

Add to your `.env.local` file:

```bash
OPENAI_API_KEY=sk-...
```

**For Vercel deployment:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key
   - **Environment:** Production, Preview, Development

### Step 3: Verify Setup

1. Start your dev server: `npm run dev`
2. Upload a document with AI extraction enabled
3. Check that AI suggestions appear

## 💰 Cost Considerations

### OpenAI Pricing (as of 2024)

- **GPT-4o (Vision):** ~$0.01-0.03 per image
- **GPT-4o-mini (Text):** ~$0.001-0.003 per request

**Estimated monthly cost:**
- 100 documents/month: ~$1-3
- 1,000 documents/month: ~$10-30

### Cost Optimization Tips

1. **Use GPT-4o-mini for text-only extraction** (if you have OCR text)
2. **Cache extraction results** for duplicate documents
3. **Only extract when user enables AI** (default can be off)
4. **Set confidence thresholds** to avoid unnecessary re-extractions

## 🧪 Testing

### Test AI Extraction

1. **Enable AI extraction:**
   - Check "Use AI to extract document type and expiration date"
   - Select a document (CDL, Medical Card, Insurance, etc.)
   - Wait for AI analysis

2. **Check suggestions:**
   - AI should suggest document type
   - AI should extract expiration date if present
   - Confidence score should be displayed

3. **Test low confidence:**
   - Upload a blurry or unclear document
   - Should see "Low confidence - flagged for review" warning
   - Document should appear in Review Queue

### Test Without OpenAI

If `OPENAI_API_KEY` is not set:
- AI extraction checkbox should still work
- Manual entry should still be available
- No errors should occur

## 🔒 Trust & Safety Rules

### Non-Negotiable Rules

1. **Low confidence (< 0.85) → Needs Review**
   - Document is flagged with `needs_review = true`
   - Appears in Review Queue
   - Status is NOT automatically set to Red

2. **No auto-red from low confidence**
   - Even if expiration date suggests expired, if confidence is low, status stays Yellow
   - Human must confirm before Red status

3. **User can always override**
   - AI suggestions are just suggestions
   - User can edit document type and expiration date
   - User can disable AI extraction entirely

### Confidence Thresholds

- **Document Type:** < 0.85 → Needs Review
- **Expiration Date:** < 0.90 → Needs Review
- **Overall:** < 0.85 → Needs Review

## 📋 Supported Document Types

AI is trained to recognize:

- **CDL** (Commercial Driver's License)
- **Medical Card** (DOT Medical Examiner's Certificate)
- **Insurance** (Vehicle Insurance)
- **Registration** (Vehicle Registration)
- **IFTA** (International Fuel Tax Agreement)
- **Annual Inspection** (Vehicle Annual Inspection)
- **Permit** (Various permits)
- **Other** (If none of the above)

## 🐛 Troubleshooting

### AI Extraction Not Working

1. **Check API Key:**
   ```bash
   echo $OPENAI_API_KEY
   ```
   Should show your key (not empty)

2. **Check Console Logs:**
   - Look for "AI extraction error" messages
   - Check network tab for API calls

3. **Check OpenAI Dashboard:**
   - Go to https://platform.openai.com/usage
   - Verify API calls are being made
   - Check for rate limits or errors

### Low Accuracy

1. **Image Quality:**
   - Ensure documents are clear and readable
   - Avoid blurry or low-resolution images
   - Use PDF when possible (better quality)

2. **Document Type:**
   - Some document types may be harder to identify
   - User can always correct manually

3. **Expiration Date Format:**
   - AI works best with standard date formats
   - Unusual formats may require manual entry

### Rate Limits

If you hit OpenAI rate limits:

1. **Check Usage:**
   - Go to OpenAI dashboard
   - Check current usage and limits

2. **Upgrade Plan:**
   - Consider upgrading OpenAI plan
   - Or implement request throttling

3. **Fallback:**
   - System gracefully falls back to manual entry
   - No errors shown to user

## 📊 Monitoring

### Track AI Usage

1. **OpenAI Dashboard:**
   - Monitor API usage
   - Track costs
   - Monitor accuracy

2. **Application Logs:**
   - Check extraction success rate
   - Monitor confidence scores
   - Track review queue size

3. **Review Queue:**
   - Documents with `needs_review = true`
   - Check `/review` page regularly
   - Monitor low-confidence rate

## ✅ Checklist

- [ ] OpenAI API key obtained
- [ ] `OPENAI_API_KEY` added to `.env.local`
- [ ] `OPENAI_API_KEY` added to Vercel environment variables
- [ ] Tested AI extraction with sample documents
- [ ] Verified low-confidence handling
- [ ] Checked Review Queue functionality
- [ ] Monitored costs in OpenAI dashboard

## 🚀 Next Steps

Once AI extraction is working:

1. **Monitor accuracy** - Track which document types are most accurate
2. **Adjust thresholds** - Fine-tune confidence thresholds based on real usage
3. **Add more document types** - Train AI on additional document types
4. **Optimize costs** - Implement caching or batch processing if needed

---

**Note:** AI extraction is optional. The system works perfectly fine with manual entry if AI is not configured or fails.
