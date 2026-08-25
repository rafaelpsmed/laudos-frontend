import { useCallback, useEffect, useRef } from 'react';
import api from '../api';

const MIN_BLOB_BYTES = 2000;
const SILENCE_RMS_THRESHOLD = 0.015;
const SILENCE_POLL_MS = 120;

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function measureRms(analyser, buffer) {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const normalized = (buffer[i] - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / buffer.length);
}

async function transcreverAudioWhisper(blob) {
  const formData = new FormData();
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
  formData.append('audio', blob, `gravacao.${extension}`);

  const response = await api.post('/api/ia/transcrever_audio/', formData, {
    headers: { 'Content-Type': false },
  });

  return response.data?.texto?.trim() || null;
}

/**
 * Motor Whisper (Groq) paralelo ao Web Speech API.
 * Não substitui o código do Google — só entra quando enabled=true.
 */
export function useWhisperRecording({
  enabled,
  pauseDelay,
  isRecording,
  setIsRecording,
  isRecordingRef,
  accumulatedTextRef,
  setPreviewText,
  insertAccumulatedText,
  editorRef,
}) {
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserBufferRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastSoundAtRef = useRef(0);
  const hasSpeechInSegmentRef = useRef(false);
  const transcribeQueueRef = useRef(Promise.resolve());
  const pendingCountRef = useRef(0);

  const stopTracks = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    analyserBufferRef.current = null;
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
  }, []);

  const enqueueTranscribe = useCallback((blob) => {
    pendingCountRef.current += 1;
    setPreviewText('Transcrevendo…');

    transcribeQueueRef.current = transcribeQueueRef.current
      .then(async () => {
        const texto = await transcreverAudioWhisper(blob);
        if (texto) {
          accumulatedTextRef.current = texto;
          await insertAccumulatedText();
        }
      })
      .catch(() => {
        setPreviewText('Falha na transcrição. Continue falando…');
      })
      .finally(() => {
        pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
        if (isRecordingRef.current && pendingCountRef.current === 0) {
          setPreviewText('Gravando…');
        } else if (!isRecordingRef.current && pendingCountRef.current === 0) {
          setPreviewText('');
        }
      });
  }, [accumulatedTextRef, insertAccumulatedText, isRecordingRef, setPreviewText]);

  const startRecorder = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream || !isRecordingRef.current) {
      return;
    }

    const mimeType = pickRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recordedChunksRef.current = [];
    hasSpeechInSegmentRef.current = false;
    lastSoundAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      recordedChunksRef.current = [];

      if (blob.size >= MIN_BLOB_BYTES) {
        enqueueTranscribe(blob);
      }

      if (isRecordingRef.current) {
        startRecorder();
      } else {
        stopTracks();
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
  }, [enqueueTranscribe, isRecordingRef, stopTracks]);

  const startSilenceWatch = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
    }

    silenceTimerRef.current = setInterval(() => {
      if (!isRecordingRef.current || !analyserRef.current || !analyserBufferRef.current) {
        return;
      }

      const rms = measureRms(analyserRef.current, analyserBufferRef.current);
      const now = Date.now();

      if (rms >= SILENCE_RMS_THRESHOLD) {
        lastSoundAtRef.current = now;
        hasSpeechInSegmentRef.current = true;
        return;
      }

      const recorder = mediaRecorderRef.current;
      if (
        hasSpeechInSegmentRef.current &&
        now - lastSoundAtRef.current >= pauseDelay &&
        recorder &&
        recorder.state === 'recording'
      ) {
        hasSpeechInSegmentRef.current = false;
        recorder.stop();
      }
    }, SILENCE_POLL_MS);
  }, [isRecordingRef, pauseDelay]);

  const startWhisperRecording = useCallback(async () => {
    if (!enabled || isRecordingRef.current) {
      return;
    }

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      alert('Este navegador não suporta gravação de áudio para o Whisper.');
      return;
    }

    try {
      if (editorRef.current) {
        editorRef.current.commands.focus();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      analyserBufferRef.current = new Uint8Array(analyser.fftSize);

      isRecordingRef.current = true;
      setIsRecording(true);
      setPreviewText('Gravando…');
      accumulatedTextRef.current = '';

      startRecorder();
      startSilenceWatch();
    } catch (error) {
      stopTracks();
      setIsRecording(false);
      isRecordingRef.current = false;
      if (error?.name === 'NotAllowedError') {
        alert('Por favor, permita o acesso ao microfone para usar esta função.');
      } else {
        alert('Erro ao iniciar a gravação. Por favor, tente novamente.');
      }
    }
  }, [
    accumulatedTextRef,
    editorRef,
    enabled,
    isRecordingRef,
    setIsRecording,
    setPreviewText,
    startRecorder,
    startSilenceWatch,
    stopTracks,
  ]);

  const stopWhisperRecording = useCallback(() => {
    if (!enabled) {
      return;
    }

    isRecordingRef.current = false;
    setIsRecording(false);

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      return;
    }

    setPreviewText('');
    stopTracks();
  }, [enabled, isRecordingRef, setIsRecording, setPreviewText, stopTracks]);

  const toggleWhisperRecording = useCallback(() => {
    if (!enabled) {
      return;
    }
    if (isRecording) {
      stopWhisperRecording();
    } else {
      startWhisperRecording();
    }
  }, [enabled, isRecording, startWhisperRecording, stopWhisperRecording]);

  const flushWhisperSegment = useCallback(() => {
    if (!enabled || !isRecordingRef.current) {
      return false;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording' && hasSpeechInSegmentRef.current) {
      recorder.stop();
      return true;
    }
    return false;
  }, [enabled, isRecordingRef]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      try {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // gravador já parado
      }
      stopTracks();
    };
  }, [isRecordingRef, stopTracks]);

  return {
    toggleWhisperRecording,
    stopWhisperRecording,
    startWhisperRecording,
    flushWhisperSegment,
  };
}

export default useWhisperRecording;
