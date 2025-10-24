/**
 * @개요 전체 사용자 랭킹 보드 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-24
 * @최종수정일 2025-10-24
 * @반환값 {JSX.Element} 랭킹 보드 컴포넌트
 */

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward } from '@fortawesome/free-solid-svg-icons';
import styles from './RankingBoard.module.scss';

const RankingBoard = () => {
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: API 연동 필요
      // const response = await fetch('/api/rankings/top10');
      // const data = await response.json();
      // setRankings(data);

      // 임시 더미 데이터 (API 연동 시 제거)
      const dummyData = [
        { rank: 1, nickname: '수어마스터', score: 9850, profileImage: null },
        { rank: 2, nickname: '손말이', score: 8920, profileImage: null },
        { rank: 3, nickname: '수어왕', score: 8450, profileImage: null },
        { rank: 4, nickname: '열심히배우는중', score: 7680, profileImage: null },
        { rank: 5, nickname: '수어초보', score: 6920, profileImage: null },
        { rank: 6, nickname: '도전자', score: 6150, profileImage: null },
        { rank: 7, nickname: '학습왕', score: 5480, profileImage: null },
        { rank: 8, nickname: '노력파', score: 4920, profileImage: null },
      ];

      // 실제 API 응답 형식 예시:
      // [
      //   {
      //     rank: 1,
      //     nickname: "사용자닉네임",
      //     score: 9850,
      //     profileImage: "https://example.com/profile.jpg" // null 가능
      //   },
      //   ...
      // ]

      setTimeout(() => {
        setRankings(dummyData);
        setIsLoading(false);
      }, 500);
    } catch (err) {
      console.error('랭킹 데이터 로드 실패:', err);
      setError('랭킹 정보를 불러올 수 없습니다.');
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <FontAwesomeIcon icon={faTrophy} className={styles.goldIcon} />;
      case 2:
        return <FontAwesomeIcon icon={faMedal} className={styles.silverIcon} />;
      case 3:
        return <FontAwesomeIcon icon={faAward} className={styles.bronzeIcon} />;
      default:
        return <span className={styles.rankNumber}>{rank}</span>;
    }
  };

  const getProfileImage = (user) => {
    if (user.profileImage) {
      return user.profileImage;
    }
    // 기본 프로필 이미지 (첫 글자로 생성)
    return null;
  };

  if (isLoading) {
    return (
      <div className={styles.rankingBoard}>
        <div className={styles.header}>
          <h2 className={styles.title}>전체 랭킹</h2>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>랭킹 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.rankingBoard}>
        <div className={styles.header}>
          <h2 className={styles.title}>전체 랭킹</h2>
        </div>
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rankingBoard}>
      <div className={styles.header}>
        <h2 className={styles.title}>전체 랭킹</h2>
        <span className={styles.subtitle}>TOP {rankings.length}</span>
      </div>

      <div className={styles.rankingList}>
        {rankings.map((user) => (
          <div
            key={user.rank}
            className={`${styles.rankingItem} ${
              user.rank <= 3 ? styles.topRank : ''
            }`}
          >
            <div className={styles.rankBadge}>{getRankIcon(user.rank)}</div>

            <div className={styles.userInfo}>
              <div className={styles.profileImage}>
                {getProfileImage(user) ? (
                  <img src={getProfileImage(user)} alt={user.nickname} />
                ) : (
                  <div className={styles.defaultProfile}>
                    {user.nickname.charAt(0)}
                  </div>
                )}
              </div>
              <span className={styles.nickname}>{user.nickname}</span>
            </div>

            <div className={styles.score}>
              {user.score.toLocaleString()}
              <span className={styles.scoreLabel}>점</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingBoard;
