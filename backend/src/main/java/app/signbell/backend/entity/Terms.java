package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

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