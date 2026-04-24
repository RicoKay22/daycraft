import { useRef, useId, useEffect } from 'react'
import { animate, useMotionValue } from 'framer-motion'

/**
 * EtherealBackground — matches 21st.dev ethereal-shadow visual effect
 *
 * The 21st.dev original uses a solid-colored organic blob masked from an
 * external PNG + SVG displacement animation + heavy grain texture.
 *
 * This version reproduces all three with zero external URLs:
 *   - Organic blobs via CSS border-radius (solid, NOT gradient)
 *   - Same SVG feTurbulence displacement + hue-rotate animation
 *   - Inline SVG fractalNoise grain at visible opacity (0.10)
 *
 * Color guide for Daycraft pages:
 *   AppLayout base  → "rgba(55,50,45,0.75)"    dark warm neutral (all pages)
 *   FeedPage        → "rgba(34,197,94,0.38)"    Forest Minimal green
 *   ProfilePage     → "rgba(245,158,11,0.38)"   Creator Gold amber
 */

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  if (fromLow === fromHigh) return toLow
  const pct = (value - fromLow) / (fromHigh - fromLow)
  return toLow + pct * (toHigh - toLow)
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

    return () => { if (animCtrl.current) animCtrl.current.stop() }
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
      {/* Inline SVG filter — zero external fetch */}
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
        Three organic blob shapes using CSS border-radius.
        SOLID backgroundColor (not gradient) so displacement filter
        distorts their edges into the flowing silk/shadow shapes
        seen in the 21st.dev preview. Positioned across the full
        viewport so the entire page has depth and movement.
      */}
      <div
        style={{
          position: 'absolute',
          inset: -displacementScale,
          filter: `url(#${filterId}) blur(6px)`,
        }}
      >
        {/* Top-left blob */}
        <div style={{
          position: 'absolute',
          width: '65%',
          height: '60%',
          top: '5%',
          left: '-5%',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          backgroundColor: color,
        }} />

        {/* Centre-right blob */}
        <div style={{
          position: 'absolute',
          width: '60%',
          height: '65%',
          top: '25%',
          right: '-5%',
          borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
          backgroundColor: color,
          opacity: 0.85,
        }} />

        {/* Bottom-centre blob */}
        <div style={{
          position: 'absolute',
          width: '55%',
          height: '50%',
          bottom: '0%',
          left: '22%',
          borderRadius: '50% 50% 30% 70% / 40% 60% 40% 60%',
          backgroundColor: color,
          opacity: 0.7,
        }} />
      </div>

      {/*
        Grain noise — inline SVG data URI, zero external fetch.
        0.10 opacity matches the heavy visible grain in the 21st.dev preview.
        This is what gives the effect its analog fabric/silk texture.
      */}
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
