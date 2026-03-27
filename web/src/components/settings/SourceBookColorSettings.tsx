'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BookColor {
  id: string
  user_id: string
  book_code: string
  book_name: string
  color_hex: string
}

interface Props {
  initialColors: BookColor[]
}

export default function SourceBookColorSettings({ initialColors }: Props) {
  const [colors, setColors] = useState<BookColor[]>(initialColors)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6B7280')
  const [adding, setAdding] = useState(false)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const upsertColor = useCallback(
    async (item: BookColor) => {
      const supabase = createClient()
      await supabase.from('source_book_colors').upsert(
        {
          id: item.id,
          user_id: item.user_id,
          book_code: item.book_code,
          book_name: item.book_name,
          color_hex: item.color_hex,
        },
        { onConflict: 'id' }
      )
    },
    []
  )

  const handleColorChange = (id: string, newColorHex: string) => {
    setColors(prev =>
      prev.map(c => (c.id === id ? { ...c, color_hex: newColorHex } : c))
    )

    // Debounce the upsert
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id])
    }
    debounceTimers.current[id] = setTimeout(() => {
      const updated = colors.find(c => c.id === id)
      if (updated) {
        upsertColor({ ...updated, color_hex: newColorHex })
      }
    }, 500)
  }

  const handleAddCustom = async () => {
    if (!newCode.trim() || !newName.trim()) return
    setAdding(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setAdding(false)
      return
    }

    const { data, error } = await supabase
      .from('source_book_colors')
      .insert({
        user_id: user.id,
        book_code: newCode.trim(),
        book_name: newName.trim(),
        color_hex: newColor,
      })
      .select()
      .single()

    if (!error && data) {
      setColors(prev => [...prev, data as BookColor])
      setNewCode('')
      setNewName('')
      setNewColor('#6B7280')
    }

    setAdding(false)
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-900">Source Book Colors</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Assign colors to source books for visual identification in the workbench.
        </p>
      </div>

      {/* Book color list */}
      <div className="divide-y divide-neutral-100">
        {colors.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-neutral-400">No source book colors configured yet.</p>
          </div>
        ) : (
          colors.map(item => (
            <div key={item.id} className="px-6 py-3 flex items-center gap-4">
              {/* Color swatch */}
              <div
                className="w-6 h-6 rounded-full border border-neutral-200 shrink-0"
                style={{ backgroundColor: item.color_hex }}
              />

              {/* Book name (Arabic) */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-neutral-900"
                  dir="rtl"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {item.book_name}
                </p>
                <p className="text-xs text-neutral-400">{item.book_code}</p>
              </div>

              {/* Color picker */}
              <input
                type="color"
                value={item.color_hex}
                onChange={e => handleColorChange(item.id, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                title="Change color"
              />
            </div>
          ))
        )}
      </div>

      {/* Add custom */}
      <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
        <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-3">
          Add Custom
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-neutral-500 mb-1">Book code</label>
            <input
              type="text"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              placeholder="e.g. bukhari"
              className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-neutral-500 mb-1">Arabic name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="اسم الكتاب"
              dir="rtl"
              className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: "'Amiri', serif" }}
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Color</label>
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border border-neutral-200 p-0.5"
            />
          </div>
          <button
            onClick={handleAddCustom}
            disabled={adding || !newCode.trim() || !newName.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
