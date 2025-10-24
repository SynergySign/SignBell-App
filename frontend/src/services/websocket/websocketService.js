/**
 * @파일명 websocketService.js
 * @개요 STOMP over WebSocket 서비스
 * @설명 대기방부터 게임 종료까지 WebSocket 연결을 유지하며,
 *       명세서에 따라 연결 해제 시 자동으로 방에서 퇴장 처리됩니다.
 * @author 강관주
 * @since 2025-10-22
 */

import { Client } from "@stomp/stompjs";

class WebSocketService {
  constructor() {
    this.client = null;
    this.roomId = null;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.connectionPromise = null;
    this.isConnecting = false;
  }

  /**
   * WebSocket 연결 (대기방 입장 시 호출)
   * @returns {Promise<void>}
   */
  connect() {
    // 이미 연결되어 있으면 기존 연결 반환
    if (this.client?.connected) {
      console.log("이미 WebSocket에 연결되어 있습니다.");
      return Promise.resolve();
    }

    // 연결 중이면 기존 프로미스 반환
    if (this.isConnecting && this.connectionPromise) {
      console.log("WebSocket 연결 중...");
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      this.client = new Client({
        // 네이티브 WebSocket 사용 (vite proxy를 통해 /ws로 연결)
        brokerURL: "wss://localhost:8443/ws",

        // STOMP 연결 헤더 (쿠키 기반 인증이므로 별도 헤더 불필요)
        connectHeaders: {},

        // 디버그 로깅 (비활성화)
        debug: () => {},

        // 자동 재연결 설정 (5초 간격)
        reconnectDelay: 5000,

        // 하트비트 설정 (30초 간격, 명세서 권장사항)
        heartbeatIncoming: 30000,
        heartbeatOutgoing: 30000,

        // 연결 성공 콜백
        onConnect: async (frame) => {
          this.isConnecting = false;

          // 기본 개인 메시지 구독 (완료 대기)
          await this.subscribeToPersonalMessages();

          resolve();
        },

        // 연결 에러 콜백
        onStompError: (frame) => {
          console.error("❌ STOMP 에러:", frame);
          this.isConnecting = false;

          const errorMessage = frame.headers?.message || "알 수 없는 오류";

          // DUPLICATE_SESSION 에러 처리
          if (errorMessage.includes("DUPLICATE_SESSION")) {
            console.warn(
              "⚠️ 중복 세션 감지: 다른 탭이나 창에서 이미 접속 중입니다."
            );
            reject(
              new Error(
                "다른 탭이나 창에서 이미 접속 중입니다. 기존 탭을 닫고 다시 시도해주세요."
              )
            );
          } else {
            reject(new Error(`WebSocket 연결 실패: ${errorMessage}`));
          }
        },

        // 연결 해제 콜백
        onDisconnect: () => {
          this.isConnecting = false;
        },

        // WebSocket 에러 콜백
        onWebSocketError: (error) => {
          console.error("❌ WebSocket 에러:", error);
          this.isConnecting = false;
        },
      });

      // 연결 활성화
      this.client.activate();
    });

    return this.connectionPromise;
  }

  /**
   * 개인 메시지 구독 (모든 사용자 필수)
   */
  subscribeToPersonalMessages() {
    // Promise로 변경하여 구독 완료를 기다림
    return new Promise((resolve) => {
      const subscriptions = [];

      // 방 입장 성공 메시지
      subscriptions.push(
        this.client.subscribe("/user/queue/room", (message) => {
          try {
            const data = JSON.parse(message.body);
            this.handleMessage("room:join", data);
          } catch (error) {
            console.error("파싱 에러:", error);
          }
        })
      );

      // 에러 메시지
      subscriptions.push(
        this.client.subscribe("/user/queue/errors", (message) => {
          console.error("📥 에러 메시지:", message);
          try {
            const data = JSON.parse(message.body);
            this.handleMessage("error", data);
          } catch (error) {
            console.error("파싱 에러:", error);
          }
        })
      );

      // 방 종료 알림
      subscriptions.push(
        this.client.subscribe("/user/queue/room-closed", (message) => {
          console.warn("📥 방 종료 알림:", message);
          try {
            const data = JSON.parse(message.body);
            this.handleMessage("room:closed", data);
          } catch (error) {
            console.error("파싱 에러:", error);
          }
        })
      );

      // 도전 신청 개인 메시지
      subscriptions.push(
        this.client.subscribe("/user/queue/challenge", (message) => {
          try {
            const data = JSON.parse(message.body);
            this.handleMessage("quiz:challenge:personal", data);
          } catch (error) {
            console.error("파싱 에러:", error);
          }
        })
      );

      // 모든 구독 완료 후 resolve
      resolve();
    });
  }

  /**
   * 방 입장 및 관련 토픽 구독 (대기방 진입 시 호출)
   * @param {number} roomId - 방 ID
   */
  joinRoom(roomId) {
    if (!this.client?.connected) {
      throw new Error("WebSocket이 연결되어 있지 않습니다.");
    }

    this.roomId = roomId;

    // 방 입장 메시지 전송
    this.sendMessage(`/app/room/${roomId}/join`);

    // 참가자 변경 이벤트 구독 (입장/퇴장/준비상태)
    this.subscribe(`/topic/room/${roomId}/participant`, (message) => {
      this.handleMessage("participant", message);
    });

    // 게임 시작 알림 구독 (대기실에서도 받아야 함)
    this.subscribe(`/topic/room/${roomId}/quiz/start`, (message) => {
      this.handleMessage("quiz:start", message);
    });
  }

  /**
   * 게임 관련 토픽 구독 (게임 시작 시 호출)
   * @param {number} roomId - 방 ID
   */
  subscribeToGameTopics(roomId) {
    if (!this.client?.connected) {
      throw new Error("WebSocket이 연결되어 있지 않습니다.");
    }

    // 게임 시작 알림 (대기실에서 이미 구독했으므로 중복 구독 방지)
    if (!this.subscriptions.has(`/topic/room/${roomId}/quiz/start`)) {
      this.subscribe(`/topic/room/${roomId}/quiz/start`, (message) => {
        this.handleMessage("quiz:start", message);
      });
    }

    // 문제 출제
    this.subscribe(`/topic/room/${roomId}/quiz/question`, (message) => {
      this.handleMessage("quiz:question", message);
    });

    // 퀴즈 관련 모든 이벤트 (도전자 신청, 다음 문제, 타임아웃 등)
    this.subscribe(`/topic/room/${roomId}/quiz`, (message) => {
      console.log("📥📥📥 퀴즈 이벤트 RAW:", JSON.stringify(message, null, 2));

      // data에 userId가 있으면 NextChallengerResponse
      if (message.data && message.data.userId) {
        console.log(
          "🎯 NextChallengerResponse 감지 - userId:",
          message.data.userId
        );
        this.handleMessage("quiz:challenger", message);
        return;
      }

      // data에 wordTitle이 있으면 NextQuestionResponse
      if (message.data && message.data.wordTitle) {
        this.handleMessage("quiz:question", message);
        return;
      }

      // eventType에 따라 다른 핸들러 호출
      if (message.data && message.data.eventType) {
        const eventType = message.data.eventType;

        switch (eventType) {
          case "CHALLENGER_REGISTERED":
            this.handleMessage("quiz:challenge", message);
            break;
          case "CHALLENGE_TIMEOUT":
            this.handleMessage("quiz:timeout", message);
            break;
          case "NEXT_QUESTION":
            this.handleMessage("quiz:question", message);
            break;
          default:
            this.handleMessage("quiz:event", message);
        }
      } else {
        this.handleMessage("quiz:event", message);
      }
    });

    // 타이머 업데이트
    this.subscribe(`/topic/room/${roomId}/quiz/timer`, (message) => {
      this.handleMessage("quiz:timer", message);
    });

    // 정답 결과
    this.subscribe(`/topic/room/${roomId}/quiz/answer`, (message) => {
      this.handleMessage("quiz:answer", message);
    });

    // 게임 종료 및 순위
    this.subscribe(`/topic/room/${roomId}/quiz/result`, (message) => {
      this.handleMessage("quiz:result", message);
    });

    // 방으로 돌아가기
    this.subscribe(`/topic/room/${roomId}/quiz/return`, (message) => {
      this.handleMessage("quiz:return", message);
    });
  }

  /**
   * 토픽 구독
   * @param {string} destination - 구독할 토픽 경로
   * @param {Function} callback - 메시지 수신 시 호출될 콜백
   */
  subscribe(destination, callback) {
    if (!this.client?.connected) {
      console.error("WebSocket이 연결되어 있지 않습니다.");
      return;
    }

    // 이미 구독 중이면 무시
    if (this.subscriptions.has(destination)) {
      console.warn(`이미 구독 중: ${destination}`);
      return;
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error("메시지 파싱 오류:", error);
        callback(message.body);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  /**
   * 토픽 구독 해제
   * @param {string} destination - 구독 해제할 토픽 경로
   */
  unsubscribe(destination) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  /**
   * 게임 관련 토픽 모두 구독 해제 (게임 종료 후 대기방 복귀 시)
   * @param {number} roomId - 방 ID
   */
  unsubscribeFromGameTopics(roomId) {
    const gameTopics = [
      `/topic/room/${roomId}/quiz/start`,
      `/topic/room/${roomId}/quiz/question`,
      `/topic/room/${roomId}/quiz/challenge`,
      `/topic/room/${roomId}/quiz/timer`,
      `/topic/room/${roomId}/quiz/answer`,
      `/topic/room/${roomId}/quiz/result`,
      `/topic/room/${roomId}/quiz/return`,
    ];

    gameTopics.forEach((topic) => {
      this.unsubscribe(topic);
    });
  }

  /**
   * 메시지 전송
   * @param {string} destination - 전송할 경로 (예: /app/room/1/join)
   * @param {Object} body - 전송할 데이터 (선택사항)
   */
  sendMessage(destination, body = {}) {
    if (!this.client?.connected) {
      console.error("WebSocket이 연결되어 있지 않습니다.");
      throw new Error("WebSocket이 연결되어 있지 않습니다.");
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error("메시지 전송 실패:", error);
      throw error;
    }
  }

  /**
   * 메시지 핸들러 등록
   * @param {string} eventType - 이벤트 타입 (예: 'participant', 'quiz:start')
   * @param {Function} handler - 핸들러 함수
   */
  on(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType).push(handler);
  }

  /**
   * 메시지 핸들러 제거
   * @param {string} eventType - 이벤트 타입
   * @param {Function} handler - 제거할 핸들러 함수
   */
  off(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) return;

    const handlers = this.messageHandlers.get(eventType);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * 메시지 핸들러 실행
   * @param {string} eventType - 이벤트 타입
   * @param {Object} data - 메시지 데이터
   */
  handleMessage(eventType, data) {
    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`핸들러 실행 오류 (${eventType}):`, error);
        }
      });
    }
  }

  /**
   * WebSocket 연결 완전 해제 (방 나가기 시)
   * ⚠️ 주의: 연결 해제 시 백엔드에서 자동으로 방 퇴장 처리됩니다
   */
  disconnect() {
    if (this.client) {
      // 모든 구독 해제
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();

      // 메시지 핸들러 초기화
      this.messageHandlers.clear();

      // STOMP 연결 해제
      this.client.deactivate();
      this.client = null;
      this.roomId = null;
      this.connectionPromise = null;
      this.isConnecting = false;
    }
  }

  /**
   * 연결 상태 확인
   * @returns {boolean}
   */
  isConnected() {
    return this.client?.connected || false;
  }

  /**
   * 현재 방 ID 반환
   * @returns {number|null}
   */
  getCurrentRoomId() {
    return this.roomId;
  }

  // ==================== 게임 API 메서드 ====================

  /**
   * 준비 상태 변경 (참가자만)
   * @param {number} roomId - 방 ID
   * @param {boolean} isReady - 준비 상태
   */
  setReady(roomId, isReady) {
    this.sendMessage(`/app/room/${roomId}/participant/ready`, { isReady });
  }

  /**
   * 게임 시작 (방장만)
   * @param {number} roomId - 방 ID
   */
  startGame(roomId) {
    this.sendMessage(`/app/room/${roomId}/quiz/start`);
  }

  /**
   * 도전 신청
   * @param {number} roomId - 방 ID
   */
  challengeQuiz(roomId) {
    this.sendMessage(`/app/room/${roomId}/quiz/challenge`);
  }

  /**
   * 정답 제출
   * @param {number} roomId - 방 ID
   * @param {string} answer - 정답
   */
  submitAnswer(roomId, answer) {
    this.sendMessage(`/app/room/${roomId}/quiz/answer`, { answer });
  }

  /**
   * 방으로 돌아가기 (게임 종료 후)
   * @param {number} roomId - 방 ID
   */
  returnToRoom(roomId) {
    this.sendMessage(`/app/room/${roomId}/quiz/return`);
  }

  // ==================== WebRTC 시그널링 메서드 ====================

  /**
   * WebRTC 시그널링 토픽 구독
   * @param {number} roomId - 방 ID
   */
  subscribeToWebRTCSignaling(roomId) {
    if (!this.client?.connected) {
      throw new Error("WebSocket이 연결되어 있지 않습니다.");
    }

    // WebRTC 시그널링 메시지 구독
    this.subscribe(`/topic/room/${roomId}/webrtc`, (message) => {
      console.log("📥 WebRTC 시그널링:", message);
      this.handleMessage("webrtc:signal", message);
    });

    // 개인 WebRTC 메시지 구독
    this.subscribe("/user/queue/webrtc", (message) => {
      console.log("📥 WebRTC 개인 메시지:", message);
      this.handleMessage("webrtc:signal", message);
    });
  }

  /**
   * WebRTC 시그널링 메시지 전송
   * @param {number} roomId - 방 ID
   * @param {Object} signalData - 시그널링 데이터 (type, offer, answer, candidate 등)
   */
  sendWebRTCSignal(roomId, signalData) {
    this.sendMessage(`/app/room/${roomId}/webrtc`, signalData);
  }

  /**
   * WebRTC 시그널링 구독 해제
   * @param {number} roomId - 방 ID
   */
  unsubscribeFromWebRTCSignaling(roomId) {
    this.unsubscribe(`/topic/room/${roomId}/webrtc`);
    this.unsubscribe("/user/queue/webrtc");
  }
}

// 싱글톤 인스턴스 생성 및 export
export const websocketService = new WebSocketService();
export default websocketService;
