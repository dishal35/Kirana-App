import React, { useState, useEffect } from 'react';
import { hackathonDemoService } from '../../services/HackathonDemoService';

interface DemoModeIndicatorProps {
  className?: string;
}

export const DemoModeIndicator: React.FC<DemoModeIndicatorProps> = ({ className = '' }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [metrics, setMetrics] = useState(hackathonDemoService.getDemoMetrics());

  useEffect(() => {
    const checkDemoMode = () => {
      setIsDemoMode(hackathonDemoService.isDemoModeActive());
      setMetrics(hackathonDemoService.getDemoMetrics());
    };

    // Check initially
    checkDemoMode();

    // Set up interval to check demo mode status
    const interval = setInterval(checkDemoMode, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isDemoMode) {
    return null;
  }

  const completionPercentage = metrics.totalScenarios > 0 
    ? Math.round((metrics.scenariosCompleted / metrics.totalScenarios) * 100)
    : 0;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium text-sm">DEMO MODE</span>
          </div>
          
          <div className="text-xs opacity-90">
            {metrics.scenariosCompleted}/{metrics.totalScenarios} scenarios
          </div>
          
          <div className="w-16 bg-white bg-opacity-20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          
          <div className="text-xs opacity-90">
            {completionPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoModeIndicator;