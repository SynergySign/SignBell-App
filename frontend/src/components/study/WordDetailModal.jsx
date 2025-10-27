/**
 * @개요 단어 상세 모달 컴포넌트입니다. 선택한 단어의 상세 정보와 수어 영상을 표시합니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @매개변수 {boolean} props.isOpen - 모달 열림/닫힘 상태입니다.
 * @매개변수 {function} props.onClose - 모달 닫기 함수입니다.
 * @매개변수 {object} props.word - 선택된 단어 정보 객체입니다.
 * @반환값 {JSX.Element} 단어 상세 모달 컴포넌트를 반환합니다.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoPlayer from '../ui/VideoPlayer';
import MirrorModeSection from './MirrorModeSection';
import styles from './WordDetailModal.module.scss';

const WordDetailModal = ({ isOpen, onClose, word }) => {
  const navigate = useNavigate();

  // 영상 제공 페이지로 이동
  const handleVideoSubmission = () => {
    if (word) {
      navigate(`/study/data/${word.id}`);
      onClose(); // 모달 닫기
    }
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // 모달 열릴 때 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !word) return null;
  console.log("VideoPlayer로 전달될 URL:", word.videoUrl);

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.modalOverlay} onClick={onClose}></div>

      {/* 모달 */}
      <div className={styles.wordDetailModal}>
        {/* 모달 헤더 */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{word.word}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>

        {/* 모달 콘텐츠 */}
        <div className={styles.modalContent}>
          {/* 수어 영상 영역 */}
          <div className={styles.videoSection}>
            <VideoPlayer
              videoUrl={word.videoUrl}
              title={word.word}
              width={400}
              height={300}
            />
          </div>

          {/* 수어 동작 설명 */}
          <div className={styles.descriptionSection}>
            <h3 className={styles.descriptionTitle}>수어 동작 설명</h3>
            <p className={styles.descriptionText}>
              {word.description || `${word.word}에 대한 수어 동작 설명입니다.`}
            </p>
            <div className={styles.wordInfo}>
              <span className={styles.category}>카테고리: {word.category}</span>
            </div>
          </div>

          {/* 거울 모드로 연습하기 섹션 */}
          <MirrorModeSection word={word} />

          {/* 영상 제공 버튼 */}
          <button
            className={styles.videoSubmissionButton}
            onClick={handleVideoSubmission}
          >
            영상 제공하고 포인트 받기 🎁
          </button>
        </div>
      </div>
    </>
  );
};

export default WordDetailModal;