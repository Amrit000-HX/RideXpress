/**
 * backend/src/services/driverMatcher.js
 *
 * DB-Primary Geo-Proximity Driver Matching & Broadcast Discovery.
 *
 * Workflow (Uber/Rapido geo-indexed broadcast strategy):
 *  1. Query MongoDB with $near (2dsphere index) — sorted by distance automatically
 *  2. Filter: onlineStatus=ONLINE, availabilityStatus=AVAILABLE, currentRideId=null, isActive=true
 *  3. Cross-reference result with in-memory socket registry for live socketIds
 *  4. Expand search radius progressively (2km → 5km → 10km)
 *  5. Fallback/merge with in-memory registry for live drivers without persisted DB GPS
 *  6. Return all eligible nearby drivers for simultaneous broadcast dispatch
 */

const { calculateDistance, calculateEtaMinutes } = require('../utils/geoUtils')
const { getConnectedDrivers }                     = require('../socket/socketManager')
const Employee                                    = require('../models/Employee')

// Configurable search radii (metres) — expands if fewer candidates found
const SEARCH_RADII_METRES = [3000, 7000, 15000]

/**
 * Finds all eligible nearby drivers sorted nearest-first.
 *
 * @param {Object} params
 * @param {number} params.pickupLat          - Customer pickup latitude
 * @param {number} params.pickupLng          - Customer pickup longitude
 * @param {string} [params.vehicleType]      - Requested vehicle type filter
 * @param {Array<string>} [params.excludeDriverIds] - Driver IDs to exclude (e.g. rejected)
 * @param {number} [params.limit=10]         - Max candidates to return
 * @returns {Promise<Array<Object>>}         - List of eligible driver candidate objects
 */
async function findEligibleNearbyDrivers({
  pickupLat,
  pickupLng,
  vehicleType,
  excludeDriverIds = [],
  limit = 10,
}) {
  const connectedDrivers = getConnectedDrivers()
  const candidateMap = new Map() // driverId -> driver candidate object

  const latN = Number(pickupLat)
  const lngN = Number(pickupLng)

  if (!isFinite(latN) || !isFinite(lngN)) {
    return []
  }

  const now = Date.now()

  // ── 1. DB-Primary: MongoDB $near geo-query ─────────────────────────────────
  for (const maxDistance of SEARCH_RADII_METRES) {
    try {
      const geoQuery = {
        onlineStatus:       'ONLINE',
        availabilityStatus: 'AVAILABLE',
        currentRideId:      null,
        isActive:           true,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lngN, latN] },
            $maxDistance: maxDistance,
          },
        },
      }

      if (excludeDriverIds.length > 0) {
        geoQuery._id = { $nin: excludeDriverIds }
      }

      let dbCandidates = await Employee.find(geoQuery)
        .select('name phone vehicleCategory vehicleNumber rating currentLocation location employeeId updatedAt _id')
        .limit(limit)

      // Apply vehicle category filter if specified
      if (vehicleType && dbCandidates.length > 0) {
        dbCandidates = dbCandidates.filter((d) => {
          if (!d.vehicleCategory) return true
          const cat = d.vehicleCategory.toLowerCase()
          const req = vehicleType.toLowerCase()
          return cat.includes(req) || req.includes(cat)
        })
      }

      for (const driver of dbCandidates) {
        const driverIdStr = String(driver._id)
        if (candidateMap.has(driverIdStr)) continue

        const socketEntry = connectedDrivers.get(driverIdStr)
        const driverLat = driver.currentLocation?.lat ?? driver.location?.coordinates?.[1]
        const driverLng = driver.currentLocation?.lng ?? driver.location?.coordinates?.[0]

        const distanceKm = (driverLat != null && driverLng != null)
          ? calculateDistance(latN, lngN, driverLat, driverLng)
          : 1.5

        candidateMap.set(driverIdStr, {
          driverId:      driverIdStr,
          socketId:      socketEntry?.socketId || null,
          name:          driver.name,
          phone:         driver.phone || '',
          employeeId:    driver.employeeId || driverIdStr,
          vehicleType:   driver.vehicleCategory || vehicleType,
          vehicleNumber: driver.vehicleNumber || 'MH 02 EQ 8492',
          rating:        driver.rating || 4.92,
          distanceKm,
          etaMinutes:    calculateEtaMinutes(distanceKm),
          lat:           driverLat,
          lng:           driverLng,
          isLiveSocket:  !!(socketEntry?.socketId),
        })
      }

      if (candidateMap.size >= limit) break
    } catch (geoErr) {
      console.warn('[driverMatcher $near warning]', geoErr.message)
      break
    }
  }

  // ── 1.5 Secondary DB Proximity Check (Mathematical Distance Fallback) ──────
  if (candidateMap.size === 0) {
    try {
      const dbOnline = await Employee.find({
        onlineStatus:       'ONLINE',
        availabilityStatus: 'AVAILABLE',
        currentRideId:      null,
        isActive:           true,
        ...(excludeDriverIds.length > 0 ? { _id: { $nin: excludeDriverIds } } : {}),
      })
        .select('name phone vehicleCategory vehicleNumber rating currentLocation location employeeId updatedAt _id')
        .limit(20)

      for (const driver of dbOnline) {
        const driverIdStr = String(driver._id)
        if (candidateMap.has(driverIdStr)) continue

        const driverLat = driver.currentLocation?.lat ?? driver.location?.coordinates?.[1]
        const driverLng = driver.currentLocation?.lng ?? driver.location?.coordinates?.[0]
        if (driverLat == null || driverLng == null) continue

        const distanceKm = calculateDistance(latN, lngN, driverLat, driverLng)
        if (distanceKm > 15) continue // within 15 km

        if (vehicleType && driver.vehicleCategory) {
          const cat = driver.vehicleCategory.toLowerCase()
          const req = vehicleType.toLowerCase()
          if (!cat.includes(req) && !req.includes(cat)) continue
        }

        const socketEntry = connectedDrivers.get(driverIdStr)

        candidateMap.set(driverIdStr, {
          driverId:      driverIdStr,
          socketId:      socketEntry?.socketId || null,
          name:          driver.name,
          phone:         driver.phone || '',
          employeeId:    driver.employeeId || driverIdStr,
          vehicleType:   driver.vehicleCategory || vehicleType,
          vehicleNumber: driver.vehicleNumber || 'MH 02 EQ 8492',
          rating:        driver.rating || 4.92,
          distanceKm,
          etaMinutes:    calculateEtaMinutes(distanceKm),
          lat:           driverLat,
          lng:           driverLng,
          isLiveSocket:  !!(socketEntry?.socketId),
        })
      }
    } catch (mathErr) {
      console.warn('[driverMatcher math fallback]', mathErr.message)
    }
  }

  // ── 2. Fallback / Merge: In-Memory Socket Registry ────────────────────────
  for (const [driverId, driver] of connectedDrivers.entries()) {
    const driverIdStr = String(driverId)
    if (candidateMap.has(driverIdStr)) continue
    if (excludeDriverIds.includes(driverIdStr)) continue
    if (!driver.isOnline || !driver.isAvailable) continue
    if (driver.lat == null || driver.lng == null) continue
    if (now - (driver.lastPing || 0) > 120_000) continue // Active within 120s

    if (vehicleType && driver.vehicleType) {
      const cat = (driver.vehicleType || '').toLowerCase()
      const req = vehicleType.toLowerCase()
      if (!cat.includes(req) && !req.includes(cat)) continue
    }

    const distanceKm = calculateDistance(latN, lngN, driver.lat, driver.lng)
    if (distanceKm > 15) continue // Max 15km

    try {
      const driverDoc = await Employee.findById(driverIdStr)
        .select('name phone vehicleCategory vehicleNumber rating employeeId')

      candidateMap.set(driverIdStr, {
        driverId:      driverIdStr,
        socketId:      driver.socketId,
        name:          driverDoc?.name          || 'Assigned Driver',
        phone:         driverDoc?.phone         || '',
        employeeId:    driverDoc?.employeeId    || driverIdStr,
        vehicleType:   driver.vehicleType       || driverDoc?.vehicleCategory || vehicleType,
        vehicleNumber: driverDoc?.vehicleNumber || 'MH 02 EQ 8492',
        rating:        driverDoc?.rating        || 4.92,
        distanceKm,
        etaMinutes:    calculateEtaMinutes(distanceKm),
        lat:           driver.lat,
        lng:           driver.lng,
        isLiveSocket:  true,
      })
    } catch {
      // Continue if DB lookup fails
    }
  }

  const results = Array.from(candidateMap.values())
  results.sort((a, b) => a.distanceKm - b.distanceKm)
  return results.slice(0, limit)
}

/**
 * Finds the single nearest available driver.
 *
 * @param {Object} params
 * @returns {Promise<Object|null>}
 */
async function findNearestDriver(params) {
  const list = await findEligibleNearbyDrivers({ ...params, limit: 1 })
  return list.length > 0 ? list[0] : null
}

module.exports = {
  findEligibleNearbyDrivers,
  findNearestDriver,
}
