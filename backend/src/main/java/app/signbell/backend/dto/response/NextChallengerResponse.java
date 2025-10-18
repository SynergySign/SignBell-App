package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * NextChallengerResponse 클래스는 다음 도전자를 알리기 위한 응답 데이터 객체입니다.
 *
 * 이 클래스는 특정 유저 ID, 문제 번호, 카운트다운 시간(초)을 포함하여
 * 다음 도전자가 누구인지, 어떤 문제를 풀게 되는지, 카운트다운 시간을 전달합니다.
 *
 * 주요 용도:
 * - 다음 도전자 정보 전달
 * - 클라이언트에서 카운트다운 타이머를 설정하거나 UI 업데이트에 사용
 *
 * 필드 설명:
 * - userId: 다음 도전자의 사용자 ID (예. 12345)
 * - questionNumber: 다음 문제의 번호 (예. 1)
 * - countdownSeconds: 카운트다운 시간(단위: 초) (예. 5)
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@AllArgsConstructor
public class NextChallengerResponse {
    private Long userId;
    private Integer questionNumber;
    private Integer countdownSeconds;  // 5초
}