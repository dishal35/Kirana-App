# Manual Audio Test Guide

## Overview
This guide helps you test the manual audio recording and product recommendation functionality without the automatic audio recording that was causing API rate limit issues.

## Changes Made

### 1. Disabled Auto Audio Recording
- **File**: `src/App.tsx`
- **Change**: Commented out auto-start listening functionality
- **Result**: Audio recording now only happens when you manually click the microphone button

### 2. Created Manual Test Interface
- **File**: `src/examples/ManualAudioTest.tsx`
- **Access**: Go to Demo page → "Manual Audio Test" tab
- **Features**:
  - Manual audio recording button
  - Product suggestion testing with custom amounts
  - Activity log to track what's happening
  - Mock products for testing

## How to Test

### Step 1: Access the Test Interface
1. Navigate to the **Demo** page in the app
2. Click on the **"🎤 Manual Audio Test"** tab
3. You'll see the manual test interface

### Step 2: Test Manual Audio Recording
1. **Click the microphone button** in the "Manual Audio Recording" section
2. **Speak clearly** - try saying something like:
   - "Payment received 100 rupees"
   - "UPI payment 50 rupees milk"
   - "Received 75 rupees for bread"
3. **Click stop** when done speaking
4. **Watch the activity log** for results

### Step 3: Test Product Suggestion (Without Audio)
1. In the "Product Suggestion Test" section:
   - Set a **test amount** (e.g., 100)
   - Enter a **test transcription** (e.g., "milk purchase")
2. **Click "Test Product Suggestion"**
3. This will open the **ProductSuggestionModal** with:
   - Your specified amount
   - Mock products as suggestions
   - Transcription text

### Step 4: Test Product Selection Flow
When the modal opens:
1. **Review suggested products** (first 2 products will be suggested)
2. **Adjust quantities** using the +/- buttons
3. **Select additional products** from the catalog if needed
4. **Click "Confirm Transaction"** to complete
5. **Watch the activity log** for completion confirmation

## Expected Behavior

### ✅ What Should Work
- **Manual Recording**: Click mic → speak → stop → processing
- **Product Suggestions**: Based on amount, relevant products suggested
- **Quantity Adjustment**: Increase/decrease product quantities
- **Transaction Completion**: Save transaction and update inventory
- **Error Handling**: Clear error messages in activity log

### ❌ What's Disabled
- **Auto Audio Recording**: No more continuous listening
- **Background Processing**: No automatic UPI detection
- **Rate Limit Issues**: Reduced API calls

## Mock Products Available
The test includes these mock products:
- **Milk (1L)** - ₹60
- **Bread** - ₹25  
- **Rice (1kg)** - ₹80
- **Sugar (1kg)** - ₹45

## Troubleshooting

### If Audio Recording Doesn't Work
1. **Check browser permissions** - Allow microphone access
2. **Check console logs** - Look for error messages
3. **Try different browsers** - Chrome/Edge work best
4. **Check activity log** - Shows detailed error messages

### If Product Suggestion Doesn't Work
1. **Check the modal opens** - Should appear after clicking test button
2. **Verify products display** - Should show mock products
3. **Test quantity changes** - +/- buttons should work
4. **Check transaction completion** - Should show success in log

### If API Rate Limits Still Occur
1. **Wait a few minutes** - Rate limits reset over time
2. **Use the manual test** - Bypasses audio transcription
3. **Check network tab** - See if API calls are being made

## Testing Scenarios

### Scenario 1: Basic Audio Recording
1. Click mic → say "Payment 100 rupees" → stop
2. Should process and suggest products around ₹100

### Scenario 2: Product Selection
1. Use manual test with ₹60 amount
2. Should suggest Milk (₹60) as primary option
3. Adjust quantity and confirm

### Scenario 3: Multiple Products
1. Use manual test with ₹150 amount  
2. Select multiple products totaling around ₹150
3. Confirm transaction

### Scenario 4: Error Handling
1. Try recording without speaking
2. Try with very low amount (₹1)
3. Check error messages in activity log

## Next Steps
Once manual testing works:
1. **Verify transaction saving** - Check if transactions appear in logs
2. **Test inventory updates** - Confirm stock decreases
3. **Check dashboard integration** - See if metrics update
4. **Test notification system** - Verify alerts for low stock

This manual approach lets you test all the core functionality without the API rate limiting issues from continuous audio monitoring.