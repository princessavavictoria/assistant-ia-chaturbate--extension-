import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { ClientProfile, DashboardStats } from '../types';

let db: any = null;

export function initFirebase(configString: string): boolean {
  try {
    const config = JSON.parse(configString);
    const app = !getApps().length ? initializeApp(config) : getApp();
    db = getFirestore(app);
    return true;
  } catch (error) {
    console.error("Erreur d'initialisation Firebase:", error);
    return false;
  }
}

export async function getClientProfile(username: string): Promise<ClientProfile | null> {
  if (!db) throw new Error("Firebase non initialisé");
  
  try {
    const docRef = doc(db, "clients", username.toLowerCase());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ClientProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erreur getClientProfile:", error);
    return null;
  }
}

export async function saveClientProfile(profile: ClientProfile): Promise<void> {
  if (!db) throw new Error("Firebase non initialisé");
  
  try {
    const docRef = doc(db, "clients", profile.username.toLowerCase());
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    console.error("Erreur saveClientProfile:", error);
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!db) return { totalClients: 0, messagesProcessedToday: 0 };
  
  try {
    const clientsColl = collection(db, "clients");
    const snapshot = await getDocs(clientsColl);
    
    // Note: for a real app, messagesProcessedToday would be tracked in a separate daily stats document.
    // Here we just mock it or calculate it roughly based on recent lastSeen.
    let todayMessages = 0;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    snapshot.forEach(doc => {
      const data = doc.data() as ClientProfile;
      if (now - data.lastSeen < oneDayMs) {
        todayMessages += 1; // Approximation
      }
    });

    return {
      totalClients: snapshot.size,
      messagesProcessedToday: todayMessages
    };
  } catch (error) {
    console.error("Erreur getDashboardStats:", error);
    return { totalClients: 0, messagesProcessedToday: 0 };
  }
}
