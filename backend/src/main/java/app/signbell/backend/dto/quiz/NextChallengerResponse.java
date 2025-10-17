package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NextChallengerResponse {
    private Long userId;
    private Integer questionNumber;
}
