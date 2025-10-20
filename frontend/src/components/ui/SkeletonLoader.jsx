/**
 * @개요 스켈레톤 로더 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {string} props.variant - 스켈레톤 타입 (card, text, circle, rectangle)
 * @매개변수 {number} props.width - 너비
 * @매개변수 {number} props.height - 높이
 * @매개변수 {number} props.count - 반복 개수
 * @반환값 {JSX.Element} 스켈레톤 로더 컴포넌트
 */

import styles from './SkeletonLoader.module.scss';

const SkeletonLoader = ({ 
  variant = 'rectangle', 
  width, 
  height, 
  count = 1 
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`${styles.skeleton} ${styles[variant]}`}
      style={{ 
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined
      }}
    />
  ));

  return <>{skeletons}</>;
};

export default SkeletonLoader;
