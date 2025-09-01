import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DemoControlPanel from '../components/demo/DemoControlPanel';
import DemoModeIndicator from '../components/demo/DemoModeIndicator';
import DemoPage from '../components/demo/DemoPage';
import { hackathonDemoService } from '../services/HackathonDemoService';

// Mock the demo service
vi.mock('../services/HackathonDemoService', () => ({
  hackathonDemoService: {
    getDemoScenarios: vi.fn(),
    getDemoMetrics: vi.fn(),
    initializeDemoMode: vi.fn(),
    executeDemoScenario: vi.fn(),
    runFullDemo: vi.fn(),
    resetDemoData: vi.fn(),
    exitDemoMode: vi.fn(),
    isDemoModeActive: vi.fn(),
    getPerformanceAnalytics: vi.fn(),
    getDemoScript: vi.fn()
  }
}));

// Mock the demo data service
vi.mock('../services/DemoDataService', () => ({
  DemoDataService: {
    getDemoShopStats: vi.fn()
  }
}));

const mockScenarios = [
  {
    id: 'scenario_1',
    name: 'Tea Purchase - ₹20',
    description: 'Customer buys tea packet for ₹20 via PhonePe',
    expectedAmount: 20,
    suggestedProducts: ['Tea (250g)'],
    duration: 3
  },
  {
    id: 'scenario_2',
    name: 'Snack Combo - ₹45',
    description: 'Customer buys biscuits and chips for ₹45 via GPay',
    expectedAmount: 45,
    suggestedProducts: ['Parle-G Biscuits', 'Chips (50g)'],
    duration: 4
  }
];

const mockMetrics = {
  scenariosCompleted: 1,
  totalScenarios: 5,
  averageProcessingTime: 1500,
  successRate: 0.8,
  startTime: new Date(),
  endTime: undefined
};

const mockPerformanceAnalytics = {
  averageTranscriptionTime: 800,
  averageSuggestionTime: 400,
  averageTotalTime: 1500,
  averageAccuracy: 92,
  totalScenarios: 2,
  fastestScenario: 1200,
  slowestScenario: 1800
};

describe('DemoControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hackathonDemoService.getDemoScenarios).mockReturnValue(mockScenarios);
    vi.mocked(hackathonDemoService.getDemoMetrics).mockReturnValue(mockMetrics);
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(false);
    vi.mocked(hackathonDemoService.getPerformanceAnalytics).mockReturnValue(null);
    vi.mocked(hackathonDemoService.getDemoScript).mockReturnValue('Mock demo script');
  });

  it('should render demo control panel with all buttons', () => {
    render(<DemoControlPanel />);
    
    expect(screen.getByText('🎯 Hackathon Demo Control Panel')).toBeInTheDocument();
    expect(screen.getByText('🚀 Initialize Demo')).toBeInTheDocument();
    expect(screen.getByText('🎬 Run Full Demo')).toBeInTheDocument();
    expect(screen.getByText('🔄 Reset Data')).toBeInTheDocument();
    expect(screen.getByText('🏁 Exit Demo')).toBeInTheDocument();
  });

  it('should show demo mode inactive status initially', () => {
    render(<DemoControlPanel />);
    
    expect(screen.getByText('⚪ Demo Mode Inactive')).toBeInTheDocument();
  });

  it('should handle demo initialization', async () => {
    vi.mocked(hackathonDemoService.initializeDemoMode).mockResolvedValue();
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(true);
    
    render(<DemoControlPanel />);
    
    const initButton = screen.getByText('🚀 Initialize Demo');
    fireEvent.click(initButton);
    
    await waitFor(() => {
      expect(hackathonDemoService.initializeDemoMode).toHaveBeenCalled();
    });
  });

  it('should display scenarios when demo mode is active', () => {
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(true);
    
    render(<DemoControlPanel />);
    
    expect(screen.getByText('📱 Demo Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Tea Purchase - ₹20')).toBeInTheDocument();
    expect(screen.getByText('Snack Combo - ₹45')).toBeInTheDocument();
  });

  it('should execute individual scenarios', async () => {
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(true);
    vi.mocked(hackathonDemoService.executeDemoScenario).mockResolvedValue({
      success: true,
      performance: {
        transcriptionTime: 800,
        suggestionTime: 400,
        confirmationTime: 1000,
        totalTime: 2200,
        accuracy: 0.95
      }
    });
    
    render(<DemoControlPanel />);
    
    const executeButtons = screen.getAllByText('▶️ Execute');
    fireEvent.click(executeButtons[0]);
    
    await waitFor(() => {
      expect(hackathonDemoService.executeDemoScenario).toHaveBeenCalledWith('scenario_1');
    });
  });

  it('should display metrics when available', () => {
    render(<DemoControlPanel />);
    
    expect(screen.getByText('1/5')).toBeInTheDocument(); // scenarios completed
    expect(screen.getByText('80%')).toBeInTheDocument(); // success rate
    expect(screen.getByText('1500ms')).toBeInTheDocument(); // avg processing time
  });

  it('should show performance analytics when available', () => {
    vi.mocked(hackathonDemoService.getPerformanceAnalytics).mockReturnValue(mockPerformanceAnalytics);
    
    render(<DemoControlPanel />);
    
    expect(screen.getByText('📊 Performance Analytics')).toBeInTheDocument();
    expect(screen.getByText('800ms')).toBeInTheDocument(); // avg transcription time
    expect(screen.getByText('92%')).toBeInTheDocument(); // avg accuracy
  });

  it('should handle demo script display', () => {
    render(<DemoControlPanel />);
    
    const scriptToggle = screen.getByText('📝 View Demo Script');
    fireEvent.click(scriptToggle);
    
    expect(screen.getByText('Mock demo script')).toBeInTheDocument();
  });
});

describe('DemoModeIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(false);
    vi.mocked(hackathonDemoService.getDemoMetrics).mockReturnValue(mockMetrics);
  });

  it('should not render when demo mode is inactive', () => {
    render(<DemoModeIndicator />);
    
    expect(screen.queryByText('DEMO MODE')).not.toBeInTheDocument();
  });

  it('should render when demo mode is active', () => {
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(true);
    
    render(<DemoModeIndicator />);
    
    expect(screen.getByText('DEMO MODE')).toBeInTheDocument();
    expect(screen.getByText('1/5 scenarios')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument(); // completion percentage
  });

  it('should show correct completion percentage', () => {
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(true);
    vi.mocked(hackathonDemoService.getDemoMetrics).mockReturnValue({
      ...mockMetrics,
      scenariosCompleted: 3,
      totalScenarios: 5
    });
    
    render(<DemoModeIndicator />);
    
    expect(screen.getByText('3/5 scenarios')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});

describe('DemoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock DemoDataService
    const { DemoDataService } = require('../services/DemoDataService');
    vi.mocked(DemoDataService.getDemoShopStats).mockResolvedValue({
      totalProducts: 33,
      totalRevenue: 1500,
      totalTransactions: 14,
      lowStockProducts: 3,
      categories: [
        { category: 'Staples', count: 6, totalValue: 800 },
        { category: 'Beverages', count: 5, totalValue: 400 }
      ]
    });
    
    vi.mocked(hackathonDemoService.getDemoScenarios).mockReturnValue(mockScenarios);
    vi.mocked(hackathonDemoService.getDemoMetrics).mockReturnValue(mockMetrics);
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(false);
  });

  it('should render demo page with header and overview', async () => {
    render(<DemoPage />);
    
    await waitFor(() => {
      expect(screen.getByText('🏆 Hackathon Demo Environment')).toBeInTheDocument();
    });
    
    expect(screen.getByText('📊 Demo Shop Overview')).toBeInTheDocument();
    expect(screen.getByText('33')).toBeInTheDocument(); // total products
    expect(screen.getByText('₹1500')).toBeInTheDocument(); // total revenue
  });

  it('should display category breakdown', async () => {
    render(<DemoPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Product Categories')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Staples')).toBeInTheDocument();
    expect(screen.getByText('Beverages')).toBeInTheDocument();
    expect(screen.getByText('6 items')).toBeInTheDocument();
    expect(screen.getByText('5 items')).toBeInTheDocument();
  });

  it('should include demo instructions', async () => {
    render(<DemoPage />);
    
    await waitFor(() => {
      expect(screen.getByText('📋 Demo Instructions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('🚀 Quick Start')).toBeInTheDocument();
    expect(screen.getByText('🎯 Demo Features')).toBeInTheDocument();
    expect(screen.getByText('💡 Presentation Tips')).toBeInTheDocument();
  });

  it('should show technical specifications', async () => {
    render(<DemoPage />);
    
    await waitFor(() => {
      expect(screen.getByText('⚙️ Technical Specifications')).toBeInTheDocument();
    });
    
    expect(screen.getByText('🔧 Technology Stack')).toBeInTheDocument();
    expect(screen.getByText('📱 Features')).toBeInTheDocument();
    expect(screen.getByText('🎯 Performance')).toBeInTheDocument();
    
    expect(screen.getByText('• React + TypeScript')).toBeInTheDocument();
    expect(screen.getByText('• Google Gemini AI')).toBeInTheDocument();
    expect(screen.getByText('• <2s average processing time')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    // Mock a delayed response
    const { DemoDataService } = require('../services/DemoDataService');
    vi.mocked(DemoDataService.getDemoShopStats).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 1000))
    );
    
    render(<DemoPage />);
    
    expect(screen.getByText('Loading demo environment...')).toBeInTheDocument();
  });
});

describe('Demo Component Integration', () => {
  it('should handle scenario execution callbacks', async () => {
    const onScenarioExecute = vi.fn();
    const onDemoComplete = vi.fn();
    
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(true);
    vi.mocked(hackathonDemoService.executeDemoScenario).mockResolvedValue({
      success: true,
      performance: mockPerformanceAnalytics as any
    });
    
    render(
      <DemoControlPanel 
        onScenarioExecute={onScenarioExecute}
        onDemoComplete={onDemoComplete}
      />
    );
    
    const executeButtons = screen.getAllByText('▶️ Execute');
    fireEvent.click(executeButtons[0]);
    
    await waitFor(() => {
      expect(onScenarioExecute).toHaveBeenCalledWith('scenario_1');
    });
  });

  it('should handle full demo completion callbacks', async () => {
    const onDemoComplete = vi.fn();
    
    vi.mocked(hackathonDemoService.isDemoModeActive).mockReturnValue(true);
    vi.mocked(hackathonDemoService.runFullDemo).mockResolvedValue({
      ...mockMetrics,
      endTime: new Date()
    });
    
    render(<DemoControlPanel onDemoComplete={onDemoComplete} />);
    
    const fullDemoButton = screen.getByText('🎬 Run Full Demo');
    fireEvent.click(fullDemoButton);
    
    await waitFor(() => {
      expect(onDemoComplete).toHaveBeenCalled();
    });
  });

  it('should handle error states gracefully', async () => {
    vi.mocked(hackathonDemoService.initializeDemoMode).mockRejectedValue(
      new Error('Demo initialization failed')
    );
    
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<DemoControlPanel />);
    
    const initButton = screen.getByText('🚀 Initialize Demo');
    fireEvent.click(initButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to initialize demo mode');
    });
    
    alertSpy.mockRestore();
  });
});