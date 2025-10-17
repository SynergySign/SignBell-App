package app.signbell.backend.dto.response;

import lombok.Getter;
import java.util.List;

/**
 * QuizStartedResponse 클래스는 퀴즈가 시작되었을 때 클라이언트에 전달되는 응답 데이터를 표현합니다.
 *
 * 이 클래스는 게임의 주요 정보를 포함하며 다음과 같은 데이터를 제공합니다:
 * - 이벤트 타입: "QUIZ_STARTED"
 * - 현재 라운드 정보
 * - 총 문제 수: 8개로 고정값
 * - 각 문제에 대한 상세 정보 리스트
 * - 각 문제당 제한 시간: 8초 (밀리초 값으로 8000)
 *
 * 주요 용도:
 * - 퀴즈 시작 이벤트 발생 시, 클라이언트에게 초기 설정값과 문제 데이터를 전달
 *
 * 생성자는 현재 라운드와 문제 리스트를 받아 객체를 생성합니다.
 */
@Getter
public class QuizStartedResponse {
    private final String eventType = "QUIZ_STARTED";
    private final int round;
    private final int totalQuestions = 8;
    private final List<QuizQuestionResponse> questions;
    private final long answerTimeLimit = 5000; // 5초

    public QuizStartedResponse(int round, List<QuizQuestionResponse> questions) {
        this.round = round;
        this.questions = questions;
    }
}