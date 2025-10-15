package app.signbell.backend.controller.myPage;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.request.UserProfileUpdateRequest;
import app.signbell.backend.dto.response.UserProfileResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 마이페이지 사용자 프로필 조회/수정 컨트롤러.
 *
 * 엔드포인트
 * - GET /api/my-page/users/{userId}/profile: 프로필 조회
 * - PUT /api/my-page/users/{userId}/profile: 프로필 수정(닉네임, 선택 동의)
 *
 * 인증/인가
 * - `@AuthenticationPrincipal`로 전달되는 subject(문자열)를 Long으로 파싱하여 사용자 ID를 구합니다.
 * - 서비스는 인가 검증 없이 주어진 userId로만 처리하며, 컨트롤러에서 일치 여부를 검증합니다.
 *
 * 응답
 * - 공통 응답 포맷 `ApiResponse<T>`를 사용합니다.
 *
 * 작성자: 송민재
 * 작성일: 2025-10-15
 */
@RestController
@RequestMapping("/api/my-page/users")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserProfileService userProfileService;

    /**
     * 사용자 프로필을 조회합니다.
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(
            @PathVariable("userId") Long userId,
            @AuthenticationPrincipal String subject
    ) {
        try {
            Long currentUserId = Long.valueOf(subject);
            if (!userId.equals(currentUserId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN);
            }
            UserProfileResponse response = userProfileService.getUserProfile(userId);
            return ResponseEntity.ok(ApiResponse.success("프로필 조회 성공", response));
        } catch (NumberFormatException e) {
            log.error("인증된 사용자 ID(subject)를 Long으로 변환 실패: {}", subject, e);
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }

    /**
     * 사용자 프로필을 수정합니다.
     */
    @PatchMapping("/{userId}/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @PathVariable("userId") Long userId,
            @Valid @RequestBody UserProfileUpdateRequest request,
            @AuthenticationPrincipal String subject
    ) {
        try {
            Long currentUserId = Long.valueOf(subject);
            if (!userId.equals(currentUserId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN);
            }
            UserProfileResponse response = userProfileService.updateUserProfile(userId, request);
            return ResponseEntity.ok(ApiResponse.success("프로필 수정 성공", response));
        } catch (NumberFormatException e) {
            log.error("인증된 사용자 ID(subject)를 Long으로 변환 실패: {}", subject, e);
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }
}


