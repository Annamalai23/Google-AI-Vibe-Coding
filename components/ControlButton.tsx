
import React from 'react';
import { SessionStatus } from '../types';

interface ControlButtonProps {
  status: SessionStatus;
  onClick: () => void;
}

const MicrophoneIcon: React.FC<{className: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-1 12.1A5.002 5.002 0 0 0 12 19a5 5 0 0 0 5-5.1V5a5 5 0 0 0-10 0v9.1ZM12 19a3 3 0 0 0 3-3h-1a2 2 0 0 1-4 0H8a3 3 0 0 0 3 3Z"/>
    <path d="M19 10h1a1 1 0 0 1 1 1v.1a7.002 7.002 0 0 1-11.936 4.858A6.974 6.974 0 0 1 5 11.1V11a1 1 0 0 1 1-1h1v-1a1 1 0 1 1 2 0v1h4v-1a1 1 0 1 1 2 0v1Z"/>
  </svg>
);

const StopIcon: React.FC<{className: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-2 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8Z"/>
    </svg>
);


const ControlButton: React.FC<ControlButtonProps> = ({ status, onClick }) => {
  const isConnected = status === SessionStatus.Connected || status === SessionStatus.Connecting;
  const buttonText = isConnected ? 'Stop Conversation' : 'Start Conversation';
  const Icon = isConnected ? StopIcon : MicrophoneIcon;
  const bgColor = isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
  const pulseClass = status === SessionStatus.Connected ? 'animate-pulse' : '';
  
  return (
    <button
      onClick={onClick}
      disabled={status === SessionStatus.Connecting}
      className={`relative flex items-center justify-center w-24 h-24 rounded-full ${bgColor} ${pulseClass} text-white font-bold transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isConnected ? 'focus:ring-red-400' : 'focus:ring-blue-400'} disabled:opacity-50 disabled:cursor-wait`}
      aria-label={buttonText}
    >
      <Icon className="h-10 w-10" />
    </button>
  );
};

export default ControlButton;
