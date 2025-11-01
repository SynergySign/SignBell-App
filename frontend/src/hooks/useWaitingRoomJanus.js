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

  // 🔥 웹캠 토글 시 스트림 업데이트
  useEffect(() => {
    // Janus가 연결되어 있고, pluginHandle이 있을 때만 실행
    if (!isJanusConnected || !pluginHandleRef.current) {
      return;
    }

    // 초기 연결 시에는 스킵 (publishOwnFeed에서 처리)
    if (!pluginHandleRef.current.webrtcStuff || !pluginHandleRef.current.webrtcStuff.pc) {
      return;
    }

    if (isWebcamOn && stream) {
      // 웹캠 켜짐 - 비디오 트랙만 교체
      console.log('📹 웹캠 켜짐 - Janus 비디오 트랙 교체');
      
      try {
        const pc = pluginHandleRef.current.webrtcStuff.pc;
        const videoTrack = stream.getVideoTracks()[0];
        
        if (!videoTrack) {
          console.error('❌ 비디오 트랙을 찾을 수 없습니다');
          return;
        }

        // 기존 비디오 sender 찾기
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
        
        if (videoSender) {
          // 기존 트랙 교체
          videoSender.replaceTrack(videoTrack).then(() => {
            console.log('✅ 비디오 트랙 교체 성공');
            
            // Janus에 비디오 활성화 알림
            const configure = {
              request: 'configure',
              video: true,
            };
            pluginHandleRef.current.send({ message: configure });
          }).catch(error => {
            console.error('❌ 비디오 트랙 교체 실패:', error);
          });
        } else {
          console.warn('⚠️ 기존 비디오 sender를 찾을 수 없습니다');
        }
      } catch (error) {
        console.error('❌ 웹캠 켜기 처리 중 오류:', error);
      }
    } else if (!isWebcamOn) {
      // 웹캠 꺼짐 - 비디오만 끄기
      console.log('📹 웹캠 꺼짐 - Janus 비디오 중지');
      
      try {
        const configure = {
          request: 'configure',
          video: false,
        };
        pluginHandleRef.current.send({ message: configure });
      } catch (error) {
        console.error('❌ 웹캠 끄기 처리 중 오류:', error);
      }
    }
  }, [isWebcamOn, stream, isJanusConnected]);

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

    // 🔥 이미 연결되어 있으면 재연결 스킵 (중복 연결 방지)
    if (isJanusConnected && janusRef.current && pluginHandleRef.current) {
      console.log('✅ Janus 이미 연결됨 - 재연결 스킵');
      return;
    }

    // 🔥 기존 연결이 있으면 완전히 정리 후 재연결
    if (janusRef.current || pluginHandleRef.current) {
      console.log('🧹 기존 Janus 연결 정리 후 재연결');
      
      if (remoteFeedsRef.current) {
        Object.values(remoteFeedsRef.current).forEach(feed => {
          try {
            if (feed && typeof feed.detach === 'function') {
              feed.detach();
            }
          } catch (error) {
            console.error('❌ Remote feed detach 실패:', error);
          }
        });
        remoteFeedsRef.current = {};
      }

      if (pluginHandleRef.current) {
        try {
          pluginHandleRef.current.detach();
        } catch (error) {
          console.error('❌ Plugin detach 실패:', error);
        }
        pluginHandleRef.current = null;
      }

      if (janusRef.current) {
        try {
          janusRef.current.destroy();
        } catch (error) {
          console.error('❌ Janus destroy 실패:', error);
        }
        janusRef.current = null;
      }

      setRemoteStreams({});
      userIdToFeedIdRef.current = {};
      setIsJanusConnected(false);
    }

    const Janus = window.Janus;

    console.log('🎥 Janus 연결 시작:', { roomId, myUserId });

    Janus.init({
      debug: false, // 프로덕션에서는 Janus 로그 비활성화
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
          bitrate: 512000,        // 🔥 128k -> 512k (비트레이트 증가)
          bitrate_cap: true,      // 🔥 비트레이트 상한 적용
          fir_freq: 5,            // 🔥 10 -> 5 (키프레임 요청 빈도 증가)
          audiocodec: 'opus',
          videocodec: 'vp8',
          video_svc: true,        // 🔥 SVC(Scalable Video Coding) 활성화
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

        // 🔥 내 스트림 publish (약간의 지연 후)
        setTimeout(() => {
          // 🔥 pluginHandle이 여전히 유효한지 확인
          if (pluginHandleRef.current) {
            publishOwnFeed();
          } else {
            console.warn('⚠️ pluginHandle이 정리됨 - publish 스킵');
          }
        }, 100);

        if (msg['publishers']) {
          console.log(`📺 기존 참가자 ${msg['publishers'].length}명 발견`);
          
          // 🔥 각 참가자 구독 시 약간의 지연 (동시 구독 방지)
          msg['publishers'].forEach((publisher, index) => {
            const userId = parseInt(publisher.display);
            console.log(`📺 [${index + 1}/${msg['publishers'].length}] 참가자:`, publisher.display, 'Feed ID:', publisher.id, '내 ID:', myUserId);

            if (userId !== myUserId) {
              userIdToFeedIdRef.current[userId] = publisher.id;
              
              // 🔥 순차적으로 구독 (150ms 간격으로 증가)
              setTimeout(() => {
                subscribeToFeed(publisher.id, userId);
              }, index * 150);
            } else {
              console.log('⏭️ 자기 자신은 구독 스킵');
            }
          });
        }
      } else if (event === 'event') {
        if (msg['publishers']) {
          msg['publishers'].forEach((publisher) => {
            const userId = parseInt(publisher.display);
            const feedId = publisher.id;
            
            console.log('📺 새 참가자 입장:', publisher.display, 'Feed ID:', feedId, '내 ID:', myUserId);

            if (userId !== myUserId) {
              // 🔥 이미 구독 중인지 확인 (중복 구독 방지)
              if (remoteFeedsRef.current[feedId]) {
                console.log('⏭️ 이미 구독 중인 Feed:', feedId);
                return;
              }

              userIdToFeedIdRef.current[userId] = feedId;
              subscribeToFeed(feedId, userId);
            } else {
              console.log('⏭️ 자기 자신은 구독 스킵');
            }
          });
        }
        
        // 🔥 unpublished 이벤트도 처리 (leaving과 동일)
        const leavingFeedId = msg['leaving'] || msg['unpublished'];
        if (leavingFeedId) {
          console.log('👋 Janus 참가자 퇴장, Feed ID:', leavingFeedId);

          let leavingUserId = null;
          for (const [userId, feedId] of Object.entries(userIdToFeedIdRef.current)) {
            if (feedId === leavingFeedId) {
              leavingUserId = parseInt(userId);
              break;
            }
          }

          if (remoteFeedsRef.current[leavingFeedId]) {
            try {
              remoteFeedsRef.current[leavingFeedId].detach();
            } catch (error) {
              console.error('❌ Feed detach 실패:', error);
            }
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

      // 🔥 pluginHandle이 null이면 중단
      if (!pluginHandleRef.current) {
        console.error('❌ pluginHandle이 null입니다 - publish 중단');
        return;
      }

      pluginHandleRef.current.createOffer({
        stream: stream,
        media: {
          audioRecv: false,
          videoRecv: false,
          audioSend: true,
          videoSend: true,
        },
        // 🔥 비디오 품질 설정 추가
        simulcast: false,
        success: function (jsep) {
          console.log('✅ Offer 생성 성공');
          const publish = {
            request: 'configure',
            audio: true,
            video: true,
            bitrate: 512000,      // 🔥 비트레이트 명시
            keyframe: true,       // 🔥 키프레임 즉시 전송
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
          console.log('✅ 원격 스트림 수신:', { 
            feedId, 
            userId,
            streamId: remoteStream.id,
            active: remoteStream.active,
            tracks: remoteStream.getTracks().map(t => ({ 
              kind: t.kind, 
              enabled: t.enabled,
              readyState: t.readyState 
            }))
          });
          
          remoteFeedsRef.current[feedId] = remoteFeed;
          
          // 🔥 스트림 수신 후 키프레임 요청 (품질 향상)
          setTimeout(() => {
            if (remoteFeed && remoteFeed.send) {
              try {
                remoteFeed.send({ 
                  message: { 
                    request: 'configure',
                    substream: 2,  // 최고 품질 서브스트림
                    temporal: 2    // 최고 품질 temporal layer
                  } 
                });
                console.log('🎬 키프레임 요청 전송:', userId);
              } catch (e) {
                console.warn('⚠️ 키프레임 요청 실패:', e);
              }
            }
          }, 500);
          
          // 🔥 스트림 상태 업데이트
          setRemoteStreams((prev) => {
            const updated = {
              ...prev,
              [userId]: remoteStream,
            };
            console.log('📹 Remote streams 업데이트:', Object.keys(updated));
            return updated;
          });
        },
      });
    }

    return () => {
      if (isNavigatingToGameRef.current) {
        console.log('🎮 게임 페이지로 이동 - Janus 연결 유지');
        return;
      }

      console.log('🧹 Janus 연결 정리 시작');
      
      // 🔥 상태를 먼저 초기화하여 새로운 연결 시도 차단
      setIsJanusConnected(false);
      
      // 🔥 Remote feeds 정리
      if (remoteFeedsRef.current && Object.keys(remoteFeedsRef.current).length > 0) {
        console.log('🔌 Remote feeds 정리:', Object.keys(remoteFeedsRef.current).length);
        Object.values(remoteFeedsRef.current).forEach(feed => {
          try {
            if (feed && typeof feed.detach === 'function') {
              feed.detach();
            }
          } catch (error) {
            console.error('❌ Remote feed detach 실패:', error);
          }
        });
        remoteFeedsRef.current = {};
      }

      // 🔥 Publisher plugin 정리
      if (pluginHandleRef.current) {
        console.log('🔌 Publisher plugin 정리');
        try {
          pluginHandleRef.current.detach();
        } catch (error) {
          console.error('❌ Plugin detach 실패:', error);
        }
        pluginHandleRef.current = null;
      }

      // 🔥 Janus 세션 종료
      if (janusRef.current) {
        console.log('🔌 Janus 세션 종료');
        try {
          janusRef.current.destroy();
        } catch (error) {
          console.error('❌ Janus destroy 실패:', error);
        }
        janusRef.current = null;
      }

      // 🔥 상태 초기화
      userIdToFeedIdRef.current = {};
      setRemoteStreams({});
      
      console.log('✅ Janus 연결 정리 완료');
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
