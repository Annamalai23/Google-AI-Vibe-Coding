
import React from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptViewProps {
  transcript: TranscriptEntry[];
}

const AgentAvatar: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
    <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a2 2 0 0 0-2 2v2H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2h-4Zm-2.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"/>
    </svg>
  </div>
);

const UserAvatar: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
    <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Zm-3 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3H9Z"/>
    </svg>
  </div>
);

const TranscriptView: React.FC<TranscriptViewProps> = ({ transcript }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div ref={scrollRef} className="flex-1 w-full p-6 space-y-4 overflow-y-auto bg-gray-800/50 rounded-lg border border-gray-700 backdrop-blur-sm">
      {transcript.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 7.5v-1.5a6 6 0 0 0-6-6m-6 6v-1.5a6 6 0 0 1 6-6m0 6a6 6 0 0 1 6-6m-12 6a6 6 0 0 0 6 6" />
            </svg>
            <p className="text-lg">Your conversation will appear here.</p>
            <p className="text-sm">Press the button below to start.</p>
        </div>
      )}
      {transcript.map((entry) => (
        <div key={entry.id} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
          {entry.speaker === 'agent' && <AgentAvatar />}
          <div className={`max-w-xl p-3 rounded-lg ${entry.speaker === 'agent' ? 'bg-indigo-600' : 'bg-teal-600'} ${entry.isFinal ? '' : 'opacity-70'}`}>
            <p>{entry.text}</p>
          </div>
          {entry.speaker === 'user' && <UserAvatar />}
        </div>
      ))}
    </div>
  );
};

export default TranscriptView;
