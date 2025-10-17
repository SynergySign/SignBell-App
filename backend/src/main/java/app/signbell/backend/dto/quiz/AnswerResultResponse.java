package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AnswerResultResponse {
    private Long userId;
    private Boolean isCorrect;
    private Integer score;
    private Integer totalScore;
}