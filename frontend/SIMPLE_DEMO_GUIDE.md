# 🚀 Simple Demo Setup Guide

## Quick Start (2 minutes)

### 1. **Login to Demo Account**
- 📧 Email: `demo@kirana.app`
- 🔑 Password: `demo123`
- Click "Try Demo Shop" for instant setup

### 2. **What You Get**
- ✅ **10 Essential Products** (Rice, Milk, Bread, Tea, etc.)
- ✅ **12 Transactions** across 3 days (Today: 3, Yesterday: 5, 2 days ago: 4)
- ✅ **Click-to-Speak Audio** on dashboard
- ✅ **Date Navigation** to view different days
- ✅ **Account Switching** (Demo ↔ New Shop)

### 3. **Test Audio Transaction**
1. Go to **Dashboard**
2. Click the **🎤 microphone button**
3. Say: **"You received 100 rupees on PhonePe"**
4. If speech fails → **Type manually** in the prompt
5. ✅ **New transaction created automatically!**

### 4. **Explore Features**
- **📅 Date Navigator**: Click arrows to see different days
- **📊 Dashboard**: View sales metrics for selected date
- **📦 Inventory**: Manage products and stock
- **💳 Transactions**: View all transaction history
- **👤 Account Switch**: Click profile icon to switch accounts

## 🎯 Testing Scenarios

### **Scenario 1: Add Transactions**
```
1. Click microphone on dashboard
2. Say: "Payment of 50 rupees received via Google Pay"
3. Check dashboard updates
4. Go to Transactions page to see new entry
```

### **Scenario 2: Navigate Days**
```
1. Use date navigator arrows
2. See different transaction counts per day
3. Click "Today" to return to current date
4. Notice metrics change based on selected date
```

### **Scenario 3: Account Switching**
```
1. Click profile icon (top-right)
2. Switch to "New Shop Owner" account
3. Complete onboarding wizard
4. Switch back to demo account
5. All demo data preserved
```

### **Scenario 4: Inventory Management**
```
1. Go to Inventory page
2. Click "Adjust" on any product
3. Change stock levels
4. Set/update expiry dates
5. View changes reflected in dashboard
```

## 🔧 Console Commands

```javascript
// Setup fresh demo data
await window.setupSimpleDemo();

// Verify current demo data
await window.verifyDemoData();

// Add transaction manually (if needed)
const { SimpleDemoService } = await import('./src/services/SimpleDemoService');
await SimpleDemoService.addManualTransaction(75, 'Test transaction', [
  { productId: 'some-product-id', quantity: 1 }
]);
```

## 🚨 Troubleshooting

### **Speech Recognition Issues**
- **Network Error**: Will auto-fallback to manual text input
- **No Speech Detected**: Type in the prompt that appears
- **Browser Support**: Works best in Chrome/Edge

### **No Transactions Showing**
```javascript
// Reset demo data
await window.setupSimpleDemo();
location.reload();
```

### **Login Issues**
- Use exact credentials: `demo@kirana.app` / `demo123`
- Clear browser storage if needed
- Try the quick login buttons

## ✅ Success Checklist

After setup, you should have:
- ✅ **Login working** with demo account
- ✅ **10 products** in inventory
- ✅ **12 transactions** across 3 days
- ✅ **Click-to-speak** creates new transactions
- ✅ **Date navigation** shows different data
- ✅ **Account switching** works
- ✅ **All pages accessible** (Dashboard, Inventory, Transactions, Chat)

**Ready to test! 🎉**

## 🎤 Sample Phrases to Try

- "You received 50 rupees on PhonePe"
- "Payment of 25 rupees received via Google Pay"
- "UPI payment 100 rupees received successfully"
- "Received 75 rupees through PhonePe payment"

**Each phrase will create a real transaction in your demo shop!**