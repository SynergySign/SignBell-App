package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * User 클래스는 사용자 정보를 관리하는 엔티티입니다.
 * 해당 클래스는 데이터베이스의 user 테이블과 매핑되며,
 * 사용자 ID, 닉네임, 이메일, 로그인 방식, 가입 시간, 수정 시간, 누적 점수 등의 속성을 포함하고 있습니다.
 *
 * 이 클래스는 사용자 데이터의 저장, 조회 및 관리를 위해 사용됩니다.
 * @author 송민재
 * @since 2025-10-14
 */
@Entity
//@Table(name = "user")
@Table(
        name = "user",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_provider_id", columnNames = {"provider", "provider_id"})
        }
)
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
    @Column(unique = true)
    private String email;

    /**
     * 프로필 이미지 URL
     */
    @Column
    private String profileImageUrl;

    /**
     * OAuth 공급자 (로그인 방식)
     * LoginMethod ENUM을 사용하도록 타입 변경
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoginMethod provider;

    /**
     * OAuth 공급자에서 부여한 ID (누락 필드 추가)
     */
    @Column(name = "provider_id", nullable = false)
    private String providerId;

    /**
     * 필수 약관 동의 여부 (누락 필드 추가)
     */
    @Column(nullable = false)
    private Boolean requiredAgree;

    /**
     * 선택 약관 동의 여부 (누락 필드 추가)
     */
    @Column(nullable = false)
    private Boolean optionalAgree;


    /**
     * 로그인 방식
     */
    /*@Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoginMethod loginMethod;*/

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

    /*@Builder
    public User(String nickname, String email, LoginMethod loginMethod) {
        this.nickname = nickname;
        this.email = email;
        this.loginMethod = loginMethod;
        this.totalScore = 0L; // 빌더 생성 시 기본값 0으로 초기화
    }*/
    /**
     * User 객체를 빌더 패턴을 사용하여 생성하는 생성자.
     * 사용자 정보를 초기화하며 입력값이 null인 경우 기본값을 설정합니다.
     * 객체를 생성할 때, 기본값이 설정된 항목을 패턴에 기재하지 않으면 자동으로 기본값이 설정됩니다.
     *
     * @param nickname 사용자의 닉네임
     * @param profileImageUrl 사용자의 프로필 이미지 URL
     * @param provider 사용자가 가입한 OAuth 제공자 (예: Google, Facebook 등)
     * @param providerId OAuth 제공자에서 부여한 사용자 ID
     * @param requiredAgree 필수 약관 동의 여부 (기본값: false)
     * @param optionalAgree 선택 약관 동의 여부 (기본값: false)
     *
     * @author 송민재
     * @since 2025-10-14
     */
    @Builder
    public User(
            String nickname
            , String profileImageUrl
            , LoginMethod provider
            , String providerId
            , String email
//            , Boolean agree
            , Boolean requiredAgree
            , Boolean optionalAgree
    ) {
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.provider = provider; // LoginMethod가 할당됨
        this.providerId = providerId;
        this.email = email;

        // 값이 null일 경우 기본값으로 대체
//        this.agree = agree != null ? agree : false;
        this.requiredAgree = requiredAgree != null ? requiredAgree : false;
        this.optionalAgree = optionalAgree != null ? optionalAgree : false;
        this.totalScore = 0L; // 빌더에서 totalScore 초기화
    }

    /**
     * 사용자의 누적 점수를 업데이트하는 편의 메서드입니다.
     * @param score 게임 라운드에서 획득한 점수
     */
    public void updateTotalScore(int score) {
        this.totalScore += score;
    }

    /**
     * 사용자 프로필 정보를 업데이트합니다.
     * - 닉네임: null이 아닌 경우에만 변경됩니다.
     * - 프로필 이미지 URL: 전달된 값으로 그대로 설정됩니다(Null 허용).
     *
     * @param nickname          변경할 닉네임(Null이면 기존 값 유지)
     * @param profileImageUrl   변경할 프로필 이미지 URL(Null 가능)
     *
     * @author 송민재
     * @since 2025-10-14
     */
    public void updateProfile(String nickname, String profileImageUrl) {
        if (nickname != null) {
            this.nickname = nickname;
        }
        this.profileImageUrl = profileImageUrl;
    }

    /**
     * 사용자의 필수 동의 상태 업데이트 편의 메서드
     * @author 송민재
     * @since 2025-10-14
     */
    public void updateRequiredAgreement() {
        this.requiredAgree = true;
    }

    /**
     * 사용자 프로필을 요청 DTO 기반으로 업데이트합니다.
     * - 닉네임: 요청 DTO가 @NotBlank로 보장하므로 그대로 적용
     * - 선택 동의: null이면 기존 값 유지
     */
    public void updateProfile(app.signbell.backend.dto.request.UserProfileUpdateRequest request) {
        this.nickname = request.getNickname();
        if (request.getOptionalAgree() != null) {
            this.optionalAgree = request.getOptionalAgree();
        }
    }

}