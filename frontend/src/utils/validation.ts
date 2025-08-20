// Validation utilities for data models

import type { Product, Transaction, Shop, ShopSettings, TransactionItem } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Product validation
export const validateProduct = (product: Partial<Product>): ValidationResult => {
  const errors: string[] = [];

  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (product.name && product.name.length > 100) {
    errors.push('Product name must be less than 100 characters');
  }

  if (product.price === undefined || product.price === null) {
    errors.push('Product price is required');
  }

  if (product.price !== undefined && product.price < 0) {
    errors.push('Product price must be non-negative');
  }

  if (product.stock === undefined || product.stock === null) {
    errors.push('Product stock is required');
  }

  if (product.stock !== undefined && product.stock < 0) {
    errors.push('Product stock must be non-negative');
  }

  if (product.reorderThreshold === undefined || product.reorderThreshold === null) {
    errors.push('Reorder threshold is required');
  }

  if (product.reorderThreshold !== undefined && product.reorderThreshold < 0) {
    errors.push('Reorder threshold must be non-negative');
  }

  if (!product.category || product.category.trim().length === 0) {
    errors.push('Product category is required');
  }

  if (product.expiryDate && product.expiryDate < new Date()) {
    errors.push('Expiry date cannot be in the past');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Transaction validation
export const validateTransaction = (transaction: Partial<Transaction>): ValidationResult => {
  const errors: string[] = [];

  // Ensure the function always returns a ValidationResult
  if (!transaction) {
    return {
      isValid: false,
      errors: ['Transaction data is required']
    };
  }

  if (transaction.amount === undefined || transaction.amount === null) {
    errors.push('Transaction amount is required');
  }

  if (transaction.amount !== undefined && transaction.amount <= 0) {
    errors.push('Transaction amount must be positive');
  }

  if (!transaction.products || transaction.products.length === 0) {
    errors.push('Transaction must have at least one product');
  }

  if (transaction.products) {
    transaction.products.forEach((item, index) => {
      const itemValidation = validateTransactionItem(item);
      if (!itemValidation.isValid) {
        errors.push(`Product ${index + 1}: ${itemValidation.errors.join(', ')}`);
      }
    });
  }

  if (!transaction.type || !['upi', 'cash'].includes(transaction.type)) {
    errors.push('Transaction type must be either "upi" or "cash"');
  }

  if (transaction.confidence !== undefined && (transaction.confidence < 0 || transaction.confidence > 1)) {
    errors.push('Confidence must be between 0 and 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Transaction item validation
export const validateTransactionItem = (item: Partial<TransactionItem>): ValidationResult => {
  const errors: string[] = [];

  if (!item.productId || item.productId.trim().length === 0) {
    errors.push('Product ID is required');
  }

  if (item.quantity === undefined || item.quantity === null) {
    errors.push('Quantity is required');
  }

  if (item.quantity !== undefined && item.quantity <= 0) {
    errors.push('Quantity must be positive');
  }

  if (item.unitPrice === undefined || item.unitPrice === null) {
    errors.push('Unit price is required');
  }

  if (item.unitPrice !== undefined && item.unitPrice < 0) {
    errors.push('Unit price must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Shop validation
export const validateShop = (shop: Partial<Shop>): ValidationResult => {
  const errors: string[] = [];

  if (!shop.name || shop.name.trim().length === 0) {
    errors.push('Shop name is required');
  }

  if (shop.name && shop.name.length > 100) {
    errors.push('Shop name must be less than 100 characters');
  }

  if (!shop.type || shop.type.trim().length === 0) {
    errors.push('Shop type is required');
  }

  if (!shop.ownerId || shop.ownerId.trim().length === 0) {
    errors.push('Owner ID is required');
  }

  if (shop.settings) {
    const settingsValidation = validateShopSettings(shop.settings);
    if (!settingsValidation.isValid) {
      errors.push(`Settings:, ${settingsValidation.errors.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Shop settings validation
export const validateShopSettings = (settings: Partial<ShopSettings>): ValidationResult => {
  const errors: string[] = [];

  if (settings.currency && settings.currency !== 'INR') {
    errors.push('Currency must be INR');
  }

  if (settings.language && !['en', 'hi', 'kn'].includes(settings.language)) {
    errors.push('Language must be one of: en, hi, kn');
  }

  if (settings.lowStockThreshold !== undefined && settings.lowStockThreshold < 0) {
    errors.push('Low stock threshold must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Utility function to validate and sanitize input
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Utility function to validate Indian currency amounts
export const validateIndianCurrency = (amount: number): boolean => {
  // Check if amount is positive and has at most 2 decimal places
  return amount > 0 && Number.isFinite(amount) && Math.round(amount * 100) === amount * 100;
};

// Utility function to validate phone numbers (basic Indian format)
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};