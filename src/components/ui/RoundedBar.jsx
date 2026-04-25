/**
 * RoundedBar — custom Recharts Bar shape using SVG path
 *
 * WHY THIS EXISTS:
 * Recharts' built-in radius={[4,4,0,0]} prop converts to CSS border-radius
 * on SVG <rect> elements. Mobile WebKit (iOS Safari, Firefox Android) does
 * not support border-radius on SVG rects and drops the declarations, causing
 * console errors: "Error in parsing value for 'border-top-left-radius'"
 *
 * This component draws the rounded-top bar as an SVG <path> instead,
 * which works correctly on all browsers including mobile WebKit.
 * The path traces: bottom-left → up left side → rounded top-left corner →
 * across top → rounded top-right corner → down right side → bottom-right → close
 */
export function RoundedBar(props) {
  const { x, y, width, height, fill } = props

  // Don't render bars with no height (empty days)
  if (!height || height <= 0) return null

  const r = Math.min(4, width / 2, height)   // radius, capped so it fits

  // SVG path for a rectangle with rounded top-left and top-right corners
  const path = `
    M ${x},${y + height}
    L ${x},${y + r}
    Q ${x},${y} ${x + r},${y}
    L ${x + width - r},${y}
    Q ${x + width},${y} ${x + width},${y + r}
    L ${x + width},${y + height}
    Z
  `

  return <path d={path} fill={fill} />
}
