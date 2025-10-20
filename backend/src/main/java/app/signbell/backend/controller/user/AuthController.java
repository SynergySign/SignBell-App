package app.signbell.backend.controller.user;


import app.signbell.backend.util.CookieUtil;
import app.signbell.backend.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 인증 관련 엔드포인트 컨트롤러.
 *
 * - /api/auth/refresh: 쿠키의 Refresh Token을 검증하고 새 Access Token 쿠키를 내려줍니다.
 * - 이 컨트롤러는 HTTP-Only 쿠키 기반 재발급만 담당하며, 바디/헤더로 토큰을 주고받지 않습니다.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;
    private final CookieUtil cookieUtil;

    /**
     * Refresh Token을 사용해 Access Token을 재발급합니다.
     *
     * 요청의 Refresh Token을 확인하고, 유효한 경우 새로운 Access Token을 생성한 뒤
     * 응답에 쿠키로 추가합니다. Refresh Token이 없거나 유효하지 않을 경우
     * 401 Unauthorized 상태를 반환합니다.
     *
     * @param request  클라이언트 요청 객체로, Refresh Token이 포함된 쿠키를 읽습니다.
     * @param response 서버 응답 객체로, 새로운 Access Token이 포함된 쿠키를 설정합니다.
     * @return 성공 시 204 No Content, 실패 시 401 Unauthorized 상태를 포함한 응답을 반환합니다.
     *
     * @author 송민재
     * @since 2025-10-14
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshAccessToken(HttpServletRequest request, HttpServletResponse response) {
        log.debug("[AuthController] /api/auth/refresh called, remoteAddr={}", request.getRemoteAddr());
        String refreshToken = cookieUtil.readRefreshToken(request); // 쿠키에서 Refresh Token 조회
        if (refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) { // 유효성 체크 실패
            log.warn("[AuthController] Refresh token missing or invalid");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); // 401 반환
        }

        Claims claims = jwtTokenProvider.getClaims(refreshToken); // Refresh Token의 클레임 파싱
        String subject = claims.getSubject(); // 사용자 식별자(subject)

        String newAccessToken = jwtTokenProvider.createAccessToken(subject, Map.of()); // 새 Access Token 생성
        cookieUtil.addAccessTokenCookie(response, newAccessToken); // Access Token 쿠키로 설정
        log.info("[AuthController] Access token reissued for subject={}", subject);
        return ResponseEntity.noContent().build(); // 204 No Content 반환
    }

    /**
     * 로그아웃: Access/Refresh 쿠키를 삭제합니다.
     *
     * @param response 서버 응답 객체로, 삭제된 쿠키 정보를 클라이언트에 전달합니다.
     * @return 204 No Content 상태를 포함한 응답을 반환합니다.
     *
     * @author 송민재
     * @since 2025-10-14
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        cookieUtil.deleteAccessTokenCookie(response);
        cookieUtil.deleteRefreshTokenCookie(response);
        log.info("[AuthController] Logged out: cleared auth cookies");
        return ResponseEntity.noContent().build();
    }
}