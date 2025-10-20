/**
 * @개요 웹캠 관리 커스텀 훅
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {Object} 웹캠 스트림, 상태, 제어 함수들
 */

import { useState, useEffect, useRef } from 'react';

const useWebcam = () => {
  const [stream, setStream] = useState(null);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  /**
   * 웹캠 시작
   */
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false // 퀴즈에서는 오디오 불필요
      });

      setStream(mediaStream);
      setIsWebcamOn(true);
      setError(null);

      // videoRef가 있으면 자동으로 연결
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      console.log('웹캠 시작 성공');
    } catch (err) {
      console.error('웹캠 시작 실패:', err);
      setError(err.message);
      setIsWebcamOn(false);
    }
  };

  /**
   * 웹캠 중지
   */
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
      setIsWebcamOn(false);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      console.log('웹캠 중지');
    }
  };

  /**
   * 웹캠 토글
   */
  const toggleWebcam = () => {
    if (isWebcamOn) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  /**
   * 컴포넌트 언마운트 시 웹캠 정리
   */
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  /**
   * stream이 변경되면 videoRef에 자동 연결
   */
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return {
    stream,
    isWebcamOn,
    error,
    videoRef,
    startWebcam,
    stopWebcam,
    toggleWebcam
  };
};

export default useWebcam;
