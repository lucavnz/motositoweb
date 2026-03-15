/**
 * API Key Manager
 * Forzato per utilizzare SOLO la terza API key come richiesto.
 */

export async function getNextApiKey(): Promise<string> {
  const key3 = process.env.GOOGLE_API_KEY_3;
  
  if (!key3) {
    console.warn("⚠️ ATTENZIONE: GOOGLE_API_KEY_3 non configurata! Fallback alla 1.");
    return process.env.GOOGLE_API_KEY_1 || '';
  }
  
  return key3;
}

