import { GoogleGenAI } from '@google/genai';
import { ClientProfile, ChatMessage } from '../types';

export async function generateResponse(
  apiKey: string,
  message: ChatMessage,
  profile: ClientProfile | null,
  globalInstructions: string
): Promise<{ reply: string; updatedProfileSummary: string }> {
  
  if (!apiKey) {
    throw new Error("Clé API Gemini manquante.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const profileContext = profile 
    ? `
      Profil du client :
      - Pseudo : ${profile.username}
      - Messages précédents : ${profile.messageCount}
      - Sujets abordés : ${profile.topics.join(', ')}
      - Historique/Notes : ${profile.history || 'Aucun historique détaillé.'}
    ` 
    : 'Nouveau client.';

  const systemInstruction = `
    Tu es l'assistant personnel d'une modèle sur Chaturbate.
    Ta mission est de lire le message d'un client et de suggérer à la modèle une réponse courte, naturelle et engageante (1 à 2 phrases maximum), qu'elle pourra lire à voix haute.
    
    Contexte supplémentaire (Instructions de la modèle) :
    ${globalInstructions || 'Sois charmante, amicale et naturelle.'}
    
    ${profileContext}
    
    Le client "${message.username}" vient de dire : "${message.text}"
    
    Tâche 1 : Propose une réponse courte et naturelle à dire à l'oral.
    Tâche 2 : Résume brièvement le profil du client (humeur, sujets abordés) basé sur ce nouveau message, pour mettre à jour ses notes.
    
    Format de réponse attendu (JSON exact) :
    {
      "reply": "La réponse suggérée pour la modèle...",
      "updatedProfileSummary": "Résumé des sujets de conversation ou du comportement du client..."
    }
  `;

  try {
    // Tentative 1 : gemini-3.5-flash avec BLOCK_NONE (idéal pour le contenu adulte)
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: systemInstruction,
        config: {
          responseMimeType: "application/json",
          safetySettings: [
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        }
      });
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return { reply: parsed.reply, updatedProfileSummary: parsed.updatedProfileSummary };
      }
    } catch (innerError: any) {
      console.warn("Échec Tentative 1 (gemini-3.5-flash + BLOCK_NONE), essai avec paramètres de sécurité standard...", innerError);
      
      // Tentative 2 : gemini-3.5-flash avec sécurité standard (si BLOCK_NONE est interdit sur cette clé)
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: systemInstruction,
          config: {
            responseMimeType: "application/json"
          }
        });
        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return { reply: parsed.reply, updatedProfileSummary: parsed.updatedProfileSummary };
        }
      } catch (err2: any) {
        console.warn("Échec Tentative 2 (gemini-3.5-flash standard), essai avec gemini-3.1-pro-preview...", err2);
        
        // Tentative 3 : Repli sur gemini-3.1-pro-preview avec sécurité standard
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: systemInstruction,
          config: {
            responseMimeType: "application/json"
          }
        });
        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return { reply: parsed.reply, updatedProfileSummary: parsed.updatedProfileSummary };
        }
      }
    }
    return { reply: "Désolé, erreur de génération.", updatedProfileSummary: "" };
  } catch (error: any) {
    console.error("Gemini API Error after all fallbacks:", error);
    // Fournir un message d'erreur plus explicatif pour l'utilisateur
    if (error?.status === 'PERMISSION_DENIED' || error?.message?.includes('permission')) {
      throw new Error("Erreur de permission de la clé API Gemini (403). Veuillez vérifier que la clé API est active, qu'elle provient d'un projet valide et que vous avez activé la facturation si vous utilisez des filtres de sécurité personnalisés.");
    }
    throw error;
  }
}
