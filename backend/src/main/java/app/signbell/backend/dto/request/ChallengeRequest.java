package app.signbell.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ChallengeRequest 클래스는 특정 문제에 대해 도전 요청을 전달하기 위한 DTO입니다.
 *
 * 주로 퀴즈 게임에서 참가자가 도전 신청 시 해당 문제 번호를 서버에 전달하는 데 사용됩니다.
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ChallengeRequest {
    private Integer questionNumber;
}