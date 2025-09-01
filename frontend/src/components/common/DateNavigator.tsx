import React from 'react';
import { useDate } from '../../contexts/DateContext';

export const DateNavigator: React.FC = () => {
  const { 
    selectedDate, 
    goToPreviousDay, 
    goToNextDay, 
    goToToday, 
    isToday, 
    formatDate,
    formatDateShort 
  } = useDate();

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-4 border border-indigo-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous Day"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">
              {formatDateShort(selectedDate)}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(selectedDate)}
            </div>
          </div>
          
          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Next Day"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              Today
            </button>
          )}
          
          <div className={`px-3 py-1 text-xs rounded-full ${
            isToday 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isToday ? '📅 Today' : '📆 Historical'}
          </div>
        </div>
      </div>
    </div>
  );
};