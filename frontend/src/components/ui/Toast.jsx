/**
 * @개요 토스트 알림 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {boolean} props.isOpen - 토스트 표시 상태
 * @매개변수 {string} props.message - 토스트 메시지
 * @매개변수 {string} props.type - 토스트 타입 ('info', 'success', 'warning', 'error')
 * @반환값 {JSX.Element} 토스트 컴포넌트
 */

import { useEffect } from 'react';
import styles from './Toast.module.scss';

const Toast = ({ isOpen, message, type = 'info' }) => {
  if (!isOpen) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.message}>{message}</span>
    </div>
  );
};

export default Toast;
