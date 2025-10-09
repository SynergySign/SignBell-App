package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

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