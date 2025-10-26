package app.signbell.backend.service;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.quiz.NextQuestionResponse;
import app.signbell.backend.entity.QuizWord;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.QuizWordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * QuizTransactionService
 * 
 * 비동기 실행에서 새 트랜잭션이 필요한 퀴즈 관련 작업을 처리하는 서비스
 * QuizService에서 분리하여 순환 참조 문제 해결
 * 
 * @author Kiro
 * @since 2025-10-26
 */
@Slf4j
@Service
public class QuizTransactionService {

    private final QuizWordRepository quizWordRepository;
    private final QuizStateCache quizStateCache;
    private final SimpMessagingTemplate messagingTemplate;
    private final QuizService quizService;
    
    // 생성자에서 @Lazy로 순환 참조 해결
    public QuizTransactionService(
            QuizWordRepository quizWordRepository,
            QuizStateCache quizStateCache,
            SimpMessagingTemplate messagingTemplate,
            @org.springframework.context.annotation.Lazy QuizService quizService) {
        this.quizWordRepository = quizWordRepository;
        this.quizStateCache = quizStateCache;
        this.messagingTemplate = messagingTemplate;
        this.quizService = quizService;
    }

    /**
     * 다음 문제로 이동 (비동기 호출용 - 새 트랜잭션)
     * 
     * @param roomId 방 ID
     * @param currentQuestion 현재 문제 번호
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void moveToNextQuestion(Long roomId, Integer currentQuestion) {
        log.info("🔄 moveToNextQuestion 호출 (새 트랜잭션) - roomId: {}, currentQuestion: {}", 
                roomId, currentQuestion);
        
        // 현재 문제의 모든 타이머 취소
        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);
        Long currentChallenger = roomState.getCurrentChallenger(currentQuestion);
        if (currentChallenger != null) {
            // 현재 도전자의 타이머 취소는 QuizService에서 처리
            log.info("현재 문제 타이머 정리 - roomId: {}, question: {}", roomId, currentQuestion);
        }
        
        if (currentQuestion >= 8) {
            // 게임 종료
            log.info("마지막 문제 완료 - 게임 종료 - roomId: {}", roomId);
            quizService.endGame(roomId);
            return;
        }

        Integer nextQuestion = currentQuestion + 1;
        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);
        Long nextQuizWordId = roomState.getQuizWordId(nextQuestion);

        if (nextQuizWordId == null) {
            log.warn("다음 문제 정보 없음 - 게임 종료 - roomId: {}, nextQuestion: {}", roomId, nextQuestion);
            quizService.endGame(roomId);
            return;
        }

        QuizWord nextQuiz = quizWordRepository.findByIdWithSign(nextQuizWordId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUIZ_NOT_FOUND));

        log.info("다음 문제 이동 - roomId: {}, nextQuestion: {}, wordTitle: {}",
                roomId, nextQuestion, nextQuiz.getSign().getTitle());

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/quiz",
                ApiResponse.success("다음 문제", NextQuestionResponse.builder()
                        .questionNumber(nextQuestion)
                        .totalQuestions(8)
                        .wordTitle(nextQuiz.getSign().getTitle())
                        .build()));

        // 다음 문제 도전 신청 타임아웃 스케줄링 (10초)
        quizService.scheduleChallengeTimeout(roomId, nextQuestion);

        // 도전 신청 타이머 시작 (10초)
        quizService.startChallengeTimer(roomId, nextQuestion);
        
        log.info("✅ moveToNextQuestion 완료 - roomId: {}, nextQuestion: {}", roomId, nextQuestion);
    }
}
