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
      <h3 style={{ marginBottom: 12 }}>Services &amp; Pricing</h3>
      {msg && (
        <div className={`alert ${msg.startsWith('❌') ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: 12 }}>
          {msg}
        </div>
      )}

      <form onSubmit={addService} className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label className="label">Service name</label>
          <input placeholder="e.g. Electrician Visit" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label className="label">Category</label>
          <input placeholder="e.g. electrician" value={category} onChange={(e) => setCategory(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: '0 1 120px' }}>
          <label className="label">Base price ₹</label>
          <input
            type="number"
            min="1"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">Add Service</button>
      </form>

      <div className="stack-sm">
        {services.map((s) => (
          <div key={s.id} className="card row">
            <span>{s.name} <span className="list-meta" style={{ display: 'inline' }}>({s.category})</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ₹
              <input
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
      </div>
      <p className="helper-text" style={{ marginTop: 10 }}>Tip: edit a price and click elsewhere to save it.</p>
    </div>
  )
}
