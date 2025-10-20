/**
 * @개요 소셜 로그인 버튼 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @매개변수 {string} props.provider - 소셜 로그인 제공자 (kakao, google 등)
 * @매개변수 {function} props.onClick - 버튼 클릭 핸들러
 * @반환값 {JSX.Element} 소셜 로그인 버튼 컴포넌트
 */

import styles from './SocialLoginButton.module.scss';

const SocialLoginButton = ({ provider, onClick }) => {
  const getButtonText = () => {
    switch (provider) {
      case 'kakao':
        return '카카오로 시작하기';
      default:
        return '로그인';
    }
  };

  return (
    <button 
      className={`${styles.socialLoginButton} ${styles[provider]}`}
      onClick={onClick}
    >
      {getButtonText()}
    </button>
  );
};

export default SocialLoginButton;
