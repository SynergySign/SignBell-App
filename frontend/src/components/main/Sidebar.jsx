/**
 * @개요 공통 사이드바 컨테이너 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-18
 * @최종수정일 2025-10-18
 * @매개변수 {boolean} props.isOpen - 사이드바 열림 상태
 * @매개변수 {function} props.onClose - 사이드바 닫기 핸들러
 * @매개변수 {React.ReactNode} props.children - 사이드바 내용
 * @매개변수 {string} props.title - 사이드바 제목
 * @반환값 {JSX.Element} 사이드바 컨테이너 컴포넌트
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import './Sidebar.scss';

const Sidebar = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="sidebar-overlay" onClick={onClose} />
      <div className="sidebar">
        <div className="sidebar-header">
          <h3 className="sidebar-title">{title}</h3>
          <button className="sidebar-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="sidebar-content">{children}</div>
      </div>
    </>
  );
};

export default Sidebar;
