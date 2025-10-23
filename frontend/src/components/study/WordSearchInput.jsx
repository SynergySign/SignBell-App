/**
 * @개요 단어 검색 입력 컴포넌트입니다. 검색어 입력, 검색 실행, 초기화 기능을 제공합니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @매개변수 {string} props.searchKeyword - 현재 검색어입니다.
 * @매개변수 {function} props.onSearchChange - 검색어 변경 핸들러입니다.
 * @매개변수 {function} props.onSearch - 검색 실행 핸들러입니다.
 * @매개변수 {function} props.onReset - 검색어 초기화 핸들러입니다.
 * @반환값 {JSX.Element} 단어 검색 입력 컴포넌트를 반환합니다.
 */

import styles from './WordSearchInput.module.scss';

const WordSearchInput = ({ 
  searchKeyword, 
  onSearchChange, 
  onSearch, 
  onReset 
}) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className={styles.searchArea}>
      <div className={styles.searchInputWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="학습할 단어를 검색하세요"
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        {searchKeyword && (
          <button 
            className={styles.clearButton}
            onClick={onReset}
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>
      
      <button className={styles.searchButton} onClick={onSearch}>
        검색
      </button>
    </div>
  );
};

export default WordSearchInput;