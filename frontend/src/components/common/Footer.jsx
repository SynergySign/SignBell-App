/**
 * @개요 공통 푸터 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 푸터 컴포넌트
 */

import './Footer.scss';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p>&copy; 2025 SignBell. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
