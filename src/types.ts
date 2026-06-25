export interface AppSettings {
  geminiApiKey: string;
  firebaseConfigString: string;
  globalInstructions: string;
}

export interface ChatMessage {
  username: string;
  text: string;
  timestamp: number;
}

export interface ClientProfile {
  id?: string;
  username: string;
  messageCount: number;
  lastSeen: number;
  topics: string[];
  generosity: string; // 'unknown', 'tipper', 'big_tipper'
  preferences: string;
  history: string; // Summary of past conversations
}

export interface DashboardStats {
  totalClients: number;
  messagesProcessedToday: number;
}
