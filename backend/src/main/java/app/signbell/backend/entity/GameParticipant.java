package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

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
     * 입장 시각
     */
    private LocalDateTime joinedAt;

    /**
     * 수정 시간
     */
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}