package app.signbell.backend.service;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 퀴즈 타이머 관리 컴포넌트
 * 
 * 퀴즈 게임의 타이머 생명주기를 관리합니다.
 * - 타이머 스케줄링
 * - 타이머 취소
 * - 타이머 정리
 * 
 * @author 강관주 (Kanggwanju)
 * @since 2025-10-27
 */
@Component
@Slf4j
public class QuizTimerManager {
    
    /**
     * 타이머 스케줄링을 위한 스레드 풀
     * 
     * 크기: 100
     * - 각 방당 동시 실행 타이머: 최대 2개 (PREPARE + SIGNING)
     * - 예상 동시 진행 방: 최대 50개
     * - 필요한 스레드: 50방 × 2타이머 = 100개
     */
    private final ScheduledExecutorService scheduler = 
        Executors.newScheduledThreadPool(100, new ThreadFactory() {
            private final AtomicInteger threadNumber = new AtomicInteger(1);
            
            @Override
            public Thread newThread(Runnable r) {
                Thread thread = new Thread(r, "quiz-timer-" + threadNumber.getAndIncrement());
                thread.setDaemon(true);
                return thread;
            }
        });
    
    /**
     * 활성 타이머 맵
     * 
     * Key: "roomId:questionNumber:timerType" (예: "123:1:PREPARE")
     * Value: 스케줄링된 작업 리스트
     */
    private final Map<String, List<ScheduledFuture<?>>> activeTimers = 
        new ConcurrentHashMap<>();
    
    /**
     * 타이머 스케줄링
     * 
     * 지정된 작업 리스트를 초 단위로 스케줄링합니다.
     * 기존에 동일한 키로 스케줄링된 타이머가 있으면 자동으로 취소합니다.
     * 
     * @param roomId 방 ID
     * @param questionNumber 문제 번호
     * @param timerType 타이머 타입 (PREPARE, SIGNING)
     * @param tasks 실행할 작업 리스트 (초별)
     */
    public void scheduleTimer(
        Long roomId, 
        Integer questionNumber, 
        String timerType,
        List<Runnable> tasks
    ) {
        String key = buildKey(roomId, questionNumber, timerType);
        
        // 기존 타이머가 있으면 자동 취소
        cancelTimer(roomId, questionNumber, timerType);
        
        List<ScheduledFuture<?>> futures = new CopyOnWriteArrayList<>();
        
        // 각 작업을 초 단위로 스케줄링
        for (int i = 0; i < tasks.size(); i++) {
            ScheduledFuture<?> future = scheduler.schedule(
                tasks.get(i),
                i,
                TimeUnit.SECONDS
            );
            futures.add(future);
        }
        
        // 활성 타이머 맵에 저장
        activeTimers.put(key, futures);
        
        log.info("타이머 스케줄링 완료 - key: {}, tasks: {}", key, tasks.size());
    }
    
    /**
     * 특정 타이머 취소
     * 
     * 지정된 타이머의 모든 스케줄링된 작업을 취소합니다.
     * 이미 완료되었거나 취소된 작업은 건너뜁니다.
     * 
     * @param roomId 방 ID
     * @param questionNumber 문제 번호
     * @param timerType 타이머 타입 (PREPARE, SIGNING)
     */
    public void cancelTimer(Long roomId, Integer questionNumber, String timerType) {
        try {
            String key = buildKey(roomId, questionNumber, timerType);
            List<ScheduledFuture<?>> futures = activeTimers.remove(key);
            
            if (futures != null) {
                int cancelledCount = 0;
                int failedCount = 0;
                int alreadyDoneCount = 0;
                
                // 개별 ScheduledFuture 취소
                for (ScheduledFuture<?> future : futures) {
                    try {
                        if (future.isDone()) {
                            alreadyDoneCount++;
                        } else if (future.isCancelled()) {
                            // 이미 취소됨
                            alreadyDoneCount++;
                        } else {
                            // 취소 시도
                            boolean cancelled = future.cancel(false);
                            if (cancelled) {
                                cancelledCount++;
                            } else {
                                failedCount++;
                            }
                        }
                    } catch (Exception e) {
                        failedCount++;
                        log.warn("개별 타이머 취소 실패 - key: {}", key, e);
                    }
                }
                
                log.info("타이머 취소 완료 - key: {}, 성공: {}, 실패: {}, 이미완료: {}, 전체: {}", 
                    key, cancelledCount, failedCount, alreadyDoneCount, futures.size());
            } else {
                log.debug("취소할 타이머 없음 - key: {}", key);
            }
        } catch (Exception e) {
            log.error("타이머 취소 중 예외 발생 - roomId: {}, question: {}, type: {}", 
                roomId, questionNumber, timerType, e);
        }
    }
    
    /**
     * 특정 문제의 모든 타이머 취소
     * 
     * 지정된 문제 번호의 PREPARE 및 SIGNING 타이머를 모두 취소합니다.
     * 도전자 퇴장 시 또는 다음 문제로 이동 시 사용됩니다.
     * 
     * @param roomId 방 ID
     * @param questionNumber 문제 번호
     */
    public void cancelAllTimersForQuestion(Long roomId, Integer questionNumber) {
        log.info("문제의 모든 타이머 취소 시작 - roomId: {}, question: {}", roomId, questionNumber);
        
        // PREPARE 타이머 취소
        cancelTimer(roomId, questionNumber, "PREPARE");
        
        // SIGNING 타이머 취소
        cancelTimer(roomId, questionNumber, "SIGNING");
        
        log.info("문제의 모든 타이머 취소 완료 - roomId: {}, question: {}", roomId, questionNumber);
    }
    
    /**
     * 타이머 키 생성
     * 
     * @param roomId 방 ID
     * @param questionNumber 문제 번호
     * @param timerType 타이머 타입 (PREPARE, SIGNING)
     * @return 타이머 키 (형식: "roomId:questionNumber:timerType")
     */
    private String buildKey(Long roomId, Integer questionNumber, String timerType) {
        return String.format("%d:%d:%s", roomId, questionNumber, timerType);
    }
    
    /**
     * 애플리케이션 종료 시 스레드 풀 정리
     */
    @PreDestroy
    public void shutdown() {
        log.info("QuizTimerManager 종료 중...");
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("QuizTimerManager 종료 완료");
    }
}
