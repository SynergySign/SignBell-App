// WebSocket service for Quiz FastAPI connection
// 퀴즈 게임에서 수어 인식을 위한 FastAPI WebSocket 연결

// 세션 ID는 페이지 로드 시 한 번만 생성
const SESSION_ID = `quiz-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

let socket = null;
let _status = 'Disconnected';
const statusListeners = new Set();
const messageListeners = new Set();

// 🆕 재연결 관련 변수들
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3초
let reconnectTimeout = null;
let currentSessionId = SESSION_ID;

// 🆕 하트비트 관련 변수들
let heartbeatInterval = null;
const HEARTBEAT_INTERVAL = 30000; // 30초마다 핑 전송

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

// 🆕 하트비트 시작 함수
function startHeartbeat() {
  // 기존 하트비트가 있다면 정리
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: 'ping' }));
        console.log('[QuizFastAPI] 💓 Heartbeat ping sent');
      } catch (err) {
        console.error('[QuizFastAPI] Heartbeat error:', err);
      }
    }
  }, HEARTBEAT_INTERVAL);
}

// 🆕 하트비트 정지 함수
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[QuizFastAPI] 💤 Heartbeat stopped');
  }
}

// 🆕 재연결 타이머 정리 함수
function clearReconnectTimeout() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

// 🆕 자동 재연결 함수
function attemptReconnect() {
  clearReconnectTimeout();

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[QuizFastAPI] ❌ 최대 재연결 시도 횟수 초과');
    setStatus('Failed: Max reconnection attempts reached');
    return;
  }

  reconnectAttempts++;
  console.log(`[QuizFastAPI] 🔄 재연결 시도 중... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  reconnectTimeout = setTimeout(() => {
    console.log('[QuizFastAPI] 재연결 실행');
    connect(currentSessionId);
  }, RECONNECT_DELAY);
}

export function connect(sessionId = SESSION_ID) {
  // 세션 ID 저장 (재연결에 사용)
  currentSessionId = sessionId;

  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('[QuizFastAPI] Already connected');
    return socket;
  }

  // 이전 재연결 타이머가 있다면 정리
  clearReconnectTimeout();

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

      // 🆕 연결 성공 시 재연결 카운트 리셋
      reconnectAttempts = 0;

      // 🆕 하트비트 시작
      startHeartbeat();
    };

    s.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        msg = { raw: event.data };
      }

      // 🆕 Pong 메시지 처리 (서버에서 핑에 응답하는 경우)
      if (msg.type === 'pong') {
        console.log('[QuizFastAPI] 💚 Heartbeat pong received');
        return;
      }

      console.log('[QuizFastAPI] RECV:', msg);
      notifyMessage(msg);
    };

    s.onclose = (event) => {
      console.warn('[QuizFastAPI] WebSocket Disconnected', event);

      // 🆕 하트비트 정지
      stopHeartbeat();

      if (event && event.code === 4001) {
        setStatus('Error: Authentication Failed');
        // 인증 실패는 재연결 시도하지 않음
      } else if (event && event.code === 1000) {
        // 정상 종료 (사용자가 의도적으로 닫음)
        setStatus('Disconnected');
        console.log('[QuizFastAPI] 정상 종료 - 재연결 시도 안 함');
      } else {
        // 🆕 비정상 종료 - 자동 재연결 시도
        setStatus(`Disconnected (Code: ${event ? event.code : 'unknown'})`);
        console.log('[QuizFastAPI] 비정상 종료 감지 - 재연결 시도');
        attemptReconnect();
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

    // 🆕 연결 실패 시 재연결 시도
    attemptReconnect();

    throw err;
  }
}

export function disconnect() {
  // 🆕 재연결 시도 중단
  clearReconnectTimeout();
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // 재연결 방지

  // 🆕 하트비트 정지
  stopHeartbeat();

  if (socket) {
    try {
      socket.close(1000, 'User disconnected'); // 정상 종료 코드
      console.log('[QuizFastAPI] WebSocket closed by user');
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

// 🆕 재연결 카운트 리셋 (수동으로 재연결 허용)
export function resetReconnectAttempts() {
  reconnectAttempts = 0;
  console.log('[QuizFastAPI] 재연결 카운트 리셋됨');
}