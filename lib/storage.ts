import type { Settings } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  folderName: 'Sampler',
  preferredFormat: 'wav',
  sampleRate: 44100,
};

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get('settings');
  const stored = (result.settings as Partial<Settings>) ?? {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await browser.storage.local.set({ settings: { ...current, ...settings } });
}

// ── Save counter (for review prompt) ────────────────────────────────────────

const SAVE_COUNT_KEY = 'saveCount';
const REVIEW_STATE_KEY = 'reviewState';
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ReviewState {
  /** Permanently dismissed (user clicked "Leave a review") */
  dismissed: boolean;
  /** Timestamp when "Not now" was clicked (0 = never snoozed) */
  snoozedAt: number;
}

export async function incrementSaveCount(): Promise<number> {
  const result = await browser.storage.local.get(SAVE_COUNT_KEY);
  const count = ((result[SAVE_COUNT_KEY] as number) ?? 0) + 1;
  await browser.storage.local.set({ [SAVE_COUNT_KEY]: count });
  return count;
}

export async function getSaveCount(): Promise<number> {
  const result = await browser.storage.local.get(SAVE_COUNT_KEY);
  return (result[SAVE_COUNT_KEY] as number) ?? 0;
}

async function getReviewState(): Promise<ReviewState> {
  const result = await browser.storage.local.get(REVIEW_STATE_KEY);
  return (result[REVIEW_STATE_KEY] as ReviewState) ?? { dismissed: false, snoozedAt: 0 };
}

/** Returns true if the review prompt should be hidden. */
export async function isReviewDismissed(): Promise<boolean> {
  const state = await getReviewState();
  if (state.dismissed) return true;
  if (state.snoozedAt > 0) return Date.now() - state.snoozedAt < SNOOZE_MS;
  return false;
}

/** Permanently dismiss — user clicked "Leave a review". */
export async function dismissReview(): Promise<void> {
  await browser.storage.local.set({
    [REVIEW_STATE_KEY]: { dismissed: true, snoozedAt: 0 } satisfies ReviewState,
  });
}

/** Snooze for 24 hours — user clicked "Not now". */
export async function snoozeReview(): Promise<void> {
  await browser.storage.local.set({
    [REVIEW_STATE_KEY]: { dismissed: false, snoozedAt: Date.now() } satisfies ReviewState,
  });
}
