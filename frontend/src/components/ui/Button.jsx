/**
 * @개요 공통 버튼 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @매개변수 {string} props.children - 버튼 텍스트
 * @매개변수 {function} props.onClick - 클릭 핸들러
 * @매개변수 {boolean} props.disabled - 비활성화 상태
 * @매개변수 {string} props.variant - 버튼 스타일 (primary, secondary)
 * @반환값 {JSX.Element} 버튼 컴포넌트
 */

import './Button.scss';

const Button = ({ children, onClick, disabled = false, variant = 'primary' }) => {
  return (
    <button
      className={`common-button ${variant} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
