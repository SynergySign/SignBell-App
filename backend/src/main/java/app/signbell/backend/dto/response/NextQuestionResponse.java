package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NextQuestionResponse {
    private Integer nextQuestionNumber;
    private Integer delaySeconds;  // 3초 후 시작
}