import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  value: number | string
  label: string
  colorClass?: string
}

export default function StatCard({ icon, value, label, colorClass = 'yellow' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>
        {icon}
      </div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  )
}
