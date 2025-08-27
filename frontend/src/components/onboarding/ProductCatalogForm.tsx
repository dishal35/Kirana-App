import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { validateProduct } from '../../utils/validation';

export const ProductCatalogForm: React.FC = () => {
  const { state, dispatch } = useOnboarding();
  const [currentProduct, setCurrentProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    imageUrl: ''
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // For MVP, we'll store images as data URLs
      // In production, you'd upload to a proper storage service
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProduct(prev => ({
          ...prev,
          imageUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to process image:', error);
      setErrors(prev => [...prev, 'Failed to process image']);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddProduct = () => {
    // Convert string values to numbers where needed
    const productToValidate = {
      ...currentProduct,
      price: Number(currentProduct.price),
      stock: Number(currentProduct.stock),
      reorderThreshold: 5 // Default value
    };

    const validation = validateProduct(productToValidate);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    dispatch({
      type: 'ADD_PRODUCT',
      product: productToValidate
    });

    // Reset form
    setCurrentProduct({
      name: '',
      price: '',
      stock: '',
      category: '',
      imageUrl: ''
    });
    setErrors([]);
  };

  const handleRemoveProduct = (index: number) => {
    dispatch({ type: 'REMOVE_PRODUCT', index });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Product Catalog</h2>
          <p className="mt-2 text-base text-gray-600">Add initial products so your inventory shows up in sales.</p>
        </div>
        <div className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-md">
          {state.products.length} {state.products.length === 1 ? 'Product' : 'Products'} Added
        </div>
      </div>

      {/* Product list */}
      {state.products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state.products.map((product, index) => (
            <div
              key={index}
              className="group flex items-center gap-6 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-indigo-50 hover:border-indigo-200 transition-all duration-300 transform hover:scale-[1.02]"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center overflow-hidden group-hover:shadow-lg transition-all duration-300">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">{product.name}</p>
                    <p className="text-sm text-gray-500 group-hover:text-indigo-400 transition-colors">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">₹{product.price}</div>
                    <div className="text-sm text-gray-400">Stock: {product.stock}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleRemoveProduct(index)}
                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add product form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-indigo-50 hover:border-indigo-100 transition-all transform hover:scale-[1.01]">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Add New Product</h3>

        {errors.length > 0 && (
          <div className="bg-red-50/50 backdrop-blur-sm p-4 rounded-xl mb-6 border border-red-100">
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="group">
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
              Product Name
              <span className="ml-1 text-indigo-600">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={currentProduct.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
              className="block w-full rounded-xl border-2 bg-white/50 py-3 px-4 text-base placeholder:text-gray-400 focus:outline-none focus:ring-0 border-gray-100 focus:border-indigo-400 hover:border-indigo-200 transition-all duration-200 group-hover:shadow-md"
            />
          </div>

          <div className="group">
            <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
              Category
              <span className="ml-1 text-indigo-600">*</span>
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={currentProduct.category}
              onChange={handleInputChange}
              placeholder="Enter category"
              className="block w-full rounded-xl border-2 bg-white/50 py-3 px-4 text-base placeholder:text-gray-400 focus:outline-none focus:ring-0 border-gray-100 focus:border-indigo-400 hover:border-indigo-200 transition-all duration-200 group-hover:shadow-md"
            />
          </div>

          <div className="group">
            <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
              Price (₹)
              <span className="ml-1 text-indigo-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="price"
                name="price"
                value={currentProduct.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="block w-full rounded-xl border-2 bg-white/50 py-3 pl-8 pr-4 text-base placeholder:text-gray-400 focus:outline-none focus:ring-0 border-gray-100 focus:border-indigo-400 hover:border-indigo-200 transition-all duration-200 group-hover:shadow-md"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">₹</span>
              </div>
            </div>
          </div>

          <div className="group">
            <label htmlFor="stock" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
              Initial Stock
              <span className="ml-1 text-indigo-600">*</span>
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={currentProduct.stock}
              onChange={handleInputChange}
              min="0"
              placeholder="0"
              className="block w-full rounded-xl border-2 bg-white/50 py-3 px-4 text-base placeholder:text-gray-400 focus:outline-none focus:ring-0 border-gray-100 focus:border-indigo-400 hover:border-indigo-200 transition-all duration-200 group-hover:shadow-md"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Product Image</label>
          <div className="flex items-start gap-6">
            <div className="group relative w-32 h-32 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden flex items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition-all duration-300">
              {currentProduct.imageUrl ? (
                <>
                  <img src={currentProduct.imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setCurrentProduct(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm border border-red-200 rounded-full p-1.5 text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex flex-col items-center gap-2 text-indigo-400 group-hover:text-indigo-600 transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Upload</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1">
              <p className="text-base text-gray-600 mb-2">Image Guidelines:</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Use a clear, high-quality image
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Show the product against a plain background
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ensure good lighting and focus
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleAddProduct}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-base font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 transform hover:scale-105 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Product
          </button>
        </div>
      </div>
    </div>
  );
};
