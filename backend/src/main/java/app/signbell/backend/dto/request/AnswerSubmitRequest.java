package app.signbell.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AnswerSubmitRequest {
    private Integer questionNumber;
    private String userAnswer;  // FastAPI에서 받은 추론 결과
}