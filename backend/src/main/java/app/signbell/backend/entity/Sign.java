/**
 * Sign 클래스는 수어데이터를 관리하기 위한 엔티티입니다.
 * 각 레코드는 수어 단어, 영상 URL, 카테고리, 설명 , 모델 학습 상태를 포함합니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */

package app.signbell.backend.entity;

import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sign", indexes = {
        @Index(name = "idx_learning_status", columnList = "learningStatus")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 1024)
    private String url;

    /**
     * 수어 설명 (API의 signDescription)
     * 텍스트가 길 수 있으므로 @Lob으로 지정
     */
    @Lob
    @Column(columnDefinition = "TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    private String signDescription; // << ✨ 추가된 필드

    @Column(length = 100)
    private String categoryType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SignStatus learningStatus = SignStatus.PENDING;

    @Builder
    public Sign(String title, String url, String signDescription, String categoryType, SignStatus learningStatus) { // << ✨ 수정된 빌더
        this.title = title;
        this.url = url;
        this.signDescription = signDescription; // << ✨ 추가
        this.categoryType = categoryType;
        // learningStatus가 null이 아닐 경우에만 전달받은 값으로 설정, null이면 기본값(PENDING) 유지
        if (learningStatus != null) {
            this.learningStatus = learningStatus;
        }
    }

    /**
     * 엔티티의 학습 상태를 변경하는 메소드입니다.
     * @param newStatus 새로운 학습 상태
     */
    public void changeLearningStatus(SignStatus newStatus) {
        if (newStatus == null) {
            throw new BusinessException(ErrorCode.INVALID_SIGN_STATUS);
        }
        this.learningStatus = newStatus;
    }


}