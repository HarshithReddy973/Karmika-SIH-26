// Rule-based matching score (Phase 3), as agreed: distance + rating + fairness.
// The PostGIS RPC already gives us distance-sorted candidates; this function
// re-ranks them using the fuller formula so closer-but-lower-rated workers
// don't always beat farther-but-excellent, rarely-booked ones.

export function computeMatchScore(worker) {
  const distanceKm = (worker.distance_meters ?? 0) / 1000
  const distanceScore = 1 / (distanceKm + 0.5)          // closer = higher
  const ratingScore = (worker.rating_avg || 0) / 5       // 0-1 range
  const fairnessScore = 1 / ((worker.jobs_this_week || 0) + 1) // rotates opportunity

  // Weights: 40% distance, 40% rating, 20% fairness - matches the
  // formula agreed on earlier. Tweak these three numbers to rebalance.
  return (0.4 * distanceScore) + (0.4 * ratingScore) + (0.2 * fairnessScore)
}

export function rankWorkers(workers) {
  return [...workers]
    .map((w) => ({ ...w, score: computeMatchScore(w) }))
    .sort((a, b) => b.score - a.score)
}
