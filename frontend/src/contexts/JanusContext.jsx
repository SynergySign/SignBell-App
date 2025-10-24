/**
 * @파일명 JanusContext.jsx
 * @개요 Janus WebRTC 연결을 전역으로 관리하는 Context
 * @설명 대기실과 게임 페이지 간 Janus 연결을 유지하기 위해 사용
 * @author Kiro
 * @since 2025-10-23
 */

import { createContext, useContext, useRef, useState } from 'react';

const JanusContext = createContext(null);

export const JanusProvider = ({ children }) => {
  const janusRef = useRef(null);
  const pluginHandleRef = useRef(null);
  const remoteFeedsRef = useRef({});
  const userIdToFeedIdRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isJanusConnected, setIsJanusConnected] = useState(false);

  const value = {
    janusRef,
    pluginHandleRef,
    remoteFeedsRef,
    userIdToFeedIdRef,
    remoteStreams,
    setRemoteStreams,
    isJanusConnected,
    setIsJanusConnected,
  };

  return <JanusContext.Provider value={value}>{children}</JanusContext.Provider>;
};

export const useJanus = () => {
  const context = useContext(JanusContext);
  if (!context) {
    throw new Error('useJanus must be used within a JanusProvider');
  }
  return context;
};
