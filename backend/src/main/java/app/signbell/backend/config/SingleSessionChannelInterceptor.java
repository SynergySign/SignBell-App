package app.signbell.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * SingleSessionChannelInterceptor는 사용자당 동시에 하나의 활성 WebSocket 세션만 허용하는
 * "단일 탭 강제" 정책을 적용하는 인바운드 채널 인터셉터입니다.
 *
 * 동작 개요:
 * - CONNECT: 인증 여부를 확인하고, 동일 사용자에 대한 다른 활성 세션이 있으면 차단합니다.
 *            문제가 없으면 (userId, sessionId)를 활성 매핑으로 바인딩합니다.
 * - SUBSCRIBE: 현재 프레임이 활성 세션에서 온 것인지 확인합니다. 활성 세션이 아니면 차단합니다.
 * - DISCONNECT: 여기서는 단순 로깅만 수행하고, 실질적인 언바인드는 이벤트 리스너에서 처리합니다.
 *
 * 설계 배경:
 * - 브라우저 탭/새 창/리프레시 등 다양한 케이스에서 중복 세션이 생길 수 있습니다.
 *   (ex. 오래된 탭이 살아있다가 네트워크가 복구되며 뒤늦게 DISCONNECT 전송)
 * - 따라서 바인딩/검증은 인터셉터에서, 정리는 리스너(finally)에서 수행하여 스테일 매핑을 최소화합니다.
 *
 * @author 강관주
 * @since 2025-10-16
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SingleSessionChannelInterceptor implements ChannelInterceptor {

    private final UserSessionRegistry userSessionRegistry;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        // 메시지에서 STOMP 헤더 접근자 추출 (없으면 그대로 통과)
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        // STOMP 커맨드가 명확하지 않은 메시지는 정책 적용 대상이 아님
        StompCommand command = accessor.getCommand();
        if (command == null) return message;

        try {
            // STOMP 프레임 종류에 따라 단일 세션 정책을 적용합니다.
            switch (command) {
                case CONNECT -> handleConnect(accessor);
                case SUBSCRIBE -> handleSubscribe(accessor);
                case DISCONNECT -> handleDisconnect(accessor);
                default -> {}
            }
        } catch (MessagingException e) {
            // 정책 위반 등으로 차단된 경우 경고 로그 출력
            log.warn("STOMP 차단됨: {} - {}", command, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.warn("STOMP 인터셉터 처리 중 오류 발생: {}", command, e);
            throw new MessagingException("STOMP 인터셉터 처리 오류");
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        // CONNECT 단계: 인증 여부 확인 및 사용자-세션 매핑 바인딩
        // 주의: 인증 정보가 없다면 이후 단계에서 사용자 식별이 불가하므로 즉시 차단합니다.
        if (accessor.getUser() == null || accessor.getUser().getName() == null) {
            throw new MessagingException("인증되지 않은 CONNECT 요청");
        }
        Long userId = Long.valueOf(accessor.getUser().getName());
        String sessionId = accessor.getSessionId();

        // 동일 사용자에 대해 이미 다른 활성 세션이 존재하면 중복 접속으로 간주하고 차단합니다.
        if (userSessionRegistry.hasOtherActiveSession(userId, sessionId)) {
            // 동일 사용자에 대해 다른 활성 세션이 존재하면 차단
            throw new MessagingException("DUPLICATE_SESSION: 동일 사용자에 대한 다른 활성 세션이 존재합니다");
        }
        // 현재 세션을 해당 사용자의 활성 세션으로 등록
        userSessionRegistry.bind(userId, sessionId);
        log.info("CONNECT 허용 - userId: {}, sessionId: {}", userId, sessionId);
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        // SUBSCRIBE 단계: 활성 세션에서만 구독 허용
        // 예: 오래된 탭에서 온 SUBSCRIBE는 활성 세션이 아니므로 차단됩니다.
        if (accessor.getUser() == null || accessor.getUser().getName() == null) {
            throw new MessagingException("인증되지 않은 SUBSCRIBE 요청");
        }
        Long userId = Long.valueOf(accessor.getUser().getName());
        String sessionId = accessor.getSessionId();

        // 현재 매핑된 활성 세션인지 확인. 활성 세션이 아니면 비정상 구독으로 간주.
        if (!userSessionRegistry.isActive(userId, sessionId)) {
            throw new MessagingException("비활성 세션에서의 SUBSCRIBE 요청");
        }
    }

    private void handleDisconnect(StompHeaderAccessor accessor) {
        // DISCONNECT 단계: 리스너에서 활성 세션 여부를 재검증하여 처리하므로 여기서는 로그만 남깁니다.
        // (이유) 여기서 바로 언바인드하면 예외/경합 상황에서 스테일 매핑이 남거나 중복 정리될 수 있습니다.
        if (accessor.getUser() == null || accessor.getUser().getName() == null) return;
        Long userId = Long.valueOf(accessor.getUser().getName());
        String sessionId = accessor.getSessionId();
        // 여기서는 언바인드하지 않습니다. 활성 세션 확인은 이벤트 리스너에서 수행합니다.
        log.info("DISCONNECT 수신 - userId: {}, sessionId: {}", userId, sessionId);
    }
}
