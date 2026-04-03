import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-xl text-sm"
        style={{
          background: 'rgba(29,29,31,0.9)',
          color: 'white',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <p className="font-semibold">{payload[0].payload.feature}</p>
        <p style={{ color: '#86868B' }}>Impact: {(payload[0].value * 100).toFixed(0)}%</p>
      </div>
    )
  }
  return null
}

const CustomBar = (props) => {
  const { x, y, width, height, fill } = props
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      rx={4}
      ry={4}
    />
  )
}

export default function FeatureImportanceChart({ features = [] }) {
  return (
    <div>
      <p className="label mb-3">SHAP Feature Importance</p>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={features}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barSize={10}
          >
            <XAxis
              type="number"
              domain={[0, 0.35]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 10, fill: '#86868B', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="feature"
              width={110}
              tick={{ fontSize: 11, fill: '#1D1D1F', fontFamily: 'Inter', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="value" shape={<CustomBar />} radius={[0, 4, 4, 0]}>
              {features.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
