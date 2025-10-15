package app.signbell.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * ParticipantEventResponse 클래스는 특정 이벤트와 관련된 참가자의 상태 정보를 나타내는 응답 객체입니다.
 *
 * 주요 사용 사례:
 * - 사용자 이벤트 발생 시 해당 이벤트와 관련된 정보를 응답 형태로 전달
 * - 이벤트 유형(eventType), 이벤트에 연관된 참가자 정보(participant), 현재 참가자 수(currentParticipants)를 포함
 *
 * 주요 필드:
 * - eventType: 이벤트 유형을 나타내는 문자열, 예를 들어 "PARTICIPANT_JOINED"와 같은 값
 * - participant: 이벤트와 연관된 개별 참가자에 대한 정보를 담은 ParticipantResponse 객체
 * - currentParticipants: 이벤트 발생 시점의 현재 게임방 참가자 수
 *
 * @author 강관주
 * @since 2025-10-15
 */
@Getter
@Builder
public class ParticipantEventResponse {
    private String eventType;  // "PARTICIPANT_JOINED"
    private ParticipantResponse participant;
    private Integer currentParticipants;
}
