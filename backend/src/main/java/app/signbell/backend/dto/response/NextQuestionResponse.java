package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * NextQuestionResponse 클래스는 다음 질문 정보와 대기 시간을 담은 응답 객체입니다.
 *
 * 이 클래스는 다음 질문 번호(nextQuestionNumber)와
 * 해당 질문 시작까지의 대기 시간(delaySeconds)을 제공합니다.
 *
 * 주요 용도:
 * - 사용자에게 다음 질문 정보를 전달
 * - 게임 내 흐름을 제어하기 위해 대기 시간 설정
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@AllArgsConstructor
public class NextQuestionResponse {
    private Integer nextQuestionNumber;
    private Integer delaySeconds;  // 3초 후 시작
}