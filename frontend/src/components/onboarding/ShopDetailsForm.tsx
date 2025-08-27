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
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Shop Details</h2>
          <p className="mt-2 text-base text-gray-600">Provide basic information about your shop.</p>
        </div>
        <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Step 1 of 2</div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-indigo-50 hover:border-indigo-100 transition-all transform hover:scale-[1.01]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="group">
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
              Shop Name
              <span className="ml-1 text-indigo-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                name="name"
                value={state.shopDetails.name || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your shop name"
                className={`
                  block w-full rounded-xl border-2 bg-white/50 py-3 px-4 text-base
                  placeholder:text-gray-400 focus:outline-none focus:ring-0
                  transition-all duration-200 group-hover:shadow-md
                  ${errors.name
                    ? 'border-red-200 focus:border-red-400 hover:border-red-300'
                    : 'border-gray-100 focus:border-indigo-400 hover:border-indigo-200'
                  }
                `}
              />
              {errors.name && (
                <div className="absolute right-0 top-0 flex h-full items-center pr-3">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.name}
              </p>
            )}
          </div>

          <div className="group">
            <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
              Shop Type
              <span className="ml-1 text-indigo-600">*</span>
            </label>
            <div className="relative">
              <select
                id="type"
                name="type"
                value={state.shopDetails.type || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`
                  block w-full rounded-xl border-2 bg-white/50 py-3 px-4 text-base
                  appearance-none focus:outline-none focus:ring-0
                  transition-all duration-200 group-hover:shadow-md
                  ${errors.type
                    ? 'border-red-200 focus:border-red-400 hover:border-red-300'
                    : 'border-gray-100 focus:border-indigo-400 hover:border-indigo-200'
                  }
                `}
              >
                <option value="">Select a shop type</option>
                {SHOP_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {errors.type && (
                <div className="absolute right-8 top-0 flex h-full items-center">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.type}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
