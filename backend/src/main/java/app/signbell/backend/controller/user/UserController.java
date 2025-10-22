package app.signbell.backend.controller.user;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.userData.UserInfoResponse;
import app.signbell.backend.dto.response.userData.UserResponse;
import app.signbell.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사용자 관련 API 요청을 처리하는 컨트롤러 클래스입니다.
 *
 * 이 클래스는 사용자 정보 조회 및 약관 동의 상태 업데이트와 같은 기능을 제공합니다.
 * 사용자 인증 정보를 기반으로 내부 비즈니스 로직과 통신하여 적절한 응답을 반환합니다.
 *
 * 사용되는 주요 엔드포인트는 다음과 같습니다:
 * - GET /api/users/me: 현재 인증된 사용자의 정보 조회
 * - PUT /api/users/me/agreement: 현재 인증된 사용자의 약관 동의 상태 업데이트
 *
 * 주의:
 * 각 메서드는 `@AuthenticationPrincipal` 어노테이션을 사용하여 인증된 사용자의 정보를
 * 메서드에 주입받아 처리합니다.
 *
 * @author 송민재
 * @since 2025-10-20
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal String subject) {
        log.info("GET /api/users/me called with subject: {}", subject);
        try {
            // subject는 OAuth2 nameAttributeKey(google: sub, kakao: id) → providerId로 사용 중
            UserInfoResponse dto = userService.findMeById(Long.valueOf(subject));
            log.info("User found: {}", dto);

            ApiResponse<UserInfoResponse> apiResponse = ApiResponse.success("사용자의 정보가 성공적으로 조회되었습니다.", dto);

            return ResponseEntity.ok(apiResponse);
        } catch (NumberFormatException e) {
            log.error("Invalid subject format: {}", subject, e);
            return ResponseEntity.badRequest().body(ApiResponse.<UserInfoResponse>builder()
                    .success(false)
                    .message("잘못된 사용자 ID 형식입니다.")
                    .build());
        } catch (Exception e) {
            log.error("Error in /api/users/me", e);
            return ResponseEntity.internalServerError().body(ApiResponse.<UserInfoResponse>builder()
                    .success(false)
                    .message("사용자 정보 조회 중 오류가 발생했습니다.")
                    .build());
        }
    }

    /*@PutMapping("/me/agreement")
    public ResponseEntity<?> updateAgreement(@AuthenticationPrincipal String subject) {
        // 사용자의 동의 상태를 업데이트
        UserResponse dto = userService.updateUserAgreement(subject);

        ApiResponse<UserResponse> apiResponse = ApiResponse.success("사용자의 약관 동의 여부가 성공적으로 수정되었습니다.", dto);

        return ResponseEntity.ok(apiResponse);
    }*/
}
