let ready;
export function greenhouseStyle() {
  return ready ||= new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = new URL('./styles/greenhouse.css', import.meta.url).href;
    link.onload = resolve; link.onerror = () => { ready = null; link.remove(); reject(new Error('The glasshouse styles could not open.')); };
    document.head.append(link);
  });
}
