/**
 * API Key Manager – Rotazione round-robin delle 3 Google API key
 * Ogni 5 utilizzi passa alla key successiva.
 * Persistenza su file system (/tmp) per Vercel serverless.
 */

import { promises as fs } from 'fs';
import path from 'path';

const COUNTER_FILE = path.join('/tmp', 'gemini-key-counter.json');
const USES_PER_KEY = 5;

const API_KEYS = [
  process.env.GOOGLE_API_KEY_1!,
  process.env.GOOGLE_API_KEY_2!,
  process.env.GOOGLE_API_KEY_3!,
];

interface CounterData {
  currentKeyIndex: number;
  usesOnCurrentKey: number;
}

async function readCounter(): Promise<CounterData> {
  try {
    const data = await fs.readFile(COUNTER_FILE, 'utf-8');
    return JSON.parse(data) as CounterData;
  } catch {
    // File doesn't exist yet or corrupted – start fresh
    return { currentKeyIndex: 0, usesOnCurrentKey: 0 };
  }
}

async function writeCounter(data: CounterData): Promise<void> {
  await fs.writeFile(COUNTER_FILE, JSON.stringify(data), 'utf-8');
}

/**
 * Ritorna la API key corrente e aggiorna il contatore.
 * Dopo 5 utilizzi sulla stessa key, passa alla successiva (round-robin).
 */
export async function getNextApiKey(): Promise<string> {
  const counter = await readCounter();

  const key = API_KEYS[counter.currentKeyIndex];

  // Aggiorna contatore
  counter.usesOnCurrentKey += 1;
  if (counter.usesOnCurrentKey >= USES_PER_KEY) {
    counter.currentKeyIndex = (counter.currentKeyIndex + 1) % API_KEYS.length;
    counter.usesOnCurrentKey = 0;
  }

  await writeCounter(counter);

  console.log(
    `[API Key Manager] Using key #${counter.currentKeyIndex + 1}, ` +
    `use ${counter.usesOnCurrentKey}/${USES_PER_KEY}`
  );

  return key;
}
