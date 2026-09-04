import Dexie, { type Table } from 'dexie'
import type { Preferences, Subscription } from '../types'
import { DEFAULT_PREFERENCES } from '../types'

/** A single-row key/value store for preferences, so the whole app state lives in IndexedDB. */
export interface PrefRow {
  key: 'app'
  value: Preferences
}

class CycloDB extends Dexie {
  subscriptions!: Table<Subscription, string>
  preferences!: Table<PrefRow, string>

  constructor() {
    super('cyclo')
    this.version(1).stores({
      // Indexed fields only — Dexie stores the whole object regardless.
      subscriptions: 'id, name, category, nextRenewal, price, active, createdAt',
      preferences: 'key',
    })
    // v2 adds `Subscription.priceHistory` (price-change log). It is not indexed,
    // so no data migration is needed — existing rows simply have no history yet.
    this.version(2).stores({
      subscriptions: 'id, name, category, nextRenewal, price, active, createdAt',
      preferences: 'key',
    })
  }
}

export const db = new CycloDB()

export async function loadPreferences(): Promise<Preferences> {
  const row = await db.preferences.get('app')
  return { ...DEFAULT_PREFERENCES, ...(row?.value ?? {}) }
}

export async function savePreferences(value: Preferences): Promise<void> {
  await db.preferences.put({ key: 'app', value })
}

export async function replaceAll(
  subscriptions: Subscription[],
  preferences: Preferences,
): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.preferences, async () => {
    await db.subscriptions.clear()
    await db.subscriptions.bulkPut(subscriptions)
    await savePreferences(preferences)
  })
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.preferences, async () => {
    await db.subscriptions.clear()
    await db.preferences.clear()
  })
}
