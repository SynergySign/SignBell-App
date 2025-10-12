package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * TermsAgreement 클래스는 약관 동의 정보를 관리하는 엔티티입니다.
 * 해당 클래스는 데이터베이스의 terms_agreement 테이블과 매핑되며,
 * 특정 사용자가 특정 약관에 대해 동의했는지 여부와 관련된 정보를 저장합니다.
 *
 * 이 클래스는 사용자의 약관 동의 상태 저장, 조회, 수정 등의 작업에 사용됩니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
@Entity
@Table(name = "terms_agreement")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TermsAgreement {

    /**
     * 약관별 동의여부 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "terms_agreement_id")
    private Long id;

    /**
     * 사용자 ID (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 약관 ID (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "terms_id", nullable = false)
    private Terms terms;

    /**
     * 동의여부 (T/F)
     */
    @Column(nullable = false)
    private boolean agreed;

    /**
     * 동의일시
     */
    private LocalDateTime agreedAt;

    /**
     * 마지막 수정시간
     */
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}