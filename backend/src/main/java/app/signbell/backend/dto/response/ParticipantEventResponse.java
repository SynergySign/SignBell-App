package app.signbell.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * 참가자 이벤트 응답 DTO
 *
 * 참가자 입장/퇴장 또는 방 종료 이벤트 정보를 담는 객체입니다.
 * 웹소켓을 통해 실시간으로 참가자들에게 브로드캐스트됩니다.
 *
 * @author 강관주
 * @since 2025-10-15
 */
@Getter
@Builder
public class ParticipantEventResponse {
    /**
     * 이벤트 타입
     * - "PARTICIPANT_JOINED": 참가자 입장
     * - "PARTICIPANT_LEFT": 참가자 퇴장
     * - "ROOM_CLOSED": 방 종료 (방장 퇴장)
     */
    private String eventType;

    /**
     * 이벤트 대상 참가자 정보
     * 입장/퇴장한 참가자의 상세 정보
     */
    private ParticipantResponse participant;

    /**
     * 현재 방의 참가자 수
     * 이벤트 처리 후의 참가자 수
     */
    private Integer currentParticipants;

    /**
     * 게임방 ID
     */
    private Long gameRoomId;

    /**
     * 방 종료 여부
     * - true: 방이 종료됨 (방장 퇴장)
     * - false: 방이 유지됨 (일반 참가자 퇴장)
     */
    private Boolean roomClosed;

    /**
     * 다음 도전자 ID (게임 중 현재 도전자가 퇴장한 경우)
     * - null이 아니면: 다음 도전자로 자동 전환됨
     * - null이면: 다음 도전자 없음 (다음 문제로 이동 또는 일반 퇴장)
     */
    private Long nextChallengerId;
}
