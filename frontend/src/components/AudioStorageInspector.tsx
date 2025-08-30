import React, { useState, useEffect } from 'react';
import { audioCaptureService } from '../services/AudioCapture';

export const AudioStorageInspector: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState({
    count: 0,
    totalSize: 0,
    memoryUsage: 0
  });
  const [isInspecting, setIsInspecting] = useState(false);

  const updateStorageInfo = () => {
    const count = audioCaptureService.getStoredAudioCount();
    
    // Estimate memory usage (this is approximate)
    const estimatedSize = count * 50000; // Rough estimate: 50KB per audio file
    const memoryUsage = (performance as any).memory ? 
      (performance as any).memory.usedJSHeapSize : 0;

    setStorageInfo({
      count,
      totalSize: estimatedSize,
      memoryUsage
    });

    updateStorageContents();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isInspecting) {
      updateStorageInfo();
      interval = setInterval(updateStorageInfo, 1000); // Update every second
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInspecting]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [storageContents, setStorageContents] = useState<any[]>([]);

  const getStorageDetails = () => {
    return {
      location: "Browser RAM (In-Memory)",
      persistence: "Temporary (30 minutes max)",
      maxFiles: "50 files maximum",
      autoCleanup: "Every 5 minutes",
      format: "Audio Blobs (WebM/WAV)",
      security: "Local only, never sent to server"
    };
  };

  const updateStorageContents = () => {
    // Get debug info from the service
    if (typeof (audioCaptureService as any).getStorageDebugInfo === 'function') {
      const contents = (audioCaptureService as any).getStorageDebugInfo();
      setStorageContents(contents);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          🔍 Audio Storage Inspector
        </h3>
        <button
          onClick={() => setIsInspecting(!isInspecting)}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isInspecting 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {isInspecting ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
        </button>
      </div>

      {isInspecting && (
        <div className="space-y-4">
          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-blue-600">{storageInfo.count}</div>
              <div className="text-sm text-gray-600">Audio Files Stored</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(storageInfo.totalSize)}
              </div>
              <div className="text-sm text-gray-600">Estimated Audio Size</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-purple-600">
                {formatBytes(storageInfo.memoryUsage)}
              </div>
              <div className="text-sm text-gray-600">Total JS Heap Size</div>
            </div>
          </div>

          {/* Storage Details */}
          <div className="bg-white p-4 rounded border">
            <h4 className="font-medium text-gray-800 mb-3">📋 Storage Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {Object.entries(getStorageDetails()).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="text-gray-800 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Memory Warning */}
          {storageInfo.count > 30 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">⚠️</span>
                <span className="text-yellow-800 font-medium">High Memory Usage</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                You have {storageInfo.count} audio files in memory. Consider clearing storage to free up RAM.
              </p>
            </div>
          )}

          {/* Storage Contents */}
          {storageContents.length > 0 && (
            <div className="bg-white border rounded p-3">
              <h4 className="font-medium text-gray-800 mb-3">📁 Storage Contents</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {storageContents.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">#{index + 1}</span>
                      <span className="font-mono text-xs text-gray-600">
                        {item.id.substring(0, 12)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span>{formatBytes(item.size)}</span>
                      <span className="text-gray-500">{item.age}</span>
                      <span className={`px-2 py-1 rounded ${
                        item.quality.isAcceptable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.quality.isAcceptable ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storage Lifecycle */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h4 className="font-medium text-blue-800 mb-2">🔄 Storage Lifecycle</h4>
            <div className="text-blue-700 text-sm space-y-1">
              <div>1. 🎤 Audio captured → Stored in RAM as Blob</div>
              <div>2. 🕐 Auto-cleanup after 30 minutes</div>
              <div>3. 🧹 Manual cleanup when "Clear All" is clicked</div>
              <div>4. 🚪 All storage cleared when browser tab closes</div>
              <div>5. 🔒 Never persisted to disk or sent to server</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioStorageInspector;