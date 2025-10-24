import styles from '../../pages/quiz/QuizGamePage.module.scss';

/**
 * 플레이어 그리드 컴포넌트
 */
const QuizPlayerGrid = ({
  players,
  gamePhase,
  isWebcamOn,
  stream,
  remoteStreams,
  remoteVideosRef,
}) => {
  const filteredPlayers = players.filter(player => {
    if (gamePhase === 'solving' || gamePhase === 'myTurn') {
      return !player.isCurrentPlayer;
    }
    return true;
  });

  if (players.length === 0) {
    return (
      <div className={styles.smallPlayersGrid}>
        <div className={styles.loadingMessage}>플레이어 정보 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.smallPlayersGrid}>
      {filteredPlayers.map(player => (
        <div key={player.id} className={styles.smallPlayerCard}>
          <div className={styles.smallWebcam}>
            {player.isMe && isWebcamOn ? (
              gamePhase === 'myTurn' ? (
                <span>내 차례</span>
              ) : (
                <video
                  ref={el => {
                    if (el && stream && el.srcObject !== stream) {
                      el.srcObject = stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={styles.smallWebcamVideo}
                />
              )
            ) : !player.isMe && remoteStreams[player.id] ? (
              <video
                ref={el => {
                  if (
                    el &&
                    remoteStreams[player.id] &&
                    el.srcObject !== remoteStreams[player.id]
                  ) {
                    remoteVideosRef.current[player.id] = el;
                    el.srcObject = remoteStreams[player.id];
                  }
                }}
                autoPlay
                playsInline
                className={styles.smallWebcamVideo}
              />
            ) : (
              <span>웹캠 {player.isMe ? '(나)' : ''}</span>
            )}
          </div>
          <div className={styles.smallPlayerInfo}>
            <span className={styles.smallPlayerName}>
              {player.nickname}
              {player.isMe ? ' (나)' : ''}
            </span>
            <span className={styles.smallPlayerScore}>{player.score}점</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuizPlayerGrid;
