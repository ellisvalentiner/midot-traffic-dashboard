import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';

const QueueStatusNotification = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [queueData, setQueueData] = useState({
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [previousData, setPreviousData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const pulseRef = useRef(null);

  const fetchQueueStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicle-detection/queue-status');
      const result = await response.json();
      
      if (result.success && result.data) {
        const newData = {
          queued: result.data.queued_images || 0,
          processing: result.data.processing_images || 0,
          completed: result.data.completed_images || 0,
          failed: result.data.failed_images || 0
        };

        // Check for changes and show notifications
        if (previousData) {
          const completedDiff = newData.completed - previousData.completed;
          const failedDiff = newData.failed - previousData.failed;
          const processingDiff = newData.processing - previousData.processing;

          if (completedDiff > 0) {
            addToast({
              type: 'success',
              title: 'Images Processed',
              message: `${completedDiff} image${completedDiff > 1 ? 's' : ''} completed successfully!`
            });
          }

          if (failedDiff > 0) {
            addToast({
              type: 'error',
              title: 'Processing Failed',
              message: `${failedDiff} image${failedDiff > 1 ? 's' : ''} failed to process.`
            });
          }

          if (processingDiff > 0) {
            addToast({
              type: 'info',
              title: 'Processing Started',
              message: `${processingDiff} image${processingDiff > 1 ? 's' : ''} started processing.`
            });
          }
        }

        setPreviousData(newData);
        setQueueData(newData);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchQueueStatus();
    
    // Set up interval for periodic updates
    const interval = setInterval(fetchQueueStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const totalActive = queueData.queued + queueData.processing;
  const hasWork = totalActive > 0;

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-12 h-12 shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm"
          title="Show Queue Status"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main notification bubble */}
      <div 
        className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 transition-all duration-300 cursor-pointer
          ${hasWork ? 'border-blue-500' : 'border-green-500'}
          ${isExpanded ? 'w-80' : 'w-16 h-16'}
          ${hasWork ? 'animate-pulse' : ''}
          backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95
        `}
        onClick={() => setIsExpanded(!isExpanded)}
        ref={pulseRef}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Status indicator */}
        <div className="flex items-center justify-center h-16">
          {!isExpanded ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalActive}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {hasWork ? 'Active' : 'Idle'}
              </div>
            </div>
          ) : (
            <div className="w-full p-4 relative">
              {/* Background overlay for better readability */}
              <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg -z-10" />
              
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Queue Status
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVisible(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  ✕
                </button>
              </div>
              
              {/* Status breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Queued:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {queueData.queued}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Processing:</span>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {queueData.processing}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Completed:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {queueData.completed}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Failed:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {queueData.failed}
                  </span>
                </div>
              </div>

              {/* Progress bar for active work */}
              {hasWork && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((queueData.completed / (queueData.completed + totalActive)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(queueData.completed / (queueData.completed + totalActive)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Status message */}
              <div className="mt-3 text-center">
                <div className={`text-sm font-medium ${
                  hasWork 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {hasWork ? '🔄 Processing images...' : '✅ All caught up!'}
                </div>
              </div>

              {/* Reset button for stuck processing images */}
              {queueData.processing > 0 && (
                <div className="mt-3 text-center">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Reset ${queueData.processing} stuck processing images back to queued status? This will allow them to be processed again.`)) {
                        try {
                          const response = await fetch('/api/vehicle-detection/reset-all-processing', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                          });
                          const result = await response.json();
                          
                          if (result.success) {
                            addToast({
                              type: 'success',
                              title: 'Reset Successful',
                              message: result.message
                            });
                            // Refresh the data immediately
                            fetchQueueStatus();
                          } else {
                            addToast({
                              type: 'error',
                              title: 'Reset Failed',
                              message: result.error || 'Failed to reset processing images'
                            });
                          }
                        } catch (error) {
                          addToast({
                            type: 'error',
                            title: 'Reset Failed',
                            message: 'Network error while resetting images'
                          });
                        }
                      }
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
                    title="Reset stuck processing images"
                  >
                    🔄 Reset Stuck Images
                  </button>
                </div>
              )}

              {/* Last updated */}
              <div className="mt-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Updates every 10s
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Minimize hint */}
      {isExpanded && (
        <div className="text-center mt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm">
            Click to minimize
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueStatusNotification;
