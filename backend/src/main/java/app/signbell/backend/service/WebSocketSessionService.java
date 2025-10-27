package app.signbell.backend.service;

import app.signbell.backend.config.UserSessionRegistry;
import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.ParticipantEventResponse;
import app.signbell.backend.entity.User;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * WebSocket 세션의 라이프사이클을 관리하는 서비스입니다.
 *
 * 주요 책임:
 * - 세션 연결 해제 시 필요한 비즈니스 로직 조율
 * - 방 퇴장 처리 및 알림 전송
 * - 세션 레지스트리 정리
 * - 방 종료 시 모든 참가자의 세션 강제 정리
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
    private final UserRepository userRepository;

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
            boolean isActive = isActiveSession(userId, sessionId);
            
            if (!isActive) {
                log.info("비활성 세션의 DISCONNECT 감지 - userId: {}, sessionId: {}", userId, sessionId);
                // 비활성 세션이어도 방 퇴장 처리는 수행해야 함
                // (방장이 퇴장하면 방 상태를 FINISHED로 변경해야 하기 때문)
            }

            // 2. 방 퇴장 처리 (활성/비활성 세션 관계없이 수행)
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
     * 방 종료 시 여러 참가자의 세션을 한꺼번에 정리합니다.
     *
     * 이 메서드는 방장이 나갔을 때 남은 참가자들의 세션을 정리하기 위해 사용됩니다.
     *
     * 처리 흐름:
     * 1. 각 참가자에게 방 종료 알림 메시지 전송
     * 2. UserSessionRegistry에서 세션 매핑 제거
     *
     * @param userIds 세션을 정리할 사용자 ID 목록
     * @param roomId 종료된 방 ID (로깅 및 알림용)
     */
    public void cleanupMultipleSessions(List<Long> userIds, Long roomId) {
        log.info("방 종료로 인한 다중 세션 정리 시작 - roomId: {}, 대상 참가자 수: {}",
                roomId, userIds.size());

        int successCount = 0;
        int failCount = 0;

        for (Long userId : userIds) {
            try {
                // 1. 세션 ID 조회
                String sessionId = userSessionRegistry.getSessionId(userId);

                if (sessionId == null) {
                    log.warn("활성 세션을 찾을 수 없음 - userId: {}, roomId: {}", userId, roomId);
                    failCount++;
                    continue;
                }

                // 2. 사용자에게 방 종료 알림 전송
                sendRoomClosedNotification(userId, roomId);

                // 3. 세션 매핑 제거
                userSessionRegistry.unbind(userId, sessionId);

                log.info("세션 정리 완료 - userId: {}, sessionId: {}, roomId: {}",
                        userId, sessionId, roomId);
                successCount++;

            } catch (Exception e) {
                log.error("세션 정리 중 오류 발생 - userId: {}, roomId: {}", userId, roomId, e);
                failCount++;

                // 오류가 발생해도 매핑은 제거 시도 (스테일 매핑 방지)
                try {
                    String sessionId = userSessionRegistry.getSessionId(userId);
                    if (sessionId != null) {
                        userSessionRegistry.unbind(userId, sessionId);
                    }
                } catch (Exception ex) {
                    log.error("세션 매핑 제거 실패 - userId: {}", userId, ex);
                }
            }
        }

        log.info("다중 세션 정리 완료 - roomId: {}, 성공: {}, 실패: {}",
                roomId, successCount, failCount);
    }

    /**
     * 사용자에게 방 종료 알림 메시지를 전송합니다.
     *
     * 클라이언트는 /user/queue/room-closed 를 구독하고 이 메시지를 받으면:
     * 1. 사용자에게 "방장이 나가서 방이 종료되었습니다" 알림 표시
     * 2. 방 목록 화면으로 이동
     *
     * @param userId 알림을 받을 사용자 ID
     * @param roomId 종료된 방 ID
     */
    private void sendRoomClosedNotification(Long userId, Long roomId) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/room-closed",
                ApiResponse.error(
                        "방장이 나가서 방이 종료되었습니다."
                )
        );

        log.debug("방 종료 알림 전송 - userId: {}, roomId: {}", userId, roomId);
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
            log.info("🚪 방 퇴장 처리 시작 - userId: {}", userId);
            
            // 방 퇴장 처리
            ParticipantEventResponse eventResp = leaveService.leaveCurrentRoomByUser(userId);
            Long roomId = eventResp.getGameRoomId();
            
            log.info("🚪 방 퇴장 처리 완료 - userId: {}, roomId: {}, eventType: {}, roomClosed: {}", 
                    userId, roomId, eventResp.getEventType(), eventResp.getRoomClosed());

            // 같은 방의 다른 참가자들에게 퇴장 알림 브로드캐스트
            broadcastLeaveEvent(roomId, eventResp);

            // 게임 중 현재 도전자가 퇴장하여 다음 도전자가 있는 경우
            if (eventResp.getNextChallengerId() != null) {
                log.info("게임 중 도전자 퇴장 - 다음 도전자에게 알림 전송: nextChallengerId={}", 
                        eventResp.getNextChallengerId());
                
                try {
                    // 다음 도전자 정보 조회
                    Long nextChallengerId = eventResp.getNextChallengerId();
                    User nextUser = userRepository.findById(nextChallengerId)
                            .orElse(null);
                    
                    if (nextUser != null) {
                        // 다음 도전자 이벤트 생성
                        java.util.Map<String, Object> nextChallengerData = new java.util.HashMap<>();
                        nextChallengerData.put("userId", nextUser.getId());
                        nextChallengerData.put("nickname", nextUser.getNickname());
                        nextChallengerData.put("profileImage", nextUser.getProfileImageUrl());
                        
                        // 다음 도전자 알림 브로드캐스트
                        messagingTemplate.convertAndSend(
                                "/topic/room/" + roomId + "/quiz/challenger",
                                ApiResponse.success(
                                        "다음 도전자 차례입니다.",
                                        nextChallengerData
                                )
                        );
                        
                        log.info("✅ 다음 도전자 알림 전송 완료 - nextChallengerId: {}, nickname: {}", 
                                nextChallengerId, nextUser.getNickname());
                    } else {
                        log.warn("⚠️ 다음 도전자 정보를 찾을 수 없습니다 - nextChallengerId: {}", nextChallengerId);
                    }
                } catch (Exception e) {
                    log.error("❌ 다음 도전자 알림 전송 실패", e);
                }
            }

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