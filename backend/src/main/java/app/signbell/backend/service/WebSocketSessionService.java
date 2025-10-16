package app.signbell.backend.service;

import app.signbell.backend.config.UserSessionRegistry;
import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.ParticipantEventResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * WebSocket 세션의 라이프사이클을 관리하는 서비스입니다.
 *
 * 주요 책임:
 * - 세션 연결 해제 시 필요한 비즈니스 로직 조율
 * - 방 퇴장 처리 및 알림 전송
 * - 세션 레지스트리 정리
 *
 * 이벤트 리스너와 비즈니스 로직을 분리하여 단일 책임 원칙을 준수합니다.
 *
 * @author 강관주
 * @since 2025-10-16
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketSessionService {

    private final GameRoomLeaveService leaveService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserSessionRegistry userSessionRegistry;

    /**
     * 세션 연결 해제 처리
     *
     * WebSocket 연결이 끊어졌을 때 수행해야 할 모든 작업을 조율합니다:
     * 1. 활성 세션 검증 (스테일 세션은 무시)
     * 2. 사용자가 참여 중인 방에서 자동 퇴장 처리
     * 3. 같은 방의 다른 참가자들에게 퇴장 알림 브로드캐스트
     * 4. 세션 레지스트리에서 매핑 제거
     *
     * @param userId 연결이 끊긴 사용자의 ID
     * @param sessionId 연결이 끊긴 세션 ID
     * @return 처리 성공 여부
     */
    public boolean handleSessionDisconnect(Long userId, String sessionId) {
        try {
            // 1. 활성 세션 검증
            // 비활성(스테일) 세션의 DISCONNECT는 무시하여 중복 처리/오탈을 방지
            if (!isActiveSession(userId, sessionId)) {
                log.info("비활성 세션의 DISCONNECT 무시 - userId: {}, sessionId: {}", userId, sessionId);
                return false;
            }

            // 2. 방 퇴장 처리
            handleRoomLeave(userId);

            return true;

        } catch (Exception e) {
            // 예외 발생 시에도 세션 정리는 finally에서 수행되므로
            // 여기서는 로그만 남기고 재throw하지 않음
            log.error("세션 연결 해제 처리 중 오류 발생 - userId: {}, sessionId: {}", userId, sessionId, e);
            return false;

        } finally {
            // 3. 세션 정리 (예외 발생 여부와 무관하게 항상 실행)
            cleanupSession(userId, sessionId);
        }
    }

    /**
     * 활성 세션 여부 확인
     *
     * @param userId 사용자 ID
     * @param sessionId 세션 ID
     * @return 활성 세션이면 true, 비활성(스테일) 세션이면 false
     */
    private boolean isActiveSession(Long userId, String sessionId) {
        return userSessionRegistry.isActive(userId, sessionId);
    }

    /**
     * 방 퇴장 처리 및 알림 전송
     *
     * 사용자가 참여 중인 방에서 자동 퇴장 처리하고,
     * 같은 방의 다른 참가자들에게 퇴장 알림을 브로드캐스트합니다.
     *
     * @param userId 퇴장 처리할 사용자 ID
     */
    private void handleRoomLeave(Long userId) {
        try {
            // 방 퇴장 처리
            ParticipantEventResponse eventResp = leaveService.leaveCurrentRoomByUser(userId);
            Long roomId = eventResp.getGameRoomId();

            // 같은 방의 다른 참가자들에게 퇴장 알림 브로드캐스트
            broadcastLeaveEvent(roomId, eventResp);

            log.info("DISCONNECT로 인한 자동 퇴장 처리 완료 - userId: {}, roomId: {}", userId, roomId);

        } catch (BusinessException e) {
            handleLeaveBusinessException(userId, e);
        }
    }

    /**
     * 퇴장 이벤트를 방의 모든 참가자에게 브로드캐스트
     *
     * @param roomId 게임방 ID
     * @param eventResp 퇴장 이벤트 응답 객체
     */
    private void broadcastLeaveEvent(Long roomId, ParticipantEventResponse eventResp) {
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/participant",
                ApiResponse.success("사용자가 연결을 끊었습니다.", eventResp)
        );
    }

    /**
     * 방 퇴장 중 발생한 비즈니스 예외 처리
     *
     * @param userId 사용자 ID
     * @param e 발생한 비즈니스 예외
     */
    private void handleLeaveBusinessException(Long userId, BusinessException e) {
        if (e.getErrorCode() == ErrorCode.PARTICIPANT_NOT_IN_ROOM) {
            // 방에 참여하지 않은 상태에서 연결이 끊긴 경우 (정상 상황)
            log.info("방에 참여하지 않은 사용자의 연결 종료 - userId: {}", userId);
        } else {
            // 다른 비즈니스 예외는 경고 로그로 남김
            log.warn("DISCONNECT 퇴장 처리 중 비즈니스 예외 발생 - userId: {}, errorCode: {}, message: {}",
                    userId, e.getErrorCode().getCode(), e.getMessage());
        }
    }

    /**
     * 세션 레지스트리 정리
     *
     * UserSessionRegistry에서 해당 사용자의 세션 매핑을 제거합니다.
     * 이 메서드는 finally 블록에서 호출되어 예외 발생 여부와 무관하게 항상 실행됩니다.
     *
     * @param userId 사용자 ID
     * @param sessionId 세션 ID
     */
    private void cleanupSession(Long userId, String sessionId) {
        userSessionRegistry.unbind(userId, sessionId);
        log.info("세션 매핑 제거 완료 - userId: {}, sessionId: {}", userId, sessionId);
    }
}