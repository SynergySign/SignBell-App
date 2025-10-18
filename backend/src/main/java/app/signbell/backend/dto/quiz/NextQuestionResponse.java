package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

/**
 * 다음 문제 응답 DTO
 *
 * 클라이언트에 다음 문제에 대한 정보를 전달하는 데이터 모델
 * - 사용자는 제시된 단어를 보고 수어로 표현
 * - 프론트엔드에서 MediaPipe로 동작 추출 후 FastAPI로 검증
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class NextQuestionResponse {
    private Integer questionNumber;
    private Integer totalQuestions;
    private String wordTitle; // 문제로 제시할 단어 (예: "감사합니다")
}
