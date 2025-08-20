
export interface Product {
  id?: string;
  name: string;
  price: number;
  stock: number;
  reorderThreshold: number;
  imageUrl?: string;
  expiryDate?: Date;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Transaction {
  id?: string;
  amount: number;
  products: TransactionItem[];
  type: 'upi' | 'cash';
  timestamp: Date;
  transcription?: string;
  confidence?: number;
}

export interface Shop {
  id?: string;
  name: string;
  type: string;
  ownerId: string;
  createdAt: Date;
  settings: ShopSettings;
}

export interface ShopSettings {
  currency: 'INR';
  language: 'en' | 'hi' | 'kn';
  lowStockThreshold: number;
  autoSuggestEnabled: boolean;
}

export interface TransactionResult {
  amount: number;
  confidence: number;
  suggestedProducts: Product[];
  transcription: string;
}

export interface BusinessContext {
  todaysSales: Transaction[];
  inventory: Product[];
  salesHistory: Transaction[];
}

export interface InsightSummary {
  totalSales: number;
  topProduct: string;
  lowStockCount: number;
}

export interface InventoryStatus {
  totalProducts: number;
  lowStockProducts: Product[];
  totalValue: number;
}