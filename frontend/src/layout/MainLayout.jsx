/**
 * @개요 메인 레이아웃 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-20
 * @매개변수 {React.ReactNode} props.children - 레이아웃 내부에 렌더링될 자식 컴포넌트
 * @반환값 {JSX.Element} Header, Footer를 포함한 레이아웃 컴포넌트
 */

import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import styles from './MainLayout.module.scss';

const MainLayout = ({ children }) => {
  return (
    <div className={styles.mainLayout}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
