package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "user")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    /**
     * 사용자 고유 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    /**
     * 닉네임
     */
    @Column(nullable = false)
    private String nickname;

    /**
     * 이메일
     */
    @Column(nullable = false, unique = true)
    private String email;

    /**
     * 로그인 방식
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoginMethod loginMethod;

    /**
     * 사용자 누적 점수
     */
    @Column(name = "total_score", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long totalScore;

    /**
     * 가입 시간
     */
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    /**
     * 마지막 수정 시간
     */
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public User(String nickname, String email, LoginMethod loginMethod) {
        this.nickname = nickname;
        this.email = email;
        this.loginMethod = loginMethod;
        this.totalScore = 0L; // 빌더 생성 시 기본값 0으로 초기화
    }

    /**
     * 사용자의 누적 점수를 업데이트하는 편의 메서드입니다.
     * @param score 게임 라운드에서 획득한 점수
     */
    public void updateTotalScore(int score) {
        this.totalScore += score;
    }
}