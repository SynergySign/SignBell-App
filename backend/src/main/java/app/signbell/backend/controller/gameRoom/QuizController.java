package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.request.ChallengeRequest;
import app.signbell.backend.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Objects;

@Controller
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    /**
     * 방장이 '/app/room/{gameRoomId}/quiz/start'로 게임 시작 메시지를 보냈을 때 호출됩니다.
     */
    @MessageMapping("/room/{gameRoomId}/quiz/start")
    public void handleGameStart(@DestinationVariable Long gameRoomId, StompHeaderAccessor accessor) {
        // StompHeaderAccessor를 통해 WebSocket 세션 속성에 접근합니다.
        // 세션에 저장된 'userId'를 가져옵니다. (CookieAuthHandshakeInterceptor에서 저장해 줌)
        Long hostId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");

        quizService.startGame(gameRoomId, hostId);
    }

    /**
     * 참가자가 '/app/room/{gameRoomId}/quiz/challenge'로 '정답 도전' 메시지를 보냈을 때 호출됩니다.
     */
    @MessageMapping("/room/{gameRoomId}/quiz/challenge")
    public void handleChallenge(@DestinationVariable Long gameRoomId,
                                @Payload ChallengeRequest request,
                                StompHeaderAccessor accessor) {
        // 위와 동일하게 세션에서 '정답 도전'을 시도한 사용자의 ID를 가져옵니다.
        Long userId = (Long) Objects.requireNonNull(accessor.getSessionAttributes()).get("userId");

        quizService.handleChallenge(gameRoomId, userId, request.getQuestionNumber());
    }
}