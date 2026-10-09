/**
 * account.js — the cloud save behind "Sign in with Google" (the Android app
 * only; the shell signs in and stores, android/ Cloud.java on Firebase).
 *
 * The save is the same backup file Settings exports (core/storage/backup.js),
 * one per account, so a lost or new phone gets the village back:
 *
 *   sign in, this phone has no village  -> the saved one comes back
 *   sign in, both have one              -> the learner picks; nothing merges unasked
 *   after that                          -> whenever the app goes to the background
 *                                          with something new, the save becomes
 *                                          this phone's village
 *
 * "Linked" is the promise that this phone may overwrite the account's save.
 * It is kept per account in localStorage, so Start over (which clears it)
 * can never push an empty village over a full one.
 */

import { ask, account } from '../core/native.js';
import { exportAll, importAll, describeBackup } from '../core/storage/backup.js';
import { STORES } from '../core/storage/storage-adapter.js';

const LINK = 'catos:cloud-linked';   // uid this phone saves to
const SIG = 'catos:cloud-sig';       // fingerprint of the last save, so nothing unchanged is sent twice

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } };

/** FNV-1a over the records: cheap, and enough to tell "changed" from "the same". */
function fingerprint(stores) {
  const s = JSON.stringify(stores);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return `${(h >>> 0).toString(36)}.${s.length}`;
}

export function linked() {
  const who = account();
  return !!who && read(LINK) === who.uid;
}

/** Save this phone's village to the account: 'saved', 'same', or why not. */
export async function backUp(storage, { force = false } = {}) {
  if (!linked()) return 'not-linked';
  const data = await exportAll(storage);
  const fp = fingerprint(data.stores);
  if (!force && fp === read(SIG)) return 'same';
  const r = await ask('cloudSave', JSON.stringify(data));
  if (!r?.ok) return r?.reason ?? 'error';
  write(SIG, fp);
  return 'saved';
}

/** app.js, in the app: save whenever the learner leaves it. */
export function keepBackedUp(storage) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') backUp(storage).catch(() => { /* the next time they leave */ });
  });
}

/**
 * After a sign-in: line this phone up with the account. `choose(saved, here)`
 * gets both villages described (describeBackup) and answers 'restore',
 * 'keep' or null. Returns 'saved', 'restored', 'later', or why not; after
 * 'restored' the caller reloads so the village is drawn from the new records.
 */
export async function link(storage, choose) {
  const who = account();
  if (!who) return 'signed-out';
  const r = await ask('cloudLoad');
  if (!r?.ok) return r?.reason ?? 'error';
  const here = await exportAll(storage);
  if (!r.backup) { write(LINK, who.uid); return backUp(storage, { force: true }); }
  const blank = [STORES.ATTEMPTS, STORES.SESSIONS, STORES.LEARNING].every((s) => !here.stores[s]?.length);
  const pick = blank ? 'restore' : await choose(describeBackup(r.backup), describeBackup(here));
  if (pick === 'keep') { write(LINK, who.uid); return backUp(storage, { force: true }); }
  if (pick !== 'restore') return 'later';
  await importAll(storage, r.backup, 'replace');
  write(LINK, who.uid);
  write(SIG, fingerprint(r.backup.stores));
  return 'restored';
}

/** The account goes; this phone keeps its village and stops saving. */
export async function deleteAccount() {
  const r = await ask('deleteAccount');
  if (r?.ok) { write(LINK, null); write(SIG, null); }
  return r;
}
