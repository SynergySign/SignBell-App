package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * ChallengeAcquiredResponse 클래스는 특정 유저가 챌린지를 획득한 정보를 담는 응답 DTO입니다.
 *
 * 이 클래스는 유저 ID, 닉네임, 문제 번호, 챌린지 단계(순서), 카운트다운 초 단위를 포함하며,
 * 클라이언트로 반환될 데이터에 대한 구조를 정의합니다.
 *
 * 주요 필드:
 * - userId: 유저의 고유 식별자
 * - nickname: 유저의 닉네임
 * - questionNumber: 문제 번호
 * - challengeOrder: 챌린지의 진행 단계 (1~4)
 * - countdownSeconds: 남은 카운트다운 시간 (단위: 초)
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@AllArgsConstructor
public class ChallengeAcquiredResponse {
    private Long userId;
    private String nickname;
    private Integer questionNumber;
    private Integer challengeOrder;  // 1, 2, 3, 4
    private Integer countdownSeconds;  // 5초
}