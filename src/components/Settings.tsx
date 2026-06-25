import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Settings as SettingsIcon, Save, Key, Database } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export default function Settings({ settings, onSave }: SettingsProps) {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [firebaseConfigString, setFirebaseConfigString] = useState(settings.firebaseConfigString || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    
    if (!geminiApiKey.trim()) {
      setError('La clé API Gemini est requise.');
      return;
    }
    
    if (firebaseConfigString.trim()) {
      try {
        JSON.parse(firebaseConfigString);
      } catch (e) {
        setError('La configuration Firebase doit être un objet JSON valide.');
        return;
      }
    }

    onSave({
      ...settings,
      geminiApiKey,
      firebaseConfigString
    });
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-indigo-600 mb-6">
        <SettingsIcon className="w-6 h-6" />
        <h1 className="text-xl font-bold">Configuration</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1">
            <Key className="w-4 h-4" />
            <span>Clé API Gemini (Obligatoire)</span>
          </label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="AIzaSy..."
          />
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1">
            <Database className="w-4 h-4" />
            <span>Configuration Firebase (JSON optionnel)</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Nécessaire pour enregistrer l'historique des clients. Collez l'objet firebaseConfig complet.
          </p>
          <textarea
            value={firebaseConfigString}
            onChange={(e) => setFirebaseConfigString(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs"
            placeholder='{&#10;  "apiKey": "...",&#10;  "authDomain": "...",&#10;  ...&#10;}'
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer</span>
        </button>
      </div>
    </div>
  );
}
