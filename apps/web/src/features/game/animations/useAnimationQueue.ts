/**
 * Manages a sequential queue of animation events.
 * Events are played one at a time; each completes before the next starts.
 * Deduplicates by event id to prevent replaying the same server event.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { AnimationEvent } from "./types";

export interface AnimationQueue {
  current: AnimationEvent | null;
  queueLength: number;
  enqueue: (events: AnimationEvent[]) => void;
  onComplete: () => void;
  skip: () => void;
  clear: () => void;
}

export function useAnimationQueue(): AnimationQueue {
  const [current, setCurrent] = useState<AnimationEvent | null>(null);
  const queueRef = useRef<AnimationEvent[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [queueLength, setQueueLength] = useState(0);
  const processingRef = useRef(false);

  const pump = useCallback(() => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) {
      setCurrent(null);
      setQueueLength(0);
      return;
    }
    processingRef.current = true;
    const next = queueRef.current.shift()!;
    setQueueLength(queueRef.current.length);
    setCurrent(next);
  }, []);

  const enqueue = useCallback((events: AnimationEvent[]) => {
    let added = false;
    for (const ev of events) {
      if (seenIdsRef.current.has(ev.id)) continue;
      seenIdsRef.current.add(ev.id);
      queueRef.current.push(ev);
      added = true;
    }
    if (added) {
      setQueueLength(queueRef.current.length);
      pump();
    }
  }, [pump]);

  const onComplete = useCallback(() => {
    processingRef.current = false;
    pump();
  }, [pump]);

  const skip = useCallback(() => {
    processingRef.current = false;
    pump();
  }, [pump]);

  const clear = useCallback(() => {
    queueRef.current = [];
    seenIdsRef.current.clear();
    processingRef.current = false;
    setCurrent(null);
    setQueueLength(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      queueRef.current = [];
      processingRef.current = false;
    };
  }, []);

  return { current, queueLength, enqueue, onComplete, skip, clear };
}
