package app.signbell.backend.service;

import app.signbell.backend.entity.Sign;
import app.signbell.backend.entity.SignStatus;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.SignRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sign 엔티티를 관리 및 조회 하는 서비스 입니다
 *
 * 학습 상태 변경 시 QuizWord 테이블과의 동기화를 담당합니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */
@Service
@RequiredArgsConstructor
public class SignService {

    private final SignRepository signRepository;
    private final QuizWordService quizWordService; // QuizWord 서비스 주입

    @Transactional
    public Sign updateLearningStatus(Long signId, SignStatus newStatus) { // 반환 타입을 Sign으로 변경
        // 1. ID로 Sign 엔티티를 찾습니다.
        Sign sign = signRepository.findById(signId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORD_NOT_FOUND));

        // 2. 엔티티의 상태를 변경합니다.
        sign.changeLearningStatus(newStatus);

        // 3. 상태 변경에 따라 QuizWord 테이블을 동기화합니다.
        if (newStatus == SignStatus.COMPLETED) {
            quizWordService.addQuizWordIfCompleted(sign);
        } else {
            quizWordService.removeQuizWordIfNotCompleted(sign);
        }

        return sign;
    }
}