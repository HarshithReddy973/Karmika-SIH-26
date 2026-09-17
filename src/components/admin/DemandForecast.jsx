import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabaseClient'
import { buildDailyCounts, movingAverageForecast } from '../../lib/forecast'

export default function DemandForecast() {
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState('')
  const [dailyCounts, setDailyCounts] = useState([])
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('services')
      .select('category')
      .then(({ data }) => {
        const cats = [...new Set((data || []).map((s) => s.category))]
        setCategories(cats)
        if (cats.length) setSelected(cats[0])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selected) return
    async function load() {
      // Two simple queries instead of one clever joined/filtered one -
      // easier to read and debug than PostgREST's embedded-filter syntax.
      const { data: svcs } = await supabase.from('services').select('id').eq('category', selected)
      const ids = (svcs || []).map((s) => s.id)
      if (ids.length === 0) {
        setDailyCounts([])
        setForecast([])
        return
      }
      const { data: bookings } = await supabase.from('bookings').select('created_at').in('service_id', ids)
      const counts = buildDailyCounts(bookings || [])
      setDailyCounts(counts)
      setForecast(movingAverageForecast(counts))
    }
    load()
  }, [selected])

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h3>Demand Forecast</h3>
      <p style={{ fontSize: 13, color: '#666' }}>
        A weighted moving-average forecast based on real booking history — deliberately
        simple and fully explainable rather than a heavy ML model, per the agreed
        prototype approach. Accuracy improves as more real bookings come in.
      </p>

      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <div style={{ width: '100%', height: 250, marginTop: 12 }}>
        <ResponsiveContainer>
          <BarChart data={dailyCounts}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#42a5f5" name="Bookings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h4 style={{ marginTop: 20 }}>Predicted demand — next 5 days</h4>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {forecast.map((f, i) => (
          <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Day +{i + 1}</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{f}</div>
          </div>
        ))}
        {forecast.length === 0 && <p style={{ color: '#666' }}>Not enough data yet for this category.</p>}
      </div>
    </div>
  )
}
