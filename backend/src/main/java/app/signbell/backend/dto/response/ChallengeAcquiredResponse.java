package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChallengeAcquiredResponse {
    private final String eventType = "CHALLENGE_ACQUIRED";
    private Long userId;
    private String nickname;
    private int questionNumber;
    private int challengeOrder;
    private int countdownStart; // "이 시간(초)만큼 카운트다운 하세요"
}