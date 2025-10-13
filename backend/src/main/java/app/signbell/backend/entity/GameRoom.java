package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "game_room")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameRoom {

    /**
     * 게임방 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "game_room_id")
    private Long id;

    /**
     * 게임방 제목
     */
    @Column(nullable = false)
    private String gameTitle;

    /**
     * 방장 User ID (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    /**
     * 게임방 최대 인원 수 (4 고정)
     */
    private Integer maxParticipants = 4;

    /**
     * 게임방 현재 인원 수
     */
    private Integer currentParticipants = 1;

    /**
     * 상태값 (대기중/진행중/종료)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GameRoomStatus status;

    /**
     * 현재 라운드
     */
    @Column(nullable = false)
    private Integer currentRound = 1;

    /**
     * 생성 시간
     */
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    /**
     * 수정 시간
     */
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // --- 편의 메서드 ---

    /**
     * 다음 라운드로 진행시킵니다.
     */
    public void proceedToNextRound() {
        this.currentRound++;
    }
}