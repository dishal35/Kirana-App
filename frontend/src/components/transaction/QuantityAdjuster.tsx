import React from 'react';

export interface QuantityAdjusterProps {
  quantity: number;
  maxQuantity: number;
  minQuantity?: number;
  onQuantityChange: (newQuantity: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const QuantityAdjuster: React.FC<QuantityAdjusterProps> = ({
  quantity,
  maxQuantity,
  minQuantity = 0,
  onQuantityChange,
  size = 'md',
  disabled = false
}) => {
  const handleDecrease = () => {
    if (quantity > minQuantity && !disabled) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxQuantity && !disabled) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const value = parseInt(e.target.value) || 0;
    const clampedValue = Math.max(minQuantity, Math.min(maxQuantity, value));
    onQuantityChange(clampedValue);
  };

  // Size-based styling
  const sizeClasses = {
    sm: {
      button: 'w-6 h-6 text-sm',
      input: 'w-12 h-6 text-sm px-1',
      container: 'gap-1'
    },
    md: {
      button: 'w-8 h-8 text-base',
      input: 'w-16 h-8 text-base px-2',
      container: 'gap-2'
    },
    lg: {
      button: 'w-10 h-10 text-lg',
      input: 'w-20 h-10 text-lg px-3',
      container: 'gap-3'
    }
  };

  const classes = sizeClasses[size];
  const canDecrease = quantity > minQuantity && !disabled;
  const canIncrease = quantity < maxQuantity && !disabled;

  return (
    <div className={`flex items-center ${classes.container}`}>
      {/* Decrease Button */}
      <button
        onClick={handleDecrease}
        disabled={!canDecrease}
        className={`
          ${classes.button}
          flex items-center justify-center
          border border-gray-300 rounded-lg
          font-bold text-gray-700
          transition-all duration-150
          ${canDecrease
            ? 'hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-label="Decrease quantity"
      >
        −
      </button>

      {/* Quantity Input */}
      <input
        type="number"
        value={quantity}
        onChange={handleInputChange}
        min={minQuantity}
        max={maxQuantity}
        disabled={disabled}
        className={`
          ${classes.input}
          text-center border border-gray-300 rounded-lg
          font-medium text-gray-900
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}
        `}
        aria-label="Quantity"
      />

      {/* Increase Button */}
      <button
        onClick={handleIncrease}
        disabled={!canIncrease}
        className={`
          ${classes.button}
          flex items-center justify-center
          border border-gray-300 rounded-lg
          font-bold text-gray-700
          transition-all duration-150
          ${canIncrease
            ? 'hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-label="Increase quantity"
      >
        +
      </button>

      {/* Stock Indicator */}
      <span className="text-xs text-gray-500 ml-1">
        / {maxQuantity}
      </span>
    </div>
  );
};