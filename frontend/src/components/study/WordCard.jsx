/**
 * @개요 개별 단어 카드 컴포넌트입니다. 단어명과 카테고리를 표시하고 클릭 이벤트를 처리합니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @매개변수 {object} props.word - 단어 정보 객체입니다.
 * @매개변수 {function} props.onClick - 단어 클릭 핸들러입니다.
 * @매개변수 {boolean} props.isLast - 마지막 요소 여부 (무한 스크롤용)입니다.
 * @매개변수 {function} props.lastElementRef - 마지막 요소 참조 (무한 스크롤용)입니다.
 * @반환값 {JSX.Element} 단어 카드 컴포넌트를 반환합니다.
 */

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
      <span className={styles.wordText}>{word.word}</span>
      <span className={styles.category}>{word.category}</span>
    </div>
  );
};

export default WordCard;