# 🚀 Quick Fix - Get App Working Now!

## 🚨 Latest Fixes (Just Added)

### ✅ Fix: Gemini API Rate Limiting (429 Errors)
**Problem**: `GeminiTranscription.ts:78 POST ... 429 (Too Many Requests)`

**Quick Solution**: Use enhanced manual testing
1. Look for ManualAudioTester component on any page
2. Click "🎤 Start Live Recognition" (works in Chrome/Edge)
3. Speak: "You received 50 rupees on PhonePe"
4. Or use sample buttons for instant testing

### ✅ Fix: Cannot Edit Expiry Dates
**Problem**: No way to change product expiry dates

**Quick Solution**: 
1. Go to Inventory page
2. Click "Adjust" button on any product
3. Use the new "Expiry Date" field to set/update/remove dates
4. Leave empty to remove expiry date

## Issue 1: No Onboarding Showing

**Solution:** Clear all data and force onboarding

Open browser console (F12) and run:
```javascript
// Force onboarding mode
await window.testUtils.forceOnboarding();
// Then refresh the page
location.reload();
```

**OR** use the shortcut:
```javascript
await window.forceOnboarding();
location.reload();
```

## Issue 2: Audio Processing Errors

**Solution:** The errors are normal! The app is listening to all audio but only processes UPI payments.

The error "Amount extraction failed validation" means:
- ✅ Audio capture is working
- ✅ Transcription is working  
- ❌ No UPI payment detected in the audio

This is **expected behavior** when you're not playing actual UPI alerts.

## Quick Setup Steps

### 1. Get Onboarding Working
```javascript
// In browser console:
await window.forceOnboarding();
location.reload();
```

### 2. Choose Setup Method

#### Option A: Demo Shop (Fastest)
- Click "Try Demo Shop" button
- Gets you a fully working shop instantly

#### Option B: Custom Shop  
- Fill in your shop details
- Add a few products
- Complete onboarding

### 3. Test Transaction Processing

Since you won't have real UPI alerts, simulate them:

```javascript
// Simulate a UPI transaction
window.testUtils.simulateTransaction(50, "Tea purchase");

// Simulate multiple transactions
window.testUtils.simulateTransaction(25, "Biscuits");
window.testUtils.simulateTransaction(120, "Rice");
window.testUtils.simulateTransaction(35, "Milk");
```

### 4. Verify Everything Works

```javascript
// Check if app is working properly
await window.verifyApp();
```

## Expected Behavior After Fix

✅ **What Should Work:**
- Onboarding wizard appears on first visit
- Can complete shop setup (demo or custom)
- Dashboard shows with data
- Can navigate between pages
- Audio shows "🟢 Listening" status
- Simulated transactions work
- Chat assistant responds

❌ **Expected "Errors" (These are Normal):**
- "No UPI payment detected" in console - this is correct!
- Audio processing errors when speaking random words - expected!

## Test the Complete Flow

1. **Setup:**
   ```javascript
   await window.forceOnboarding();
   location.reload();
   ```

2. **Complete Onboarding:**
   - Choose "Try Demo Shop" for instant setup
   - OR fill in custom shop details

3. **Test Transactions:**
   ```javascript
   // Create some test transactions
   window.testUtils.simulateTransaction(50, "Customer bought tea");
   window.testUtils.simulateTransaction(25, "Biscuit sale");
   ```

4. **Test All Features:**
   - Navigate to Dashboard ✅
   - Check Inventory page ✅  
   - View Transactions ✅
   - Try Chat Assistant ✅
   - Test Demo mode ✅

## Real UPI Testing

To test with actual UPI-like audio:

1. **Record UPI Alert:** Use your phone to record a UPI payment alert
2. **Play Near Microphone:** Play the recording near your computer's microphone
3. **Check Processing:** Should detect amount and suggest products

**OR** use text-to-speech:
- Use online TTS to generate: "You have received rupees 50 on PhonePe from customer"
- Play the generated audio near microphone

## Troubleshooting

### Still No Onboarding?
```javascript
// Nuclear option - clear everything
await window.testUtils.clearAllData();
localStorage.clear();
location.reload();
```

### Audio Not Working?
```javascript
// Check audio permissions
await window.testUtils.checkAudioPermissions();
```

### Performance Issues?
```javascript
// Check system health
await window.testUtils.runHealthCheck();
```

## Success Checklist

After following these steps, you should have:

- ✅ Working onboarding flow
- ✅ Shop with products and data
- ✅ Audio listening (green indicator)
- ✅ Transaction simulation working
- ✅ All pages navigable
- ✅ Chat assistant responding
- ✅ Demo mode functional

The app is now **fully functional** for testing all features! 🎉

---

**Note:** The "amount extraction failed" errors are **normal** and **expected** when the app doesn't detect UPI payment language in the audio. This means the UPI detection is working correctly!