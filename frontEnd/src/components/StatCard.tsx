import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface StatCardProps {
  icon: ReactNode
  value: number | string
  label: string
  colorClass?: string
  index?: number
}

/* Animated number counter */
function useAnimatedNumber(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const from = display

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return display
}

const colorMap: Record<string, { gradient: string; glow: string; text: string; ring: string }> = {
  yellow: {
    gradient: 'linear-gradient(135deg, rgba(255,203,5,0.2), rgba(255,203,5,0.05))',
    glow: 'rgba(255,203,5,0.35)',
    text: '#FFCB05',
    ring: 'rgba(255,203,5,0.15)',
  },
  green: {
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
    glow: 'rgba(16,185,129,0.35)',
    text: '#10B981',
    ring: 'rgba(16,185,129,0.15)',
  },
  red: {
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
    glow: 'rgba(239,68,68,0.35)',
    text: '#EF4444',
    ring: 'rgba(239,68,68,0.15)',
  },
  gray: {
    gradient: 'linear-gradient(135deg, rgba(107,114,128,0.2), rgba(107,114,128,0.05))',
    glow: 'rgba(107,114,128,0.35)',
    text: '#6B7280',
    ring: 'rgba(107,114,128,0.15)',
  },
  blue: {
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))',
    glow: 'rgba(59,130,246,0.35)',
    text: '#3B82F6',
    ring: 'rgba(59,130,246,0.15)',
  },
}

export default function StatCard({ icon, value, label, colorClass = 'yellow', index = 0 }: StatCardProps) {
  const colors = colorMap[colorClass] || colorMap.yellow
  const numericValue = typeof value === 'number' ? value : parseInt(value as string, 10)
  const isNumeric = !isNaN(numericValue)
  const animatedValue = useAnimatedNumber(isNumeric ? numericValue : 0)

  return (
    <motion.div
      className="stat-card-v2"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
        ease: [0.21, 1.02, 0.73, 1],
      }}
      whileHover={{
        y: -6,
        transition: { duration: 0.25 },
      }}
      style={{
        '--card-glow': colors.glow,
        '--card-text': colors.text,
        '--card-ring': colors.ring,
      } as React.CSSProperties}
    >
      {/* Shimmer overlay */}
      <div className="stat-card-shimmer" />

      {/* Top gradient accent line */}
      <div
        className="stat-card-accent-line"
        style={{ background: `linear-gradient(90deg, transparent, ${colors.text}, transparent)` }}
      />

      {/* Icon with animated ring */}
      <div className="stat-card-icon-wrap">
        <motion.div
          className="stat-card-icon-ring"
          style={{ background: colors.gradient }}
        />
        <div className="stat-card-icon" style={{ color: colors.text }}>
          {icon}
        </div>
      </div>

      {/* Value + Label */}
      <div className="stat-card-content">
        <motion.span
          className="stat-card-value"
          style={{ color: colors.text }}
          key={value}
        >
          {isNumeric ? animatedValue : value}
        </motion.span>
        <span className="stat-card-label">{label}</span>
      </div>

      {/* Bottom ambient glow */}
      <div
        className="stat-card-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${colors.glow}, transparent 70%)`,
        }}
      />
    </motion.div>
  )
}
