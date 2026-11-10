/**
 * reminders.js — which notifications the phone should show, worked out from
 * where the player is. Pure, so the rules can be tested; shell/reminders.js
 * hands the answer to Android.
 *
 * The rules are the whole point:
 *   - only ever after a real duel, and only if the player said yes
 *   - at most one letter and one fire reminder a day, never at night
 *   - the letter names what is inside it: the card the next letter opens with
 *   - planned three days ahead and no further, so someone who stops playing
 *     stops hearing from us instead of being nagged for ever
 *   - every plan is replaced whenever the player comes back
 */

export const PLAN_DAYS = 3;
const FIRE_AT = [20, 30];
const DEFAULT_POST = [8, 30];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const atLocal = (now, dayOffset, [h, m]) => { const d = new Date(now); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.getTime(); };

/** The hour someone usually plays, from their recent finishes, or null. */
export function usualHour(finishedAt) {
  const hours = (Array.isArray(finishedAt) ? finishedAt : []).map((t) => Date.parse(t)).filter(Number.isFinite).sort((a, b) => a - b).slice(-30).map((t) => new Date(t).getHours()).sort((a, b) => a - b);
  return hours.length >= 3 ? hours[Math.floor(hours.length / 2)] : null;
}

/** The letter arrives a little before the player usually sits down, never early or late at night. */
export function postTime(hour) {
  return hour === null || hour === undefined ? DEFAULT_POST : [clamp(hour - 1, 8, 20), 30];
}

const POST_COPY = [
  { title: 'A letter has arrived', text: (hook) => hook },
  { title: 'Your letter is still sealed', text: (hook) => hook },
  { title: 'Chai is keeping your letter safe', text: () => 'It will wait. The Muddles will not.' },
];

/**
 * @param {object} o
 * @param {number} o.now
 * @param {boolean} o.hasDueled has this player ever finished a duel
 * @param {boolean} o.playedToday has the fire been lit today
 * @param {number} o.fireDays days in a row
 * @param {boolean} o.postOpenedToday has today's Morning Post been opened
 * @param {boolean} [o.firstDayToday] did this player's first duel happen today (the Morning Post starts tomorrow)
 * @param {string|null} o.hook the first line of what the next letter holds
 * @param {number|null} o.hour usualHour()
 * @returns {Array<{id:number, at:number, title:string, text:string, route:string}>}
 */
export function reminderPlan({ now, hasDueled, playedToday, fireDays, postOpenedToday, firstDayToday = false, hook, hour = null }) {
  if (!hasDueled) return [];
  const plan = [];
  const post = postTime(hour);
  const text = hook || 'Something strange about English is inside.';
  let sent = 0;
  // A letter is only announced on a day when there really is one.
  for (let day = postOpenedToday || firstDayToday ? 1 : 0; day <= PLAN_DAYS && sent < POST_COPY.length; day += 1) {
    const at = atLocal(now, day, post);
    if (at <= now + 10 * 60e3) continue;
    const copy = POST_COPY[sent];
    plan.push({ id: 1000 + day, at, title: copy.title, text: copy.text(text), route: '#/letters' });
    sent += 1;
  }
  // The fire only goes out if the next day is missed, so it is only ever worth one reminder.
  if (fireDays >= 2) {
    const day = playedToday ? 1 : 0;
    const at = atLocal(now, day, FIRE_AT);
    if (at > now + 10 * 60e3) plan.push({ id: 2000 + day, at, title: 'Toffee\'s fire is burning low', text: `${fireDays} days in a row. One quick duel keeps it lit.`, route: '#/duel' });
  }
  return plan.sort((a, b) => a.at - b.at);
}
