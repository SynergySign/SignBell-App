// src/components/study/PersonalStudySidebar.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
// [수정] 3개 함수 모두 import
import { getCategories, listSignEdu, getSignDetail } from '../../services/signEdu/signEdu.js'; //
import SkeletonLoader from '../ui/SkeletonLoader';
import WordSearchInput from './WordSearchInput';
import WordCard from './WordCard';
import WordDetailModal from './WordDetailModal';
import styles from './PersonalStudySidebar.module.scss';

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

    // --- [수정] 단어 목록 로딩 함수 (API 연동) ---
    const loadWords = useCallback(async (page = 1, keyword = '', category = '전체', isNewSearch = false) => {

        if (isNewSearch) {
            setIsLoading(true);
            setWordList([]);
            setCurrentPage(1);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const apiKeyword = keyword.trim();
            // 키워드 검색 시에는 카테고리를 '전체'로 보내 백엔드가 무시하도록 함
            const apiCategory = apiKeyword ? '전체' : category;

            // [수정] listSignEdu 호출 시 keyword와 category 모두 전달
            const response = await listSignEdu({
                page: page,
                size: 20,
                category: apiCategory,
                keyword: apiKeyword
            }); //

            const newWords = response.words; //
            if (isNewSearch) {
                setWordList(newWords);
            } else {
                setWordList(prev => [...prev, ...newWords]);
            }
            setHasNextPage(response.hasNext); //
        } catch (error) {
            console.error("단어 목록 로딩에 실패했습니다:", error);
        } finally {
            if (isNewSearch) {
                setIsLoading(false);
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
                    const apiCategories = await getCategories(); //
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

    // --- [추가] 디바운스 검색을 위한 useEffect ---
    useEffect(() => {
        const trimmedKeyword = searchKeyword.trim();

        const handler = setTimeout(() => {
            // 500ms 후...
            if (trimmedKeyword) {
                // 검색어가 있으면: 검색 실행
                // console.log(`[디바운스 검색] '${trimmedKeyword}'`); // (디버깅용)
                setShowCategoryList(false);
                setSelectedCategory('전체'); // 검색 시 카테고리 초기화
                loadWords(1, trimmedKeyword, '전체', true);
            } else if (!showCategoryList) {
                // 검색어가 없고, 현재 단어 목록을 보고있다면 (즉, 방금 검색어를 지웠다면)
                // 카테고리 목록으로 되돌림
                setShowCategoryList(true);
                setWordList([]);
                setSelectedCategory('전체');
                setCurrentPage(1); // 페이지도 초기화
            }
            // 검색어도 없고, 이미 카테고리 목록을 보고 있다면(showCategoryList=true) 아무것도 안 함

        }, 500); // 500ms 지연

        // 클린업 함수: 타이머가 만료되기 전에 searchKeyword가 바뀌면 기존 타이머 취소
        return () => {
            clearTimeout(handler);
        };
    }, [searchKeyword, loadWords, showCategoryList]); // 의존성 배열


    // --- 무한 스크롤 (이전과 동일, 검색 중에는 작동 X) ---
    const lastWordElementRef = useCallback(node => {
        if (isLoadingMore) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            // [수정] !searchKeyword.trim() 조건 확인 (검색 중이 아닐 때만 무한 스크롤)
            if (entries[0].isIntersecting && hasNextPage && !searchKeyword.trim()) { //
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
                loadWords(nextPage, '', selectedCategory, false);
            }
        });
        if (node) observerRef.current.observe(node);
    }, [isLoadingMore, hasNextPage, currentPage, searchKeyword, selectedCategory, loadWords]); //

    // --- (기타 핸들러 동일) ---
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    // [수정] '검색' 버튼 클릭 핸들러 (이제 즉시 검색용)
    const handleSearch = () => {
        const trimmedKeyword = searchKeyword.trim();
        if (trimmedKeyword) {
            // console.log(`[즉시 검색] '${trimmedKeyword}'`); // (디버깅용)
            setShowCategoryList(false);
            setSelectedCategory('전체');
            loadWords(1, trimmedKeyword, '전체', true);
        }
    }; //

    const handleReset = () => {
        setSearchKeyword('');
        // useEffect가 검색어 비워진 것을 감지하고
        // 자동으로 카테고리 목록으로 돌려줍니다.
    }; //

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        setShowCategoryList(false);
        setSearchKeyword('');
        loadWords(1, '', category, true);
    }; //

    const handleBackToCategories = () => {
        setShowCategoryList(true);
        setWordList([]);
        setSearchKeyword('');
    }; //

    // [수정] 검색어 변경 핸들러 (state만 변경)
    const handleSearchChange = (value) => {
        setSearchKeyword(value);
        // 실제 API 호출은 useEffect (디바운스)가 담당
    }; //

    // --- [수정] 단어 클릭 핸들러 (이전과 동일) ---
    const handleWordClick = async (word) => {
        // word는 { signId, wordName }
        if (isDetailLoading) return; // 중복 클릭 방지

        setIsDetailLoading(true);
        try {
            // API 호출로 { id, word, videoUrl, ... } 상세 정보 가져오기
            const fullDetails = await getSignDetail(word.signId); //

            // 상세 정보를 state에 저장
            setSelectedWord(fullDetails);

            // *데이터 준비 후* 모달 열기
            setIsModalOpen(true);
        } catch (error) {
            console.error("단어 상세 정보 로딩 실패:", error);
            alert("정보를 불러오는 데 실패했습니다.");
        } finally {
            setIsDetailLoading(false);
        }
    }; //

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedWord(null);
    }; //

    if (!isOpen) return null;

    return (
        <>
            {/* (오버레이, 사이드바, 헤더, 탭, 검색 영역 동일) */}
            <div className={styles.sidebarOverlay} onClick={onClose}></div>
            <div className={`${styles.personalStudySidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    {/* ... 헤더 ... */}
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
                    {/* ... 탭 ... */}
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
                    onSearchChange={handleSearchChange}
                    onSearch={handleSearch}
                    onReset={handleReset}
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
                                {/* ... 뒤로가기 버튼 ... */}
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
                                                word={word} // { signId, wordName } 전달
                                                onClick={handleWordClick}
                                                isLast={isLast}
                                                // [수정] 마지막 요소에만 ref 전달
                                                lastElementRef={isLast ? lastWordElementRef : null} //
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
                word={selectedWord} // { id, word, videoUrl, ... } 전달
            />
        </>
    );
};

export default PersonalStudySidebar;