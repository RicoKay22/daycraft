import { useRef, useId, useEffect, useState } from 'react'
import { animate, useMotionValue } from 'framer-motion'

/**
 * EtherealBackground — 21st.dev ethereal-shadow adapted to JSX
 *
 * MOBILE PERFORMANCE FIX:
 * SVG feTurbulence displacement filters are GPU-intensive. On mobile devices
 * running the filter continuously caused 5-second scroll lag, sluggish typing,
 * and slow page transitions because the main thread was throttled.
 *
 * Fix: detect mobile (screen width < 768px OR touch device) and skip the SVG
 * filter entirely. Mobile gets the static blob shapes with no animation —
 * visually identical at a glance, zero performance cost.
 *
 * Desktop keeps the full animated displacement filter as designed.
 */

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  if (fromLow === fromHigh) return toLow
  const pct = (value - fromLow) / (fromHigh - fromLow)
  return toLow + pct * (toHigh - toLow)
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768 || ('ontouchstart' in window)
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export default function EtherealBackground({
  color = 'rgba(55, 50, 45, 0.75)',
  animationScale = 60,
  animationSpeed = 70,
  opacity = 1,
  style = {},
}) {
  const rawId    = useId()
  const filterId = `ethereal-${rawId.replace(/:/g, '')}`
  const isMobile = useIsMobile()

  const feColorMatrixRef = useRef(null)
  const hueMotion        = useRef(useMotionValue(180)).current
  const animCtrl         = useRef(null)

  const displacementScale = mapRange(animationScale, 1, 100, 20, 100)
  const duration          = mapRange(animationSpeed, 1, 100, 1000, 50)

  // Only run the animation on desktop — mobile skips this entirely
  useEffect(() => {
    if (isMobile) return
    if (!feColorMatrixRef.current) return
    if (animCtrl.current) animCtrl.current.stop()
    hueMotion.set(0)

    animCtrl.current = animate(hueMotion, 360, {
      duration: duration / 25,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'linear',
      onUpdate: (v) => {
        if (feColorMatrixRef.current) {
          feColorMatrixRef.current.setAttribute('values', String(v))
        }
      },
    })

    return () => { if (animCtrl.current) animCtrl.current.stop() }
  }, [animationScale, animationSpeed, isMobile]) // eslint-disable-line

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity,
        ...style,
      }}
    >
      {/* SVG filter — only rendered on desktop */}
      {!isMobile && (
        <svg
          style={{ position: 'absolute', width: 0, height: 0 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter
              id={filterId}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                result="undulation"
                numOctaves="2"
                baseFrequency={`${mapRange(animationScale, 0, 100, 0.001, 0.0005)},${mapRange(animationScale, 0, 100, 0.004, 0.002)}`}
                seed="0"
                type="turbulence"
              />
              <feColorMatrix
                ref={feColorMatrixRef}
                in="undulation"
                type="hueRotate"
                values="180"
              />
              <feColorMatrix
                in="dist"
                result="circulation"
                type="matrix"
                values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="circulation"
                scale={displacementScale}
                result="dist"
              />
              <feDisplacementMap
                in="dist"
                in2="undulation"
                scale={displacementScale}
                result="output"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/*
        Blob shapes:
        - Desktop: displacement filter applied → animated silk/shadow shapes
        - Mobile:  no filter → static soft blobs, zero GPU cost
      */}
      <div
        style={{
          position: 'absolute',
          inset: isMobile ? 0 : -displacementScale,
          filter: isMobile ? 'blur(40px)' : `url(#${filterId}) blur(6px)`,
        }}
      >
        <div style={{
          position: 'absolute',
          width: '65%', height: '60%',
          top: '5%', left: '-5%',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          backgroundColor: color,
        }} />
        <div style={{
          position: 'absolute',
          width: '60%', height: '65%',
          top: '25%', right: '-5%',
          borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
          backgroundColor: color,
          opacity: 0.85,
        }} />
        <div style={{
          position: 'absolute',
          width: '55%', height: '50%',
          bottom: '0%', left: '22%',
          borderRadius: '50% 50% 30% 70% / 40% 60% 40% 60%',
          backgroundColor: color,
          opacity: 0.7,
        }} />
      </div>

      {/* Grain texture — inline SVG, zero external fetch */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
          backgroundRepeat: 'repeat',
          opacity: 0.10,
        }}
      />
    </div>
  )
}
