package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuizQuestionResponse {
    private int questionNumber;
    private Long quizWordId;
    private String title;
}