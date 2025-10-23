// WebSocket service for SignEdu (no JSX)
// Provides: connect, disconnect, sendMeta, onStatus, onMessage, getStatus, SESSION_ID

export const SESSION_ID = `react-client-cookie-${Date.now()}`; // 테스트용 임시 세션 ID

// 항상 wss로 연결하도록 강제하고, 프록시를 통해 쿠키가 전달되도록
// 브라우저의 현재 호스트(window.location.host)를 사용합니다.
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

  // 반드시 wss로 연결합니다. 프록시가 /ws 경로를 백엔드 FastAPI로 전달합니다.
  const host = (typeof window !== 'undefined' && window.location && window.location.host) ? window.location.host : 'localhost:8443';
  // 현재 페이지의 프로토콜(http: 또는 https:)을 확인
  const isSecure = (typeof window !== 'undefined' && window.location.protocol === 'https:');
  // http: -> 'ws://', https: -> 'wss://'
  const wsProtocol = isSecure ? 'wss://' : 'ws://';

  const wsUrl = `${wsProtocol}${host}/fastapi/ws/${sessionId}`;

  console.log(`(Cookie Auth via Proxy) Connecting to ${wsUrl}...`);

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
      try { msg = JSON.parse(event.data); } catch { msg = { raw: event.data }; }
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

// 이전에는 인자 없는 테스트용 sendMeta였음. Phase1 요구사항에 따라 메타 전송을 인자 기반으로 변경.
export function sendMeta(arg1, arg2) {
  // 사용 가능 형태:
  // 1) sendMeta({ word_pk, word_name, ...extra })
  // 2) sendMeta(word_pk, word_name)
  // 3) 인자가 아예 없는 경우는 에러로 처리 -> 호출자에게 예외 전파

  // 인자 유효성 검사를 먼저 수행 (try 바깥에서 throw하여 호출자에게 전파)
  const isObjectForm = arg1 !== null && typeof arg1 === 'object';
  const isArgForm = arg1 !== undefined || arg2 !== undefined;
  if (!isObjectForm && !isArgForm) {
    throw new TypeError('sendMeta requires an argument: either an object {word_pk, word_name} or (word_pk, word_name).');
  }

  try {
    if (!(socket && socket.readyState === WebSocket.OPEN)) {
      console.warn('Cannot send meta, WebSocket is not open.');
      return false;
    }

    let payload = { type: 'meta' };

    if (isObjectForm) {
      // 객체 형태로 전달된 경우 그대로 병합
      payload = { type: 'meta', ...(arg1 || {}) };
    } else {
      // 두 개의 인자(word_pk, word_name)로 전달된 경우
      if (arg1 !== undefined) payload.word_pk = arg1;
      if (arg2 !== undefined) payload.word_name = arg2;
    }

    console.log('SEND (meta):', payload);
    socket.send(JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('sendMeta error:', err);
    return false;
  }
}

// Phase1-2: Blob(프레임) 바이너리 전송 함수
export function sendFrame(blob) {
  if (!blob) {
    console.warn('sendFrame called with empty blob');
    return false;
  }
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {

      console.log(`[WebSocket] socket.send(blob) called. Size: ${blob.size}`);
      // Blob은 그대로 전송
      socket.send(blob);
      return true;
    } catch (err) {
      console.error('sendFrame error:', err);
      return false;
    }
  }
  console.warn('Cannot send frame, WebSocket is not open.');
  return false;
}

// Phase1-3: 학습 저장 요청
export function sendSaveLearning() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const msg = { type: 'save_learning' };
    try {
      console.log('SEND (save_learning):', msg);
      socket.send(JSON.stringify(msg));
      return true;
    } catch (err) {
      console.error('sendSaveLearning error:', err);
      return false;
    }
  }
  console.warn('Cannot send save_learning, WebSocket is not open.');
  return false;
}

// Phase1-4: 퀴즈 제출(Flush)
export function sendFlush() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const msg = { type: 'flush' };
    try {
      console.log('SEND (flush):', msg);
      socket.send(JSON.stringify(msg));
      return true;
    } catch (err) {
      console.error('sendFlush error:', err);
      return false;
    }
  }
  console.warn('Cannot send flush, WebSocket is not open.');
  return false;
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
