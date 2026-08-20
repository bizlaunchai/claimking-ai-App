// SignWell embedded signing must be mounted with the vendor's JS library, NOT a
// raw <iframe src>. Their signing page sends X-Frame-Options, so a bare iframe
// shows "www.signwell.com refused to connect". The embed.js library opens the
// same URL through an allowed handshake and mounts the iframe into a container.
//
// Docs: https://developers.signwell.com/reference/embedded-iframe
const SDK_URL = 'https://static.signwell.com/assets/embedded.js';
const SDK_ID = 'signwell-embed-sdk';

/** Load the SignWell embed SDK once; resolves with window.SignWellEmbed. */
export function loadSignWellEmbed() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.SignWellEmbed) return Promise.resolve(window.SignWellEmbed);

  return new Promise((resolve, reject) => {
    const done = () =>
      window.SignWellEmbed ? resolve(window.SignWellEmbed) : reject(new Error('SignWellEmbed missing'));

    const existing = document.getElementById(SDK_ID);
    if (existing) {
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('SignWell SDK failed to load')));
      if (window.SignWellEmbed) resolve(window.SignWellEmbed);
      return;
    }

    const s = document.createElement('script');
    s.id = SDK_ID;
    s.src = SDK_URL;
    s.async = true;
    s.onload = done;
    s.onerror = () => reject(new Error('SignWell SDK failed to load'));
    document.head.appendChild(s);
  });
}
