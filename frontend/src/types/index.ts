
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

export interface UpiDetectionResult {
  detected: boolean;
  timestamp: Date;
  confidence: number;
  message: string;
}

export interface AudioQualityMetrics {
  volume: number;
  noiseLevel: number;
  clarity: number;
  isAcceptable: boolean;
}

export interface AudioCaptureConfig {
  vadThreshold?: number;
  noiseThreshold?: number;
  minRecordingDuration?: number;
  maxRecordingDuration?: number;
  sampleRate?: number;
  enableNoiseFiltering?: boolean;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export interface TranscriptionError {
  code: 'API_ERROR' | 'NETWORK_ERROR' | 'INVALID_AUDIO' | 'RATE_LIMIT' | 'AUTH_ERROR';
  message: string;
  retryable: boolean;
}

export interface InventoryAuditEntry {
  id?: string;
  productId: string;
  type: 'sale' | 'adjustment' | 'restock' | 'expiry' | 'damage';
  quantityChange: number; // Positive for additions, negative for reductions
  previousStock: number;
  newStock: number;
  reason?: string;
  timestamp: Date;
  transactionId?: string; // Link to transaction if this was from a sale
}

export interface StockAlert {
  id?: string;
  productId: string;
  type: 'low_stock' | 'out_of_stock' | 'expiry_warning' | 'expired';
  message: string;
  threshold?: number;
  expiryDate?: Date;
  createdAt: Date;
  acknowledged: boolean;
}

export interface InventoryAdjustment {
  productId: string;
  quantityChange: number;
  reason: string;
  type: 'adjustment' | 'restock' | 'damage' | 'expiry';
  expiryDate?: Date | null; // Optional expiry date update
}