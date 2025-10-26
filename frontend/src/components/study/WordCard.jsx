// src/components/study/WordCard.jsx

import styles from './WordCard.module.scss';

const WordCard = ({ word, onClick, isLast, lastElementRef }) => {
  const handleClick = () => {
    onClick(word);
  };

  return (
      <div
          ref={isLast ? lastElementRef : null}
          className={styles.wordCard}
          onClick={handleClick}
      >
        {/* [수정] word.word -> word.wordName */}
        <span className={styles.wordText}>{word.wordName}</span>

        {/* [수정] 목록 API에는 category가 없으므로 제거 */}
        {/* <span className={styles.category}>{word.category}</span> */}
      </div>
  );
};

export default WordCard;