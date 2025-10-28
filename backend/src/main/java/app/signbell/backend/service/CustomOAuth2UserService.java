package app.signbell.backend.service;

import app.signbell.backend.entity.LoginMethod;
import app.signbell.backend.entity.User;
import app.signbell.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

/**
 * OAuth2 사용자 정보를 로드하고 우리 도메인 사용자로 동기화하는 서비스.
 *
 * 동작 개요
 * 1) 공급자(registrationId)에 따라 응답 스키마를 구분
 * 2) 사용자 식별자(providerId), 이메일/닉네임/프로필 이미지를 추출
 * 3) 기존 사용자면 프로필을 업데이트, 없으면 신규로 저장
 * 4) ROLE_USER 권한의 DefaultOAuth2User를 반환 (name은 우리 플랫폼의 User ID)
 *
 * 주의
 * - 카카오는 응답 구조가 중첩되어 있어 안전 캐스팅과 널 처리(safeStr, coalesce)를 사용합니다.
 * - 반환되는 OAuth2User의 getName()은 우리 플랫폼의 User ID를 반환합니다.
 *
 * 테스트 URL
 * - http://localhost:9000/oauth2/authorization/kakao
 *
 * @author 송민재
 * @since 2025-10-14
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    /**
     * 공급자에서 사용자 정보를 조회하고, 우리 DB와 동기화한 뒤 OAuth2User를 반환합니다.
     *
     * 절차
     * - super.loadUser(...)로 공급자 사용자 정보 조회
     * - registrationId(google|kakao)로 공급자를 식별
     * - 공급자별 스키마에 맞게 주요 필드 추출 (providerId, nickname, profileImageUrl)
     * - 기존 사용자 → 프로필 업데이트, 신규 사용자 → 저장
     * - nameAttributeKey를 공급자별로 맞춰 DefaultOAuth2User 구성
     * - getName()은 우리 플랫폼의 User ID를 반환하도록 오버라이드
     */
    /*@Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // registrationId는 yml 파일의 registration 뒤에 나오는 값
        // 예시) client.registration.kakao -> kakao, client.registration.google -> google
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        // registrationId가 카카오가 아닌경우 -> 이상한 provider 감지, error throw
        if (!"kakao".equalsIgnoreCase(registrationId)) {
            throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
        }

//        String provider = registrationId;
        // String 대신 LoginMethod ENUM을 사용
        LoginMethod loginProvider = LoginMethod.valueOf(registrationId.toUpperCase()); // "kakao" -> KAKAO

        // 사용자 정보를 JSON으로 받지 않아도
        // Spring Security가 대신 받아와서 편하게 사용할 수 있도록 Map 형태로 제공해주는 사용자 정보 묶음
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String providerId;
        String nickname;
        String profileImageUrl;
        String email;

        // 위에서 provider 검사 이미 완료.
        // Kakao 응답 스키마: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#req-user-info
        providerId = String.valueOf(attributes.get("id"));
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.getOrDefault("kakao_account", Collections.emptyMap());

        // 이메일 추출 로직 추가
        email = safeStr(kakaoAccount.get("email"));
        if (email == null) {
            // 이메일 미동의 시 임시 이메일 부여 또는 예외 처리 로직 추가 필요
            email = providerId + "@" + registrationId + ".com"; // 임시 처리 예시
        }

        // 닉네임이 없을 경우, 기본값 할당 로직 추가
        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.getOrDefault("profile", Collections.emptyMap());
        String tempNickname = safeStr(profile.get("nickname"));

        // 닉네임이 없으면 'user_' + providerId 와 같은 임시 닉네임 부여
        if (tempNickname == null || tempNickname.isBlank()) {
            nickname = "user_" + providerId;
        } else {
            nickname = tempNickname;
        }

        profileImageUrl = safeStr(profile.get("profile_image_url"));

        // 유저가 이미 있음 -> 프로필 업데이트, 없음 -> 새로 생성
        // findByProviderAndProviderId의 첫 인자가 LoginMethod로 변경
        Optional<User> existing = userRepository.findByProviderAndProviderId(loginProvider, providerId);
        User user = existing.map(u -> {
            u.updateProfile(nickname, profileImageUrl);
            return u;
        }).orElseGet(() -> User.builder()
                .nickname(nickname)
                .profileImageUrl(profileImageUrl)
//                .provider(provider)
                // LoginMethod ENUM을 User 엔티티의 provider 필드에 저장
                .provider(loginProvider)
                .providerId(providerId)
                // agree는 빌더에서 기본값 false로 자동 처리
                .build());

        // ✅ 중요: save() 호출 후 생성된 ID를 가져옴
        User savedUser = userRepository.save(user);
        Long internalUserId = savedUser.getId(); // 우리 플랫폼의 자동 생성된 User ID

        // ✅ DefaultOAuth2User를 반환하되, getName()을 우리 플랫폼의 userId로 오버라이드
        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                attributes,
                resolveNameAttributeKey(registrationId)
        ) {
            @Override
            public String getName() {
                // 우리 플랫폼의 User ID를 반환 (JWT subject로 사용됨)
                return String.valueOf(internalUserId);
            }
        };
    }*/

    /**
     * OAuth2UserRequest를 받아 사용자 정보를 로드하고,
     * 우리 시스템의 User 엔티티로 변환 또는 업데이트합니다.
     *
     * @param userRequest OAuth2 사용자 정보를 포함하는 요청 객체
     * @return 우리 시스템에서 인증 주체로 사용될 OAuth2User 객체 (getName()은 우리 시스템의 User ID를 반환)
     * @throws OAuth2AuthenticationException 인증 과정에서 문제가 발생할 경우
     */
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 부모의 loadUser 호출: 외부 API에서 사용자 정보(attributes)를 가져옴
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        // 우리 시스템의 User 엔티티 동기화 및 인증 주체 반환
        return processOAuth2User(registrationId, oAuth2User.getAttributes());
    }

    // 1. attributes를 파싱하여 우리 시스템에 필요한 User 정보(로그인 제공자, ID, 이메일, 닉네임, 이미지 URL)를 추출
    private Map<String, Object> extractOAuth2Attributes(String registrationId, Map<String, Object> attributes) {
        String providerId;
        String email = null;
        String nickname;
        String profileImage = null;

        if ("kakao".equalsIgnoreCase(registrationId)) {
            // 카카오 응답 구조: 최상위 id, kakao_account(이메일, 프로필), properties(닉네임, 이미지)
            providerId = String.valueOf(attributes.get("id"));

            @SuppressWarnings("unchecked")
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            @SuppressWarnings("unchecked")
            Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");

            nickname = (String) profile.get("nickname");
            profileImage = (String) profile.get("profile_image_url");

            Boolean isEmailValid = (Boolean) kakaoAccount.get("is_email_valid");
            if (isEmailValid != null && isEmailValid) {
                email = (String) kakaoAccount.get("email");
            }

        } else {
            // 미지원 공급자 처리 (현재는 카카오만 지원)
            throw new OAuth2AuthenticationException("Unsupported registrationId: " + registrationId);
        }

        return Map.of(
                "providerId", providerId,
                "email", email != null ? email : providerId + "@" + registrationId + ".sso", // 이메일이 없는 경우 가짜 이메일 생성
                "nickname", nickname,
                "profileImage", profileImage,
                "registrationId", registrationId
        );
    }

    // 2. 공급자 및 ID 기반으로 기존 사용자 또는 신규 사용자 생성
    private OAuth2User processOAuth2User(String registrationId, Map<String, Object> attributes) {
        Map<String, Object> parsedAttributes = extractOAuth2Attributes(registrationId, attributes);

        LoginMethod loginProvider = LoginMethod.valueOf(registrationId.toUpperCase());
        String providerId = (String) parsedAttributes.get("providerId");
        String email = (String) parsedAttributes.get("email");
        String nickname = (String) parsedAttributes.get("nickname");
        String profileImage = (String) parsedAttributes.get("profileImage");

        // findByLoginMethodAndProviderId로 메서드 호출
        Optional<User> optionalUser = userRepository.findByProviderAndProviderId(loginProvider, providerId);

        User savedUser;
        if (optionalUser.isPresent()) {
            // 기존 사용자 업데이트 로직
            User existingUser = optionalUser.get();

            // 사용자가 마이페이지에서 닉네임을 변경한 경우, 카카오 정보로 덮어쓰지 않도록 보호
            String finalNickname = existingUser.getNickname();

            // 기존 닉네임이 null/빈 값일 경우 또는 기존 닉네임이 외부 제공자 닉네임과 동일할 경우에만 업데이트
            if (finalNickname == null || finalNickname.isEmpty() || finalNickname.equals(nickname)) {
                finalNickname = nickname;
            }

            existingUser.setNickname(finalNickname); // 닉네임 업데이트 로직 반영

            existingUser.setProfileImageUrl(profileImage); // 프로필 이미지는 항상 최신으로 업데이트

            savedUser = userRepository.save(existingUser); // 업데이트 후 저장
        } else {
            // 신규 사용자 생성 로직 (최초 로그인)
            User newUser = User.builder()
                    .email(email)
                    .nickname(nickname)
                    .profileImageUrl(profileImage)
                    .provider(loginProvider)
                    .providerId(providerId)
                    // agree는 빌더에서 기본값 false로 자동 처리
                    .build();

            // ✅ 중요: save() 호출 후 생성된 ID를 가져옴
            savedUser = userRepository.save(newUser);
        }

        Long internalUserId = savedUser.getId(); // 우리 플랫폼의 자동 생성된 User ID

        // ✅ DefaultOAuth2User를 반환하되, getName()을 우리 플랫폼의 userId로 오버라이드
        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                attributes,
                resolveNameAttributeKey(registrationId)
        ) {
            @Override
            public String getName() {
                // 우리 플랫폼의 User ID를 반환 (JWT subject로 사용됨)
                return String.valueOf(internalUserId);
            }
        };
    }

    /**
     * Spring Security가 principal의 name으로 사용할 attribute key를 공급자별로 반환합니다.
     * 향후 공급자 추가 확장을 고려하여 검증 로직을 유지함
     * - Google: sub (OpenID Connect 표준 subject)
     * - Kakao: id
     */
    private String resolveNameAttributeKey(String registrationId) {
        String id = registrationId == null ? "" : registrationId.toLowerCase();
        return switch (id) {
//            case "google" -> "sub";
            case "kakao" -> "id";
            default -> "id";
        };
    }

    /**
     * 객체를 null-safe하게 문자열로 변환합니다. null이면 null을 반환합니다.
     */
    private String safeStr(Object v) {
        return v == null ? null : String.valueOf(v);
    }

}