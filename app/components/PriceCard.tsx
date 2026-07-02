'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
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
  const prev24h = history.length >= 2 ? history[history.length - 2].price : latest
  const first30d = history[0]?.price ?? latest

  const change24h = prev24h ? ((latest - prev24h) / prev24h) * 100 : 0
  const change30d = first30d ? ((latest - first30d) / first30d) * 100 : 0

  const chartData = history.map((h) => ({
    date: new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: h.price,
  }))

  const isUp = latest >= first30d
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
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% <span className="text-gray-400">24h</span>
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
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke={lineColor} strokeWidth={2} dot={{ r: 3 }} />
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
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400"
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