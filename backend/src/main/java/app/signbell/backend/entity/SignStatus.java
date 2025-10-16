package app.signbell.backend.entity;

/**
 * 모델 학습 상태를 정의하는 Enum.
 *    @author 백승현
 *    @since 2025-10-16
 */
public enum SignStatus {
    COMPLETED("완료"),
    IN_PROGRESS("진행중"),
    PENDING("미진행"); // 초기값

    private final String koreanName;

    SignStatus(String koreanName) {
        this.koreanName = koreanName;
    }

    public String getKoreanName() {
        return koreanName;
    }
}