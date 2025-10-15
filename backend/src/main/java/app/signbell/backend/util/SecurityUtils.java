package app.signbell.backend.util;

import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 보안 관련 공통 유틸리티.
 *
 * - 현재 인증된 사용자 ID 조회 (JwtAuthenticationFilter가 subject를 userId로 세팅)
 *
 * 작성자: 송민재
 * 작성일: 2025-10-15
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    public static Long getCurrentUserIdOrThrow() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }
}


