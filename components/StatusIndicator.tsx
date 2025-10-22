
import React from 'react';
import { SessionStatus } from '../types';

interface StatusIndicatorProps {
  status: SessionStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case SessionStatus.Connecting:
        return { text: 'Connecting...', color: 'bg-yellow-500', animate: true };
      case SessionStatus.Connected:
        return { text: 'Connected & Listening', color: 'bg-green-500', animate: true };
      case SessionStatus.Error:
        return { text: 'Error', color: 'bg-red-500', animate: false };
      case SessionStatus.Idle:
      default:
        return { text: 'Not Connected', color: 'bg-gray-500', animate: false };
    }
  };

  const { text, color, animate } = getStatusInfo();

  return (
    <div className="flex items-center justify-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${color} ${animate ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm font-medium text-gray-300">{text}</span>
    </div>
  );
};

export default StatusIndicator;
