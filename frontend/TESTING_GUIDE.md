# 🧪 Complete Application Testing Guide

This guide will help you test all functionality of the Shopkeeper UPI Tracker application.

## 🚀 Getting Started

1. **Start the Development Server**
   ```bash
   cd Kirana-App/frontend
   npm run dev
   ```

2. **Open the Application**
   - Navigate to `http://localhost:5174` (or the port shown in terminal)
   - The app should load with the onboarding wizard

## 📋 Testing Checklist

### ✅ 1. Onboarding Flow

#### Option A: Demo Shop Setup (Recommended for Quick Testing)
- [ ] Click "Try Demo Shop" button on the welcome screen
- [ ] Verify demo shop loads with "Sharma General Store"
- [ ] Check that 30+ products are pre-loaded
- [ ] Verify sample transactions are visible in dashboard

#### Option B: Custom Shop Setup
- [ ] Fill in shop details (name, type, location)
- [ ] Add at least 3-5 products with prices and stock
- [ ] Complete the onboarding process
- [ ] Verify shop is created successfully

### ✅ 2. Dashboard Functionality
- [ ] **Sales Overview**: Check today's sales, revenue, transaction count
- [ ] **Quick Stats**: Verify product count, low stock alerts
- [ ] **Recent Transactions**: View transaction history
- [ ] **Performance Metrics**: Check loading times and responsiveness

### ✅ 3. Audio Capture & UPI Detection

#### Setup Audio Permissions
- [ ] Browser should request microphone permission
- [ ] Grant microphone access when prompted
- [ ] Look for "🟢 Listening" indicator in navigation

#### Testing Audio Capture (Manual)

**🔧 New: Improved Manual Testing (Rate Limit Workaround)**

Due to Gemini API rate limiting (429 errors), use the enhanced ManualAudioTester:

1. **Navigate to Manual Tester**:
   - Go to any page with the ManualAudioTester component
   - Or access via the demo page

2. **Live Speech Recognition** (Recommended):
   - Click "🎤 Start Live Recognition"
   - Speak directly: "You received 50 rupees on PhonePe"
   - Watch real-time transcription and amount extraction
   - Works best in Chrome/Edge browsers

3. **Record & Process Mode**:
   - Click "📹 Record & Process" 
   - Speak your UPI alert message
   - Stop recording to process the audio

4. **Quick Test Samples**:
   - Use pre-built sample buttons for instant testing
   - Test different UPI providers (PhonePe, GPay, Paytm)
   - Test Hindi language support

Since we can't generate real UPI alerts, also test with:

1. **Console Testing**:
   ```javascript
   // Open browser console (F12) and run:
   window.testAudio = async () => {
     const service = new (await import('./src/services/IntegratedTransactionService.js')).IntegratedTransactionService({
       onTransactionDetected: (result) => console.log('Transaction detected:', result),
       onError: (error) => console.error('Error:', error),
       onStatusChange: (status) => console.log('Status:', status)
     });
     await service.startListening();
   };
   window.testAudio();
   ```

2. **Simulate UPI Alert**:
   ```javascript
   // Simulate a transaction
   window.simulateTransaction = () => {
     const event = new CustomEvent('upi-transaction', {
       detail: {
         amount: 50,
         transcription: 'You have received ₹50 on PhonePe from customer',
         confidence: 0.95
       }
     });
     window.dispatchEvent(event);
   };
   window.simulateTransaction();
   ```

### ✅ 4. Transaction Processing
- [ ] **Transaction Detection**: Audio should trigger transaction modal
- [ ] **Product Suggestions**: AI should suggest relevant products
- [ ] **Manual Selection**: Ability to select/modify products
- [ ] **Confirmation**: Transaction saves to database
- [ ] **Inventory Update**: Stock levels decrease automatically

### ✅ 5. Inventory Management
- [ ] **View Products**: Navigate to Inventory page
- [ ] **Add Products**: Create new products with details
- [ ] **Edit Products**: Modify existing product information
- [ ] **Stock Adjustments**: Increase/decrease stock levels
- [ ] **🆕 Expiry Date Management**: 
  - [ ] Set expiry dates during product creation (onboarding)
  - [ ] Edit expiry dates via "Adjust" button in inventory
  - [ ] View expiry status (expired/expiring soon) in inventory table
  - [ ] Remove expiry dates by leaving field empty
- [ ] **Low Stock Alerts**: Products below threshold show warnings
- [ ] **Audit Trail**: View stock change history

### ✅ 6. Chat Assistant
- [ ] **Navigate to Chat**: Click Assistant tab
- [ ] **Ask Questions**: Try these sample queries:
   - "आज कितना बेचा?" (How much sold today?)
   - "Which products are low in stock?"
   - "Show me today's best selling items"
   - "What's my total revenue this week?"
- [ ] **Multilingual Support**: Test Hindi and English queries
- [ ] **Business Insights**: Verify accurate responses

### ✅ 7. Transaction History
- [ ] **View Transactions**: Navigate to Transactions page
- [ ] **Filter by Date**: Test date range filtering
- [ ] **Filter by Type**: UPI vs Cash transactions
- [ ] **Transaction Details**: Click to view full transaction info
- [ ] **Export Data**: Check if export functionality works

### ✅ 8. Demo Mode (For Presentations)
- [ ] **Navigate to Demo**: Click Demo tab in navigation
- [ ] **Initialize Demo**: Click "Initialize Demo" button
- [ ] **Run Scenarios**: Execute individual demo scenarios
- [ ] **Full Demo**: Run complete presentation demo
- [ ] **Performance Metrics**: Check real-time analytics
- [ ] **Reset Demo**: Clear data for fresh presentation

### ✅ 9. Performance & Responsiveness
- [ ] **Loading Times**: Pages should load within 2-3 seconds
- [ ] **Mobile Responsive**: Test on mobile device/browser dev tools
- [ ] **Memory Usage**: Check browser task manager for memory leaks
- [ ] **Audio Processing**: Should handle continuous listening without lag
- [ ] **Database Operations**: CRUD operations should be fast

### ✅ 10. Error Handling
- [ ] **Network Errors**: Test with poor/no internet connection
- [ ] **Audio Errors**: Test without microphone permission
- [ ] **Invalid Data**: Try submitting forms with invalid data
- [ ] **API Failures**: Simulate Gemini API failures
- [ ] **Storage Errors**: Test with full browser storage

## 🔧 Console Commands for Testing

Open browser console (F12) and try these commands:

```javascript
// Initialize demo data
window.initDemoData();

// Get current shop stats
window.getDemoStats();

// Test audio capture
window.debugAudio.startCapture();

// Check database status
window.testDb();

// Performance monitoring
window.performance.mark('test-start');
// ... perform actions ...
window.performance.mark('test-end');
window.performance.measure('test-duration', 'test-start', 'test-end');
```

## 🐛 Common Issues & Solutions

### Audio Not Working
- **Issue**: Microphone permission denied
- **Solution**: Check browser settings, reload page, grant permission

### Transactions Not Saving
- **Issue**: Database errors in console
- **Solution**: Clear browser storage, refresh page

### Slow Performance
- **Issue**: High memory usage
- **Solution**: Close other browser tabs, check for memory leaks

### Chat Assistant Not Responding
- **Issue**: Missing Gemini API key
- **Solution**: Set `VITE_GEMINI_API_KEY` environment variable

### Demo Mode Issues
- **Issue**: Demo scenarios not executing
- **Solution**: Reset demo data, check console for errors

## 📊 Expected Performance Benchmarks

- **Page Load Time**: < 3 seconds
- **Audio Processing**: < 2 seconds from capture to transcription
- **Database Operations**: < 500ms for CRUD operations
- **Memory Usage**: < 100MB for normal operation
- **Transaction Processing**: < 5 seconds end-to-end

## 🎯 Success Criteria

The application is working correctly if:

1. ✅ Onboarding completes without errors
2. ✅ Audio capture shows "Listening" status
3. ✅ Transactions can be created and saved
4. ✅ Inventory updates automatically
5. ✅ Chat assistant responds to queries
6. ✅ All pages load and function properly
7. ✅ Demo mode executes scenarios successfully
8. ✅ Performance stays within benchmarks

## 🚨 Critical Test Scenarios

### Scenario 1: New Shop Owner
1. Complete custom onboarding
2. Add 5-10 products
3. Simulate 3-5 transactions
4. Check inventory updates
5. Ask chat assistant about sales

### Scenario 2: Demo Presentation
1. Use demo shop setup
2. Navigate to demo page
3. Run full demo presentation
4. Check all metrics and analytics
5. Reset for fresh demo

### Scenario 3: Daily Operations
1. Start with existing shop
2. Process 10+ transactions
3. Add new products
4. Adjust stock levels
5. Review daily reports

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify microphone permissions
3. Clear browser cache/storage
4. Try in incognito mode
5. Check network connectivity

Happy Testing! 🎉