/**
 * @개요 퀴즈 대기방 Janus WebRTC 연결 관리 훅
 * @작성자 강관주 (Kanggwanju)
 * @작성일 2025-10-26
 */

import { useEffect, useCallback } from 'react';

export const useWaitingRoomJanus = ({
  roomId,
  myUserId,
  participants,
  isWebcamOn,
  stream,
  janusRef,
  pluginHandleRef,
  remoteFeedsRef,
  userIdToFeedIdRef,
  isJanusConnected,
  setIsJanusConnected,
  setRemoteStreams,
  isNavigatingToGameRef,
}) => {
  const JANUS_SERVER = import.meta.env.VITE_JANUS_SERVER || 'https://janus.jsflux.co.kr/janus';

  // Janus 연결
  useEffect(() => {
    if (!myUserId || participants.length === 0) {
      console.log('⏳ 방 입장 대기 중... Janus 연결 보류');
      return;
    }

    if (!isWebcamOn || !stream) {
      console.log('⏳ 웹캠 대기 중... Janus 연결 보류');
      return;
    }

    if (!window.Janus) {
      console.error('❌ Janus 라이브러리가 로드되지 않았습니다.');
      return;
    }

    if (isJanusConnected && janusRef.current && pluginHandleRef.current) {
      console.log('✅ Janus 이미 연결됨 - 재연결 스킵');
      return;
    }

    const Janus = window.Janus;

    console.log('🎥 Janus 연결 시작:', { roomId, myUserId });

    Janus.init({
      debug: 'all',
      callback: function () {
        console.log('✅ Janus 초기화 완료');

        janusRef.current = new Janus({
          server: JANUS_SERVER,
          success: function () {
            console.log('✅ Janus 서버 연결 성공');

            janusRef.current.attach({
              plugin: 'janus.plugin.videoroom',
              opaqueId: `user-${myUserId}`,
              success: function (pluginHandle) {
                console.log('✅ VideoRoom 플러그인 연결 성공');
                pluginHandleRef.current = pluginHandle;

                const register = {
                  request: 'join',
                  room: parseInt(roomId),
                  ptype: 'publisher',
                  display: String(myUserId),
                };

                pluginHandle.send({ message: register });
              },
              error: function (error) {
                console.error('❌ 플러그인 연결 실패:', error);
              },
              onmessage: function (msg, jsep) {
                handleJanusMessage(msg, jsep);
              },
              onlocalstream: function (localStream) {
                console.log('✅ 로컬 스트림 수신 (Janus echo)');
              },
              onremotestream: function () {
                // Publisher는 sendonly
              },
            });
          },
          error: function (error) {
            console.error('❌ Janus 서버 연결 실패:', error);
          },
          destroyed: function () {
            console.log('🔌 Janus 세션 종료');
          },
        });
      },
    });

    function handleJanusMessage(msg, jsep) {
      console.log('📨 Janus 메시지 수신:', msg);
      const event = msg['videoroom'];

      // 방이 없으면 생성
      if (event === 'event' && msg['error_code'] === 426) {
        console.log('⚠️ Janus 방이 없음 - 방 생성 시도');

        const create = {
          request: 'create',
          room: parseInt(roomId),
          description: `Game Room ${roomId}`,
          publishers: 10,
          bitrate: 128000,
          fir_freq: 10,
          audiocodec: 'opus',
          videocodec: 'vp8',
          record: false,
          permanent: false
        };

        pluginHandleRef.current.send({
          message: create,
          success: function (result) {
            console.log('✅ Janus 방 생성 성공:', result);
            const register = {
              request: 'join',
              room: parseInt(roomId),
              ptype: 'publisher',
              display: String(myUserId),
            };
            pluginHandleRef.current.send({ message: register });
          },
          error: function (error) {
            console.error('❌ Janus 방 생성 실패:', error);
          }
        });
        return;
      }

      if (event === 'joined') {
        const myFeedId = msg['id'];
        console.log('✅ Janus 방 참여 성공, My Feed ID:', myFeedId);
        setIsJanusConnected(true);

        publishOwnFeed();

        if (msg['publishers']) {
          msg['publishers'].forEach((publisher) => {
            const userId = parseInt(publisher.display);
            console.log('📺 기존 참가자 발견:', publisher.display, 'Feed ID:', publisher.id, '내 ID:', myUserId);

            if (userId !== myUserId) {
              userIdToFeedIdRef.current[userId] = publisher.id;
              subscribeToFeed(publisher.id, userId);
            } else {
              console.log('⏭️ 자기 자신은 구독 스킵');
            }
          });
        }
      } else if (event === 'event') {
        if (msg['publishers']) {
          msg['publishers'].forEach((publisher) => {
            const userId = parseInt(publisher.display);
            console.log('📺 새 참가자 입장:', publisher.display, 'Feed ID:', publisher.id, '내 ID:', myUserId);

            if (userId !== myUserId) {
              userIdToFeedIdRef.current[userId] = publisher.id;
              subscribeToFeed(publisher.id, userId);
            } else {
              console.log('⏭️ 자기 자신은 구독 스킵');
            }
          });
        }
        if (msg['leaving']) {
          const leavingFeedId = msg['leaving'];
          console.log('👋 Janus 참가자 퇴장, Feed ID:', leavingFeedId);

          let leavingUserId = null;
          for (const [userId, feedId] of Object.entries(userIdToFeedIdRef.current)) {
            if (feedId === leavingFeedId) {
              leavingUserId = parseInt(userId);
              break;
            }
          }

          if (remoteFeedsRef.current[leavingFeedId]) {
            remoteFeedsRef.current[leavingFeedId].detach();
            delete remoteFeedsRef.current[leavingFeedId];
          }

          if (leavingUserId) {
            delete userIdToFeedIdRef.current[leavingUserId];

            setRemoteStreams((prev) => {
              const newStreams = { ...prev };
              delete newStreams[leavingUserId];
              return newStreams;
            });
          }
        }
      }

      if (jsep) {
        pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
      }
    }

    function publishOwnFeed() {
      console.log('📤 내 스트림 publish 시작');

      pluginHandleRef.current.createOffer({
        stream: stream,
        media: {
          audioRecv: false,
          videoRecv: false,
          audioSend: true,
          videoSend: true,
        },
        success: function (jsep) {
          console.log('✅ Offer 생성 성공');
          const publish = {
            request: 'configure',
            audio: true,
            video: true,
          };
          pluginHandleRef.current.send({ message: publish, jsep: jsep });
        },
        error: function (error) {
          console.error('❌ Offer 생성 실패:', error);
        },
      });
    }

    function subscribeToFeed(feedId, userId) {
      let remoteFeed = null;
      console.log('📺 참가자 구독 시작:', { feedId, userId });

      janusRef.current.attach({
        plugin: 'janus.plugin.videoroom',
        opaqueId: `subscriber-${myUserId}-${feedId}`,
        success: function (pluginHandle) {
          remoteFeed = pluginHandle;
          const subscribe = {
            request: 'join',
            room: parseInt(roomId),
            ptype: 'subscriber',
            feed: feedId,
          };
          remoteFeed.send({ message: subscribe });
        },
        error: function (error) {
          console.error('❌ 구독 실패:', error);
        },
        onmessage: function (msg, jsep) {
          const event = msg['videoroom'];
          console.log('📨 Subscriber 메시지:', event, msg);

          if (jsep) {
            remoteFeed.createAnswer({
              jsep: jsep,
              media: { audioSend: false, videoSend: false },
              success: function (answerJsep) {
                const body = { request: 'start', room: parseInt(roomId) };
                remoteFeed.send({ message: body, jsep: answerJsep });
              },
              error: function (error) {
                console.error('❌ Answer 생성 실패:', error);
              },
            });
          }
        },
        onremotestream: function (remoteStream) {
          console.log('✅ 원격 스트림 수신:', { feedId, userId });
          remoteFeedsRef.current[feedId] = remoteFeed;
          setRemoteStreams((prev) => ({
            ...prev,
            [userId]: remoteStream,
          }));
        },
      });
    }

    return () => {
      if (isNavigatingToGameRef.current) {
        console.log('🎮 게임 페이지로 이동 - Janus 연결 유지');
        return;
      }

      console.log('🧹 Janus 연결 정리');
      if (janusRef.current) {
        janusRef.current.destroy();
        janusRef.current = null;
      }
      pluginHandleRef.current = null;
      remoteFeedsRef.current = {};
      userIdToFeedIdRef.current = {};
      setIsJanusConnected(false);
      setRemoteStreams({});
    };
  }, [
    myUserId,
    participants.length,
    roomId,
    isWebcamOn,
    stream,
    // 🔥 ref 객체들과 setter 함수들은 의존성 배열에서 제거 (무한 루프 방지)
    // janusRef, pluginHandleRef, remoteFeedsRef, userIdToFeedIdRef는 ref이므로 제외
    // setIsJanusConnected, setRemoteStreams는 setter이므로 제외
    // isJanusConnected는 cleanup에서 변경하므로 제외
    // isNavigatingToGameRef는 ref이므로 제외
    // JANUS_SERVER는 상수이므로 제외
  ]);
};
