package app.signbell.backend.service;

import app.signbell.backend.entity.QuizWord;
import app.signbell.backend.entity.Sign;
import app.signbell.backend.entity.SignStatus;
import app.signbell.backend.repository.QuizWordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 학습 완료된 단어를 테이블에 추가하는 로직을 추가하였습니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */

@Slf4j
@Service
@RequiredArgsConstructor
public class QuizWordService {

    private final QuizWordRepository quizWordRepository;

    @Transactional
    public void addQuizWordIfCompleted(Sign sign) {
        // 상태가 '완료'이고, 아직 퀴즈 단어에 없다면 추가
        if (sign.getLearningStatus() == SignStatus.COMPLETED && !quizWordRepository.existsBySign(sign)) {
            QuizWord quizWord = QuizWord.builder().sign(sign).build();
            quizWordRepository.save(quizWord);
            log.info("✅ 퀴즈 단어 추가: {}", sign.getTitle());
        }
    }

    @Transactional
    public void removeQuizWordIfNotCompleted(Sign sign) {
        // 상태가 '완료'가 아니고, 퀴즈 단어에 있다면 삭제
        if (sign.getLearningStatus() != SignStatus.COMPLETED && quizWordRepository.existsBySign(sign)) {
            quizWordRepository.deleteBySign(sign);
            log.info("🗑️ 퀴즈 단어 삭제: {}", sign.getTitle());
        }
    }
}