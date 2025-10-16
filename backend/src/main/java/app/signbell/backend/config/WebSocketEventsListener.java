package app.signbell.backend.config;

import app.signbell.backend.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * WebSocket 연결 관련 이벤트를 감지하고 처리를 위임하는 리스너입니다.
 *
 * 주요 책임:
 * - WebSocket 이벤트 감지 (DISCONNECT 등)
 * - STOMP 헤더에서 사용자 정보 추출
 * - WebSocketSessionService에게 실제 처리 위임
 *
 * 단일 책임 원칙(SRP)을 준수하여 이벤트 리스닝과 비즈니스 로직을 분리했습니다.
 * 실제 세션 관리 로직은 WebSocketSessionService가 담당합니다.
 *
 * @author 강관주
 * @since 2025-10-16
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventsListener {

    private final WebSocketSessionService sessionManager;

    /**
     * WebSocket 연결 해제 이벤트 리스너
     *
     * 사용자가 WebSocket 연결을 끊었을 때 호출되는 이벤트 핸들러입니다.
     *
     * 처리 흐름:
     * 1. STOMP 헤더에서 사용자 ID와 세션 ID 추출
     * 2. 인증 정보 검증 (없으면 무시)
     * 3. WebSocketSessionManager에게 실제 처리 위임
     *
     * 이 메서드는 이벤트 수신과 데이터 추출만 담당하며,
     * 실제 비즈니스 로직은 WebSocketSessionManager가 처리합니다.
     *
     * @param event SessionDisconnectEvent - WebSocket 연결 해제 이벤트
     */
    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        try {
            // 1. STOMP 헤더에서 사용자 및 세션 정보 추출
            DisconnectInfo disconnectInfo = extractDisconnectInfo(event);

            // 추출 실패 시 (인증 정보 없음) 조기 종료
            if (disconnectInfo == null) {
                return;
            }

            // 2. 이벤트 수신 로그
            log.info("DISCONNECT 이벤트 수신 - userId: {}, sessionId: {}",
                    disconnectInfo.userId(), disconnectInfo.sessionId());

            // 3. 실제 처리는 SessionManager에게 위임
            sessionManager.handleSessionDisconnect(
                    disconnectInfo.userId(),
                    disconnectInfo.sessionId()
            );

        } catch (NumberFormatException e) {
            log.error("사용자 ID 파싱 실패", e);
        } catch (Exception e) {
            log.error("DISCONNECT 이벤트 처리 중 예상치 못한 오류 발생", e);
        }
    }

    /**
     * STOMP 헤더에서 연결 해제 정보 추출
     *
     * SessionDisconnectEvent에서 사용자 ID와 세션 ID를 추출합니다.
     * 인증 정보가 없는 경우 null을 반환합니다.
     *
     * @param event SessionDisconnectEvent
     * @return DisconnectInfo (userId, sessionId) 또는 null (인증 정보 없음)
     */
    private DisconnectInfo extractDisconnectInfo(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        // 인증 정보 확인
        if (accessor.getUser() == null || accessor.getUser().getName() == null) {
            log.warn("인증 정보 없이 DISCONNECT 이벤트가 수신되었습니다.");
            return null;
        }

        Long userId = Long.valueOf(accessor.getUser().getName());
        String sessionId = accessor.getSessionId();

        return new DisconnectInfo(userId, sessionId);
    }

    /**
     * 연결 해제 정보를 담는 내부 레코드 클래스
     *
     * @param userId 사용자 ID
     * @param sessionId 세션 ID
     */
    private record DisconnectInfo(Long userId, String sessionId) {}
}