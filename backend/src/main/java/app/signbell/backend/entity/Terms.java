package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * Terms 클래스는 약관 정보를 관리하는 엔티티입니다.
 * 해당 클래스는 데이터베이스의 terms 테이블과 매핑되며,
 * 약관의 ID, 제목, 내용, 버전, 필수 여부, 생성 및 수정 시간 정보를 포함하고 있습니다.
 *
 * 이 클래스는 약관 데이터의 저장, 조회, 수정, 관리를 위해 사용됩니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
@Entity
@Table(name = "terms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Terms {

    /**
     * 약관 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "terms_id")
    private Long id;

    /**
     * 약관 제목
     */
    @Column(nullable = false)
    private String title;

    /**
     * 약관 내용
     */
    @Lob
    @Column(nullable = false)
    private String content;

    /**
     * 약관 버전
     */
    @Column(nullable = false, length = 50)
    private String version;

    /**
     * 필수 약관 여부
     */
    @Column(nullable = false)
    private boolean isRequired;

    /**
     * 약관 등록 일시
     */
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    /**
     * 마지막 수정 시간
     */
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}