import type { Message } from './Message';

export interface Conversation {
  id: string;
  title?: string | null;
  archived?: boolean;
  messages?: Message[];
}

