import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ServicesManager() {
  const [services, setServices] = useState([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [msg, setMsg] = useState('')

  function load() {
    supabase.from('services').select('*').order('name').then(({ data }) => setServices(data || []))
  }
  useEffect(load, [])

  async function addService(e) {
    e.preventDefault()

    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setMsg('❌ Base price must be a positive number.')
      return
    }

    const { error } = await supabase.from('services').insert({ name, category, base_price: priceNum })
    if (error) {
      setMsg(error.message)
    } else {
      setMsg('✅ Added!')
      setName('')
      setCategory('')
      setPrice('')
      load()
    }
  }

  async function updatePrice(id, rawValue, revertValue) {
    const priceNum = Number(rawValue)

    // Reject anything that isn't a valid positive number - covers
    // negative values (from typing "-1" or using the spinner arrows
    // past zero), zero, empty strings, and non-numeric input.
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setMsg('❌ Price must be a positive number — change reverted.')
      load() // re-fetch so the input snaps back to the last valid price
      return
    }

    const { error } = await supabase.from('services').update({ base_price: priceNum }).eq('id', id)
    setMsg(error ? error.message : '')
    load()
  }

  return (
    <div>
      <h3>Services &amp; Pricing</h3>
      {msg && <p style={{ color: msg.startsWith('❌') ? 'red' : 'inherit' }}>{msg}</p>}

      <form onSubmit={addService} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <input placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          placeholder="Category (e.g. electrician)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <input
          placeholder="Base price ₹"
          type="number"
          min="1"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <button type="submit">Add Service</button>
      </form>

      {services.map((s) => (
        <div
          key={s.id}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '6px 0' }}
        >
          <span>{s.name} <span style={{ color: '#666', fontSize: 13 }}>({s.category})</span></span>
          <span>
            ₹<input
              type="number"
              min="1"
              step="1"
              defaultValue={s.base_price}
              style={{ width: 80 }}
              onBlur={(e) => {
                if (Number(e.target.value) !== s.base_price) {
                  updatePrice(s.id, e.target.value, s.base_price)
                }
              }}
            />
          </span>
        </div>
      ))}
      <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>Tip: edit a price and click elsewhere to save it.</p>
    </div>
  )
}
