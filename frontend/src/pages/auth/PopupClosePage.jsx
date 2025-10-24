import React, { useEffect } from "react";
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
// import { TbXboxX } from "react-icons/tb";
import styles from './PopupClosePage.module.scss';
import { useAuthStore } from "../../store/auth/authStore";

const PopupClosePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorMessage = searchParams.get('error');
  const statusMessage = searchParams.get('status');
  const {user, fetchMe, hasCheckedAuth, loading} = useAuthStore();

  //  최초 마운트 시 fetchMe()를 호출하여 사용자 정보를 로드 (최우선)
  // 소셜 로그인 성공 직후 백엔드가 설정한 쿠키를 기반으로 사용자 정보를 가져옵니다.
  useEffect(() => {
    // 에러 메시지가 없고, 아직 인증 체크를 하지 않았을 때만 호출
    if (!errorMessage && !hasCheckedAuth) {
      console.log("PopupClosePage mount: Calling fetchMe() to load user data (requiredAgree 포함).");
      fetchMe();
    }
  }, [errorMessage, hasCheckedAuth, fetchMe]); // hasCheckedAuth가 false일 때만 fetchMe 호출

  // 1. OAuth2 로그인 성공 후 사용자 정보가 로드되면 처리하는 로직 (약관 동의 체크 및 리디렉션)
  // 의존성: errorMessage, hasCheckedAuth, loading, user, statusMessage, navigate
  useEffect(() => {
    console.log("로그", errorMessage, hasCheckedAuth, loading, user, statusMessage, navigate);
    console.log("사용자 정보 로딩 완료!!@#!#!#@!#!@#@");
    // 에러 메시지가 없고, 인증 체크를 완료했으며, 로딩 중이 아니고, 사용자 정보가 있을 때
    if (!errorMessage && hasCheckedAuth && !loading && user) {
      console.log("사용자 정보 로딩 완료, requiredAgree 값 확인:", user.requiredAgree);

      if (window.opener) {
        // 'logout' 상태가 아닐 때만 약관 동의/메인 페이지 분기 처리
        if (statusMessage !== 'logout') {
          // requiredAgree 값에 따른 분기 처리
          if (user.requiredAgree) {
            // 약관 동의 완료: 팝업 닫고 부모 창을 /main으로 이동
            console.log("약관 동의 완료 - 팝업 닫고 부모 창을 /main으로 이동");
            window.opener.location.href = "https://localhost:5173/main";
            window.opener.focus();
            window.close();
          } else {
            // 약관 미동의: 팝업 창에서 /terms로 이동
            console.log("약관 미동의 - 팝업 창에서 /terms로 이동");
            navigate('/terms');
          }
        }
      } else {
        // 팝업이 아닐 경우
        if (user.requiredAgree === true) {
          console.log("팝업아니어서 메인으로 가기")
          navigate('/main');
        } else {
          navigate('/terms');
        }
      }
    }
  }, [errorMessage, hasCheckedAuth, loading, user, statusMessage, navigate]);


  // 2. 로그아웃 상태 처리 (statusMessage === 'logout' logic)
  // 의존성: statusMessage
  useEffect(() => {
    if (statusMessage === 'logout' && window.opener) {
      console.log("로그아웃 후 팝업 닫기: 부모 창 이동/새로고침 없음");
      // 로그아웃 시: 부모 창을 건드리지 않고 팝업만 닫음
      window.close();
    }
  }, [statusMessage]);


  // 로그인 실패 처리
  useEffect(() => {
    if (errorMessage) {
      console.log("팝업 로그인 실패");
      if (window.opener) {
        // 부모 창을 현재 팝업 창의 URL로 이동
        window.opener.location.href = window.location.href;
        window.close();
      } else {
        // 팝업이 아닐 경우 그대로 있음
      }
    }
  }, [errorMessage]);

  return (
    <div className={`${styles.container} ${styles.popupContainer}`}>
      <main className={styles.popupMain}>
        <div className={styles.popupCard}>
          {errorMessage ? (
            <>
              <div className={styles.errorHeader}>
                {/*<TbXboxX className={styles.errorIcon}/>*/}
                <h1 className={styles.errorTitle}>로그인 오류</h1>
                <p className={styles.errorSubtitle}>
                  로그인 과정에서 문제가 발생했습니다.
                </p>
              </div>

              <div className={styles.errorContent}>
                <div className={styles.errorMessage}>
                  <span className={styles.errorText}>
                    {errorMessage === 'access_denied'
                      ? '로그인이 취소되었습니다.'
                      : '인증 과정에서 오류가 발생했습니다.'}
                  </span>
                </div>

                <div className={styles.actionContainer}>
                  <Link
                    to='/login'
                    className={styles.retryButton}
                  >
                    로그인 페이지로
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.successHeader}>
                <div className={styles.loadingSpinner}></div>
                <h1 className={styles.successTitle}>로그인 중...</h1>
                <p className={styles.successSubtitle}>
                  로그인을 완료하는 중입니다.
                </p>
              </div>

              <div className={styles.successContent}>
                <p className={styles.processingMessage}>
                  잠시만 기다려주세요.<br />
                  곧 메인 페이지로 이동합니다.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PopupClosePage;