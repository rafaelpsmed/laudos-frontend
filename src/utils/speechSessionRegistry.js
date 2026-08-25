const stoppers = new Set();

export function registerSpeechStopper(stopFn) {
  stoppers.add(stopFn);
  return () => {
    stoppers.delete(stopFn);
  };
}

export function stopOtherSpeechSessions(exceptFn) {
  for (const stopFn of [...stoppers]) {
    if (stopFn !== exceptFn) {
      stopFn();
    }
  }
}

function editorTemFoco(editor) {
  if (!editor) {
    return false;
  }
  if (editor.isFocused) {
    return true;
  }
  if (typeof editor.view?.hasFocus === 'function' && editor.view.hasFocus()) {
    return true;
  }
  const dom = editor.view?.dom;
  return Boolean(dom && document.activeElement && dom.contains(document.activeElement));
}

export { editorTemFoco };
