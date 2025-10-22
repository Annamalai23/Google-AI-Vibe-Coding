
export enum SessionStatus {
  Idle = 'Idle',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Error = 'Error',
}

export interface TranscriptEntry {
  id: number;
  speaker: 'user' | 'agent';
  text: string;
  isFinal: boolean;
}
