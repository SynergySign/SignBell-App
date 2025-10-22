/**
 * @개요 개인 학습 사이드바 컴포넌트입니다. 단어 검색, 필터링, 목록 표시 기능을 제공합니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @매개변수 {boolean} props.isOpen - 사이드바 열림/닫힘 상태입니다.
 * @매개변수 {function} props.onClose - 사이드바 닫기 함수입니다.
 * @반환값 {JSX.Element} 개인 학습 사이드바 컴포넌트를 반환합니다.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import SkeletonLoader from '../ui/SkeletonLoader';
import WordSearchInput from './WordSearchInput';
import WordCard from './WordCard';
import WordDetailModal from './WordDetailModal';
import styles from './PersonalStudySidebar.module.scss';

const PersonalStudySidebar = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'quiz'
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [wordList, setWordList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [showCategoryList, setShowCategoryList] = useState(true);
  const observerRef = useRef();

  // 카테고리 목록
  const categories = [
    '전체', '개념', '경제생활', '교육', '기타', '나라명 및 지명', 
    '동식물', '문화', '사회생활', '삶', '식생활', '의생활', 
    '인간', '자연', '정치와 행정', '종교', '주생활'
  ];

  // 더미 데이터 생성 함수
  const generateDummyWords = (page, keyword = '', category = '전체') => {
    const words = [];
    const wordCategories = [
      '개념', '경제생활', '교육', '기타', '나라명 및 지명', 
      '동식물', '문화', '사회생활', '삶', '식생활', '의생활', 
      '인간', '자연', '정치와 행정', '종교', '주생활'
    ];
    
    for (let i = 0; i < 20; i++) {
      const wordIndex = (page - 1) * 20 + i + 1;
      const word = keyword ? `${keyword}${wordIndex}` : `단어${wordIndex}`;
      const wordCategory = category === '전체' 
        ? wordCategories[Math.floor(Math.random() * wordCategories.length)]
        : category;
      
      words.push({
        id: `word-${wordIndex}`,
        word: word,
        description: `${word}에 대한 수어 설명입니다. 양손을 사용하여 표현하며, 자연스러운 동작으로 의미를 전달합니다.`,
        videoUrl: '', // TODO: 실제 영상 URL 연동 필요
        category: wordCategory
      });
    }
    
    return words;
  };

  // 단어 목록 로딩 시뮬레이션
  const loadWords = useCallback(async (page = 1, keyword = '', category = '전체', isNewSearch = false) => {
    if (isNewSearch) {
      setIsLoading(true);
      setWordList([]);
      setCurrentPage(1);
    } else {
      setIsLoadingMore(true);
    }

    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newWords = generateDummyWords(page, keyword, category);
    
    if (isNewSearch) {
      setWordList(newWords);
      setIsLoading(false);
    } else {
      setWordList(prev => [...prev, ...newWords]);
      setIsLoadingMore(false);
    }
    
    // 5페이지까지만 있다고 가정
    setHasNextPage(page < 5);
  }, []);

  // 초기 로딩 - 카테고리 목록 표시
  useEffect(() => {
    if (isOpen) {
      setShowCategoryList(true);
      setWordList([]);
    }
  }, [isOpen]);

  // 무한 스크롤을 위한 Intersection Observer
  const lastWordElementRef = useCallback(node => {
    if (isLoadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        // 검색 중이면 전체 카테고리에서, 아니면 선택된 카테고리에서
        const categoryForLoad = searchKeyword.trim() ? '전체' : selectedCategory;
        loadWords(nextPage, searchKeyword, categoryForLoad, false);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoadingMore, hasNextPage, currentPage, searchKeyword, selectedCategory, loadWords]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // TODO: 탭 전환 시 실시간 퀴즈 사이드바로 전환 필요
  };

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      setShowCategoryList(false);
      setSelectedCategory('전체'); // 검색 시 무조건 전체 카테고리에서 검색
      loadWords(1, searchKeyword.trim(), '전체', true);
    }
  };

  const handleReset = () => {
    setSearchKeyword('');
    setShowCategoryList(true);
    setWordList([]);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowCategoryList(false);
    setSearchKeyword('');
    loadWords(1, '', category, true);
  };

  const handleBackToCategories = () => {
    setShowCategoryList(true);
    setWordList([]);
    setSearchKeyword('');
  };

  const handleSearchChange = (value) => {
    setSearchKeyword(value);
  };

  const handleWordClick = (word) => {
    setSelectedWord(word);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedWord(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.sidebarOverlay} onClick={onClose}></div>
      
      {/* 사이드바 */}
      <div className={`${styles.personalStudySidebar} ${isOpen ? styles.open : ''}`}>
        {/* 헤더 영역 */}
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>개인 학습</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="사이드바 닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 영역 */}
        <div className={styles.sidebarTabs}>
          <button
            className={`${styles.tabButton} ${activeTab === 'personal' ? styles.active : ''}`}
            onClick={() => handleTabChange('personal')}
          >
            개인 학습
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'quiz' ? styles.active : ''}`}
            onClick={() => handleTabChange('quiz')}
          >
            실시간 퀴즈
          </button>
        </div>



        {/* 검색 영역 */}
        <WordSearchInput
          searchKeyword={searchKeyword}
          onSearchChange={handleSearchChange}
          onSearch={handleSearch}
          onReset={handleReset}
        />

        {/* 카테고리/단어 목록 영역 */}
        <div className={styles.contentArea}>
          {showCategoryList ? (
            // 카테고리 목록 표시
            <div className={styles.categoryList}>
              <div className={styles.categoryHeader}>
                <h3>카테고리를 선택하세요</h3>
              </div>
              <div className={styles.categoryGrid}>
                {categories.map((category) => (
                  <button
                    key={category}
                    className={styles.categoryCard}
                    onClick={() => handleCategoryClick(category)}
                  >
                    <span className={styles.categoryName}>{category}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // 단어 목록 표시
            <div className={styles.wordList}>
              {/* 뒤로가기 버튼 */}
              <div className={styles.backButton}>
                <button onClick={handleBackToCategories}>
                  ← 카테고리로 돌아가기
                </button>
                <span className={styles.currentCategory}>
                  {searchKeyword.trim() ? `"${searchKeyword}" 검색 결과` : selectedCategory}
                </span>
              </div>

              {isLoading ? (
                // 초기 로딩 중 스켈레톤 표시
                <div className={styles.skeletonWrapper}>
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className={styles.skeletonCard}>
                      <SkeletonLoader variant="rectangle" width={350} height={60} />
                    </div>
                  ))}
                </div>
              ) : wordList.length > 0 ? (
                <>
                  {wordList.map((word, index) => {
                    const isLast = index === wordList.length - 1;
                    return (
                      <WordCard
                        key={word.id}
                        word={word}
                        onClick={handleWordClick}
                        isLast={isLast}
                        lastElementRef={lastWordElementRef}
                      />
                    );
                  })}
                  
                  {/* 추가 로딩 중 스켈레톤 */}
                  {isLoadingMore && (
                    <div className={styles.skeletonWrapper}>
                      {[...Array(3)].map((_, index) => (
                        <div key={`loading-${index}`} className={styles.skeletonCard}>
                          <SkeletonLoader variant="rectangle" width={350} height={60} />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 더 이상 로드할 데이터가 없을 때 */}
                  {!hasNextPage && !isLoadingMore && (
                    <div className={styles.endMessage}>
                      <p>모든 단어를 불러왔습니다</p>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p>검색 결과가 없습니다</p>
                  <p className={styles.emptySubtext}>다른 키워드로 검색해보세요!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 단어 상세 모달 */}
      <WordDetailModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        word={selectedWord}
      />
    </>
  );
};

export default PersonalStudySidebar;