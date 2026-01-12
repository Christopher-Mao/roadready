# AI Extraction Debugging Guide

If AI extraction shows "Analyzing document with AI..." but doesn't do anything, follow these steps:

## 🔍 Quick Checks

### 1. Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Select a file to upload
4. Look for these messages:
   - "Starting AI extraction for file: ..."
   - "AI extraction response status: ..."
   - Any error messages in red

### 2. Check Network Tab
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Select a file to upload
4. Look for request to `/api/documents/extract`
5. Click on it to see:
   - **Status:** Should be 200 (OK) or show error
   - **Response:** Should show extraction result or error

### 3. Check Server Logs
1. Look at your terminal where `npm run dev` is running
2. Look for:
   - "Extracting document info for file: ..."
   - "Extraction result: ..."
   - Any error messages

## 🐛 Common Issues

### Issue 1: OPENAI_API_KEY Not Set

**Symptoms:**
- No error shown in UI
- Console shows: "AI extraction not configured"
- Response shows: `reasoning: "AI extraction not configured (OPENAI_API_KEY missing)"`

**Fix:**
1. Check `.env.local` file exists
2. Add: `OPENAI_API_KEY=sk-...`
3. Restart dev server: `npm run dev`

### Issue 2: Invalid API Key

**Symptoms:**
- Console shows OpenAI API error
- Response status: 401 (Unauthorized)
- Error message: "Invalid API key"

**Fix:**
1. Verify API key at https://platform.openai.com/api-keys
2. Make sure key starts with `sk-`
3. Check key hasn't expired
4. Regenerate if needed

### Issue 3: Rate Limit Exceeded

**Symptoms:**
- Console shows: "429 Too Many Requests"
- Error: "Rate limit exceeded"

**Fix:**
1. Wait a few minutes
2. Check OpenAI usage dashboard
3. Upgrade plan if needed

### Issue 4: File Too Large

**Symptoms:**
- Response shows: "File size must be less than 10MB"
- Error in console

**Fix:**
- Use smaller file or compress image

### Issue 5: PDF Not Supported

**Symptoms:**
- Works with images but not PDFs
- OpenAI API returns error for PDF

**Fix:**
- Try converting PDF to image first
- Or use image format (JPG/PNG)

### Issue 6: Network Error

**Symptoms:**
- Console shows: "Failed to fetch"
- Network tab shows failed request

**Fix:**
1. Check internet connection
2. Check if OpenAI API is accessible
3. Check firewall/proxy settings

## 🧪 Test Steps

### Step 1: Test API Endpoint Directly

```bash
# Create a test script
curl -X POST http://localhost:3000/api/documents/extract \
  -F "file=@/path/to/test-image.jpg"
```

Should return JSON with extraction result.

### Step 2: Check Environment Variable

```bash
# In your terminal
echo $OPENAI_API_KEY
```

Should show your API key (not empty).

### Step 3: Test OpenAI API Directly

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

Should return list of models (not error).

## 📊 What to Look For

### Good Response (Success)
```json
{
  "extraction": {
    "docType": "CDL",
    "expiresOn": "2025-12-31",
    "confidence": 0.95,
    "needsReview": false,
    "reasoning": "Clear CDL document with expiration date visible"
  }
}
```

### Bad Response (No API Key)
```json
{
  "extraction": {
    "docType": null,
    "expiresOn": null,
    "confidence": 0,
    "needsReview": true,
    "reasoning": "AI extraction not configured (OPENAI_API_KEY missing)"
  }
}
```

### Bad Response (API Error)
```json
{
  "extraction": {
    "docType": null,
    "expiresOn": null,
    "confidence": 0,
    "needsReview": true,
    "reasoning": "AI extraction failed: Invalid API key"
  }
}
```

## 🔧 Debug Mode

To see more detailed logs, check:

1. **Browser Console** - Client-side logs
2. **Server Terminal** - Server-side logs
3. **Network Tab** - API request/response details

## ✅ Expected Behavior

1. User selects file
2. Shows "🤖 Analyzing document with AI..."
3. Makes request to `/api/documents/extract`
4. Shows AI suggestion box (if successful)
5. Or shows error message (if failed)

## 🆘 Still Not Working?

1. **Check all console logs** (browser + server)
2. **Check network request** to `/api/documents/extract`
3. **Verify OPENAI_API_KEY** is set correctly
4. **Test with a simple image** (not PDF)
5. **Check OpenAI dashboard** for API usage/errors

If still stuck, share:
- Browser console errors
- Server terminal logs
- Network request details
- Response from `/api/documents/extract`
