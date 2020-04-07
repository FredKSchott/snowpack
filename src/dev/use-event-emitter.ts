import {EventEmitter} from 'events';
import {useRef, useEffect} from 'react';

export function useEventEmitter(
  emitter: EventEmitter,
  eventName: string,
  eventHandler: (data: any) => void,
) {
  const eventHandlerRef = useRef();
  useEffect(() => {
    eventHandlerRef.current = eventHandler;
  }, [eventHandler]);
  useEffect(() => {
    emitter.on(eventName, (data) => eventHandlerRef.current(data));
    return () => {
      emitter.removeListener(eventName, eventHandler);
    };
  }, [eventName, emitter]);
}
