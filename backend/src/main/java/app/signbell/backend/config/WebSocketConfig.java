package app.signbell.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocketConfig 클래스는 Spring에서 WebSocket 메시지 브로커를 설정하기 위한 구성 클래스입니다.
 * <p>
 * 주요 기능:
 * - STOMP 엔드포인트를 정의하여 클라이언트가 WebSocket 연결을 시작할 수 있도록 설정합니다.
 * - 메시지 브로커를 구성하여 클라이언트 간의 메시지 송수신 규칙을 정의합니다.
 * - 쿠키 기반 인증 핸드셰이크 인터셉터를 적용하여 WebSocket 연결 시 사용자 인증을 처리합니다.
 * - 단일 세션 인터셉터를 통해 동일 사용자의 중복 접속을 제어합니다.
 * <p>
 * 주요 설정:
 * - STOMP 엔드포인트: `/ws` 설정
 * - 메시지 브로커:
 * - 발행 주소: `/app`
 * - 브로드캐스트 경로: `/topic`, `/queue`
 * - 사용자 메시지 경로: `/user`
 *
 * @author 고동현
 * @since 2025-10-14
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // [추가] application.yml에서 오리진 URL 주입
    @Value("${app.frontend-origin-url}")
    private String frontendOrigin;
    @Value("${app.backend-origin-url}")
    private String backendOrigin;

    private final CookieAuthHandshakeInterceptor cookieAuthHandshakeInterceptor;
    private final SingleSessionChannelInterceptor singleSessionChannelInterceptor;

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // 클라이언트가 웹소켓 연결을 시작할 엔드포인트(/ws)를 설정합니다.
        // CORS 문제를 해결하기 위해 허용할 오리진을 명시합니다.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        frontendOrigin,
                        backendOrigin
                )
                .addInterceptors(cookieAuthHandshakeInterceptor); // 인증 인터셉터 추가
    }

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        // 메시지 브로커가 /topic 또는 /queue 로 시작하는 주소를 구독하는 클라이언트에게 메시지를 전달하도록 설정합니다.
        registry.enableSimpleBroker("/topic", "/queue");
        // 클라이언트가 서버로 메시지를 보낼 때 사용할 주소의 접두사를 /app 으로 설정합니다.
        registry.setApplicationDestinationPrefixes("/app");
        // 특정 사용자에게 메시지를 보낼 때 사용할 주소의 접두사를 /user 로 설정합니다.
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        // 단일 세션 인터셉터를 등록하여 동일한 사용자가 중복 접속하는 것을 방지합니다.
        registration.interceptors(singleSessionChannelInterceptor);
    }
}