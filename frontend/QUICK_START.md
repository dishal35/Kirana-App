# 🚀 Quick Start Guide

## Prerequisites
1. **Gemini API Key** (Optional but recommended)
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create `.env` file in the frontend directory:
     ```
     VITE_GEMINI_API_KEY=your_api_key_here
     ```

## Start the Application

1. **Install Dependencies**
   ```bash
   cd Kirana-App/frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:5174`
   - Grant microphone permissions when prompted

## Quick Test Sequence

### 1. First Time Setup (Choose One)

#### Option A: Demo Shop (Recommended)
- Click "Try Demo Shop" on welcome screen
- This creates "Sharma General Store" with 30+ products and sample transactions

#### Option B: Custom Shop
- Fill in your shop details
- Add a few products manually
- Complete onboarding

### 2. Verify Core Functionality

Open browser console (F12) and run:

```javascript
// Check if everything is working
await window.testUtils.verifySetup();

// Test audio permissions
await window.testUtils.checkAudioPermissions();

// Run full health check
await window.testUtils.runHealthCheck();
```

### 3. Test Transaction Flow

```javascript
// Simulate a UPI transaction
window.testUtils.simulateTransaction(50, "Tea purchase");

// Or simulate multiple transactions
window.testUtils.simulateTransaction(25, "Biscuits");
window.testUtils.simulateTransaction(120, "Rice bag");
```

### 4. Test Audio Capture (Real Microphone)

1. Look for "🟢 Listening" indicator in navigation
2. Speak into microphone (any speech will be captured)
3. Check console for audio processing logs

### 5. Test All Features

- **Dashboard**: Check sales overview and metrics
- **Inventory**: Add/edit products, adjust stock
- **Transactions**: View transaction history
- **Chat**: Ask "आज कितना बेचा?" or "What are my top products?"
- **Demo**: Navigate to Demo tab for presentation mode

## Troubleshooting

### Audio Not Working
```javascript
// Check audio permissions
navigator.mediaDevices.getUserMedia({audio: true})
  .then(() => console.log('✅ Audio OK'))
  .catch(e => console.log('❌ Audio Error:', e));
```

### Database Issues
```javascript
// Clear and reset data
await window.testUtils.clearAllData();
// Then refresh page and restart onboarding
```

### Performance Issues
```javascript
// Check memory usage
console.log('Memory:', performance.memory);

// Monitor performance
window.performance.mark('test-start');
// ... do something ...
window.performance.mark('test-end');
window.performance.measure('test', 'test-start', 'test-end');
```

## Expected Behavior

✅ **Working Correctly:**
- Onboarding completes without errors
- "🟢 Listening" shows in navigation
- Transactions save and appear in dashboard
- Inventory updates automatically
- Chat responds to queries
- All pages load quickly

❌ **Needs Attention:**
- Console errors
- Audio permission denied
- Slow page loads (>3 seconds)
- Transactions not saving
- Chat not responding

## Demo Mode Testing

```javascript
// Initialize demo mode
await window.demoUtils.initDemo();

// Run a demo scenario
await window.demoUtils.executeScenario('scenario_1');

// Get demo metrics
window.demoUtils.getMetrics();

// Reset for fresh demo
await window.demoUtils.resetDemo();
```

## Performance Benchmarks

- **Page Load**: < 3 seconds
- **Audio Processing**: < 2 seconds
- **Database Operations**: < 500ms
- **Memory Usage**: < 100MB

Happy testing! 🎉

For detailed testing instructions, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)