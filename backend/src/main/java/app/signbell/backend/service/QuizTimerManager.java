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
        
        log.info("타이머 시작 - roomId: {}, question: {}, type: {}, duration: {}초", 
            roomId, questionNumber, timerType, tasks.size() - 1);
        log.debug("타이머 상태 - key: {}, 스케줄링할 작업 수: {}, 현재 활성 타이머 수: {}", 
            key, tasks.size(), activeTimers.size());
        
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
        
        log.info("타이머 스케줄링 완료 - roomId: {}, question: {}, type: {}, tasks: {}", 
            roomId, questionNumber, timerType, tasks.size());
        log.debug("타이머 상태 - 스케줄링 후 활성 타이머 수: {}", activeTimers.size());
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
            
            log.info("타이머 취소 시작 - roomId: {}, question: {}, type: {}", 
                roomId, questionNumber, timerType);
            log.debug("타이머 상태 - key: {}, 취소 전 활성 타이머 수: {}", key, activeTimers.size());
            
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
                
                log.info("타이머 취소 완료 - roomId: {}, question: {}, type: {}, 성공: {}, 실패: {}, 이미완료: {}, 전체: {}", 
                    roomId, questionNumber, timerType, cancelledCount, failedCount, alreadyDoneCount, futures.size());
                log.debug("타이머 상태 - 취소 후 활성 타이머 수: {}", activeTimers.size());
            } else {
                log.info("타이머 취소 - 취소할 타이머 없음 - roomId: {}, question: {}, type: {}", 
                    roomId, questionNumber, timerType);
                log.debug("타이머 상태 - key: {}, 활성 타이머 수: {}", key, activeTimers.size());
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
        log.debug("타이머 상태 - 취소 전 활성 타이머 수: {}", activeTimers.size());
        
        // PREPARE 타이머 취소
        cancelTimer(roomId, questionNumber, "PREPARE");
        
        // SIGNING 타이머 취소
        cancelTimer(roomId, questionNumber, "SIGNING");
        
        log.info("문제의 모든 타이머 취소 완료 - roomId: {}, question: {}", roomId, questionNumber);
        log.debug("타이머 상태 - 취소 후 활성 타이머 수: {}", activeTimers.size());
    }
    
    /**
     * 방의 모든 타이머 정리
     * 
     * 지정된 방의 모든 타이머를 제거합니다.
     * 게임 종료 시 또는 방 삭제 시 사용됩니다.
     * 
     * @param roomId 방 ID
     */
    public void cleanupRoom(Long roomId) {
        log.info("방 타이머 정리 시작 - roomId: {}", roomId);
        log.debug("타이머 상태 - 정리 전 활성 타이머 수: {}", activeTimers.size());
        
        int removedCount = 0;
        int cancelledTaskCount = 0;
        String roomPrefix = roomId + ":";
        
        // roomId로 시작하는 모든 타이머 키를 찾아서 제거
        for (Map.Entry<String, List<ScheduledFuture<?>>> entry : activeTimers.entrySet()) {
            String key = entry.getKey();
            if (key.startsWith(roomPrefix)) {
                List<ScheduledFuture<?>> futures = activeTimers.remove(key);
                
                if (futures != null) {
                    // 모든 스케줄링된 작업 취소
                    int tasksCancelled = 0;
                    for (ScheduledFuture<?> future : futures) {
                        if (!future.isDone() && !future.isCancelled()) {
                            future.cancel(false);
                            tasksCancelled++;
                        }
                    }
                    cancelledTaskCount += tasksCancelled;
                    removedCount++;
                    log.debug("타이머 제거 - key: {}, 전체 작업: {}, 취소된 작업: {}", 
                        key, futures.size(), tasksCancelled);
                }
            }
        }
        
        log.info("방 타이머 정리 완료 - roomId: {}, 제거된 타이머: {}, 취소된 작업: {}", 
            roomId, removedCount, cancelledTaskCount);
        log.debug("타이머 상태 - 정리 후 활성 타이머 수: {}", activeTimers.size());
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
