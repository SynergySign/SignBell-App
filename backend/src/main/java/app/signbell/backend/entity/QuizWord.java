package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * QuizWord 클래스는 퀴즈에 사용하는 단어 정보를 관리하는 엔티티입니다.
 * 이 엔티티는 '학습 완료(COMPLETED)' 상태인 Sign 엔티티의 정보를 저장합니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */
@Entity
@Table(name = "quiz_word", indexes = {
        // Sign 엔티티와의 중복 생성을 방지하기 위해 unique 제약조건을 추가합니다.
        @Index(name = "uk_quiz_word_sign_id", columnList = "sign_id", unique = true)
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuizWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quiz_word_id")
    private Long id;

    /**
     * 학습 완료된 수어 단어의 ID (FK)
     * SignApi 대신 Sign 엔티티를 직접 참조하도록 변경되었습니다.
     * 하나의 Sign 데이터는 하나의 QuizWord만 가질 수 있으므로 OneToOne 관계를 사용합니다.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sign_id", nullable = false)
    private Sign sign;

    @Builder
    public QuizWord(Sign sign) {
        this.sign = sign;
    }
}