import React from 'react';
import { BusinessDashboard } from '../components/dashboard/BusinessDashboard';

/**
 * Example component demonstrating the Business Dashboard
 * 
 * This example shows how to use the BusinessDashboard component
 * which displays key business metrics including:
 * - Daily sales total
 * - Top selling product
 * - Low stock alerts
 * - Revenue trend chart
 * - Average transaction value
 */
export const BusinessDashboardExample: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Business Dashboard Demo
          </h1>
          <p className="text-gray-600">
            This dashboard shows key business metrics for shopkeepers. 
            It automatically calculates daily sales, identifies top products, 
            alerts for low stock, and displays revenue trends.
          </p>
        </div>
        
        <BusinessDashboard />
        
        <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Dashboard Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Key Metrics</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Daily sales total in rupees</li>
                <li>• Number of transactions</li>
                <li>• Average transaction value</li>
                <li>• Top selling product by quantity</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Alerts & Insights</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Low stock product alerts</li>
                <li>• 7-day revenue trend chart</li>
                <li>• Visual indicators for stock status</li>
                <li>• Auto-refresh every 5 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};