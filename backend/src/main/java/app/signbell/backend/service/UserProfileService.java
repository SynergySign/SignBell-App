package app.signbell.backend.service;

import app.signbell.backend.dto.request.UserProfileUpdateRequest;
import app.signbell.backend.dto.response.userData.UserProfileResponse;
import app.signbell.backend.entity.User;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import app.signbell.backend.dto.request.NicknameUpdateRequest;

/**
 * 사용자 프로필 조회/수정을 담당하는 서비스.
 *
 * 동작 개요
 * 1) getUserProfile: 사용자 ID로 조회하여 프로필 응답 DTO로 변환
 * 2) updateUserProfile: 닉네임/선택 약관 동의(optionalAgree) 변경 후 변경 감지로 반영
 *
 * 예외 처리
 * - 존재하지 않는 사용자: BusinessException(ErrorCode.USER_NOT_FOUND)
 *
 * 트랜잭션 정책
 * - 조회 메서드는 readOnly 트랜잭션
 * - 수정 메서드는 기본 트랜잭션으로 변경 감지(dirty checking) 반영
 *
 * @author 송민재
 * @since 2025-10-15
 */
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;

    /**
     * 사용자 프로필을 조회합니다.
     *
     * 절차
     * - userId로 사용자를 조회
     * - 없으면 USER_NOT_FOUND 예외 발생
     * - User를 UserProfileResponse로 변환하여 반환
     *
     * @param userId 사용자 ID
     * @return 사용자 프로필 응답 DTO
     *
     * @author 송민재
     * @since 2025-10-15
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return UserProfileResponse.from(user);
    }

    /**
     * 사용자 닉네임만 업데이트합니다.
     *
     * @param userId 사용자 ID
     * @param request 닉네임 수정 요청
     * @return 수정된 사용자 프로필 응답 DTO
     *
     * @author [작성자 이름]
     * @since [작성일]
     */
    @Transactional
    public UserProfileResponse updateNickname(Long userId, NicknameUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 닉네임만 업데이트하는 메서드 호출
        user.updateNickname(request.getNickname()); // 🔑 User.java에 이 메서드를 추가할 예정

        return UserProfileResponse.from(user);
    }

    /**
     * 사용자 프로필을 수정합니다.
     *
     * 절차
     * - userId로 사용자를 조회 (없으면 USER_NOT_FOUND)
     * - 닉네임과 선택 약관 동의 상태(optionalAgree)를 업데이트
     * - JPA 변경 감지를 통해 저장소에 반영
     * - 변경된 상태를 UserProfileResponse로 변환하여 반환
     *
     * @param userId 사용자 ID
     * @param request 닉네임/선택 동의 수정 요청
     * @return 수정된 사용자 프로필 응답 DTO
     *
     * @author 송민재
     * @since 2025-10-15
     */
    @Transactional
    public UserProfileResponse updateUserProfile(Long userId, UserProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 단일 업데이트 메서드로 응집도 있게 수정
        user.updateProfile(request);

        // JPA 변경감지로 flush, 명시적 save는 선택 사항
        return UserProfileResponse.from(user);
    }

    /**
     * 약관 동의를 처리합니다.
     * - requiredAgree를 true로 설정
     * - optionalAgree는 요청값에 따라 설정
     *
     * @param userId 사용자 ID
     * @param optionalAgree 선택 약관 동의 여부
     * @return 수정된 사용자 프로필 응답 DTO
     */
    @Transactional
    public UserProfileResponse updateTermsAgreement(Long userId, Boolean optionalAgree) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 필수 약관 동의를 true로 설정
        user.updateRequiredAgreement();
        
        // 선택 약관 동의 설정 (null이면 기존 값 유지)
        user.updateOptionalAgreement(optionalAgree);

        return UserProfileResponse.from(user);
    }
}
