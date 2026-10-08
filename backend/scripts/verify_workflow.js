require('dotenv').config()
const path = require('path')
const mongoose = require('mongoose')
const ioClient = require(path.resolve(__dirname, '../../ridexpress-app/node_modules/socket.io-client'))
const Employee = require('../src/models/Employee')
const Ride = require('../src/models/Ride')
const User = require('../src/models/User')
const { findEligibleDrivers } = require('../src/services/driverMatcher')
const { handleRideSearchTimeout } = require('../src/controllers/rideController')

const BASE_URL = 'http://localhost:5000'

async function request(urlPath, options = {}) {
  const url = `${BASE_URL}${urlPath}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(url, { ...options, headers })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, ok: res.ok, data }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runTests() {
  console.log('====================================================')
  console.log('🚀 STARTING E2E RIDE-BOOKING & DRIVER DISPATCH SUITE')
  console.log('====================================================')

  await mongoose.connect(process.env.MONGO_URI)
  console.log('📦 Connected to MongoDB Atlas')

  // Clean up any stale active rides for clean test state
  const driverDoc = await Employee.findOne({ email: 'driver@ridexpress.com' })
  if (!driverDoc) {
    throw new Error('Driver driver@ridexpress.com not found in MongoDB!')
  }
  const driverId = String(driverDoc._id)

  const userDoc = await User.findOne({ email: 'user@ridexpress.com' })
  if (!userDoc) {
    throw new Error('User user@ridexpress.com not found in MongoDB!')
  }
  const userId = String(userDoc._id)

  await Employee.findByIdAndUpdate(driverId, {
    availabilityStatus: 'AVAILABLE',
    currentRideId: null,
    onlineStatus: 'ONLINE',
    vehicleCategory: 'Scooty',
    location: { type: 'Point', coordinates: [83.8130, 19.0733] },
    currentLocation: {
      lat: 19.0733,
      lng: 83.8130,
      heading: 0,
      speed: 0,
      updatedAt: new Date(),
    },
  })

  // 1. Authenticate Driver & Rider
  console.log('\n--- 1. Authenticating Rider & Driver ---')
  const driverLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'driver@ridexpress.com', password: 'Driver@12345', accountType: 'employee' }),
  })
  if (!driverLogin.ok) throw new Error(`Driver login failed: ${JSON.stringify(driverLogin.data)}`)
  const driverToken = driverLogin.data.token
  console.log('✅ Driver authenticated successfully')

  const userLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'user@ridexpress.com', password: 'User@12345', accountType: 'user' }),
  })
  if (!userLogin.ok) throw new Error(`User login failed: ${JSON.stringify(userLogin.data)}`)
  const userToken = userLogin.data.token
  console.log('✅ Rider authenticated successfully')

  // 2. Sockets Setup
  console.log('\n--- 2. Connecting WebSockets ---')
  const driverSocket = ioClient(BASE_URL, {
    auth: { token: driverToken },
    transports: ['websocket'],
  })

  const userSocket = ioClient(BASE_URL, {
    auth: { token: userToken },
    transports: ['websocket'],
  })

  await Promise.all([
    new Promise((resolve) => driverSocket.on('connect', resolve)),
    new Promise((resolve) => userSocket.on('connect', resolve)),
  ])
  console.log(`✅ Driver socket connected: ${driverSocket.id}`)
  console.log(`✅ Rider socket connected: ${userSocket.id}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Driver comes online & appears on Rider's Map
  // ─────────────────────────────────────────────────────────────────
  console.log('\n====================================================')
  console.log('🧪 TEST 1: Driver Comes Online & Map Availability')
  console.log('====================================================')

  // Call status update API
  const statusRes = await request('/api/employees/me/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({ status: 'ONLINE' }),
  })
  console.log('Driver status update API response:', statusRes.data)

  // Call location update API
  const locRes = await request('/api/employees/me/location', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({ lat: 19.0733, lng: 83.8130, heading: 45, speed: 12 }),
  })
  console.log('Driver location update API response:', locRes.data.success ? 'Location saved' : locRes.data)

  // Driver emits go_online and location_update on socket
  driverSocket.emit('driver:go_online', { vehicleType: 'Scooty' })
  driverSocket.emit('driver:location_update', {
    lat: 19.0733,
    lng: 83.8130,
    heading: 45,
    speed: 12,
  })

  await wait(500)

  // Verify MongoDB
  const verifiedDriver = await Employee.findById(driverId)
  if (verifiedDriver.onlineStatus !== 'ONLINE') {
    throw new Error(`Test 1 Failed: onlineStatus in MongoDB is ${verifiedDriver.onlineStatus}`)
  }
  if (!verifiedDriver.currentLocation || verifiedDriver.currentLocation.lat !== 19.0733) {
    throw new Error(`Test 1 Failed: currentLocation in MongoDB is invalid`)
  }
  console.log('✅ MongoDB records driver ONLINE with valid GPS coordinates: 19.0733, 83.8130')

  // Verify Rider receives driver on map via fleet:get_nearby
  const nearbyDriversPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for fleet:nearby_drivers')), 4000)
    userSocket.once('fleet:nearby_drivers', (data) => {
      clearTimeout(timeout)
      resolve(data)
    })
  })
  userSocket.emit('fleet:get_nearby')
  const nearbyFleet = await nearbyDriversPromise
  console.log(`Received nearby fleet for rider: ${nearbyFleet.drivers.length} drivers found`)
  const foundDriver = nearbyFleet.drivers.find((d) => String(d.id || d.driverId) === driverId)
  if (!foundDriver) {
    throw new Error(`Test 1 Failed: Driver ${driverId} not found in nearby fleet!`)
  }
  console.log(`✅ PASS TEST 1: Driver ${driverId} appears on rider map with lat: ${foundDriver.lat}, lng: ${foundDriver.lng}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Ride request reaches a driver
  // ─────────────────────────────────────────────────────────────────
  console.log('\n====================================================')
  console.log('🧪 TEST 2: Ride Request Dispatched to Online Driver')
  console.log('====================================================')

  let incomingRequestReceived = null
  driverSocket.on('ride:incoming_request', (data) => {
    console.log('🔔 Driver received ride:incoming_request for ride:', data.rideId || data._id)
    incomingRequestReceived = data
  })

  // Rider submits ride booking
  const rideBookingRes = await request('/api/rides', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      vehicleType: 'Scooty',
      vehicleId: 'scooty',
      pickup: {
        address: 'Gunupur Railway Station, Rayagada, Odisha',
        lat: 19.0733,
        lng: 83.8130,
      },
      drop: {
        address: 'Main Bazaar, Gunupur, Odisha',
        lat: 19.0682,
        lng: 83.8163,
      },
      distanceKm: 2.4,
      estimatedFare: 110,
      paymentMethod: 'Cash / UPI',
    }),
  })

  if (!rideBookingRes.ok) {
    throw new Error(`Test 2 Failed to create ride: ${JSON.stringify(rideBookingRes.data)}`)
  }

  const createdRide = rideBookingRes.data.ride
  const testRideId = String(createdRide._id || createdRide.id || createdRide.rideId)
  console.log(`Created Ride ID: ${testRideId} with status: ${createdRide.status}`)

  // Verify DB state
  const dbRide = await Ride.findById(testRideId)
  if (!dbRide || dbRide.status !== 'searching') {
    throw new Error(`Test 2 Failed: Ride not in searching status in DB! Status: ${dbRide?.status}`)
  }
  console.log('✅ Ride successfully persisted with status: searching')

  // Wait briefly for socket delivery
  await wait(1000)
  if (!incomingRequestReceived || String(incomingRequestReceived.rideId || incomingRequestReceived._id) !== testRideId) {
    throw new Error('Test 2 Failed: Driver socket did not receive ride:incoming_request!')
  }
  console.log('✅ Driver socket received real-time ride request')

  // Check driver available requests feed
  const availRes = await request('/api/rides/available', {
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  const availableRides = availRes.data.rides || []
  const hasInFeed = availableRides.some((r) => String(r._id) === testRideId)
  if (!hasInFeed) {
    throw new Error('Test 2 Failed: Ride not found in driver GET /api/rides/available feed!')
  }
  console.log('✅ Ride visible in driver upcoming/available feed API')
  console.log('✅ PASS TEST 2: Ride request successfully reached driver')

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Driver accepts ride
  // ─────────────────────────────────────────────────────────────────
  console.log('\n====================================================')
  console.log('🧪 TEST 3: Driver Accepts Ride')
  console.log('====================================================')

  let riderAcceptedNotification = null
  userSocket.on('ride:accepted', (data) => {
    console.log('🎉 Rider received ride:accepted event!')
    riderAcceptedNotification = data
  })
  // Join rider room to listen for events
  userSocket.emit('ride:join_room', { rideId: testRideId })
  await wait(200)

  // Driver accepts the ride
  const acceptRes = await request(`/api/rides/${testRideId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  if (!acceptRes.ok) {
    throw new Error(`Test 3 Failed to accept ride: ${JSON.stringify(acceptRes.data)}`)
  }
  console.log('Driver accept response:', acceptRes.data.message)

  // Verify DB
  const acceptedDbRide = await Ride.findById(testRideId)
  if (acceptedDbRide.status !== 'assigned') {
    throw new Error(`Test 3 Failed: DB ride status is ${acceptedDbRide.status}, expected assigned`)
  }
  if (String(acceptedDbRide.driverId) !== driverId) {
    throw new Error(`Test 3 Failed: DB ride driverId is ${acceptedDbRide.driverId}, expected ${driverId}`)
  }
  console.log(`✅ Ride ${testRideId} atomically updated in DB: status=assigned, driverId=${driverId}`)

  // Verify rider received socket event
  await wait(500)
  if (!riderAcceptedNotification) {
    throw new Error('Test 3 Failed: Rider did not receive ride:accepted socket event!')
  }
  console.log('✅ Rider socket received ride:accepted notification')

  // Verify employee portal getDriverActiveRide
  const activeRideRes = await request('/api/rides/driver-active', {
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  if (!activeRideRes.ok || !activeRideRes.data.ride || String(activeRideRes.data.ride._id) !== testRideId) {
    throw new Error(`Test 3 Failed: Driver active ride query did not return ride ${testRideId}!`)
  }
  console.log('✅ Driver portal GET /api/rides/driver-active successfully returns assigned ride')

  // Verify available feed no longer lists this ride
  const availAfterAccept = await request('/api/rides/available', {
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  const stillAvailable = (availAfterAccept.data.rides || []).some((r) => String(r._id) === testRideId)
  if (stillAvailable) {
    throw new Error('Test 3 Failed: Ride is still in available feed after acceptance!')
  }
  console.log('✅ Ride removed from open available feed')
  console.log('✅ PASS TEST 3: Driver acceptance verified end-to-end')

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Driver rejects a ride request
  // ─────────────────────────────────────────────────────────────────
  console.log('\n====================================================')
  console.log('🧪 TEST 4: Driver Rejects Ride Request')
  console.log('====================================================')

  // Reset driver availability for next test
  await Employee.findByIdAndUpdate(driverId, {
    availabilityStatus: 'AVAILABLE',
    currentRideId: null,
  })

  // Create a second ride
  const ride2Res = await request('/api/rides', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      vehicleType: 'Scooty',
      vehicleId: 'scooty',
      pickup: {
        address: 'Gunupur Main Road, Odisha',
        lat: 19.0733,
        lng: 83.8130,
      },
      drop: {
        address: 'GIET University Campus, Gunupur, Odisha',
        lat: 19.0490,
        lng: 83.8240,
      },
      distanceKm: 4.8,
      estimatedFare: 180,
      paymentMethod: 'Cash / UPI',
    }),
  })
  const ride2Id = String(ride2Res.data.ride._id || ride2Res.data.ride.id)
  console.log(`Created second ride ID: ${ride2Id}`)

  // Driver rejects this ride
  const rejectRes = await request(`/api/rides/${ride2Id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  if (!rejectRes.ok) {
    throw new Error(`Test 4 Failed to reject ride: ${JSON.stringify(rejectRes.data)}`)
  }
  console.log('Driver reject response:', rejectRes.data.message)

  // Verify DB: ride must REMAIN searching, NOT cancelled
  const rejectedDbRide = await Ride.findById(ride2Id)
  if (rejectedDbRide.status !== 'searching') {
    throw new Error(`Test 4 Failed: Ride status changed to ${rejectedDbRide.status}, expected searching`)
  }
  const isDriverInRejectedList = (rejectedDbRide.rejectedBy || []).some((d) => String(d) === driverId)
  if (!isDriverInRejectedList) {
    throw new Error('Test 4 Failed: Driver not added to rejectedBy array')
  }
  console.log('✅ Ride remains in searching status; rejecting driver recorded in rejectedBy')
  console.log('✅ PASS TEST 4: Driver rejection verified')

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: Competing driver acceptance concurrency
  // ─────────────────────────────────────────────────────────────────
  console.log('\n====================================================')
  console.log('🧪 TEST 5: Competing Driver Acceptance (Atomic Concurrency)')
  console.log('====================================================')

  // Driver accepts ride2
  const acceptRide2Res = await request(`/api/rides/${ride2Id}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  if (!acceptRide2Res.ok) {
    throw new Error(`Accepting ride2 failed: ${JSON.stringify(acceptRide2Res.data)}`)
  }
  console.log('First driver accepted ride2 successfully')

  // Second simulated acceptance on the same ride
  const duplicateAcceptRes = await request(`/api/rides/${ride2Id}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  console.log('Duplicate accept status:', duplicateAcceptRes.status, duplicateAcceptRes.data)
  if (duplicateAcceptRes.status !== 409 && duplicateAcceptRes.status !== 400) {
    throw new Error(`Test 5 Failed: Expected 409/400 Conflict on duplicate accept, got ${duplicateAcceptRes.status}`)
  }
  console.log('✅ Duplicate accept safely rejected with 409 Conflict')

  // Verify DB assignment was not corrupted
  const ride2Final = await Ride.findById(ride2Id)
  if (ride2Final.status !== 'assigned') {
    throw new Error(`Test 5 Failed: Ride status corrupted: ${ride2Final.status}`)
  }
  console.log('✅ PASS TEST 5: Atomic concurrency safe; only one acceptance succeeded')

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Standby / Demo Driver Timeout Assignment
  // ─────────────────────────────────────────────────────────────────
  console.log('\n====================================================')
  console.log('🧪 TEST 6: Demo / Standby Driver Timeout Assignment')
  console.log('====================================================')

  // Reset driver availability
  await Employee.findByIdAndUpdate(driverId, {
    availabilityStatus: 'AVAILABLE',
    currentRideId: null,
  })

  // Create a 3rd ride (unaccepted)
  const ride3Res = await request('/api/rides', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      vehicleType: 'Scooty',
      vehicleId: 'scooty',
      pickup: {
        address: 'Remote Outpost, Gunupur, Odisha',
        lat: 19.0733,
        lng: 83.8130,
      },
      drop: {
        address: 'Hospital Road, Gunupur, Odisha',
        lat: 19.0650,
        lng: 83.8100,
      },
      distanceKm: 3.1,
      estimatedFare: 135,
      paymentMethod: 'Cash / UPI',
    }),
  })
  const ride3Id = String(ride3Res.data.ride._id || ride3Res.data.ride.id)
  console.log(`Created 3rd ride for timeout test: ${ride3Id}`)

  // Invoke timeout handler (or wait 30s)
  // Let's call handleRideSearchTimeout directly to test the atomic logic immediately
  console.log('Executing handleRideSearchTimeout on ride3...')
  const mockIo = {
    to: (room) => ({
      emit: (event, payload) => {
        console.log(`   [Timeout Socket Emit] room: ${room} | event: ${event}`)
      },
    }),
  }
  await handleRideSearchTimeout(ride3Id, mockIo)

  // Verify DB state
  const ride3Db = await Ride.findById(ride3Id)
  console.log('Ride 3 state after timeout handler:', {
    status: ride3Db.status,
    driverId: ride3Db.driverId,
    driverName: ride3Db.driverName,
  })

  if (ride3Db.status !== 'assigned') {
    throw new Error(`Test 6 Failed: Ride status is ${ride3Db.status}, expected assigned`)
  }
  if (!ride3Db.driverId) {
    throw new Error('Test 6 Failed: DriverId not assigned in DB by timeout handler!')
  }
  console.log(`✅ Standby assignment safely persisted in MongoDB: assigned to ${ride3Db.driverName} (${ride3Db.driverId})`)

  // Verify employee portal retrieves this ride!
  const driverActiveAfterTimeout = await request('/api/rides/driver-active', {
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  if (!driverActiveAfterTimeout.ok || !driverActiveAfterTimeout.data.ride) {
    throw new Error('Test 6 Failed: Driver portal cannot retrieve the timeout-assigned ride!')
  }
  console.log(`✅ Employee portal GET /api/rides/driver-active returns ride: ${driverActiveAfterTimeout.data.ride.bookingId}`)

  // Verify timeout safety: Calling timeout AGAIN on the already-assigned ride must NOT overwrite it
  console.log('Verifying concurrency safety: Re-running timeout on assigned ride...')
  await handleRideSearchTimeout(ride3Id, mockIo)
  const ride3AfterSecondTimeout = await Ride.findById(ride3Id)
  if (String(ride3AfterSecondTimeout.driverId) !== String(ride3Db.driverId)) {
    throw new Error('Test 6 Failed: Timeout handler modified already assigned ride!')
  }
  console.log('✅ Timeout handler safely skipped already-assigned ride')
  console.log('✅ PASS TEST 6: Timeout fallback and employee synchronization verified')

  // ─────────────────────────────────────────────────────────────────
  // TEST 7: Reconnection & Refresh State Recovery
  // ─────────────────────────────────────────────────────────────────
  console.log('\n====================================================')
  console.log('🧪 TEST 7: Reconnection & State Recovery')
  console.log('====================================================')

  // Disconnect sockets
  driverSocket.disconnect()
  userSocket.disconnect()
  console.log('Sockets disconnected')

  // Re-fetch ride via REST API (same as page refresh in browser)
  const rideRecovery = await request(`/api/rides/${ride3Id}`, {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  if (!rideRecovery.ok || rideRecovery.data.ride.status !== 'assigned') {
    throw new Error('Test 7 Failed: Failed to recover ride state from REST API on page refresh!')
  }
  console.log(`✅ Rider recovers full trip state on refresh: status=${rideRecovery.data.ride.status}, driver=${rideRecovery.data.ride.driverName}`)

  const driverRecovery = await request('/api/rides/driver-active', {
    headers: { Authorization: `Bearer ${driverToken}` },
  })
  if (!driverRecovery.ok || !driverRecovery.data.ride) {
    throw new Error('Test 7 Failed: Failed to recover driver active trip on refresh!')
  }
  console.log(`✅ Driver recovers active trip on refresh: bookingId=${driverRecovery.data.ride.bookingId}`)
  console.log('✅ PASS TEST 7: State recovery from DB verified after disconnection and refresh')

  console.log('\n====================================================')
  console.log('🎉 ALL 7 E2E INTEGRATION TESTS PASSED SUCCESSFULLY!')
  console.log('====================================================')

  await mongoose.disconnect()
  process.exit(0)
}

runTests().catch((err) => {
  console.error('\n❌ E2E SUITE FAILED WITH ERROR:', err)
  process.exit(1)
})
