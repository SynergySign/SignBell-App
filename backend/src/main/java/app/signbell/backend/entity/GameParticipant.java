package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * GameParticipant 클래스는 게임 대기실 참여자를 나타내는 엔티티로,
 * 사용자의 참여 정보와 참가 상태를 관리합니다. 또한 게임방과 사용자와의
 * 관계를 설정하며 게임 내 역할 정보를 포함합니다.
 * @author 고동현
 * @since 2025-10-12
 */
@Entity
@Table(name = "game_participant")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameParticipant {

    /**
     * 대기실 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "game_participant_id")
    private Long id;

    /**
     * 게임방 ID (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_room_id", nullable = false)
    private GameRoom gameRoom;

    /**
     * 유저 ID (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private User participant;

    /**
     * 레디 상태 (방장은 무조건 TRUE)
     */
    @Column(nullable = false)
    private boolean isReady = false;

    /**
     * 방장 여부 (논리값)
     */
    @Column(nullable = false)
    private boolean isHost;

    /**
     * 현재 라운드
     */
    @Column(nullable = false)
    private Integer currentRound = 1;

    /**
     * 입장 시각
     */
    private LocalDateTime joinedAt;

    /**
     * 수정 시간
     */
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // --- Builder 및 편의 메서드 ---

    @Builder
    public GameParticipant(GameRoom gameRoom, User participant, boolean isHost) {
        this.gameRoom = gameRoom;
        this.participant = participant;
        this.isHost = isHost;
        this.isReady = isHost; // 방장은 기본적으로 준비 상태
        this.joinedAt = LocalDateTime.now();
        this.currentRound = gameRoom.getCurrentRound(); // 참여 시점의 게임방 라운드로 설정
    }

    /**
     * 참여자의 라운드를 게임방의 현재 라운드와 동기화합니다.
     */
    public void syncRound() {
        this.currentRound = this.gameRoom.getCurrentRound();
    }

    /**
     * 참여자의 준비 상태를 변경시킵니다.
     */
    public void changeReadyStatus(boolean isReady) {
        this.isReady = isReady;
    }
}