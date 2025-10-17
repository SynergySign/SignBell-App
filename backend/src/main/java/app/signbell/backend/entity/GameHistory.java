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
 * GameHistory 클래스는 특정 게임방에서의 게임 진행 기록을 관리하기 위한 엔티티입니다.
 * 각 레코드는 게임방, 참여 유저, 획득 점수, 회차 정보와 생성 및 수정 시간 등의 데이터를 포함합니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
@Entity
@Table(name = "game_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameHistory {

    /**
     * 게임 기록 고유 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "game_history_id")
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
     * 점수
     */
    @Column(nullable = false)
    private int score;

    /**
     * 회차
     */
    @Column(nullable = false)
    private int round;

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


    // ===== 추가 메서드 =====

    @Builder
    public GameHistory(GameRoom gameRoom, User participant, int score, int round) {
        this.gameRoom = gameRoom;
        this.participant = participant;
        this.score = score;
        this.round = round;
    }

    /**
     * 점수 누적
     */
    public void addScore(int additionalScore) {
        this.score += additionalScore;
    }
}