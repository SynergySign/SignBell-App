package app.signbell.backend.dto.response;

import app.signbell.backend.entity.GameParticipant;
import lombok.Builder;
import lombok.Getter;

/**
 * ParticipantResponse 클래스는 게임 참가자의 데이터를 응답 형식으로 전달하기 위한 DTO입니다.
 *
 * 이 클래스는 게임 참가자의 ID, 닉네임, 프로필 이미지 URL, 방장 여부, 레디 상태 정보를 포함합니다.
 * 엔티티와의 의존성을 최소화하고 클라이언트가 이해하기 쉬운 데이터 구조로 변환하는 역할을 합니다.
 *
 * 주요 역할:
 * - GameParticipant 엔티티로부터 사용자 데이터를 변환하여 클라이언트에 전달
 * - 게임 대기실 또는 게임방 관련 API 응답 데이터로 사용
 *
 * 주요 메서드:
 * - from(GameParticipant participant): GameParticipant 엔티티를 기반으로 ParticipantResponse 객체를 생성합니다.
 *
 * @author 강관주
 * @since 2025-10-15
 */
@Getter
@Builder
public class ParticipantResponse {
    private Long userId;
    private String nickname;
    private String profileImageUrl;
    private boolean isHost;
    private boolean isReady;

    public static ParticipantResponse from(GameParticipant participant) {
        return ParticipantResponse.builder()
                .userId(participant.getParticipant().getId())
                .nickname(participant.getParticipant().getNickname())
                .profileImageUrl(participant.getParticipant().getProfileImageUrl())
                .isHost(participant.isHost())
                .isReady(participant.isReady())
                .build();
    }
}
