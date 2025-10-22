
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from "@google/genai";
import { SessionStatus, TranscriptEntry } from './types';
import ControlButton from './components/ControlButton';
import StatusIndicator from './components/StatusIndicator';
import TranscriptView from './components/TranscriptView';

// --- Audio Helper Functions ---

// From the Gemini API documentation
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// From the Gemini API documentation
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// From the Gemini API documentation for raw PCM data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// From the Gemini API documentation
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


// --- Main App Component ---

const App: React.FC = () => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(SessionStatus.Idle);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Refs for audio and session management
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const cleanup = useCallback(() => {
    // Stop microphone stream
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    
    // Disconnect audio nodes
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;

    // Close audio contexts
    inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;
    
    // Clear refs
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
  }, []);

  const endSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (error) {
            console.error("Error closing session:", error);
        }
    }
    cleanup();
    setSessionStatus(SessionStatus.Idle);
  }, [cleanup]);

  const startSession = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');
    } catch (err) {
      console.error("Microphone access denied:", err);
      setMicPermission('denied');
      setSessionStatus(SessionStatus.Error);
      return;
    }

    setSessionStatus(SessionStatus.Connecting);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction: 'You are a friendly and helpful AI assistant. Keep your responses concise and conversational.',
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
            setSessionStatus(SessionStatus.Connected);
            if (!streamRef.current || !inputAudioContextRef.current) return;

            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
            const outputCtx = outputAudioContextRef.current;
            if (!outputCtx) return;
            
            // --- Handle Audio Playback ---
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

            // --- Handle Interruptions ---
            if (message.serverContent?.interrupted) {
                for (const source of audioSourcesRef.current.values()) {
                    source.stop();
                    audioSourcesRef.current.delete(source);
                }
                nextStartTimeRef.current = 0;
            }

            // --- Handle Transcription ---
            let userEntryUpdated = false;
            let agentEntryUpdated = false;

            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscriptionRef.current += text;
                userEntryUpdated = true;
            }
            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptionRef.current += text;
                agentEntryUpdated = true;
            }
            
            setTranscript(prev => {
                let newTranscript = [...prev];
                if (userEntryUpdated) {
                    // Fix: Replaced `findLast` with a widely supported alternative.
                    const lastUserEntry = newTranscript.slice().reverse().find(e => e.speaker === 'user');
                    if(lastUserEntry && !lastUserEntry.isFinal) {
                        lastUserEntry.text = currentInputTranscriptionRef.current;
                    } else if (currentInputTranscriptionRef.current.trim()) {
                         newTranscript.push({ id: Date.now(), speaker: 'user', text: currentInputTranscriptionRef.current, isFinal: false });
                    }
                }
                 if (agentEntryUpdated) {
                    // Fix: Replaced `findLast` with a widely supported alternative.
                    const lastAgentEntry = newTranscript.slice().reverse().find(e => e.speaker === 'agent');
                     if(lastAgentEntry && !lastAgentEntry.isFinal) {
                        lastAgentEntry.text = currentOutputTranscriptionRef.current;
                    } else if (currentOutputTranscriptionRef.current.trim()) {
                        newTranscript.push({ id: Date.now(), speaker: 'agent', text: currentOutputTranscriptionRef.current, isFinal: false });
                    }
                }
                return newTranscript;
            });
            
            if (message.serverContent?.turnComplete) {
                setTranscript(prev => prev.map(entry => ({...entry, isFinal: true})));
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
            }
        },
        onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            setSessionStatus(SessionStatus.Error);
            cleanup();
        },
        onclose: (e: CloseEvent) => {
            console.log("Session closed");
            cleanup();
            if(sessionStatus !== SessionStatus.Idle) {
                 setSessionStatus(SessionStatus.Idle);
            }
        },
      }
    });

    sessionPromiseRef.current.catch(err => {
        console.error("Failed to connect:", err);
        setSessionStatus(SessionStatus.Error);
        cleanup();
    });
  }, [cleanup, sessionStatus]);
  
  useEffect(() => {
      // Add a listener to end session on component unmount
      return () => {
          endSession();
      };
  }, [endSession]);

  const handleButtonClick = () => {
    if (sessionStatus === SessionStatus.Connected || sessionStatus === SessionStatus.Connecting) {
      endSession();
    } else {
      startSession();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 font-sans p-4 sm:p-6 lg:p-8">
        <header className="flex-shrink-0 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white tracking-wider">Gemini Voice Agents</h1>
            <p className="text-center text-indigo-300 mt-1">Real-time conversations with Gemini</p>
        </header>
        <main className="flex-1 flex flex-col items-center justify-between w-full max-w-4xl mx-auto min-h-0">
            <TranscriptView transcript={transcript} />
            <div className="flex flex-col items-center justify-center flex-shrink-0 mt-6 w-full space-y-4">
                <StatusIndicator status={sessionStatus} />
                {micPermission === 'denied' && (
                    <div className="text-center p-4 bg-red-900/50 text-red-300 rounded-lg">
                        <p className="font-bold">Microphone access denied.</p>
                        <p className="text-sm">Please enable microphone permissions in your browser settings to use this app.</p>
                    </div>
                )}
                <ControlButton status={sessionStatus} onClick={handleButtonClick} />
            </div>
        </main>
    </div>
  );
};

export default App;
