package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * GameRoom 클래스는 게임방 정보를 관리하는 엔티티입니다.
 * 해당 클래스는 데이터베이스의 game_room 테이블과 매핑되며,
 * 게임방의 제목, 방장, 최대/현재 인원, 상태값 등 주요 정보를 포함하고 있습니다.
 * @author 고동현
 * @since 2025-10-12
 */
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

    /**
     * GameRoom 생성자를 통해 게임방을 초기화합니다.
     *
     * @param gameTitle 게임방 제목
     * @param host 게임방 방장
     * @param status 게임방 상태값 (대기중/진행중/종료)
     */
    @Builder
    public GameRoom(String gameTitle, User host, GameRoomStatus status) {
        this.gameTitle = gameTitle;
        this.host = host;
        this.status = status;
        this.maxParticipants = 4;
        this.currentParticipants = 1;
        this.currentRound = 1;
    }

    // --- 편의 메서드 ---

    /**
     * 다음 라운드로 진행시킵니다.
     */
    public void proceedToNextRound() {
        this.currentRound++;
    }

    /**
     * 참가자 수를 1 증가시킵니다.
     */
    public void incrementParticipants() {
        this.currentParticipants++;
    }

    /**
     * 참가자 수를 1 감소시킵니다.
     */
    public void decrementParticipants() {
        if (this.currentParticipants > 0) {
            this.currentParticipants--;
        }
    }
}