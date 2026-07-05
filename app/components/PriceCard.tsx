'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase, type Card, type PriceHistory } from '@/lib/supabase'

type Props = {
  card: Card
  onRemove: (id: string) => void
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'white', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
        <p style={{ color: '#00cc00', fontWeight: 700, fontSize: 13, margin: '0 0 4px 0' }}>{label}</p>
        <p style={{ color: '#333', margin: 0 }}>${Number(payload[0].value).toFixed(2)}</p>
      </div>
    )
  }
  return null
}

export default function PriceCard({ card, onRemove }: Props) {
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M')

  useEffect(() => {
    loadHistory()
  }, [card.id])

  async function loadHistory() {
    setLoading(true)
    const { data } = await supabase
      .from('price_history')
      .select('*')
      .eq('card_id', card.id)
      .order('recorded_at', { ascending: true })

    if (data) setHistory(data)
    setLoading(false)
  }

  async function submitNewPrice() {
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) return

    setSaving(true)
    await supabase.from('price_history').insert({
      card_id: card.id,
      price: price,
    })
    setNewPrice('')
    setShowUpdateForm(false)
    setSaving(false)
    loadHistory()
  }

  if (loading) {
    return (
      <div className="bg-gray-600 border border-gray-200 rounded-lg overflow-hidden h-[380px] animate-pulse">
        <div className="h-[40%] bg-gray-100" />
        <div className="h-[60%] bg-gray-50" />
      </div>
    )
  }

  const latest = history[history.length - 1]?.price ?? 0
const latestDate = history[history.length - 1]?.recorded_at
  ? new Date(history[history.length - 1].recorded_at)
  : new Date()

const oneDayAgo = new Date(latestDate.getTime() - 24 * 60 * 60 * 1000)
const thirtyDaysAgo = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000)

const closest24h = history.reduce((prev, curr) => {
  const currDiff = Math.abs(new Date(curr.recorded_at).getTime() - oneDayAgo.getTime())
  const prevDiff = Math.abs(new Date(prev.recorded_at).getTime() - oneDayAgo.getTime())
  return currDiff < prevDiff ? curr : prev
})

const closest30d = history.reduce((prev, curr) => {
  const currDiff = Math.abs(new Date(curr.recorded_at).getTime() - thirtyDaysAgo.getTime())
  const prevDiff = Math.abs(new Date(prev.recorded_at).getTime() - thirtyDaysAgo.getTime())
  return currDiff < prevDiff ? curr : prev
})

const change24h = closest24h ? ((latest - closest24h.price) / closest24h.price) * 100 : 0
const change30d = closest30d ? ((latest - closest30d.price) / closest30d.price) * 100 : 0

  const now = new Date()
const rangeMap = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  'ALL': 99999
}

const filteredHistory = history.filter((h) => {
  const daysAgo = (now.getTime() - new Date(h.recorded_at).getTime()) / (1000 * 60 * 60 * 24)
  return daysAgo <= rangeMap[timeRange]
})

const chartData = filteredHistory.map((h) => ({
  date: new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  price: h.price,
}))

  const rangeStartPrice = filteredHistory.length > 0 ? filteredHistory[0].price : latest
const isUp = latest >= rangeStartPrice
const lineColor = isUp ? '#16a34a' : '#dc2626'

  return (
    <div className="bg-gray-600 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      {/* TOP SECTION - 40% - image + info */}
      <div className="h-[160px] flex gap-3 p-4 relative">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.name}
            className="w-20 h-28 object-contain rounded bg-gray-50 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-28 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">
            No image
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate text-gray-900">{card.name}</p>
          <p className="text-xs text-gray-500 truncate mb-2">{card.set_name}</p>
          <p className="text-xl font-semibold text-gray-900">${latest.toFixed(2)}</p>
          <div className="flex gap-3 text-xs mt-1">
            <span className={change24h >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% <span className="text-gray-400">3d</span>
            </span>
            <span className={change30d >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change30d >= 0 ? '+' : ''}{change30d.toFixed(2)}% <span className="text-gray-400">30d</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => onRemove(card.id)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700"
          aria-label={`Remove ${card.name}`}
        >
          ✕
        </button>
      </div>

      {/* BOTTOM SECTION - 60% - chart */}
      <div className="h-[220px] bg-gray-600 p-4 flex flex-col text-white">
         <div className="flex gap-1 mb-2 w-full">
  {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((range) => (
    <button
      key={range}
      onClick={() => setTimeRange(range)}
      className={`flex-1 py-0.5 rounded text-xs font-medium text-center ${
  timeRange === range
    ? 'bg-blue-600 text-white'
    : 'bg-gray-500 text-gray-200 hover:bg-gray-400'
}`}
    >
      {range}
    </button>
  ))}
</div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                hide={true}
                domain={([dataMin, dataMax]) => {
                  const padding = (dataMax - dataMin) * 0.1
                return [Math.floor(dataMin - padding), Math.ceil(dataMax + padding)]
              }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke={lineColor} strokeWidth={2} dot={{ r: 1.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {showUpdateForm ? (
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="New price"
              autoFocus
              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={submitNewPrice}
              disabled={saving}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowUpdateForm(false)}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowUpdateForm(true)}
            className="mt-2 text-sm text-white hover:underline text-left"
          >
            + Update price
          </button>
        )}
      </div>
    </div>
  )
}