package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SignApi 클래스는 한국어 수어 단어 정보를 관리하는 엔티티입니다.
 * 해당 클래스는 데이터베이스의 sign_api 테이블과 매핑되며,
 * 수어 단어의 ID, 제목, 설명, 영상 URL, 카테고리 정보를 포함하고 있습니다.
 *
 * 이 클래스는 수어 데이터베이스의 데이터를 저장, 조회 및 관리하는 데 사용됩니다.
 *
 *
 * @author 고동현
 * @since 2025-10-12
 */
@Entity
@Table(name = "sign_api")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SignApi {

    /**
     * 국어원 API 수어단어 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sign_api_id")
    private Long id;

    /**
     * 이름
     */
    @Column(nullable = false)
    private String title;

    /**
     * 영상 url
     */
    private String videoUrl;

    /**
     * 수어 설명
     */
    @Lob
    private String signDescription;

    /**
     * 카테고리
     */
    @Column(length = 100)
    private String categoryType;
}