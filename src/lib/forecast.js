// Phase 4's "AI-based demand forecasting" - deliberately a simple, fully
// explainable weighted moving average rather than a heavy ML library.
// This is the choice agreed on for the prototype: you can explain every
// line of this to a judge, it has zero install/dependency risk, and it
// runs instantly on real booking data.

// Turns a list of bookings (each with created_at) into a fixed-length
// array of { date, count } covering the last `days` days, so gaps with
// zero bookings still show up as 0 rather than being missing entirely.
export function buildDailyCounts(bookings, days = 14) {
  const today = new Date()
  const counts = {}

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10) // "YYYY-MM-DD"
    counts[key] = 0
  }

  bookings.forEach((b) => {
    const key = (b.created_at || '').slice(0, 10)
    if (key in counts) counts[key] += 1
  })

  return Object.entries(counts).map(([date, count]) => ({ date, count }))
}

// Projects the next `forecastDays` values using a rolling moving average
// of the last `windowSize` known values - each new forecast point feeds
// into the average for the next one, smoothing out day-to-day noise.
export function movingAverageForecast(dailyCounts, windowSize = 5, forecastDays = 5) {
  const series = dailyCounts.map((d) => d.count)
  const forecast = []

  for (let i = 0; i < forecastDays; i++) {
    const window = series.slice(-windowSize)
    const avg = window.reduce((a, b) => a + b, 0) / window.length
    forecast.push(Math.round(avg * 10) / 10)
    series.push(avg)
  }

  return forecast
}
