package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

/**
 * 퀴즈 시작 응답 DTO
 *
 * 퀴즈 시작 시 클라이언트에 문제 정보를 전달하는 데이터 모델
 * - 사용자는 제시된 단어를 보고 수어로 표현
 * - 프론트엔드에서 MediaPipe로 동작 추출 후 FastAPI로 검증
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class QuizStartResponse {
    private Integer questionNumber;
    private Integer totalQuestions;
    private String wordTitle; // 문제로 제시할 단어 (예: "안녕하세요")
}
