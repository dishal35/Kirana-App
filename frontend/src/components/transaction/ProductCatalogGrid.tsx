import React from 'react';
import type { Product } from '../../types';
import type { SelectedProduct } from './TransactionConfirmationModal';

export interface ProductCatalogGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  onQuickConfirm?: (product: Product) => void;
  selectedProducts: SelectedProduct[];
  showQuickConfirm?: boolean;
}

export const ProductCatalogGrid: React.FC<ProductCatalogGridProps> = ({
  products,
  onProductSelect,
  onQuickConfirm,
  selectedProducts,
  showQuickConfirm = false
}) => {
  const getSelectedQuantity = (productId: string): number => {
    const selected = selectedProducts.find(sp => sp.product.id === productId);
    return selected?.quantity || 0;
  };

  const isOutOfStock = (product: Product): boolean => {
    return product.stock <= 0;
  };

  const isLowStock = (product: Product): boolean => {
    return product.stock <= product.reorderThreshold && product.stock > 0;
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No products available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => {
        const selectedQuantity = getSelectedQuantity(product.id!);
        const outOfStock = isOutOfStock(product);
        const lowStock = isLowStock(product);

        return (
          <div
            key={product.id}
            className={`
              relative border rounded-lg p-3 transition-all duration-200
              ${outOfStock 
                ? 'bg-gray-100 border-gray-300 opacity-60' 
                : selectedQuantity > 0
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
              }
            `}
            onClick={() => !outOfStock && onProductSelect(product)}
          >
            {/* Stock Status Indicators */}
            {outOfStock && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                Out of Stock
              </div>
            )}
            {lowStock && !outOfStock && (
              <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                Low Stock
              </div>
            )}
            {selectedQuantity > 0 && (
              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {selectedQuantity}
              </div>
            )}

            {/* Product Image */}
            <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-1">
              <h4 className={`font-medium text-sm leading-tight ${outOfStock ? 'text-gray-500' : 'text-gray-900'}`}>
                {product.name}
              </h4>
              <p className={`text-lg font-bold ${outOfStock ? 'text-gray-400' : 'text-green-600'}`}>
                ₹{product.price.toFixed(2)}
              </p>
              <p className={`text-xs ${outOfStock ? 'text-gray-400' : 'text-gray-600'}`}>
                Stock: {product.stock}
              </p>
              {product.category && (
                <p className={`text-xs ${outOfStock ? 'text-gray-400' : 'text-gray-500'}`}>
                  {product.category}
                </p>
              )}
            </div>

            {/* Quick Confirm Button */}
            {showQuickConfirm && onQuickConfirm && !outOfStock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickConfirm(product);
                }}
                className="w-full mt-3 bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Quick Confirm
              </button>
            )}

            {/* Add Button for Manual Selection */}
            {!showQuickConfirm && !outOfStock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onProductSelect(product);
                }}
                className="w-full mt-3 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {selectedQuantity > 0 ? 'Add More' : 'Add to Sale'}
              </button>
            )}

            {/* Out of Stock Overlay */}
            {outOfStock && (
              <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center rounded-lg">
                <span className="text-gray-600 font-medium text-sm">Unavailable</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};