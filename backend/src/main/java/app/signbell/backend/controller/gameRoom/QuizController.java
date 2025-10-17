package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.request.AnswerSubmitRequest;
import app.signbell.backend.dto.request.ChallengeRequest;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Objects;

/**
 * 퀴즈 게임 진행을 제어하는 컨트롤러 클래스
 * STOMP 프로토콜로 클라이언트에서 전달된 메시지를 처리하고 QuizService와 상호작용
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 게임 시작
     * 방장이 '/app/room/{gameRoomId}/quiz/start'로 게임 시작
     */
    @MessageMapping("/room/{gameRoomId}/quiz/start")
    public void handleGameStart(@DestinationVariable Long gameRoomId,
                                StompHeaderAccessor accessor) {
        Long hostId = null;
        try {
            hostId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");
            quizService.startGame(gameRoomId, hostId);
        } catch (BusinessException e) {
            log.warn("게임 시작 실패 - userId: {}, roomId: {}, error: {}", 
                    hostId, gameRoomId, e.getErrorCode());
            if (hostId != null) {
                sendErrorToUser(hostId, e.getMessage());
            }
        } catch (Exception e) {
            log.error("게임 시작 중 예상치 못한 오류 - userId: {}, roomId: {}", hostId, gameRoomId, e);
            if (hostId != null) {
                sendErrorToUser(hostId, "게임 시작 중 오류가 발생했습니다");
            }
        }
    }

    /**
     * 정답 도전 (선착순 4명 등록)
     * 참가자가 '/app/room/{gameRoomId}/quiz/challenge'로 도전권 신청
     */
    @MessageMapping("/room/{gameRoomId}/quiz/challenge")
    public void handleChallenge(@DestinationVariable Long gameRoomId,
                                @Payload ChallengeRequest request,
                                StompHeaderAccessor accessor) {
        Long userId = null;
        try {
            userId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");
            quizService.registerChallenge(gameRoomId, userId, request.getQuestionNumber());
        } catch (BusinessException e) {
            log.warn("도전 신청 실패 - userId: {}, roomId: {}, error: {}", 
                    userId, gameRoomId, e.getErrorCode());
            if (userId != null) {
                sendErrorToUser(userId, e.getMessage());
            }
        } catch (Exception e) {
            log.error("도전 신청 중 예상치 못한 오류 - userId: {}, roomId: {}", userId, gameRoomId, e);
            if (userId != null) {
                sendErrorToUser(userId, "도전 신청 중 오류가 발생했습니다");
            }
        }
    }

    /**
     * 정답 제출 (AI 추론 결과)
     * 
     * 플로우:
     * 1. 프론트엔드: 5초 동안 수어 동작 수행
     * 2. 프론트엔드 → FastAPI: 실시간으로 MediaPipe 데이터 전송
     * 3. FastAPI → 프론트엔드: AI 모델이 인식한 단어 반환
     * 4. 프론트엔드 → 백엔드: 인식된 단어 제출 (이 메서드)
     * 5. 백엔드: DB 정답과 비교하여 점수 처리
     * 
     * '/app/room/{gameRoomId}/quiz/answer'
     */
    @MessageMapping("/room/{gameRoomId}/quiz/answer")
    public void submitAnswer(@DestinationVariable Long gameRoomId,
                             @Payload AnswerSubmitRequest request,
                             StompHeaderAccessor accessor) {
        Long userId = null;
        try {
            userId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");

            log.info("정답 제출 - userId: {}, roomId: {}, questionNumber: {}, answer: {}",
                    userId, gameRoomId, request.getQuestionNumber(), request.getUserAnswer());

            quizService.submitAnswer(
                    gameRoomId,
                    userId,
                    request.getQuestionNumber(),
                    request.getUserAnswer()
            );
        } catch (BusinessException e) {
            log.warn("정답 제출 실패 - userId: {}, roomId: {}, error: {}", 
                    userId, gameRoomId, e.getErrorCode());
            if (userId != null) {
                sendErrorToUser(userId, e.getMessage());
            }
        } catch (Exception e) {
            log.error("정답 제출 중 예상치 못한 오류 - userId: {}, roomId: {}", userId, gameRoomId, e);
            if (userId != null) {
                sendErrorToUser(userId, "정답 제출 중 오류가 발생했습니다");
            }
        }
    }

    /**
     * 방으로 돌아가기 (게임 종료 후)
     * 
     * 게임 종료 후 순위 발표 화면에서 "방으로 돌아가기" 버튼 클릭 시 호출
     * - 대기실 화면으로 이동하라는 메시지를 브로드캐스트
     * - 실제 방 상태는 이미 endGame()에서 WAITING으로 변경됨
     * 
     * '/app/room/{gameRoomId}/quiz/return'
     */
    @MessageMapping("/room/{gameRoomId}/quiz/return")
    public void returnToWaitingRoom(@DestinationVariable Long gameRoomId,
                                     StompHeaderAccessor accessor) {
        Long userId = null;
        try {
            userId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");

            log.info("방으로 돌아가기 요청 - userId: {}, roomId: {}", userId, gameRoomId);

            quizService.returnToWaitingRoom(gameRoomId, userId);
        } catch (BusinessException e) {
            log.warn("방으로 돌아가기 실패 - userId: {}, roomId: {}, error: {}", 
                    userId, gameRoomId, e.getErrorCode());
            if (userId != null) {
                sendErrorToUser(userId, e.getMessage());
            }
        } catch (Exception e) {
            log.error("방으로 돌아가기 중 예상치 못한 오류 - userId: {}, roomId: {}", userId, gameRoomId, e);
            if (userId != null) {
                sendErrorToUser(userId, "방으로 돌아가기 중 오류가 발생했습니다");
            }
        }
    }

    /**
     * 사용자에게 에러 메시지 전송
     */
    private void sendErrorToUser(Long userId, String message) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/errors",
                ApiResponse.error(message)
        );
    }
}