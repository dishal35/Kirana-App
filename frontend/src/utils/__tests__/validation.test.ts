// Unit tests for validation utilities
import { describe, it, expect } from 'vitest';
import {
  validateProduct,
  validateTransaction,
  validateTransactionItem,
  validateShop,
  validateShopSettings,
  sanitizeString,
  validateIndianCurrency,
  validatePhoneNumber
} from '../validation';
import type{ Product, Transaction, Shop, ShopSettings, TransactionItem } from '../../types';

describe('Product Validation', () => {
  it('should validate a correct product', () => {
    const product: Partial<Product> = {
      name: 'Test Product',
      price: 100,
      stock: 50,
      reorderThreshold: 10,
      category: 'Test Category'
    };

    const result = validateProduct(product);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject product with missing name', () => {
    const product: Partial<Product> = {
      price: 100,
      stock: 50,
      reorderThreshold: 10,
      category: 'Test Category'
    };

    const result = validateProduct(product);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Product name is required');
  });

  it('should reject product with negative price', () => {
    const product: Partial<Product> = {
      name: 'Test Product',
      price: -10,
      stock: 50,
      reorderThreshold: 10,
      category: 'Test Category'
    };

    const result = validateProduct(product);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Product price must be non-negative');
  });

  it('should reject product with expiry date in the past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const product: Partial<Product> = {
      name: 'Test Product',
      price: 100,
      stock: 50,
      reorderThreshold: 10,
      category: 'Test Category',
      expiryDate: pastDate
    };

    const result = validateProduct(product);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Expiry date cannot be in the past');
  });
});

describe('Transaction Validation', () => {
  it('should validate a correct transaction', () => {
    const transaction: Partial<Transaction> = {
      amount: 100,
      products: [
        { productId: '1', quantity: 2, unitPrice: 50 }
      ],
      type: 'upi'
    };

    const result = validateTransaction(transaction);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject transaction with zero amount', () => {
    const transaction: Partial<Transaction> = {
      amount: 0,
      products: [
        { productId: '1', quantity: 2, unitPrice: 50 }
      ],
      type: 'upi'
    };

    const result = validateTransaction(transaction);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Transaction amount must be positive');
  });

  it('should reject transaction with no products', () => {
    const transaction: Partial<Transaction> = {
      amount: 100,
      products: [],
      type: 'upi'
    };

    const result = validateTransaction(transaction);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Transaction must have at least one product');
  });

  it('should reject transaction with invalid type', () => {
    const transaction: Partial<Transaction> = {
      amount: 100,
      products: [
        { productId: '1', quantity: 2, unitPrice: 50 }
      ],
      type: 'invalid' as any
    };

    const result = validateTransaction(transaction);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Transaction type must be either "upi" or "cash"');
  });
});

describe('Transaction Item Validation', () => {
  it('should validate a correct transaction item', () => {
    const item: TransactionItem = {
      productId: '1',
      quantity: 2,
      unitPrice: 50
    };

    const result = validateTransactionItem(item);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject item with zero quantity', () => {
    const item: Partial<TransactionItem> = {
      productId: '1',
      quantity: 0,
      unitPrice: 50
    };

    const result = validateTransactionItem(item);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Quantity must be positive');
  });
});

describe('Shop Validation', () => {
  it('should validate a correct shop', () => {
    const shop: Partial<Shop> = {
      name: 'Test Shop',
      type: 'General Store',
      ownerId: 'owner123',
      settings: {
        currency: 'INR',
        language: 'en',
        lowStockThreshold: 5,
        autoSuggestEnabled: true
      }
    };

    const result = validateShop(shop);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject shop with missing name', () => {
    const shop: Partial<Shop> = {
      type: 'General Store',
      ownerId: 'owner123'
    };

    const result = validateShop(shop);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Shop name is required');
  });
});

describe('Shop Settings Validation', () => {
  it('should validate correct shop settings', () => {
    const settings: ShopSettings = {
      currency: 'INR',
      language: 'en',
      lowStockThreshold: 5,
      autoSuggestEnabled: true
    };

    const result = validateShopSettings(settings);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid currency', () => {
    const settings: Partial<ShopSettings> = {
      currency: 'USD' as any,
      language: 'en',
      lowStockThreshold: 5,
      autoSuggestEnabled: true
    };

    const result = validateShopSettings(settings);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Currency must be INR');
  });

  it('should reject invalid language', () => {
    const settings: Partial<ShopSettings> = {
      currency: 'INR',
      language: 'fr' as any,
      lowStockThreshold: 5,
      autoSuggestEnabled: true
    };

    const result = validateShopSettings(settings);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Language must be one of: en, hi, kn');
  });
});

describe('Utility Functions', () => {
  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeString(input);
      expect(result).toBe('scriptalert("xss")/script'); 
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const result = sanitizeString(input);
      expect(result).toBe('test string');
    });
  });

  describe('validateIndianCurrency', () => {
    it('should accept valid amounts', () => {
      expect(validateIndianCurrency(100)).toBe(true);
      expect(validateIndianCurrency(99.99)).toBe(true);
      expect(validateIndianCurrency(0.01)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateIndianCurrency(0)).toBe(false);
      expect(validateIndianCurrency(-10)).toBe(false);
      expect(validateIndianCurrency(99.999)).toBe(false);
      expect(validateIndianCurrency(Infinity)).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid Indian phone numbers', () => {
      expect(validatePhoneNumber('9876543210')).toBe(true);
      expect(validatePhoneNumber('8123456789')).toBe(true);
      expect(validatePhoneNumber('7000000000')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('1234567890')).toBe(false);
      expect(validatePhoneNumber('98765432')).toBe(false);
      expect(validatePhoneNumber('98765432100')).toBe(false);
      expect(validatePhoneNumber('abcdefghij')).toBe(false);
    });
  });
});