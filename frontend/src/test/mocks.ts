import type { Product, Transaction, Shop, ShopSettings, TransactionItem } from '../types';

const now = new Date();

export const mockProducts: { [key: string]: Product } = {
  valid: {
    id: 'test-id',
    name: "Test Product",
    price: 100,
    stock: 10,
    reorderThreshold: 5,
    category: "Grocery",
    expiryDate: new Date(Date.now() + 86400000), // tomorrow
    createdAt: now,
    updatedAt: now
  },
  invalid: {
    id: 'invalid-id',
    name: "",
    price: -10,
    stock: -1,
    reorderThreshold: -1,
    category: "",
    createdAt: now,
    updatedAt: now
  }
};

export const mockTransactionItems: { [key: string]: TransactionItem } = {
  valid: {
    productId: '1',
    quantity: 2,
    unitPrice: 50
  }
};

export const mockTransactions: { [key: string]: Transaction } = {
  valid: {
    id: 'test-transaction-id',
    amount: 100,
    type: "upi",
    products: [mockTransactionItems.valid],
    timestamp: now
  },
  invalid: {
    id: 'invalid-transaction-id',
    amount: -50,
    type: "cash",
    products: [],
    timestamp: now
  }
};

export const mockShopSettings: { [key: string]: ShopSettings } = {
  valid: {
    currency: "INR",
    language: "en",
    lowStockThreshold: 5,
    autoSuggestEnabled: true
  },
  invalid: {
    currency: "INR",
    language: "en",
    lowStockThreshold: -1,
    autoSuggestEnabled: false
  }
};

export const mockShops: { [key: string]: Shop } = {
  valid: {
    id: 'test-shop-id',
    name: "Test Shop",
    type: "Grocery",
    ownerId: "test-owner",
    settings: mockShopSettings.valid,
    createdAt: now
  },
  invalid: {
    id: 'invalid-shop-id',
    name: "",
    type: "Invalid",
    ownerId: "",
    settings: mockShopSettings.invalid,
    createdAt: now
  }
};
