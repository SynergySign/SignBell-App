package app.signbell.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * AnswerSubmitRequest 클래스는 사용자가 퀴즈 정답을 제출할 때 사용되는 요청 데이터를 정의합니다.
 *
 * 필드:
 * - questionNumber: 제출된 정답이 해당되는 문제 번호
 * - userAnswer: FastAPI에서 받은 AI 추론 결과로 사용자 제출 정답을 나타냄
 * - confidenceScore: FastAPI AI 모델의 신뢰도 점수 (0.0 ~ 1.0)
 *
 * 주로 STOMP 메시지로 서버에 전송되어 정답 처리에 활용됩니다.
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AnswerSubmitRequest {
    private Integer questionNumber;
    private String userAnswer;  // FastAPI에서 받은 추론 결과
    private Double confidenceScore;  // AI 모델 신뢰도 (0.0 ~ 1.0)
}