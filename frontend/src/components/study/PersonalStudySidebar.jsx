// src/components/study/PersonalStudySidebar.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCategories, listSignEdu, getSignDetail } from '../../services/signEdu/signEdu.js';
import SkeletonLoader from '../ui/SkeletonLoader';
import WordSearchInput from './WordSearchInput';
import WordCard from './WordCard';
import WordDetailModal from './WordDetailModal';
import styles from './PersonalStudySidebar.module.scss';

// [추가] 스켈레톤 최소 노출 시간 (ms)
const MIN_SKELETON_TIME_MS = 500;

const PersonalStudySidebar = ({ isOpen, onClose, onTabChange }) => {
    const [activeTab, setActiveTab] = useState('personal');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [wordList, setWordList] = useState([]); // [{ signId, wordName }]
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [selectedWord, setSelectedWord] = useState(null); // [{ id, word, ... }]
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [showCategoryList, setShowCategoryList] = useState(true);
    const observerRef = useRef();

    const [categories, setCategories] = useState(['전체']);
    const [isCategoryLoading, setIsCategoryLoading] = useState(false);

    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // [추가] 새 검색/로딩 시작 시간을 기록하기 위한 Ref
    const loadStartTimeRef = useRef(null);

    // --- [수정] 단어 목록 로딩 함수 (최소 로딩 시간 보장 로직 추가) ---
    const loadWords = useCallback(async (page = 1, keyword = '', category = '전체', isNewSearch = false) => {

        if (isNewSearch) {
            setIsLoading(true);
            setWordList([]);
            setCurrentPage(1);
            loadStartTimeRef.current = Date.now(); // [추가] 로딩 시작 시간 기록
        } else {
            setIsLoadingMore(true);
        }

        try {
            const apiKeyword = keyword.trim();
            const apiCategory = apiKeyword ? '전체' : category;

            const response = await listSignEdu({
                page: page,
                size: 20,
                category: apiCategory,
                keyword: apiKeyword
            });

            const newWords = response.words;
            if (isNewSearch) {
                setWordList(newWords);
            } else {
                setWordList(prev => [...prev, ...newWords]);
            }
            setHasNextPage(response.hasNext);
        } catch (error) {
            console.error("단어 목록 로딩에 실패했습니다:", error);
        } finally {
            if (isNewSearch) {
                // [수정] 최소 로딩 시간 보장 로직
                const startTime = loadStartTimeRef.current;
                if (startTime) {
                    const elapsedTime = Date.now() - startTime;
                    const remainingTime = MIN_SKELETON_TIME_MS - elapsedTime;

                    if (remainingTime > 0) {
                        // 0.5초가 안 지났으면, 남은 시간 뒤에 로딩 종료
                        setTimeout(() => setIsLoading(false), remainingTime);
                    } else {
                        // 0.5초가 이미 지났으면, 즉시 로딩 종료
                        setIsLoading(false);
                    }
                } else {
                    setIsLoading(false); // Fallback
                }
            } else {
                setIsLoadingMore(false);
            }
        }
    }, []); // 의존성 배열 비움

    // --- 카테고리 목록 로딩 (이전과 동일) ---
    useEffect(() => {
        if (isOpen) {
            setActiveTab('personal');
            setShowCategoryList(true);
            setWordList([]);
            const fetchCategories = async () => {
                setIsCategoryLoading(true);
                try {
                    const apiCategories = await getCategories();
                    setCategories(['전체', ...apiCategories]);
                } catch (error) {
                    console.error("카테고리 목록 로딩에 실패했습니다:", error);
                    setCategories(['전체']);
                } finally {
                    setIsCategoryLoading(false);
                }
            };
            fetchCategories();
        }
    }, [isOpen]);

    // --- [수정] 디바운스 검색을 위한 useEffect (로직 단순화) ---
    useEffect(() => {
        const trimmedKeyword = searchKeyword.trim();

        // [수정] 검색어가 있을 때만 디바운스 실행
        if (trimmedKeyword) {
            const handler = setTimeout(() => {
                // 500ms 후... 검색어가 여전히 존재하면 검색 실행
                // console.log(`[디바운스 검색] '${trimmedKeyword}'`); // (디버깅용)
                setShowCategoryList(false);
                setSelectedCategory('전체'); // 검색 시 카테고리 초기화
                loadWords(1, trimmedKeyword, '전체', true);
            }, 500); // 500ms 지연

            // 클린업 함수
            return () => {
                clearTimeout(handler);
            };
        }
        // [수정] 검색어가 비어있을 때 카테고리 목록으로 되돌리는 'else' 로직 제거
        // (이 로직은 handleSearchChange로 이동)

    }, [searchKeyword, loadWords]); // [수정] 의존성 배열에서 showCategoryList 제거


    // --- 무한 스크롤 (이전과 동일) ---
    const lastWordElementRef = useCallback(node => {
        if (isLoadingMore) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage && !searchKeyword.trim()) {
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
                loadWords(nextPage, '', selectedCategory, false);
            }
        });
        if (node) observerRef.current.observe(node);
    }, [isLoadingMore, hasNextPage, currentPage, searchKeyword, selectedCategory, loadWords]);

    // --- 핸들러 ---
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    const handleSearch = () => {
        const trimmedKeyword = searchKeyword.trim();
        if (trimmedKeyword) {
            setShowCategoryList(false);
            setSelectedCategory('전체');
            loadWords(1, trimmedKeyword, '전체', true);
        }
    };

    const handleReset = () => {
        // setSearchKeyword('')만 호출하면,
        // handleSearchChange가 'value'를 ''로 감지하여 처리합니다.
        setSearchKeyword('');
    };

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        setShowCategoryList(false);
        setSearchKeyword(''); // 이로 인해 useEffect가 실행되지만, 이젠 버그 없음
        loadWords(1, '', category, true);
    };

    const handleBackToCategories = () => {
        setShowCategoryList(true);
        setWordList([]);
        setSearchKeyword('');
    };

    // [수정] 검색어 변경 핸들러 (카테고리 복귀 로직 추가)
    const handleSearchChange = (value) => {
        setSearchKeyword(value);

        // [추가] 사용자가 검색어를 *직접* 지워서 비웠을 때,
        // (그리고 현재 단어 목록을 보고 있을 때)
        // 카테고리 목록으로 되돌립니다.
        if (value.trim() === '' && !showCategoryList) {
            setShowCategoryList(true);
            setWordList([]);
            setSelectedCategory('전체');
            setCurrentPage(1);
        }
    };

    // --- 단어 클릭 핸들러 (이전과 동일) ---
    const handleWordClick = async (word) => {
        if (isDetailLoading) return;
        setIsDetailLoading(true);
        try {
            const fullDetails = await getSignDetail(word.signId);
            setSelectedWord(fullDetails);
            setIsModalOpen(true);
        } catch (error) {
            console.error("단어 상세 정보 로딩 실패:", error);
            alert("정보를 불러오는 데 실패했습니다.");
        } finally {
            setIsDetailLoading(false);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedWord(null);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* (오버레이, 사이드바, 헤더, 탭, 검색 영역 동일) */}
            <div className={styles.sidebarOverlay} onClick={onClose}></div>
            <div className={`${styles.personalStudySidebar} ${isOpen ? styles.open : ''}`}>
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
                <WordSearchInput
                    searchKeyword={searchKeyword}
                    onSearchChange={handleSearchChange} // [수정]
                    onSearch={handleSearch}
                    onReset={handleReset} // [수정]
                />

                {/* 카테고리/단어 목록 영역 */}
                <div className={styles.contentArea}>
                    {showCategoryList ? (
                        // 카테고리 목록 (이전과 동일)
                        <div className={styles.categoryList}>
                            <div className={styles.categoryHeader}>
                                <h3>카테고리를 선택하세요</h3>
                            </div>
                            {isCategoryLoading ? (
                                <div className={styles.categoryGrid}>
                                    {[...Array(12)].map((_, index) => (
                                        <div key={index} className={styles.skeletonCategoryCard}>
                                            <SkeletonLoader variant="rectangle" width="100%" height={60} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
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
                            )}
                        </div>
                    ) : (
                        // 단어 목록
                        <div className={styles.wordList}>
                            <div className={styles.backButton}>
                                <button onClick={handleBackToCategories}>
                                    ← 카테고리로 돌아가기
                                </button>
                                <span className={styles.currentCategory}>
                  {searchKeyword.trim() ? `"${searchKeyword}" 검색 결과` : selectedCategory}
                </span>
                            </div>

                            {isLoading ? (
                                // ... 스켈레톤 ...
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
                                                key={word.signId}
                                                word={word}
                                                onClick={handleWordClick}
                                                isLast={isLast}
                                                lastElementRef={isLast ? lastWordElementRef : null}
                                            />
                                        );
                                    })}

                                    {/* ... 추가 로딩 스켈레톤 ... */}
                                    {isLoadingMore && (
                                        <div className={styles.skeletonWrapper}>
                                            {[...Array(3)].map((_, index) => (
                                                <div key={`loading-${index}`} className={styles.skeletonCard}>
                                                    <SkeletonLoader variant="rectangle" width={350} height={60} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!hasNextPage && !isLoadingMore && (
                                        <div className={styles.endMessage}>
                                            <p>모든 단어를 불러왔습니다</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // ... 검색 결과 없음 ...
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