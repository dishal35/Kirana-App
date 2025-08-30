/**
 * Debug utilities for inspecting audio storage
 * Use these in the browser console for detailed inspection
 */

import { audioCaptureService } from '../services/AudioCapture';

// Make the service available globally for console debugging
(window as any).audioDebug = {
  // Get current storage info
  getStorageInfo: () => {
    const count = audioCaptureService.getStoredAudioCount();
    const debugInfo = (audioCaptureService as any).getStorageDebugInfo?.() || [];
    
    console.group('🎤 Audio Storage Debug Info');
    console.log('📊 Storage Count:', count);
    console.log('💾 Storage Contents:', debugInfo);
    console.log('🎯 Service Status:', {
      isListening: audioCaptureService.isListening,
      hasStoredAudio: count > 0
    });
    console.groupEnd();
    
    return { count, contents: debugInfo };
  },

  // Clear all stored audio
  clearStorage: () => {
    const beforeCount = audioCaptureService.getStoredAudioCount();
    audioCaptureService.clearStoredAudio();
    const afterCount = audioCaptureService.getStoredAudioCount();
    
    console.log(`🧹 Cleared ${beforeCount} audio files. Remaining: ${afterCount}`);
    return { cleared: beforeCount, remaining: afterCount };
  },

  // Monitor storage in real-time
  startMonitoring: (intervalMs = 2000) => {
    const interval = setInterval(() => {
      const info = (window as any).audioDebug.getStorageInfo();
      if (info.count === 0) {
        console.log('📭 No audio files in storage');
      }
    }, intervalMs);

    console.log(`🔍 Started monitoring audio storage every ${intervalMs}ms`);
    console.log('💡 Use audioDebug.stopMonitoring() to stop');
    
    (window as any).audioDebug._monitoringInterval = interval;
    return interval;
  },

  // Stop monitoring
  stopMonitoring: () => {
    const interval = (window as any).audioDebug._monitoringInterval;
    if (interval) {
      clearInterval(interval);
      delete (window as any).audioDebug._monitoringInterval;
      console.log('⏹️ Stopped monitoring audio storage');
    } else {
      console.log('❌ No monitoring active');
    }
  },

  // Get memory usage estimate
  getMemoryUsage: () => {
    const count = audioCaptureService.getStoredAudioCount();
    const estimatedAudioSize = count * 50000; // 50KB per file estimate
    const jsHeapSize = (performance as any).memory?.usedJSHeapSize || 0;
    
    const info = {
      audioFiles: count,
      estimatedAudioSize: `${(estimatedAudioSize / 1024 / 1024).toFixed(2)} MB`,
      totalJSHeap: `${(jsHeapSize / 1024 / 1024).toFixed(2)} MB`,
      audioPercentage: jsHeapSize > 0 ? `${((estimatedAudioSize / jsHeapSize) * 100).toFixed(1)}%` : 'Unknown'
    };

    console.group('💾 Memory Usage Analysis');
    console.table(info);
    console.groupEnd();
    
    return info;
  },

  // Test audio capture
  testCapture: async () => {
    console.log('🧪 Testing audio capture...');
    
    try {
      if (!audioCaptureService.isListening) {
        await audioCaptureService.startListening();
        console.log('✅ Audio capture started successfully');
        console.log('💡 Speak into your microphone to test voice activity detection');
        console.log('💡 Use audioDebug.stopCapture() to stop');
      } else {
        console.log('⚠️ Audio capture is already running');
      }
    } catch (error) {
      console.error('❌ Failed to start audio capture:', error);
    }
  },

  // Stop audio capture
  stopCapture: () => {
    if (audioCaptureService.isListening) {
      audioCaptureService.stopListening();
      console.log('⏹️ Audio capture stopped');
    } else {
      console.log('❌ Audio capture is not running');
    }
  },

  // Show help
  help: () => {
    console.group('🎤 Audio Debug Commands');
    console.log('audioDebug.getStorageInfo() - Show current storage status');
    console.log('audioDebug.clearStorage() - Clear all stored audio');
    console.log('audioDebug.startMonitoring() - Monitor storage in real-time');
    console.log('audioDebug.stopMonitoring() - Stop monitoring');
    console.log('audioDebug.getMemoryUsage() - Show memory usage analysis');
    console.log('audioDebug.testCapture() - Start audio capture test');
    console.log('audioDebug.stopCapture() - Stop audio capture');
    console.log('audioDebug.help() - Show this help');
    console.groupEnd();
    
    console.log('💡 Example: audioDebug.getStorageInfo()');
  }
};

// Show help on load
console.log('🎤 Audio Debug Tools Loaded! Type audioDebug.help() for commands');

export default (window as any).audioDebug;