import styles from '../../pages/quiz/QuizGamePage.module.scss';

/**
 * 퀴즈 문제 표시 컴포넌트
 */
const QuizQuestion = ({ currentQuestion, totalQuestions, word }) => {
  return (
    <div className={styles.questionSection}>
      <span className={styles.questionNumber}>
        (문제 {currentQuestion}/{totalQuestions})
      </span>
      <h1 className={styles.questionText}>
        '{word}'를 수어로 표현하세요.
      </h1>
    </div>
  );
};

export default QuizQuestion;
