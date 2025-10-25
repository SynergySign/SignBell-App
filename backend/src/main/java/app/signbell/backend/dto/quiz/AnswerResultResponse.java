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
    private String nickname;  // 도전자 닉네임
    private Boolean isCorrect;
    private Integer score;  // 이번 문제에서 획득/차감된 점수
    private Integer totalScore;  // 누적 점수
    private String userAnswer;  // 사용자가 제출한 답변
    private String correctAnswer;  // 정답
    private Double confidenceScore;  // AI 신뢰도 점수
    private String resultMessage;  // 결과 메시지
}