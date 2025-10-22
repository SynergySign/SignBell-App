/**
 * @개요 영상 플레이어 컴포넌트입니다. 수어 영상을 재생하고 컨트롤 기능을 제공합니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @매개변수 {string} props.videoUrl - 영상 URL입니다.
 * @매개변수 {string} props.title - 영상 제목입니다.
 * @매개변수 {number} props.width - 플레이어 너비입니다.
 * @매개변수 {number} props.height - 플레이어 높이입니다.
 * @반환값 {JSX.Element} 영상 플레이어 컴포넌트를 반환합니다.
 */

import { useState, useRef, useEffect } from 'react';
import styles from './VideoPlayer.module.scss';

const VideoPlayer = ({ 
  videoUrl, 
  title = '수어 영상', 
  width = 400, 
  height = 300 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={styles.videoPlayer} 
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {hasError ? (
        // 에러 상태
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <p className={styles.errorMessage}>영상을 불러올 수 없습니다</p>
          <span className={styles.errorSubtext}>잠시 후 다시 시도해주세요</span>
        </div>
      ) : isLoading ? (
        // 로딩 상태
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingMessage}>영상 로딩 중...</p>
        </div>
      ) : (
        // 영상 플레이어
        <>
          <video
            ref={videoRef}
            className={styles.video}
            src={videoUrl}
            onClick={togglePlay}
            preload="metadata"
          />
          
          {/* 플레이 버튼 오버레이 */}
          {!isPlaying && (
            <div className={styles.playOverlay} onClick={togglePlay}>
              <div className={styles.playButton}>
                ▶
              </div>
            </div>
          )}

          {/* 컨트롤 바 */}
          <div className={styles.controls}>
            {/* 진행 바 */}
            <div className={styles.progressBar} onClick={handleSeek}>
              <div 
                className={styles.progressFill}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* 컨트롤 버튼들 */}
            <div className={styles.controlButtons}>
              <button 
                className={styles.playPauseButton}
                onClick={togglePlay}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              <div className={styles.timeDisplay}>
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className={styles.spacer}></div>

              <span className={styles.videoTitle}>{title}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoPlayer;