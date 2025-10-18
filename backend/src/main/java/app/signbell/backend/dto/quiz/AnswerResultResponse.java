package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

/**
 * 정답 결과 응답 DTO
 *
 * 사용자의 정답 여부와 점수를 포함한 정보를 제공
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class AnswerResultResponse {
    private Long userId;
    private Boolean isCorrect;
    private Integer score;
    private Integer totalScore;
}