package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NextChallengerResponse {
    private Long userId;
    private Integer questionNumber;
    private Integer countdownSeconds;  // 5초
}