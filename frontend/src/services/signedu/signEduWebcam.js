import { useState, useRef, useCallback, useEffect } from 'react';

// useSignEduWebcam 훅: SignDetailPage 같은 컴포넌트에서 웹캠 제어를 재사용 가능하게 분리
export default function useSignEduWebcam() {
  const [isCamOn, setIsCamOn] = useState(false);
  const [camError, setCamError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 장치 목록 갱신
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = list.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (!selectedDeviceId && videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
    } catch (err) {
      console.error('refreshDevices 실패:', err);
    }
  }, [selectedDeviceId]);

  // 내부: 여러 디바이스/제약조건을 순차 시도
  const tryDevices = useCallback(async (videoDevices) => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    for (const dev of videoDevices) {
      const variants = [
        { video: { deviceId: { exact: dev.deviceId } }, audio: false },
        { video: { deviceId: { ideal: dev.deviceId } }, audio: false },
        { video: true, audio: false },
      ];
      for (const constraints of variants) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          return stream;
        } catch {
          await sleep(100);
        }
      }
    }
    throw new Error('all-device-failed');
  }, []);

  const startCamera = useCallback(async (deviceId) => {
    setCamError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamError('브라우저가 카메라 접근을 지원하지 않습니다.');
      return;
    }

    try {
      // 기존 스트림 정리
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
        streamRef.current = null;
      }

      let constraints;
      if (deviceId) constraints = { video: { deviceId: { exact: deviceId } }, audio: false };
      else constraints = { video: { facingMode: 'user' }, audio: false };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        const name = err && err.name ? err.name : '';
        if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'OverconstrainedError') {
          try {
            const list = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = list.filter((d) => d.kind === 'videoinput');
            if (videoDevices.length > 0) {
              stream = await tryDevices(videoDevices);
            } else {
              throw err;
            }
          } catch {
            throw err;
          }
        } else {
          throw err;
        }
      }

      // 성공
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // 일부 브라우저는 play()가 거부될 수 있음(자동 재생 정책)
        }
      }
      setIsCamOn(true);
      // 라벨이 채워질 수 있으니 갱신
      refreshDevices();
    } catch (err) {
      console.error('startCamera 실패:', err);
      const name = err && err.name ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
        setCamError('카메라 접근이 거부되었습니다. 브라우저 권한 설정에서 카메라 접근을 허용해주세요.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCamError('사용 가능한 카메라 장치를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인하세요.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCamError('카메라 장치를 열 수 없습니다. 다른 앱이 카메라를 사용 중이거나 장치 드라이버에 문제가 있을 수 있습니다. 카메라를 사용 중인 프로그램을 종료한 뒤 다시 시도하세요.');
      } else if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        setCamError('요청한 카메라 제약 조건을 만족하는 장치가 없습니다.');
      } else if (err && err.message === 'all-device-failed') {
        setCamError('모든 카메라 장치에서 스트림을 얻지 못했습니다. 시스템 설정과 다른 앱을 확인하세요.');
      } else {
        setCamError('카메라 접근을 허용해주세요. (' + (err && err.message ? err.message : '알 수 없는 오류') + ')');
      }
    }
  }, [refreshDevices, tryDevices]);

  const stopCamera = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.error('stopCamera 중 오류:', err);
    } finally {
      setIsCamOn(false);
    }
  }, []);

  // 언마운트 시 정리
  useEffect(() => {
    // 초기 장치 시도
    refreshDevices();
    const id = setTimeout(refreshDevices, 1000);
    return () => {
      clearTimeout(id);
      stopCamera();
    };
  }, [refreshDevices, stopCamera]);

  return {
    isCamOn,
    camError,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    videoRef,
    startCamera,
    stopCamera,
    refreshDevices,
  };
}
