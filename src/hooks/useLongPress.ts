import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
  threshold?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

export const useLongPress = (
  onLongPress: () => void,
  threshold: number = 500,
  options: LongPressOptions = {}
) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (options.onStart) {
        options.onStart();
      }

      target.current = event.target;
      setIsLongPressing(false);

      timeout.current = setTimeout(() => {
        onLongPress();
        setIsLongPressing(true);
        if (options.onFinish) {
          options.onFinish();
        }
      }, threshold);
    },
    [onLongPress, threshold, options]
  );

  const clear = useCallback(
    (shouldTriggerOnCancel = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerOnCancel && options.onCancel && isLongPressing) {
        options.onCancel();
      }
      setIsLongPressing(false);
    },
    [options, isLongPressing]
  );

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: () => clear(false),
    onMouseLeave: () => clear(true),
    // Moving the finger means the user is scrolling/swiping, not long-pressing —
    // cancel the pending timer so the action menu doesn't pop up mid-scroll.
    onTouchMove: () => clear(false),
    onTouchEnd: () => clear(false),
    onTouchCancel: () => clear(true),
    isLongPressing,
  };
};