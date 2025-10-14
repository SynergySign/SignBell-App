package app.signbell.backend.controller.socket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@Slf4j
public class WebSocketEchoController {

    /**
     * 클라이언트로부터 메시지를 받아 /topic/echo 주제를 구독하는 모든 클라이언트에게 전송합니다.
     *
     * @param message 클라이언트가 보낸 메시지 페이로드
     * @return 받은 메시지를 그대로 반환
     */
    @MessageMapping("/echo") // 클라이언트가 메시지를 보낼 목적지: /app/echo
    @SendTo("/topic/echo")   // 서버가 메시지를 보낼 목적지
    public String echo(String message) {
        log.info("Received message to echo: {}", message);
        return message;
    }
}