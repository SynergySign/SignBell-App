package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NextQuestionResponse {
    private Integer questionNumber;
    private Integer totalQuestions;
    private String videoUrl;
    private String signDescription;
}
