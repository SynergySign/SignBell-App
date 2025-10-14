package app.signbell.backend.controller;

import io.micrometer.common.lang.NonNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.StringMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.web.socket.sockjs.client.SockJsClient;
import org.springframework.web.socket.sockjs.client.Transport;
import org.springframework.web.socket.sockjs.client.WebSocketTransport;

import java.lang.reflect.Type;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WebSocketEchoControllerTest {

    @LocalServerPort
    private int port;

    private WebSocketStompClient stompClient;

    private final String ENDPOINT = "/ws";

    @BeforeEach
    void setUp() {
        // SockJS 대신 표준 웹소켓 클라이언트를 직접 사용
        this.stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        this.stompClient.setMessageConverter(new StringMessageConverter());
    }

    @Test
    @DisplayName("클라이언트가 보낸 메시지를 서버가 그대로 Echo 해야 한다")
    void testEchoMessage() throws Exception {
        // given
        final String messageToSend = "Hello WebSocket!";
        final CountDownLatch latch = new CountDownLatch(1);
        final StringBuilder receivedMessage = new StringBuilder();

        String url = String.format("ws://localhost:%d%s", port, ENDPOINT);

        // when
        StompSession session = stompClient.connect(url, new StompSessionHandlerAdapter() {}).get(1, TimeUnit.SECONDS);

        session.subscribe("/topic/echo", new StompFrameHandler() {
            @Override
            @NonNull
            public Type getPayloadType(@NonNull StompHeaders headers) {
                return String.class; // 받은 메시지의 페이로드 타입
            }

            @Override
            public void handleFrame(@NonNull StompHeaders headers, Object payload) {
                receivedMessage.append(payload);
                latch.countDown(); // 메시지를 받으면 카운트다운
            }
        });

        session.send("/app/echo", messageToSend);

        // then
        // latch.await()가 true를 반환할 때까지 (메시지를 받을 때까지) 최대 3초간 기다립니다.
        boolean messageReceived = latch.await(3, TimeUnit.SECONDS);

        assertThat(messageReceived).isTrue(); // 메시지를 시간 안에 받았는지 확인
        assertThat(receivedMessage.toString()).isEqualTo(messageToSend); // 받은 메시지가 보낸 메시지와 같은지 확인
    }
}