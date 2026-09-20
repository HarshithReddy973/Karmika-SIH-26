import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabaseClient'
import { buildDailyCounts, movingAverageForecast } from '../../lib/forecast'
import { LoadingRow } from '../ui/Feedback'

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

  if (loading) return <LoadingRow>Loading...</LoadingRow>

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Demand Forecast</h3>
      <p className="helper-text" style={{ marginBottom: 12 }}>
        A weighted moving-average forecast based on real booking history — deliberately
        simple and fully explainable rather than a heavy ML model, per the agreed
        prototype approach. Accuracy improves as more real bookings come in.
      </p>

      <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: 'auto' }}>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <div className="card" style={{ marginTop: 12, padding: '16px 8px 8px' }}>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={dailyCounts}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" />
              <YAxis allowDecimals={false} stroke="var(--color-text-muted)" />
              <Tooltip />
              <Bar dataKey="count" fill="#0D9488" name="Bookings" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 20 }}>Predicted demand — next 5 days</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {forecast.map((f, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', minWidth: 74 }}>
            <div className="list-meta">Day +{i + 1}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{f}</div>
          </div>
        ))}
        {forecast.length === 0 && <p className="helper-text">Not enough data yet for this category.</p>}
      </div>
    </div>
  )
}
