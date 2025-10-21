// WebSocket helper for connecting to the external FastAPI WebSocket signaling server.
// - Browser usage: rely on cookie-based token (server must set `Set-Cookie` for the auth token).
// - If cookie is not available (server-side client or debug), fallback helpers are provided
//   to attach the token via query string. Browser's native WebSocket cannot set custom
//   headers (Authorization), so cookie or BFF is required for Authorization header flows.

const WS_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL)
  ? import.meta.env.VITE_WS_URL
  : (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : 'wss://localhost:8000/ws');

/**
 * Open a control WebSocket that relies on browser cookies for authentication.
 * The browser will automatically include cookies on the WS handshake if they are
 * set for the WS origin.
 *
 * Options:
 *  - path (string): additional path or query to append to base WS_URL (e.g. `/signaling?session=...`)
 *  - onOpen, onMessage, onClose, onError: callbacks
 *
 * Returns the WebSocket instance.
 */
export function openControlWebSocket({ path = '', onOpen, onMessage, onClose, onError } = {}) {
  const url = WS_URL + path;
  const ws = new WebSocket(url);

  ws.addEventListener('open', (ev) => { if (onOpen) onOpen(ev); });
  ws.addEventListener('message', (ev) => { if (onMessage) onMessage(ev); });
  ws.addEventListener('close', (ev) => { if (onClose) onClose(ev); });
  ws.addEventListener('error', (ev) => { if (onError) onError(ev); });

  return ws;
}

/**
 * Development / fallback: open a WebSocket by attaching token as a query param.
 * Use only for debugging or non-browser clients. Browser will include cookies and
 * usually should NOT use this in production.
 */
export function openWebSocketWithQueryToken(token, { path = '', onOpen, onMessage, onClose, onError } = {}) {
  if (!token) throw new Error('token required for openWebSocketWithQueryToken');
  const sep = WS_URL.includes('?') ? '&' : '?';
  const url = WS_URL + path + `${sep}token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);

  ws.addEventListener('open', (ev) => { if (onOpen) onOpen(ev); });
  ws.addEventListener('message', (ev) => { if (onMessage) onMessage(ev); });
  ws.addEventListener('close', (ev) => { if (onClose) onClose(ev); });
  ws.addEventListener('error', (ev) => { if (onError) onError(ev); });

  return ws;
}

/**
 * Development helper: set a cookie in the browser for the auth token.
 * Note: the server should normally set this via `Set-Cookie`. Use this only in dev.
 * SameSite and Secure flags are recommended; path is '/' by default.
 */
export function setAuthCookie(name = 'ACCESS_TOKEN', value, days = 1, { secure = true, sameSite = 'Strict', path = '/' } = {}) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=${path}; SameSite=${sameSite}`;
  if (secure) cookie += '; Secure';
  document.cookie = cookie;
}

/**
 * Example message sender: safely send JSON over a WebSocket (no-op if closed).
 */
export function safeSendJson(ws, obj) {
  if (!ws) return;
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(obj));
  } catch (e) {
    console.warn('safeSendJson failed', e);
  }
}
