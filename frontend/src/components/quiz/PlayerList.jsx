/**
 * 플레이어 목록 컴포넌트
 */

import styles from './PlayerList.module.scss';

const PlayerList = ({ players, remoteStreams, remoteVideosRef }) => {
  return (
    <div className={styles.playerList}>
      {players.map((player) => (
        <div
          key={player.id}
          className={`${styles.playerCard} ${player.isCurrentPlayer ? styles.current : ''} ${player.isMe ? styles.me : ''}`}
        >
          <div className={styles.videoContainer}>
            {!player.isMe && remoteStreams[player.id] ? (
              <video
                ref={(el) => {
                  if (el && remoteVideosRef.current) {
                    remoteVideosRef.current[player.id] = el;
                  }
                }}
                autoPlay
                playsInline
                className={styles.video}
              />
            ) : (
              <div className={styles.placeholder}>
                {player.nickname.charAt(0)}
              </div>
            )}
          </div>

          <div className={styles.info}>
            <span className={styles.nickname}>
              {player.nickname}
              {player.isMe && ' (나)'}
            </span>
            <span className={styles.score}>{player.score}점</span>
          </div>

          {player.hasChallenged && player.challengeOrder && (
            <div className={styles.challengeBadge}>
              {player.challengeOrder}번째
            </div>
          )}

          {player.isCurrentPlayer && (
            <div className={styles.currentBadge}>진행 중</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PlayerList;
