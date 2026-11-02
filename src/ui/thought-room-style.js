/** Shared by Mochi's room and practice companion, loaded only on a visit. */
let ready;
export function thoughtRoomStyle() {
  if (!ready) ready = new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = './src/ui/styles/thought-room.css';
    link.onload = resolve;
    link.onerror = () => { ready = null; link.remove(); resolve(); };
    document.head.append(link);
  });
  return ready;
}
