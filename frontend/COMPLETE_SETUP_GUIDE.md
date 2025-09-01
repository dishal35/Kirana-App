# 🚀 Complete Setup Guide - Kirana UPI Tracker

## 🎯 New Features Overview

### ✅ 1. **Authentication System**
- **Login Page** with 2 preloaded accounts
- **Account Switching** between Demo & New Shop
- **Session Management** with localStorage persistence

### ✅ 2. **Click-to-Speak Audio**
- **No Continuous Listening** - only when you click
- **Real-time Speech Recognition** using Web Speech API
- **Fallback Support** for manual text input
- **UPI Amount Extraction** from spoken text

### ✅ 3. **Multi-Day Demo Data**
- **7 Days of Transaction History** with realistic patterns
- **20+ Products** with proper inventory management
- **Date Navigation** to explore historical data
- **Realistic Sales Patterns** (busy days, slow days, weekends)

### ✅ 4. **Enhanced Dashboard**
- **Date-Specific Metrics** for any selected day
- **Visual Date Navigator** with today/historical indicators
- **Account-Specific Data** (demo vs new shop)
- **Real-time Audio Integration** on dashboard

## 🔧 Quick Setup

### 1. **Start the Application**
```bash
cd Kirana-App/frontend
npm run dev
```

### 2. **Login Options**
Choose from 2 preloaded accounts:

**Demo Account (Recommended)**
- 📧 Email: `demo@kirana.app`
- 🔑 Password: `demo123` or `admin`
- 🏪 Shop: Sharma General Store (fully loaded with data)

**New Shop Account**
- 📧 Email: `newshop@kirana.app`
- 🔑 Password: `demo123` or `admin`
- 🏪 Shop: Fresh setup (requires onboarding)

### 3. **Quick Demo Setup**
For instant demo with multi-day data:
```javascript
// In browser console (F12)
await window.setupCompleteDemo();
```

## 🎮 How to Use

### **1. Login & Account Switching**
1. **Login**: Use quick login buttons or manual form
2. **Switch Accounts**: Click profile icon in top-right
3. **Logout**: Available in account dropdown

### **2. Click-to-Speak Audio**
1. **Navigate to Dashboard**: Main page after login
2. **Click Microphone Button**: Large blue/purple button
3. **Speak UPI Alert**: "You received 50 rupees on PhonePe"
4. **View Results**: Amount extracted automatically

**Sample Phrases to Try:**
- "You have received rupees 50 on PhonePe from customer"
- "Payment of rupees 25 received via Google Pay"
- "Paytm payment rupees 100 received successfully"
- "UPI payment of ₹75 credited via BHIM"

### **3. Date Navigation**
1. **Use Date Navigator**: Top of dashboard
2. **Previous/Next Day**: Arrow buttons
3. **Jump to Today**: "Today" button
4. **View Historical Data**: Sales, transactions, metrics for any day

### **4. Multi-Day Demo Exploration**
1. **Navigate Different Days**: Use date navigator
2. **Compare Sales Patterns**: See busy vs slow days
3. **View Transaction Details**: Click on transactions
4. **Analyze Trends**: Weekly sales data

## 📊 Demo Data Breakdown

### **Transaction Patterns by Day**
- **Today**: 8 transactions (current day)
- **Yesterday**: 15 transactions (normal day)
- **2 Days Ago**: 12 transactions
- **3 Days Ago**: 18 transactions (busy day)
- **4 Days Ago**: 10 transactions
- **5 Days Ago**: 6 transactions (slow day)
- **6 Days Ago**: 14 transactions (weekend)

### **Product Categories**
- **Groceries**: Rice, Flour, Sugar, Oil, Tea (25+ items)
- **Dairy & Beverages**: Milk, Yogurt, Soft Drinks (12+ items)
- **Snacks**: Biscuits, Noodles, Chips (15+ items)
- **Personal Care**: Toothpaste, Soap, Shampoo (8+ items)
- **Household**: Detergent, Dishwash (5+ items)
- **Stationery**: Notebooks, Pens, Pencils (6+ items)

### **Realistic Features**
- **Expiry Dates**: Dairy products have realistic expiry dates
- **Stock Levels**: Varied inventory with low stock alerts
- **Price Ranges**: ₹10 - ₹180 (realistic Indian prices)
- **Payment Mix**: 80% UPI, 20% Cash transactions
- **Time Distribution**: Business hours (8 AM - 9 PM)

## 🧪 Testing Scenarios

### **Scenario 1: New User Experience**
1. Login with `newshop@kirana.app`
2. Complete onboarding wizard
3. Add 5-10 products manually
4. Test click-to-speak audio
5. Create transactions and view dashboard

### **Scenario 2: Demo Shop Exploration**
1. Login with `demo@kirana.app`
2. Navigate through different dates
3. Compare sales patterns across week
4. Test audio with various UPI phrases
5. Switch to inventory management
6. Adjust stock levels and expiry dates

### **Scenario 3: Account Switching**
1. Start with demo account
2. Explore multi-day data
3. Switch to new shop account
4. Complete onboarding
5. Switch back to demo
6. Verify data persistence

### **Scenario 4: Audio Transaction Flow**
1. Go to dashboard
2. Click microphone button
3. Speak: "You received 100 rupees on PhonePe"
4. Verify amount extraction (₹100)
5. Complete transaction with product selection
6. Check inventory updates
7. View transaction in history

## 🔍 Advanced Features

### **Console Commands**
```javascript
// Setup complete demo environment
await window.setupCompleteDemo();

// Verify demo data
await window.verifyDemoData();

// Get sales for specific date
const today = new Date();
const summary = await MultiDayDemoService.getSalesSummaryForDate(today);
console.log('Today Sales:', summary);

// Get weekly sales data
const weeklyData = await MultiDayDemoService.getWeeklySalesData();
console.log('Weekly Data:', weeklyData);

// Switch accounts programmatically
const { useAuth } = await import('./src/contexts/AuthContext');
// (Use in React components)
```

### **Date-Specific Queries**
```javascript
// Get transactions for specific date
const date = new Date('2024-01-15');
const transactions = await MultiDayDemoService.getTransactionsForDate(date);

// Get sales summary for date
const summary = await MultiDayDemoService.getSalesSummaryForDate(date);
```

## 🎯 Key Benefits

### **For Development**
- **Realistic Testing Environment**: Multi-day data for thorough testing
- **Account Isolation**: Test different user scenarios
- **Audio Testing**: No API rate limits with click-to-speak
- **Date Simulation**: Test dashboard across different time periods

### **For Demos**
- **Instant Setup**: Pre-loaded demo account ready to use
- **Rich Data**: Week of realistic transaction history
- **Interactive Audio**: Live speech recognition demonstration
- **Professional UI**: Polished interface for presentations

### **For Users**
- **Easy Onboarding**: Simple login with quick options
- **Flexible Audio**: Click when ready, no continuous listening
- **Historical Analysis**: View past performance easily
- **Account Management**: Switch between different shops

## 🚨 Troubleshooting

### **Audio Not Working**
1. **Check Browser**: Use Chrome or Edge for best results
2. **Microphone Permission**: Grant when prompted
3. **Fallback Mode**: Manual text input if speech fails
4. **Sample Testing**: Use pre-built sample buttons

### **Login Issues**
1. **Correct Credentials**: Use `demo123` or `admin` as password
2. **Clear Storage**: Clear localStorage if needed
3. **Account Switching**: Use dropdown in top-right

### **Data Issues**
1. **Reset Demo**: Run `await window.setupCompleteDemo()`
2. **Verify Data**: Run `await window.verifyDemoData()`
3. **Clear All**: Clear browser storage and refresh

## 🎉 Success Checklist

After setup, you should have:
- ✅ **Working Login**: Can access both demo and new accounts
- ✅ **Click-to-Speak Audio**: Microphone button responds to speech
- ✅ **Date Navigation**: Can browse different days
- ✅ **Multi-Day Data**: See transactions across 7 days
- ✅ **Account Switching**: Can switch between accounts
- ✅ **Complete Onboarding**: New shop setup works
- ✅ **Inventory Management**: Can adjust stock and expiry dates
- ✅ **Transaction Processing**: Audio creates actual transactions

**Ready for Demo! 🚀**