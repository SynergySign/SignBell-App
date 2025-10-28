package app.signbell.backend.dto.quiz;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 타이머 업데이트 응답 DTO
 *
 * 게임 진행 중 타이머 상태를 실시간으로 전달하는 데이터 모델입니다.
 * WebSocket을 통해 모든 참가자에게 브로드캐스트됩니다.
 * 
 * 타이머 타입:
 * - CHALLENGE: 도전 신청 타이머 (10초)
 * - PREPARE: 수어 준비 타이머 (5초)
 * - SIGNING: 수어 표현 타이머 (10초)
 * 
 * 도전자 퇴장 시 타이머 재시작 기능:
 * - challengerUserId를 통해 현재 도전자 검증
 * - 도전자 변경 시 타이머가 초기값으로 재시작
 *
 * @author 고동현
 * @since 2025-10-23
 */
@Getter
@Builder
@AllArgsConstructor
public class TimerUpdateResponse {
    private String timerType;  // "CHALLENGE", "PREPARE", "SIGNING"
    private Integer remainingSeconds;  // 남은 시간 (초)
    private Integer questionNumber;  // 문제 번호
    private Long challengerUserId;  // 도전자 ID (PREPARE, SIGNING 타입일 때만)
}
