package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * QuizQuestionResponse 클래스는 퀴즈 문제에 대한 정보를 담는 DTO입니다.
 *
 * 이 클래스는 퀴즈 문제 번호, 관련 단어 ID, 문제 제목을 포함하여
 * 클라이언트로 전달하는 응답 데이터를 표현합니다.
 *
 * 주요 필드:
 * - questionNumber: 퀴즈 문제의 번호
 * - quizWordId: 퀴즈와 관련된 단어의 ID
 * - title: 퀴즈 문제 제목
 *
 * 주요 사용 사례:
 * - 퀴즈 문제 데이터를 클라이언트로 반환
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@AllArgsConstructor
public class QuizQuestionResponse {
    private int questionNumber;
    private Long quizWordId;
    private String title;
}