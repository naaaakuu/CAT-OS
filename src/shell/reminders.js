/**
 * reminders.js — notifications, in the Android app only. duel/reminders.js
 * decides what to say; the shell (android/ Reminders.java) schedules it on the
 * phone. Nothing leaves the device and there is no server.
 *
 * "On" is a setting the player chose, kept with their other settings. The
 * plan is rewritten whenever they come back to the village or leave the app.
 */

import { NATIVE, ask } from '../core/native.js';
import { STORES } from '../core/storage/storage-adapter.js';
import { loadWorld } from '../world/state.js';
import { dayKey } from '../core/engagement/streaks.js';
import { loadCurios } from '../duel/content.js';
import { duelsIn } from '../duel/model.js';
import { openedLetters, ownedCards, teaseCard } from '../duel/letters.js';
import { reminderPlan, usualHour } from '../duel/reminders.js';

const KEY = 'reminders';

export const remindersSupported = () => typeof NATIVE?.scheduleReminders === 'function';

/** Has the phone itself allowed this app to notify? */
export const phoneAllows = () => { try { return !!NATIVE?.notificationsAllowed?.(); } catch { return false; } };

export async function remindersOn(storage) {
  if (!remindersSupported()) return false;
  try { return (await storage.get(STORES.SETTINGS, KEY))?.value === true && phoneAllows(); } catch { return false; }
}

/** Rewrite what the phone will show. Quiet if the player has not said yes. */
export async function syncReminders(storage) {
  if (!(await remindersOn(storage))) return;
  try {
    const now = Date.now();
    const [{ records, state }, { cards }] = await Promise.all([loadWorld(storage, now), loadCurios()]);
    const duels = duelsIn(records.learning);
    const flame = state.pets?.flame;
    const postId = `post-${dayKey(now)}`;
    const plan = reminderPlan({
      now,
      hasDueled: duels.length > 0,
      playedToday: !!flame?.today,
      fireDays: flame?.days ?? 0,
      postOpenedToday: openedLetters(records.learning).some((r) => r.letter_id === postId),
      firstDayToday: !!duels.length && dayKey(duels[0].finished_at) === dayKey(now),
      hook: teaseCard(cards, ownedCards(records.learning))?.hook ?? null,
      hour: usualHour(duels.map((d) => d.finished_at)),
    });
    NATIVE.scheduleReminders(JSON.stringify(plan));
  } catch (err) { console.error('[CAT OS] reminders could not be planned', err); }
}

/** The player said yes. Android asks its own question on phones that need it. */
export async function turnOnReminders(storage) {
  const answer = await ask('requestNotifications');
  if (!answer?.granted) return false;
  await storage.put(STORES.SETTINGS, { id: KEY, value: true });
  await syncReminders(storage);
  return true;
}

export async function turnOffReminders(storage) {
  await storage.put(STORES.SETTINGS, { id: KEY, value: false });
  try { NATIVE?.cancelReminders?.(); } catch { /* nothing was scheduled */ }
}

/** Plan again whenever the player leaves the app. */
export function watchReminders(storage) {
  if (!remindersSupported()) return;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncReminders(storage); });
}
