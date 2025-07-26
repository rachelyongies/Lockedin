import { useEffect, useRef, useCallback } from 'react'

interface UseIntersectionObserverOptions {
  onIntersect: (() => void) | undefined
  enabled?: boolean
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useIntersectionObserver({
  onIntersect,
  enabled = true,
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = false
}: UseIntersectionObserverOptions) {
  const targetRef = useRef<HTMLDivElement>(null)
  const hasTriggered = useRef(false)

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    
    if (entry.isIntersecting && enabled && onIntersect) {
      if (triggerOnce && hasTriggered.current) {
        return
      }
      
      hasTriggered.current = true
      onIntersect()
    }
  }, [onIntersect, enabled, triggerOnce])

  useEffect(() => {
    const target = targetRef.current
    if (!target || !enabled || !onIntersect) return

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin
    })

    observer.observe(target)

    return () => {
      observer.unobserve(target)
      observer.disconnect()
    }
  }, [handleIntersect, enabled, onIntersect, threshold, rootMargin])

  // Reset trigger state when enabled changes
  useEffect(() => {
    if (!enabled) {
      hasTriggered.current = false
    }
  }, [enabled])

  return { targetRef }
}