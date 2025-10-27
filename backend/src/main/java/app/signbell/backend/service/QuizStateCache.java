package app.signbell.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * QuizStateCache 클래스는 퀴즈 게임의 각 방에 대한 상태를 관리하는 캐시 기능을 제공합니다.
 * 각 게임 방의 상태는 GameRoomState 객체로 유지되며, 이를 통해 참가자, 점수, 퀴즈 단어 및 순서 관리 등을 수행합니다.
 * @author 고동현
 * @since 2025-10-17
 */
@Slf4j
@Component
public class QuizStateCache {

    private final Map<Long, GameRoomState> roomStates = new ConcurrentHashMap<>();

    public GameRoomState getOrCreateRoomState(Long roomId) {
        return roomStates.computeIfAbsent(roomId, k -> new GameRoomState());
    }

    public void clearRoomState(Long roomId) {
        roomStates.remove(roomId);
        log.info("게임방 캐시 정리 완료 - roomId: {}", roomId);
    }

    public static class GameRoomState {
        private final Map<Integer, Long> quizWordIds = new ConcurrentHashMap<>();
        private final Map<Integer, Queue<Long>> challengerQueues = new ConcurrentHashMap<>();
        private final Map<Integer, Long> currentChallengers = new ConcurrentHashMap<>();
        private final Map<Integer, Map<Long, Integer>> challengerOrders = new ConcurrentHashMap<>();
        private final Map<Long, Integer> userScores = new ConcurrentHashMap<>();
        private Integer currentQuestionNumber;

        // 퀴즈 단어 ID 저장
        public void setQuizWordId(Integer questionNumber, Long quizWordId) {
            quizWordIds.put(questionNumber, quizWordId);
        }

        // 퀴즈 단어 ID 조회
        public Long getQuizWordId(Integer questionNumber) {
            return quizWordIds.get(questionNumber);
        }

        // 도전자 추가 (최대 4명)
        public boolean addChallenger(Integer questionNumber, Long userId) {
            Queue<Long> queue = challengerQueues.computeIfAbsent(
                    questionNumber,
                    k -> new LinkedList<>()
            );

            if (queue.size() >= 4) {
                return false;
            }

            if (queue.contains(userId)) {
                return false;
            }

            queue.offer(userId);

            // 순서 저장
            Map<Long, Integer> orders = challengerOrders.computeIfAbsent(
                    questionNumber,
                    k -> new ConcurrentHashMap<>()
            );
            orders.put(userId, queue.size());

            return true;
        }

        // 현재 도전자 설정
        public void setCurrentChallenger(Integer questionNumber, Long userId) {
            currentChallengers.put(questionNumber, userId);
        }

        // 현재 도전자 조회
        public Long getCurrentChallenger(Integer questionNumber) {
            return currentChallengers.get(questionNumber);
        }

        // 다음 도전자 조회 및 설정
        public Long getNextChallenger(Integer questionNumber) {
            Queue<Long> queue = challengerQueues.get(questionNumber);
            if (queue == null || queue.isEmpty()) {
                return null;
            }

            // 현재 도전자 제거
            queue.poll();

            // 다음 도전자 조회
            Long nextChallenger = queue.peek();
            if (nextChallenger != null) {
                currentChallengers.put(questionNumber, nextChallenger);
            }

            return nextChallenger;
        }

        // 도전자 순서 조회
        public Integer getChallengerOrder(Integer questionNumber, Long userId) {
            Map<Long, Integer> orders = challengerOrders.get(questionNumber);
            if (orders == null) {
                return null;
            }
            return orders.get(userId);
        }

        // 사용자 점수 저장
        public void setUserScore(Long userId, Integer score) {
            userScores.put(userId, score);
        }

        // 사용자 점수 조회
        public Integer getUserScore(Long userId) {
            return userScores.get(userId);
        }

        // 모든 사용자 점수 조회
        public Map<Long, Integer> getAllUserScores() {
            return new HashMap<>(userScores);
        }

        // 사용자 점수 제거 (게임 중 퇴장 시)
        public void removeUserScore(Long userId) {
            userScores.remove(userId);
        }

        // 도전자 제거 (게임 중 퇴장 시)
        public void removeChallenger(Integer questionNumber, Long userId) {
            // 큐에서 제거
            Queue<Long> queue = challengerQueues.get(questionNumber);
            if (queue != null) {
                queue.remove(userId);
            }

            // 순서 맵에서 제거
            Map<Long, Integer> orders = challengerOrders.get(questionNumber);
            if (orders != null) {
                orders.remove(userId);
            }

            // 현재 도전자였다면 제거
            Long currentChallenger = currentChallengers.get(questionNumber);
            if (userId.equals(currentChallenger)) {
                currentChallengers.remove(questionNumber);
            }
        }

        // 도전자 수 조회 (타임아웃 처리용)
        public Integer getChallengerCount(Integer questionNumber) {
            Queue<Long> queue = challengerQueues.get(questionNumber);
            return queue != null ? queue.size() : 0;
        }

        // 첫 번째 도전자 조회 (타임아웃 후 첫 도전자 설정용)
        public Long getFirstChallenger(Integer questionNumber) {
            Queue<Long> queue = challengerQueues.get(questionNumber);
            return queue != null ? queue.peek() : null;
        }

        // 현재 문제 번호 조회
        public Integer getCurrentQuestionNumber() {
            return currentQuestionNumber;
        }

        // 현재 문제 번호 설정
        public void setCurrentQuestionNumber(Integer questionNumber) {
            this.currentQuestionNumber = questionNumber;
        }
    }
}