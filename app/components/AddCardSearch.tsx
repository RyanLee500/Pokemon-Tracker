'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ApiCard = {
  id: string
  name: string
  number: string
  set: { name: string }
  images: { small: string; large: string }
}

type Props = {
  onCardAdded: () => void
}

export default function AddCardSearch({ onCardAdded }: Props) {
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState('')
  const [results, setResults] = useState<ApiCard[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedCard, setSelectedCard] = useState<ApiCard | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    timeoutRef.current = setTimeout(() => doSearch(query, setFilter), 400)
  }, [query, setFilter])

  async function doSearch(q: string, setName: string) {
    setSearching(true)
    setError('')
    try {
      let queryStr = `name:"${q}"`
      if (setName.trim().length > 0) {
        queryStr += ` set.name:"${setName.trim()}"`
      }

      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(queryStr)}&pageSize=50`
      )
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.data || [])
      setShowResults(true)
    } catch (e) {
      setError('Search unavailable right now. You can still add manually below.')
      setResults([])
      setShowResults(true)
    } finally {
      setSearching(false)
    }
  }

  function pickCard(card: ApiCard) {
    setSelectedCard(card)
    setShowResults(false)
    setQuery('')
    setSetFilter('')
  }

  function pickManual() {
    setSelectedCard({
      id: '',
      name: query,
      number: '',
      set: { name: setFilter || '' },
      images: { small: '', large: '' },
    })
    setShowResults(false)
  }

  async function confirmAdd() {
    if (!selectedCard || !priceInput) return
    const price = parseFloat(priceInput)
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid price')
      return
    }

    const { data: newCard, error: cardError } = await supabase
      .from('cards')
      .insert({
        name: selectedCard.name,
        set_name: selectedCard.set.name || 'Unknown set',
        card_number: selectedCard.number || null,
        image_url: selectedCard.images?.large || selectedCard.images?.small || null,
        tcg_api_id: selectedCard.id || null,
      })
      .select()
      .single()

    if (cardError || !newCard) {
      setError('Could not add card. Try again.')
      return
    }

    const { error: priceError } = await supabase.from('price_history').insert({
      card_id: newCard.id,
      price: price,
    })

    if (priceError) {
      setError('Card added but price failed to save.')
      return
    }

    setSelectedCard(null)
    setPriceInput('')
    setQuery('')
    setSetFilter('')
    setError('')
    onCardAdded()
  }

  return (
    <div className="mb-6">
      <div className="relative flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Pokemon card name..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white"
        />
        {query.trim().length >= 2 && (
          <input
            type="text"
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            placeholder="Set name (optional, e.g. Surging Sparks)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 placeholder-gray-400 bg-white"
          />
        )}

        {showResults && (
          <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-10">
            {searching && <div className="p-3 text-sm text-gray-500">Searching...</div>}
            {!searching && error && (
              <div className="p-3">
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <button
                  onClick={pickManual}
                  className="text-sm text-blue-600 underline"
                >
                  Add "{query}" manually
                </button>
              </div>
            )}
            {!searching && !error && results.length === 0 && (
              <div className="p-3">
                <p className="text-sm text-gray-500 mb-2">No results found. Try removing the set filter, or check spelling.</p>
                <button
                  onClick={pickManual}
                  className="text-sm text-blue-600 underline"
                >
                  Add "{query}" manually
                </button>
              </div>
            )}
            {!searching &&
              results.map((card) => (
                <div
                  key={card.id}
                  onClick={() => pickCard(card)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                >
                  <img
                    src={card.images?.small}
                    alt=""
                    className="w-8 h-11 object-contain flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{card.name}</p>
                    <p className="text-xs text-gray-500">
                      {card.set?.name} {card.number ? `#${card.number}` : ''}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {selectedCard && (
        <div className="mt-3 bg-gray-50 rounded-lg p-4 flex flex-wrap gap-3 items-center">
          {selectedCard.images?.small && (
            <img src={selectedCard.images.small} alt="" className="w-10 h-14 object-contain rounded" />
          )}
          <div className="flex-1 min-w-[140px]">
            <p className="text-sm font-medium text-gray-900">{selectedCard.name}</p>
            <p className="text-xs text-gray-500">{selectedCard.set?.name || 'Unknown set'}</p>
          </div>
          <input
            type="number"
            step="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="Current price (e.g. 99.99)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-44 text-gray-900 placeholder-gray-400"
          />
          <button
            onClick={confirmAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Add card
          </button>
          <button
            onClick={() => setSelectedCard(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          {error && <p className="text-sm text-red-500 w-full">{error}</p>}
        </div>
      )}
    </div>
  )
}