// WebSocket service for Quiz FastAPI connection
// 퀴즈 게임에서 수어 인식을 위한 FastAPI WebSocket 연결

// 세션 ID는 페이지 로드 시 한 번만 생성
const SESSION_ID = `quiz-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

let socket = null;
let _status = 'Disconnected';
const statusListeners = new Set();
const messageListeners = new Set();

function setStatus(s) {
  _status = s;
  statusListeners.forEach((cb) => {
    try { cb(s); } catch (e) { console.error('[QuizFastAPI] status listener error', e); }
  });
}

function notifyMessage(msg) {
  messageListeners.forEach((cb) => {
    try { cb(msg); } catch (e) { console.error('[QuizFastAPI] message listener error', e); }
  });
}

export function connect(sessionId = SESSION_ID) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('[QuizFastAPI] Already connected');
    return socket;
  }

  const host = (typeof window !== 'undefined' && window.location && window.location.host) 
    ? window.location.host 
    : 'localhost:8443';
  
  const isSecure = (typeof window !== 'undefined' && window.location.protocol === 'https:');
  const wsProtocol = isSecure ? 'wss://' : 'ws://';
  const wsUrl = `${wsProtocol}${host}/fastapi/ws/${sessionId}`;

  console.log(`[QuizFastAPI] Connecting to ${wsUrl}... (Session: ${sessionId})`);

  try {
    const s = new WebSocket(wsUrl);
    setStatus('Connecting');

    s.onopen = () => {
      console.log('[QuizFastAPI] ✅ WebSocket Connected');
      socket = s;
      setStatus('Connected');
    };

    s.onmessage = (event) => {
      let msg;
      try { 
        msg = JSON.parse(event.data); 
      } catch { 
        msg = { raw: event.data }; 
      }
      console.log('[QuizFastAPI] RECV:', msg);
      notifyMessage(msg);
    };

    s.onclose = (event) => {
      console.warn('[QuizFastAPI] WebSocket Disconnected', event);
      if (event && event.code === 4001) {
        setStatus('Error: Authentication Failed');
      } else {
        setStatus(`Disconnected (Code: ${event ? event.code : 'unknown'})`);
      }
      if (socket === s) socket = null;
    };

    s.onerror = (error) => {
      console.error('[QuizFastAPI] WebSocket Error:', error);
      setStatus('Error');
    };

    return s;
  } catch (err) {
    console.error('[QuizFastAPI] Failed to create WebSocket:', err);
    setStatus('Error');
    throw err;
  }
}

export function disconnect() {
  if (socket) {
    try { 
      socket.close(); 
      console.log('[QuizFastAPI] WebSocket closed');
    } catch (e) { 
      console.warn('[QuizFastAPI] Error while closing WebSocket', e); 
    }
    socket = null;
  }
  setStatus('Disconnected');
}

// 메타 정보 전송 (단어 정보)
export function sendMeta(wordPk, wordName) {
  if (!wordPk || !wordName) {
    console.error('[QuizFastAPI] sendMeta requires wordPk and wordName');
    return false;
  }

  if (!(socket && socket.readyState === WebSocket.OPEN)) {
    console.warn('[QuizFastAPI] Cannot send meta, WebSocket is not open');
    return false;
  }

  try {
    const payload = { 
      type: 'meta', 
      word_pk: wordPk, 
      word_name: wordName 
    };
    console.log('[QuizFastAPI] SEND (meta):', payload);
    socket.send(JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('[QuizFastAPI] sendMeta error:', err);
    return false;
  }
}

// 프레임 전송 (Blob)
export function sendFrame(blob) {
  if (!blob) {
    console.warn('[QuizFastAPI] sendFrame called with empty blob');
    return false;
  }

  if (!(socket && socket.readyState === WebSocket.OPEN)) {
    console.warn('[QuizFastAPI] Cannot send frame, WebSocket is not open');
    return false;
  }

  try {
    socket.send(blob);
    return true;
  } catch (err) {
    console.error('[QuizFastAPI] sendFrame error:', err);
    return false;
  }
}

// 퀴즈 제출 (Flush) - AI 인식 결과 요청
export function sendFlush() {
  if (!(socket && socket.readyState === WebSocket.OPEN)) {
    console.warn('[QuizFastAPI] Cannot send flush, WebSocket is not open');
    return false;
  }

  try {
    const msg = { type: 'flush' };
    console.log('[QuizFastAPI] SEND (flush):', msg);
    socket.send(JSON.stringify(msg));
    return true;
  } catch (err) {
    console.error('[QuizFastAPI] sendFlush error:', err);
    return false;
  }
}

// 상태 리스너 등록
export function onStatus(cb) {
  statusListeners.add(cb);
  try { cb(_status); } catch (e) { console.error('[QuizFastAPI] onStatus initial callback error', e); }
  return () => statusListeners.delete(cb);
}

// 메시지 리스너 등록
export function onMessage(cb) {
  messageListeners.add(cb);
  return () => messageListeners.delete(cb);
}

// 현재 상태 조회
export function getStatus() { 
  return _status; 
}

// 세션 ID 조회
export function getSessionId() {
  return SESSION_ID;
}
