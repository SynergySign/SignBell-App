/**
 * @개요 전체 사용자 랭킹 보드 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-24
 * @최종수정일 2025-10-28
 * @반환값 {JSX.Element} 랭킹 보드 컴포넌트
 */

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward } from '@fortawesome/free-solid-svg-icons';
import { RankService } from '../../services/api/rankService';
import { useAuthStore } from '../../store/auth/authStore';
import styles from './RankingBoard.module.scss';

const RankingBoard = () => {
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, hasCheckedAuth } = useAuthStore();

  useEffect(() => {
    // 인증 확인이 완료되고 로그인된 상태에서만 랭킹 조회
    if (hasCheckedAuth && isAuthenticated) {
      fetchRankings();
    } else if (hasCheckedAuth && !isAuthenticated) {
      // 로그인하지 않은 경우
      setIsLoading(false);
      setError('로그인이 필요합니다.');
    }
  }, [hasCheckedAuth, isAuthenticated]);

  const fetchRankings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await RankService.getRankings();
      setRankings(data);
    } catch (err) {
      // 401 에러는 apiClient에서 자동으로 처리하므로 여기서는 무시
      if (err.response?.status === 401) {
        return;
      }
      
      // 기타 에러만 처리
      if (err.response?.data) {
        const errorData = err.response.data;
        setError(errorData.detail || errorData.error || '랭킹 정보를 불러올 수 없습니다.');
      } else {
        setError('랭킹 정보를 불러올 수 없습니다.');
      }
    } finally {
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
