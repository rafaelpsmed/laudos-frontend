import { forwardRef, useCallback, useState } from 'react';
import { ActionIcon, Paper, Stack, Text } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import FraseBaseTipTap from './FraseBaseTipTap';
import { useAudioTranscription } from '../utils/useAudioTranscription';

/**
 * Editor de frase com botão de ditado.
 * Ctrl+Alt+A liga/desliga só no campo que está com o cursor.
 */
const FraseCampoComAudio = forwardRef(function FraseCampoComAudio(
  {
    value,
    onChange,
    onEditorReady,
    ...tiptapProps
  },
  ref,
) {
  const [editor, setEditor] = useState(null);

  const handleEditorReady = useCallback(
    (instance) => {
      setEditor(instance);
      onEditorReady?.(instance);
    },
    [onEditorReady],
  );

  const { isRecording, previewText, toggleRecording } = useAudioTranscription({
    editor,
    textoState: value,
    setTextoState: onChange,
    atalhoTeclado: 'Ctrl+Alt+A',
    atalhoSomenteSeFocado: true,
    pauseDelay: 2000,
  });

  const handleMicClick = useCallback(() => {
    editor?.commands?.focus();
    toggleRecording();
  }, [editor, toggleRecording]);

  return (
    <Stack gap={4}>
      <div style={{ position: 'relative' }}>
        <FraseBaseTipTap
          ref={ref}
          {...tiptapProps}
          value={value}
          onChange={onChange}
          onEditorReady={handleEditorReady}
        />
        <ActionIcon
          size="md"
          variant={isRecording ? 'filled' : 'subtle'}
          color={isRecording ? 'red' : 'blue'}
          onClick={handleMicClick}
          title="Atalho: Ctrl+Alt+A no campo com o cursor | Inserção rápida: Enter"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
          }}
        >
          {isRecording ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
        </ActionIcon>
      </div>
      {previewText && (
        <Paper p="xs" bg="blue.0" withBorder>
          <Text size="xs" c="blue.7" fw={500}>
            Gravando: {previewText}
          </Text>
        </Paper>
      )}
    </Stack>
  );
});

export default FraseCampoComAudio;
