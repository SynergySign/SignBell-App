package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * AnswerResultResponse 클래스는 특정 유저의 퀴즈 답변 결과를 포함하는 응답 데이터를 표현합니다.
 *
 * 이 클래스는 유저 ID, 문제 번호, 정답 여부, 획득 점수, 결과 메시지 등의 정보를 담고 있습니다.
 * 주로 퀴즈 진행 중 각 유저의 답변 결과를 클라이언트에 전달하는 데 사용됩니다.
 *
 * 필드 정보:
 * - userId: 유저 식별자
 * - questionNumber: 문제 번호
 * - isCorrect: 정답 여부 (정답일 경우 true)
 * - score: 해당 문제에서 획득한 점수
 * - message: 결과에 관한 추가 메시지
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@AllArgsConstructor
public class AnswerResultResponse {
    private Long userId;
    private Integer questionNumber;
    private Boolean isCorrect;
    private Integer score;
    private String message;
}