import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, ChatMessage, ClientProfile, DashboardStats } from '../types';
import { generateResponse } from '../lib/gemini';
import { getClientProfile, saveClientProfile, getDashboardStats } from '../lib/firebase';
import { Settings as SettingsIcon, MessageSquare, User, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  isFirebaseActive: boolean;
}

type Tab = 'prompter' | 'profile' | 'dashboard';

export default function Sidebar({ settings, onOpenSettings, updateSettings, isFirebaseActive }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('prompter');
  const [currentMessage, setCurrentMessage] = useState<ChatMessage | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ClientProfile | null>(null);
  const [suggestion, setSuggestion] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats>({ totalClients: 0, messagesProcessedToday: 0 });
  const [globalInstructions, setGlobalInstructions] = useState(settings.globalInstructions || '');
  
  const instructionTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    loadStats();
    
    // Listen for messages from content script
    const messageListener = (request: any) => {
      if (request.type === 'NEW_CHAT_MESSAGE') {
        handleNewMessage(request.payload as ChatMessage);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []);

  const loadStats = async () => {
    if (isFirebaseActive) {
      const s = await getDashboardStats();
      setStats(s);
    }
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setGlobalInstructions(val);
    
    if (instructionTimeoutRef.current) clearTimeout(instructionTimeoutRef.current);
    instructionTimeoutRef.current = setTimeout(() => {
      updateSettings({ globalInstructions: val });
    }, 1000);
  };

  const [queueUI, setQueueUI] = useState<ChatMessage[]>([]);
  const queueRef = useRef<ChatMessage[]>([]);
  const isProcessingQueue = useRef(false);

  const processQueue = async () => {
    isProcessingQueue.current = true;
    
    while (queueRef.current.length > 0) {
      const msg = queueRef.current[0];
      
      setCurrentMessage(msg);
      setIsProcessing(true);
      setError('');
      
      try {
        let profile: ClientProfile | null = null;
        if (isFirebaseActive) {
          profile = await getClientProfile(msg.username);
        }
        
        setCurrentProfile(profile);

        // Call Gemini
        const { reply, updatedProfileSummary } = await generateResponse(
          settings.geminiApiKey,
          msg,
          profile,
          globalInstructions
        );

        setSuggestion(reply);

        // Save updated profile
        if (isFirebaseActive) {
          const newProfile: ClientProfile = {
            username: msg.username,
            messageCount: (profile?.messageCount || 0) + 1,
            lastSeen: Date.now(),
            topics: profile?.topics || [],
            generosity: profile?.generosity || 'unknown',
            preferences: profile?.preferences || '',
            history: updatedProfileSummary
          };
          await saveClientProfile(newProfile);
          setCurrentProfile(newProfile);
          loadStats();
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur lors de la génération.");
      } finally {
        setIsProcessing(false);
      }

      // Remove processed item
      queueRef.current = queueRef.current.slice(1);
      setQueueUI([...queueRef.current]);
      
      // Enforce 2 second delay before processing next item to respect rate limits
      if (queueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    isProcessingQueue.current = false;
  };

  const handleNewMessage = (msg: ChatMessage) => {
    queueRef.current.push(msg);
    setQueueUI([...queueRef.current]);
    
    if (!isProcessingQueue.current) {
      processQueue();
    }
  };

  // Mock message for testing in AI Studio
  const simulateMessage = () => {
    handleNewMessage({
      username: "CoolGuy99",
      text: "Salut, tu es magnifique aujourd'hui ! Comment s'est passée ta journée ?",
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-inner">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">AI Assistant</h1>
        </div>
        <button 
          onClick={onOpenSettings}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('prompter')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'prompter' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Téléprompteur
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4" />
          Profil
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Stats
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2 shadow-sm border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'prompter' && (
            <motion.div
              key="prompter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 h-full flex flex-col"
            >
              {/* Context / Instructions */}
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 shrink-0">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  System Instructions
                </label>
                <textarea
                  value={globalInstructions}
                  onChange={handleInstructionsChange}
                  placeholder="Ex: Sois joueuse et taquine aujourd'hui..."
                  className="w-full text-sm resize-none bg-gray-50 border-transparent focus:border-indigo-300 focus:bg-white focus:ring-0 rounded-lg p-2"
                  rows={2}
                />
              </div>

              {/* Téléprompteur Principal */}
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center min-h-[300px] relative overflow-hidden">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center text-indigo-600 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="text-sm font-medium animate-pulse">Génération en cours...</p>
                  </div>
                ) : suggestion ? (
                  <div className="space-y-6">
                    <div className="inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                      {currentMessage?.username}
                    </div>
                    <p className="text-gray-500 text-sm border-l-2 border-indigo-200 pl-3 italic">
                      "{currentMessage?.text}"
                    </p>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-3xl font-bold text-gray-900 leading-tight">
                        {suggestion}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">En attente d'un message...</p>
                    {typeof chrome === 'undefined' || !chrome.runtime?.sendMessage ? (
                      <button 
                        onClick={simulateMessage}
                        className="mt-6 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100"
                      >
                        Simuler un message (Mode Test)
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {!isFirebaseActive && (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200">
                  Firebase n'est pas configuré. L'historique n'est pas sauvegardé.
                </div>
              )}

              {currentProfile ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner">
                      {currentProfile.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{currentProfile.username}</h2>
                      <p className="text-xs text-gray-500 font-medium">{currentProfile.messageCount} messages au total</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes IA</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
                        {currentProfile.history || "Aucune note pour le moment."}
                      </p>
                    </div>
                    
                    {currentProfile.topics && currentProfile.topics.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sujets</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentProfile.topics.map((t, i) => (
                            <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                  <User className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Aucun profil actif.</p>
                  <p className="text-sm mt-1">Le profil s'affichera lorsqu'un utilisateur parlera.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Actifs (24h)</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats.messagesProcessedToday}</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white mt-4">
                <h3 className="font-bold text-lg mb-2">Assistant Actif</h3>
                <p className="text-indigo-100 text-sm opacity-90 leading-relaxed">
                  L'extension écoute le chat en arrière-plan. Assurez-vous de garder l'onglet de la room ouvert pour que la capture fonctionne.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
