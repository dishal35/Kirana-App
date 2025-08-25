import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const SHOP_TYPES = [
  'General Store',
  'Grocery Store',
  'Medical Store',
  'Electronics Store',
  'Clothing Store',
  'Hardware Store',
  'Other'
];

export const ShopDetailsForm: React.FC = () => {
  const { state, dispatch } = useOnboarding();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!state.shopDetails.name?.trim()) {
      newErrors.name = 'Shop name is required';
    }
    
    if (!state.shopDetails.type) {
      newErrors.type = 'Shop type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    dispatch({
      type: 'SET_SHOP_DETAILS',
      details: { [name]: value }
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBlur = () => {
    validateForm();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Shop Details</h2>
      <p className="text-gray-600">
        Please provide your shop information to get started.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Shop Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={state.shopDetails.name || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.name ? 'border-red-300' : ''
            }`}
            placeholder="Enter your shop name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Shop Type
          </label>
          <select
            id="type"
            name="type"
            value={state.shopDetails.type || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.type ? 'border-red-300' : ''
            }`}
          >
            <option value="">Select a shop type</option>
            {SHOP_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type}</p>
          )}
        </div>
      </div>
    </div>
  );
};
