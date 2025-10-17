package app.signbell.backend.service;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class QuizStateCache {

    // 각 문제의 도전 순서를 스레드 안전하게 추적합니다.
    // Key: "gameRoomId:questionNumber" (예: "1:1", "1:2")
    // Value: 현재까지 도전한 사람의 수 (AtomicInteger를 사용해 동시 요청 처리)
    private final Map<String, AtomicInteger> challengeOrderMap = new ConcurrentHashMap<>();

    /**
     * '정답 도전'을 시도하고, 해당 문제의 도전 순서를 1 증가시킨 후 반환합니다.
     * @param gameRoomId 게임방 ID
     * @param questionNumber 문제 번호
     * @return 1-4 사이의 도전 순서. 4명을 초과하면 -1을 반환합니다.
     */
    public int getAndIncrementChallengeOrder(Long gameRoomId, int questionNumber) {
        String key = gameRoomId + ":" + questionNumber;

        // computeIfAbsent: key가 없으면 새로 AtomicInteger(0)을 생성하고, 있으면 기존 값을 사용합니다.
        // incrementAndGet: 값을 1 증가시키고 그 결과를 반환합니다.
        int order = challengeOrderMap.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();

        // 4명까지만 허용
        return order > 4 ? -1 : order;
    }

    public void clearCacheForRoom(Long gameRoomId) {
        // "gameRoomId:" 로 시작하는 모든 키를 찾아서 삭제
        challengeOrderMap.keySet().removeIf(key -> key.startsWith(gameRoomId + ":"));
    }

    // TODO: 다음 문제로 넘어가거나 게임이 종료될 때 이 Map의 데이터를 정리하는 로직이 필요합니다.
}