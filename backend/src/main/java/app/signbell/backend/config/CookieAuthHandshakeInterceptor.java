package app.signbell.backend.config;

import app.signbell.backend.util.CookieUtil;
import app.signbell.backend.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * WebSocket 연결 시 쿠키 기반 인증 핸드셰이크를 처리하는 인터셉터입니다.
 *
 * <p>WebSocket 연결 요청 시, HTTP-Only 쿠키로 전달된 Access Token을 기반으로 인증을 수행합니다.
 * 성공적으로 인증된 사용자는 WebSocket 세션 내에서 식별될 수 있도록 설정됩니다.
 *
 * <p>핵심 기능:
 * - Access Token 쿠키를 읽고 유효성을 검증합니다.
 * - 인증된 사용자 정보를 WebSocket 세션 속성에 저장합니다.
 * - 인증 실패 시에도 연결은 허용하며, 이후 메시지 처리 단계에서 권한을 제어합니다.
 *
 * <p>Spring의 {@link HandshakeInterceptor}를 구현하여 WebSocket 핸드셰이크 과정에서 동작합니다.
 *
 *
 * @author 고동현
 * @since 2025-10-14
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CookieAuthHandshakeInterceptor implements HandshakeInterceptor {

    private final CookieUtil cookieUtil;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public boolean beforeHandshake(@NonNull ServerHttpRequest request,
                                   @NonNull ServerHttpResponse response,
                                   @NonNull WebSocketHandler wsHandler,
                                   @NonNull Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            String token = cookieUtil.readAccessToken(httpRequest);

            if (token != null && jwtTokenProvider.validateToken(token)) {
                Claims claims = jwtTokenProvider.getClaims(token);
                String subject = claims.getSubject(); // User ID
                log.info("WebSocket handshake authorized for user: {}", subject);

                // 웹소켓 세션에서 사용자를 식별할 수 있도록 Principal 객체를 설정합니다.
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(subject, null, List.of());
                attributes.put("user", authentication); // StompHeaderAccessor에서 user.getName()으로 접근 가능
            }
        }
        return true; // 인증에 실패해도 연결은 허용하고, 실제 메시지 처리에서 권한을 제어합니다.
    }

    @Override
    public void afterHandshake(@NonNull ServerHttpRequest request,
                               @NonNull ServerHttpResponse response,
                               @NonNull WebSocketHandler wsHandler,
                               Exception exception) {
        // 핸드셰이크 이후 로직 (필요 시 구현)
    }
}