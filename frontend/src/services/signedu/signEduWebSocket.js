// WebSocket service for SignEdu (no JSX)
// Provides: connect, disconnect, sendMeta, onStatus, onMessage, getStatus, SESSION_ID

const SERVER_HOST = '127.0.0.1:8000';
export const SESSION_ID = `react-client-cookie-${Date.now()}`; // 테스트용 임시 세션 ID

let socket = null;
let _status = 'Disconnected';
const statusListeners = new Set();
const messageListeners = new Set();

function setStatus(s) {
  _status = s;
  statusListeners.forEach((cb) => {
    try { cb(s); } catch (e) { console.error('status listener error', e); }
  });
}

function notifyMessage(msg) {
  messageListeners.forEach((cb) => {
    try { cb(msg); } catch (e) { console.error('message listener error', e); }
  });
}

export function connect(sessionId = SESSION_ID) {
  if (socket && socket.readyState === WebSocket.OPEN) return socket;

  const scheme = (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') ? 'wss' : 'ws';
  const wsUrl = `${scheme}://${SERVER_HOST}/ws/${sessionId}`;
  console.log(`(Cookie Auth) Connecting to ${wsUrl}...`);

  try {
    const s = new WebSocket(wsUrl);
    setStatus('Connecting');

    s.onopen = () => {
      console.log('✅ WebSocket Connected (via Cookie)');
      socket = s;
      setStatus('Connected');
    };

    s.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { msg = { raw: event.data }; }
      console.log('RECV:', msg);
      notifyMessage(msg);
    };

    s.onclose = (event) => {
      console.warn('WebSocket Disconnected', event);
      if (event && event.code === 4001) {
        setStatus('Error: Authentication Failed (Missing or Invalid Cookie)');
      } else {
        setStatus(`Disconnected (Code: ${event ? event.code : 'unknown'})`);
      }
      if (socket === s) socket = null;
    };

    s.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStatus('Error');
    };

    return s;
  } catch (err) {
    console.error('Failed to create WebSocket:', err);
    setStatus('Error');
    throw err;
  }
}

export function disconnect() {
  if (socket) {
    try { socket.close(); } catch (e) { console.warn('Error while closing WebSocket', e); }
    socket = null;
  }
  setStatus('Disconnected');
}

export function sendMeta(meta = { type: 'meta', word_pk: 1, word_name: '테스트단어' }) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(meta));
    return true;
  }
  throw new Error('WebSocket is not connected');
}

export function onStatus(cb) {
  statusListeners.add(cb);
  try { cb(_status); } catch (e) { console.error('onStatus initial callback error', e); }
  return () => statusListeners.delete(cb);
}

export function onMessage(cb) {
  messageListeners.add(cb);
  return () => messageListeners.delete(cb);
}

export function getStatus() { return _status; }
