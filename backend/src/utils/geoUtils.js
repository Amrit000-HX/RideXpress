/**
 * backend/src/utils/geoUtils.js
 *
 * 100% Free Geospatial Math Utilities.
 * Implements Haversine distance and driving ETA calculation without paid APIs.
 */

const EARTH_RADIUS_KM = 6371

/**
 * Calculates straight-line spherical distance between two GPS coordinates in kilometers.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in km (rounded to 2 decimal places)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = EARTH_RADIUS_KM * c

  return Math.round(distance * 100) / 100
}

/**
 * Estimates driving ETA in minutes based on distance and average urban vehicle speed.
 * @param {number} distanceKm
 * @param {number} [averageSpeedKmh=28] - Average urban city speed
 * @returns {number} ETA in minutes
 */
function calculateEtaMinutes(distanceKm, averageSpeedKmh = 28) {
  if (distanceKm <= 0) return 1
  const hours = distanceKm / averageSpeedKmh
  return Math.max(1, Math.round(hours * 60))
}

module.exports = {
  calculateDistance,
  calculateEtaMinutes,
}
