import { useRef, useId, useEffect } from 'react'
import { animate, useMotionValue } from 'framer-motion'

/**
 * EtherealBackground — adapted from 21st.dev ethereal-shadow component
 * Pure CSS version — zero external URLs, zero CORS issues
 * Organic blob shape built from overlapping radial gradients
 * Displacement animation via SVG feTurbulence (fully inline)
 */

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  if (fromLow === fromHigh) return toLow
  const pct = (value - fromLow) / (fromHigh - fromLow)
  return toLow + pct * (toHigh - toLow)
}

export default function EtherealBackground({
  // Pass ANY rgba color — controls the glow hue for that page
  color = 'rgba(34, 197, 94, 0.18)',   // Forest Minimal green (Feed default)
  animationScale = 60,
  animationSpeed = 70,
  opacity = 1,
  style = {},
}) {
  const rawId    = useId()
  const filterId = `ethereal-${rawId.replace(/:/g, '')}`

  const feColorMatrixRef = useRef(null)
  const hueMotion        = useMotionValue(180)
  const animCtrl         = useRef(null)

  const displacementScale = mapRange(animationScale, 1, 100, 20, 100)
  const duration          = mapRange(animationSpeed, 1, 100, 1000, 50)

  useEffect(() => {
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

    return () => {
      if (animCtrl.current) animCtrl.current.stop()
    }
  }, [animationScale, animationSpeed]) // eslint-disable-line

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
      {/* Inline SVG filter — no external fetch, fully self-contained */}
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

      {/* 
        Organic blob built from 3 overlapping radial gradients.
        No mask PNG needed — the displacement filter distorts these
        into the same organic animated shape the 21st.dev original produces.
        inset: -displacementScale prevents filter clipping at edges.
      */}
      <div
        style={{
          position: 'absolute',
          inset: -displacementScale,
          filter: `url(#${filterId}) blur(8px)`,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: [
              `radial-gradient(ellipse 65% 55% at 28% 38%, ${color}, transparent 70%)`,
              `radial-gradient(ellipse 55% 65% at 72% 62%, ${color}, transparent 70%)`,
              `radial-gradient(ellipse 45% 45% at 52% 18%, ${color}, transparent 65%)`,
              `radial-gradient(ellipse 40% 50% at 15% 72%, ${color}, transparent 65%)`,
            ].join(', '),
          }}
        />
      </div>

      {/* 
        Inline noise texture — pure SVG data URI, zero external fetch.
        Adds subtle grain that makes the background feel analog/organic.
        opacity: 0.035 = almost invisible but adds tactile depth.
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
          backgroundRepeat: 'repeat',
          opacity: 0.035,
        }}
      />
    </div>
  )
}
