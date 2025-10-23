/**
 * @개요 마이페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-23
 * @최종수정일 2025-10-23
 * @반환값 {JSX.Element} 마이페이지 컴포넌트
 */

import { useState } from 'react';
import styles from './MyPage.module.scss';

const MyPage = () => {
  return (
    <div className={styles.myPage}>
      <div className={styles.mainContent}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>마이페이지</h1>
          
          {/* TODO: 프로필 이미지 수정 컴포넌트 추가 예정 */}
          
          {/* TODO: 닉네임 수정 컴포넌트 추가 예정 */}
          
          {/* TODO: 약관 보기 섹션 추가 예정 */}
        </div>
      </div>
    </div>
  );
};

export default MyPage;
