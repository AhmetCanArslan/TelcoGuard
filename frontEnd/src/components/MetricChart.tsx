import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import type { Metric } from '../types'

interface ThresholdLine {
  value: number
  label: string
  color: string
}

interface Props {
  title: string
  metrics: Metric[]
  dataKey: keyof Metric
  unit: string
  color?: string
  warningThreshold?: ThresholdLine
  criticalThreshold?: ThresholdLine
}

export default function MetricChart({
  title, metrics, dataKey, unit, color = '#FFCC00',
  warningThreshold, criticalThreshold
}: Props) {
  const data = metrics.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: m[dataKey] as number,
  }))

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <span>📉</span> {title} <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 'auto' }}>({unit})</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6B7A90', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6B7A90', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: '#1B2838',
                border: '1px solid rgba(255,204,0,0.2)',
                borderRadius: 8,
                color: '#F0F0F0',
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value} ${unit}`, title]}
            />
            {warningThreshold && (
              <ReferenceLine
                y={warningThreshold.value}
                stroke={warningThreshold.color}
                strokeDasharray="6 3"
                label={{ value: warningThreshold.label, fill: warningThreshold.color, fontSize: 10, position: 'insideTopRight' }}
              />
            )}
            {criticalThreshold && (
              <ReferenceLine
                y={criticalThreshold.value}
                stroke={criticalThreshold.color}
                strokeDasharray="6 3"
                label={{ value: criticalThreshold.label, fill: criticalThreshold.color, fontSize: 10, position: 'insideTopRight' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
