/**
 * @개요 영상 플레이어 컴포넌트입니다. (0.5초 지연 로딩 버전)
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21 (0.5초 스피너 로직으로 단순화)
 */

import React, { useState, useEffect } from 'react';
import styles from './VideoPlayer.module.scss';

const VideoPlayer = ({
                       videoUrl,
                       title = '수어 영상',
                       width = 400,
                       height = 300
                     }) => {

  // [수정] 0.5초간 스피너를 보여주기 위한 loading 상태
  const [isLoading, setIsLoading] = useState(true);

  // videoUrl이 바뀔 때마다 0.5초 타이머를 다시 실행합니다.
  useEffect(() => {
    // 1. URL이 바뀌면 무조건 로딩 스피너를 다시 보여줍니다.
    setIsLoading(true);

    // 2. 0.5초(500ms) 후에 로딩 상태를 false로 변경합니다.
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // 0.5초

    // 3. 컴포넌트가 사라지거나 URL이 다시 바뀌면 기존 타이머를 제거합니다.
    return () => clearTimeout(timer);

  }, [videoUrl]); // videoUrl이 바뀔 때만 이 효과가 실행됩니다.

  return (
      <div
          // CSS 모듈 클래스 이름은 kebab-case를 사용합니다.
          className={styles.videoPlayer}
          style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* 1. 로딩 중일 때 스피너를 보여줍니다. */}
        {isLoading && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}></div>
            </div>
        )}

        {/*
          2. <video> 태그는 항상 렌더링합니다. (로딩 중에는 숨겨짐)
             - 브라우저가 스피너를 보는 0.5초 동안 영상을 미리 불러올 수 있습니다.
             - display: 'none' 대신 visibility를 사용하면 공간을 유지합니다.
        */}
        <video
            className={styles.video}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // 로딩 중일 땐 숨기고, 로딩이 끝나면 보여줍니다.
              visibility: isLoading ? 'hidden' : 'visible'
            }}
            controls // 브라우저 기본 컨트롤러 사용
            autoPlay
            muted
            playsInline
            // key를 videoUrl로 설정하여 URL이 바뀔 때마다
            // <video> 태그를 강제로 새로 생성합니다. (가장 중요)
            key={videoUrl}
            loop
        >
          {/* signEdu.js가 'https://...' URL을 여기에 넣어줍니다. */}
          <source src={videoUrl} />
          현재 브라우저는 video 태그를 지원하지 않습니다.
        </video>
      </div>
  );
};

export default VideoPlayer;