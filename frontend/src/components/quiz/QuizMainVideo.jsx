import { useEffect } from 'react';
import styles from '../../pages/quiz/QuizGamePage.module.scss';

/**
 * 메인 비디오 카드 컴포넌트
 */
const QuizMainVideo = ({
  gamePhase,
  isWebcamOn,
  mainVideoRef,
  currentChallengerInfo,
  remoteStreams,
  remoteVideosRef,
  stream,  // 내 스트림 추가
}) => {
  // 내 차례일 때 내 스트림 연결
  useEffect(() => {
    if (gamePhase === 'myTurn' && mainVideoRef.current && stream) {
      console.log('🎥 내 차례 - 스트림 연결:', {
        hasRef: !!mainVideoRef.current,
        hasStream: !!stream,
        streamActive: stream.active
      });
      mainVideoRef.current.srcObject = stream;
    }
  }, [gamePhase, stream, mainVideoRef]);

  // 다른 사람 차례일 때 원격 스트림 연결
  useEffect(() => {
    if (
      gamePhase === 'solving' &&
      currentChallengerInfo.id &&
      remoteStreams[currentChallengerInfo.id]
    ) {
      const videoElement = remoteVideosRef.current[currentChallengerInfo.id];
      const remoteStream = remoteStreams[currentChallengerInfo.id];

      console.log('🎥 다른 사람 차례 - 원격 스트림 연결:', {
        userId: currentChallengerInfo.id,
        hasVideoElement: !!videoElement,
        hasStream: !!remoteStream,
        streamActive: remoteStream?.active
      });

      if (videoElement && remoteStream) {
        videoElement.srcObject = remoteStream;
        console.log('✅ 원격 스트림 연결 완료:', currentChallengerInfo.id);
      }
    }
  }, [gamePhase, currentChallengerInfo.id, remoteStreams, remoteVideosRef]);
  const renderVideo = () => {
    console.log('🎬 QuizMainVideo 렌더링:', {
      gamePhase,
      isWebcamOn,
      hasMainVideoRef: !!mainVideoRef,
      currentChallengerId: currentChallengerInfo?.id,
      hasRemoteStream: currentChallengerInfo?.id ? !!remoteStreams[currentChallengerInfo.id] : false,
      remoteStreamKeys: Object.keys(remoteStreams)
    });

    if (gamePhase === 'myTurn') {
      console.log('📹 내 차례 - 내 카메라 표시');
      return (
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          muted
          className={styles.webcamVideo}
          onLoadedMetadata={() => console.log('✅ 내 비디오 메타데이터 로드됨')}
          onError={(e) => console.error('❌ 내 비디오 오류:', e)}
        />
      );
    } else if (
      gamePhase === 'solving' &&
      currentChallengerInfo.id &&
      remoteStreams[currentChallengerInfo.id]
    ) {
      console.log('📹 다른 사람 차례 - 원격 카메라 표시:', currentChallengerInfo.id);
      return (
        <video
          ref={el => {
            if (el) {
              remoteVideosRef.current[currentChallengerInfo.id] = el;
              console.log('✅ 원격 비디오 ref 설정:', currentChallengerInfo.id);
            }
          }}
          autoPlay
          playsInline
          className={styles.webcamVideo}
          onLoadedMetadata={() => console.log('✅ 원격 비디오 메타데이터 로드됨:', currentChallengerInfo.id)}
          onError={(e) => console.error('❌ 원격 비디오 오류:', currentChallengerInfo.id, e)}
        />
      );
    } else {
      console.log('⏸️ 대기 중 - 플레이스홀더 표시');
      return (
        <div className={styles.challengerWebcam}>
          <span>도전자 웹캠</span>
        </div>
      );
    }
  };

  return (
    <div className={styles.mainVideoCard}>
      {(gamePhase === 'myTurn' || gamePhase === 'solving') && (
        <div className={styles.mainChallengerBadge}>도전 중</div>
      )}
      <div className={styles.mainWebcam}>{renderVideo()}</div>
      <div className={styles.mainPlayerInfo}>
        <span className={styles.mainPlayerName}>
          {currentChallengerInfo?.nickname || '대기중'}
        </span>
        <span className={styles.mainPlayerScore}>
          {currentChallengerInfo?.score || 0}점
        </span>
      </div>
    </div>
  );
};

export default QuizMainVideo;
