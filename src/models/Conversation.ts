import type { Message } from './Message';

export interface Conversation {
  id: string;
  title?: string | null;
  messages?: Message[];
}

