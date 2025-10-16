package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 외부 API로부터 받은 원본 데이터를 가공 없이 저장하는 엔티티입니다. (Staging Table)
 *
 * @author 백승현
 * @since 2025-10-16
 */
@Entity
@Table(name = "sign_api") // 테이블 이름 지정
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SignApi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 1024)
    private String url;

    @Lob
    @Column(columnDefinition = "TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    private String signDescription;

    @Column(length = 100)
    private String categoryType;

    @Builder
    public SignApi(String title, String url, String signDescription, String categoryType) {
        this.title = title;
        this.url = url;
        this.signDescription = signDescription;
        this.categoryType = categoryType;
    }
}