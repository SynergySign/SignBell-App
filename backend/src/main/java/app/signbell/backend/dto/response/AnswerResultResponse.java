package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AnswerResultResponse {
    private Long userId;
    private Integer questionNumber;
    private Boolean isCorrect;
    private Integer score;
    private String message;
}