package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.request.AnswerSubmitRequest;
import app.signbell.backend.dto.request.ChallengeRequest;
import app.signbell.backend.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Objects;

@Slf4j
@Controller
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    /**
     * 게임 시작
     * 방장이 '/app/room/{gameRoomId}/quiz/start'로 게임 시작
     */
    @MessageMapping("/room/{gameRoomId}/quiz/start")
    public void handleGameStart(@DestinationVariable Long gameRoomId,
                                StompHeaderAccessor accessor) {
        Long hostId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");
        quizService.startGame(gameRoomId, hostId);
    }

    /**
     * 정답 도전 (선착순 4명 등록)
     * 참가자가 '/app/room/{gameRoomId}/quiz/challenge'로 도전권 신청
     */
    @MessageMapping("/room/{gameRoomId}/quiz/challenge")
    public void handleChallenge(@DestinationVariable Long gameRoomId,
                                @Payload ChallengeRequest request,
                                StompHeaderAccessor accessor) {
        Long userId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");
        quizService.registerChallenge(gameRoomId, userId, request.getQuestionNumber());
    }

    /**
     * 정답 제출 (AI 추론 결과 받기)
     * 프론트엔드가 FastAPI로부터 추론 결과를 받아서 전송
     * '/app/room/{gameRoomId}/quiz/answer'
     */
    @MessageMapping("/room/{gameRoomId}/quiz/answer")
    public void submitAnswer(@DestinationVariable Long gameRoomId,
                             @Payload AnswerSubmitRequest request,
                             StompHeaderAccessor accessor) {
        Long userId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");

        log.info("정답 제출 - userId: {}, roomId: {}, questionNumber: {}, answer: {}",
                userId, gameRoomId, request.getQuestionNumber(), request.getUserAnswer());

        quizService.submitAnswer(
                gameRoomId,
                userId,
                request.getQuestionNumber(),
                request.getUserAnswer()
        );
    }

    /**
     * 타임아웃 처리 (프론트엔드에서 5초 후 자동 호출)
     * '/app/room/{gameRoomId}/quiz/timeout'
     */
    @MessageMapping("/room/{gameRoomId}/quiz/timeout")
    public void handleTimeout(@DestinationVariable Long gameRoomId,
                              @Payload ChallengeRequest request,
                              StompHeaderAccessor accessor) {
        Long userId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");

        log.info("타임아웃 발생 - userId: {}, roomId: {}, questionNumber: {}",
                userId, gameRoomId, request.getQuestionNumber());

        quizService.handleTimeout(gameRoomId, userId, request.getQuestionNumber());
    }
}