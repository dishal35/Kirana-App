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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
      <p className="text-gray-600">
        Add your initial products to get started. You can add more products later.
      </p>

      {/* Product list */}
      {state.products.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Added Products</h3>
          <div className="space-y-2">
            {state.products.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      ₹{product.price} · Stock: {product.stock}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveProduct(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add product form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Add New Product</h3>
        
        {errors.length > 0 && (
          <div className="bg-red-50 p-3 rounded">
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600">{error}</p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={currentProduct.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={currentProduct.category}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price (₹)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={currentProduct.price}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Initial Stock
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={currentProduct.stock}
              onChange={handleInputChange}
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product Image
          </label>
          <div className="mt-1 flex items-center space-x-4">
            {currentProduct.imageUrl ? (
              <div className="relative">
                <img
                  src={currentProduct.imageUrl}
                  alt="Product preview"
                  className="w-20 h-20 object-cover rounded"
                />
                <button
                  onClick={() => setCurrentProduct(prev => ({ ...prev, imageUrl: '' }))}
                  className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:bg-red-200"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute w-20 h-20 opacity-0 cursor-pointer"
                />
                <span className="text-gray-400">+</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAddProduct}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Product
          </button>
        </div>
      </div>
    </div>
  );
};
