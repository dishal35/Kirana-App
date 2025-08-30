import React, { useState, useEffect } from 'react';
import { shopRepository, productRepository } from '../dbs/repo';

export const DebugInfo: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        const shops = await shopRepository.getAll();
        const products = await productRepository.getAll();
        
        setDebugInfo({
          shops: shops.length,
          products: products.length,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      } catch (error) {
        setDebugInfo({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDebugInfo();
  }, []);

  if (isLoading) {
    return <div className="p-4 bg-blue-50 rounded">Loading debug info...</div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-bold mb-2">Debug Information</h3>
      <pre className="text-xs bg-white p-2 rounded border overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};