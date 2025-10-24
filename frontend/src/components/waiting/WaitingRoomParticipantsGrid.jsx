/**
 * @개요 대기방 참가자 그리드 컴포넌트
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import WaitingRoomParticipantCard from './WaitingRoomParticipantCard';
import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomParticipantsGrid = ({ 
  participants, 
  myUserId,
  isWebcamOn,
  videoRef,
  remoteStreams,
  remoteVideosRef 
}) => {
  return (
    <div className={styles.participantsGrid}>
      {participants.map((participant) => (
        <WaitingRoomParticipantCard
          key={participant.id}
          participant={participant}
          myUserId={myUserId}
          isWebcamOn={isWebcamOn}
          videoRef={videoRef}
          remoteStreams={remoteStreams}
          remoteVideosRef={remoteVideosRef}
        />
      ))}

      {/* 빈 자리 카드들 */}
      {Array.from({ length: 4 - participants.length }, (_, index) => (
        <div key={`empty-${index}`} className={styles.emptyCard}>
          <span>대기중</span>
        </div>
      ))}
    </div>
  );
};

export default WaitingRoomParticipantsGrid;
