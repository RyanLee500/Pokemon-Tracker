'use client'

import { useEffect, useState } from 'react'
import { supabase, type Card } from '@/lib/supabase'
import PriceCard from './components/PriceCard'
import AddCardSearch from './components/AddCardSearch'

export default function Home() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCards()
  }, [])

  async function loadCards() {
    setLoading(true)
    const { data } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) setCards(data)
    setLoading(false)
  }

  async function removeCard(id: string) {
    await supabase.from('cards').delete().eq('id', id)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Pokemon Card Price Tracker</h1>

      <AddCardSearch onCardAdded={loadCards} />

      {loading ? (
        <p className="text-gray-500">Loading your cards...</p>
      ) : cards.length === 0 ? (
        <p className="text-gray-500">No cards yet — search above to add your first one.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
  {cards.map((card) => (
  <PriceCard key={card.id} card={card} onRemove={removeCard} />
))}
</div>
      )}
    </main>
  )
}