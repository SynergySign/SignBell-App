package app.signbell.backend.config;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * UserSessionRegistry 클래스는 사용자별 활성 세션 ID를 관리하는 레지스트리 역할을 수행합니다.
 * 이 클래스는 단일 탭 강제 정책을 지원하기 위해 userId와 sessionId 간의 매핑을 유지 및 관리합니다.
 *
 * 주요 기능:
 * - 사용자별 활성 세션 ID 확인
 * - 사용자와 세션 간의 매핑 바인딩 및 해제
 * - 활성 상태 검사
 * - 동일 사용자의 다른 활성 세션 존재 여부 확인
 *
 * @author 강관주
 * @since 2025-10-16
 */
@Component
public class UserSessionRegistry {
    // 사용자별 활성 세션 ID를 저장하는 레지스트리입니다.
    // 단일 탭 강제 정책을 위해 userId ↔ sessionId 매핑을 유지합니다.
    private final Map<Long, String> userToSession = new ConcurrentHashMap<>();

    /**
     * 특정 사용자의 현재 활성 세션 ID를 조회합니다.
     */
    public String getSessionId(Long userId) {
        return userToSession.get(userId);
    }

    /**
     * 사용자의 활성 세션을 바인딩합니다. 동일 사용자에 대해 새로운 세션으로 덮어씌웁니다.
     */
    public void bind(Long userId, String sessionId) {
        userToSession.put(userId, sessionId);
    }

    /**
     * 사용자의 활성 세션 매핑을 해제합니다. 현재 등록된 세션과 일치할 때만 제거합니다.
     */
    public void unbind(Long userId, String sessionId) {
        String current = userToSession.get(userId);
        if (current != null && current.equals(sessionId)) {
            userToSession.remove(userId);
        }
    }

    /**
     * 주어진 (userId, sessionId) 조합이 활성 상태인지 여부를 반환합니다.
     */
    public boolean isActive(Long userId, String sessionId) {
        String current = userToSession.get(userId);
        return current != null && current.equals(sessionId);
    }

    /**
     * 동일 사용자에 대해 현재 세션과 다른 활성 세션이 존재하는지 확인합니다.
     */
    public boolean hasOtherActiveSession(Long userId, String sessionId) {
        String current = userToSession.get(userId);
        return current != null && !current.equals(sessionId);
    }
}
