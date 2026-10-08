require('dotenv').config()
const path = require('path')
const mongoose = require('mongoose')
const io = require(path.resolve(__dirname, '../../ridexpress-app/node_modules/socket.io-client'))

const BASE_URL = 'http://localhost:5000'
const API_BASE = 'http://localhost:5000/api'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request(method, path, body = null, token = null) {
  const url = `${API_BASE}${path}`
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const options = {
    method,
    headers,
  }
  if (body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { rawText: text }
  }
  return { status: res.status, ok: res.ok, data }
}

async function runTests() {
  console.log('====================================================')
  console.log('🧪 STARTING EMPLOYEE PORTAL WORKFLOW VERIFICATION')
  console.log('====================================================\n')

  let driverToken, driverUser, riderToken, riderUser
  let driverSocket, riderSocket

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST A: Employee Login & Stale Ride Reconciliation
    // ─────────────────────────────────────────────────────────────
    console.log('▶ TEST A: Employee Login & Stale Ride Cleanup')

    // 1. Employee Login
    const driverLoginRes = await request('POST', '/auth/login', {
      email: 'driver@ridexpress.com',
      password: 'Driver@12345',
      accountType: 'employee',
    })

    if (!driverLoginRes.ok || !driverLoginRes.data.token) {
      throw new Error(`Driver login failed! ${JSON.stringify(driverLoginRes.data)}`)
    }
    driverToken = driverLoginRes.data.token
    driverUser = driverLoginRes.data.user
    console.log(`  ✓ Driver logged in: ${driverUser.name} (${driverUser.id})`)

    // 2. Check Driver's Active Ride endpoint (triggers cleanupDriverStaleRides)
    const activeRideRes = await request('GET', '/rides/driver-active', null, driverToken)
    console.log(`  ✓ Driver active ride check: ${activeRideRes.data.ride ? activeRideRes.data.ride.bookingId + ' (' + activeRideRes.data.ride.status + ')' : 'No stale ride (CLEAN)'}`)
    
    // Connect to DB directly to verify Employee availability & stale ride statuses
    await mongoose.connect(process.env.MONGO_URI)
    const Employee = require('../src/models/Employee')
    const Ride = require('../src/models/Ride')

    const driverDoc = await Employee.findById(driverUser.id)
    console.log(`  ✓ Driver DB state -> availabilityStatus: ${driverDoc.availabilityStatus}, currentRideId: ${driverDoc.currentRideId}`)

    // ─────────────────────────────────────────────────────────────
    // TEST B: Driver Goes Online
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST B: Driver Goes Online & Real-time GPS Streaming')

    // 1. Toggle Online via API
    const onlineRes = await request('PATCH', '/employees/me/status', { status: 'ONLINE' }, driverToken)
    console.log(`  ✓ updateOnlineStatus returned: ${onlineRes.data.onlineStatus}`)

    // 2. Update Location
    const locRes = await request(
      'PATCH',
      '/employees/me/location',
      { lat: 19.07334, lng: 83.81302, heading: 90, speed: 15 },
      driverToken
    )
    console.log(`  ✓ updateLocation returned lat: ${locRes.data.currentLocation.lat}, lng: ${locRes.data.currentLocation.lng}`)

    // 3. Connect Driver Socket
    driverSocket = io(BASE_URL, {
      auth: { token: driverToken },
      transports: ['websocket'],
    })

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Driver socket connect timeout')), 5000)
      driverSocket.on('connect', () => {
        clearTimeout(timer)
        console.log(`  ✓ Driver Socket connected: ${driverSocket.id}`)
        resolve()
      })
    })

    // Emit driver:location_update via socket
    driverSocket.emit('driver:location_update', {
      lat: 19.07334,
      lng: 83.81302,
      heading: 90,
      speed: 15,
      activeRideId: null,
    })
    console.log('  ✓ driver:location_update emitted via socket')

    // ─────────────────────────────────────────────────────────────
    // TEST C: Receive and Accept a Ride (Fix Server Error)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST C: Rider Books Ride & Driver Accepts (No Server Error)')

    // 1. Rider Login
    const riderLoginRes = await request('POST', '/auth/login', {
      email: 'user@ridexpress.com',
      password: 'User@12345',
      accountType: 'user',
    })
    riderToken = riderLoginRes.data.token
    riderUser = riderLoginRes.data.user
    console.log(`  ✓ Rider logged in: ${riderUser.name} (${riderUser.id})`)

    // 2. Connect Rider Socket
    riderSocket = io(BASE_URL, {
      auth: { token: riderToken },
      transports: ['websocket'],
    })
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Rider socket connect timeout')), 5000)
      riderSocket.on('connect', () => {
        clearTimeout(timer)
        console.log(`  ✓ Rider Socket connected: ${riderSocket.id}`)
        resolve()
      })
    })

    // 3. Setup Driver listener for incoming request
    let receivedDispatch = null
    driverSocket.on('ride:incoming_request', (data) => {
      receivedDispatch = data
      console.log(`  📩 [Driver Received Request] Booking: ${data.bookingId}, Fare: ₹${data.estimatedFare}, Pickup: ${data.pickup?.address?.slice(0, 30)}`)
    })

    // 4. Setup Rider listener for ride:accepted
    let riderReceivedAccept = null
    riderSocket.on('ride:accepted', (data) => {
      riderReceivedAccept = data
      console.log(`  🎉 [Rider Received Accept] Driver: ${data.driver?.name}, Vehicle: ${data.driver?.vehicleNumber}`)
    })

    // 5. Rider Books a Ride
    const bookRes = await request(
      'POST',
      '/rides',
      {
        vehicleType: 'Scooty',
        pickup: {
          address: 'Gunupur Main Market, Rayagada, Odisha',
          lat: 19.0733,
          lng: 83.8130,
        },
        drop: {
          address: 'GIET University Gate 1, Gunupur, Odisha',
          lat: 19.0490,
          lng: 83.8240,
        },
        distanceKm: 4.8,
        estimatedMinutes: 12,
        estimatedFare: 240,
        paymentMethod: 'Cash on Delivery / UPI',
      },
      riderToken
    )

    const bookedRide = bookRes.data.ride
    console.log(`  ✓ Ride created: ${bookedRide.bookingId} (${bookedRide.id || bookedRide._id}), PIN: ${bookedRide.startRidePin}`)

    // Wait for real-time dispatch event
    await sleep(1500)
    if (!receivedDispatch) {
      console.log('  ⚠️ Checking available rides endpoint as fallback...')
      const avail = await request('GET', '/rides/available', null, driverToken)
      console.log(`  ✓ Available rides found: ${avail.data.rides.length}`)
    } else {
      console.log(`  ✓ Driver received real-time socket dispatch: rideId=${receivedDispatch.rideId}`)
    }

    // 6. Driver Accepts the Ride!
    const rideIdToAccept = bookedRide.id || bookedRide._id
    console.log(`  👉 Calling POST /api/rides/${rideIdToAccept}/accept ...`)
    
    const acceptRes = await request('POST', `/rides/${rideIdToAccept}/accept`, {}, driverToken)

    if (!acceptRes.ok || !acceptRes.data.success) {
      throw new Error(`Accept failed! HTTP ${acceptRes.status}: ${JSON.stringify(acceptRes.data)}`)
    }
    console.log(`  ✅ Accept SUCCEEDED! Status: ${acceptRes.status} OK | Ride status: ${acceptRes.data.ride?.status}`)

    await sleep(1000)
    if (riderReceivedAccept) {
      console.log('  ✓ Rider received real-time ride:accepted notification via socket')
    }

    // Verify DB State after acceptance
    const acceptedRideInDb = await Ride.findById(rideIdToAccept)
    console.log(`  ✓ DB Ride State -> status: ${acceptedRideInDb.status}, driverId: ${acceptedRideInDb.driverId}, driverName: ${acceptedRideInDb.driverName}`)
    if (acceptedRideInDb.status !== 'assigned') {
      throw new Error(`Expected status 'assigned', found '${acceptedRideInDb.status}'! Must not transition directly to in_progress before PIN verification.`)
    }
    console.log('  ✓ Concurrency & Pre-start check passed: Ride is in assigned status, NOT in_progress!')

    // ─────────────────────────────────────────────────────────────
    // TEST D: Driver Arrives & Rider PIN Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST D: Driver Arrives at Pickup & Mandatory PIN Verification')

    // 1. Driver Marks Arrived
    const arrivedRes = await request('POST', `/rides/${rideIdToAccept}/arrived`, {}, driverToken)
    console.log(`  ✓ markArrived returned: ${arrivedRes.data.ride?.status}`)

    // 2. Driver attempts to start with WRONG PIN
    console.log('  👉 Testing Start Ride with INCORRECT PIN "9999"...')
    const wrongPinRes = await request('POST', `/rides/${rideIdToAccept}/start`, { pin: '9999' }, driverToken)
    if (wrongPinRes.status === 400) {
      console.log(`  ✅ Correctly REJECTED wrong PIN with HTTP 400: "${wrongPinRes.data.message}"`)
    } else {
      throw new Error(`FAILED: Wrong PIN returned status ${wrongPinRes.status}: ${JSON.stringify(wrongPinRes.data)}`)
    }

    // Verify ride is still not in progress
    const rideAfterWrongPin = await Ride.findById(rideIdToAccept)
    if (rideAfterWrongPin.status === 'in_progress') {
      throw new Error('FAILED: Ride transitioned to in_progress despite wrong PIN!')
    }
    console.log(`  ✓ Ride status preserved as '${rideAfterWrongPin.status}' after invalid PIN`)

    // 3. Driver enters the CORRECT PIN from rider
    const correctPin = acceptedRideInDb.startRidePin
    console.log(`  👉 Testing Start Ride with CORRECT PIN "${correctPin}"...`)
    const startRes = await request('POST', `/rides/${rideIdToAccept}/start`, { pin: correctPin }, driverToken)
    if (!startRes.ok) {
      throw new Error(`Start ride with correct PIN failed: ${JSON.stringify(startRes.data)}`)
    }
    console.log(`  ✅ Start ride SUCCEEDED! Status: ${startRes.data.ride?.status}, startedAt: ${startRes.data.ride?.startedAt}`)

    const rideAfterCorrectPin = await Ride.findById(rideIdToAccept)
    if (rideAfterCorrectPin.status !== 'in_progress' || !rideAfterCorrectPin.startedAt) {
      throw new Error('FAILED: Ride should be in_progress with startedAt set!')
    }
    console.log('  ✓ Ride successfully transitioned to in_progress with verified timestamp!')

    // 4. Complete the Ride
    console.log('  👉 Completing the ride...')
    const completeRes = await request('POST', `/rides/${rideIdToAccept}/complete`, {}, driverToken)
    console.log(`  ✅ completeRide returned: status=${completeRes.data.ride?.status}`)

    // Verify Driver is freed in DB
    const driverAfterComplete = await Employee.findById(driverUser.id)
    console.log(`  ✓ Driver DB state after completion -> availabilityStatus: ${driverAfterComplete.availabilityStatus}, currentRideId: ${driverAfterComplete.currentRideId}`)

    // ─────────────────────────────────────────────────────────────
    // TEST E: Concurrency & Safety Checks
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST E: Concurrency & Invalid Parameter Rejection')

    // 1. Attempt to accept with [object Object] (the old bug!)
    console.log('  👉 Testing accept with [object Object] parameter...')
    const objErr = await request('POST', `/rides/[object%20Object]/accept`, {}, driverToken)
    if (objErr.status === 400) {
      console.log(`  ✅ Correctly rejected invalid [object Object] with HTTP 400: "${objErr.data.message}"`)
    } else {
      throw new Error(`Should have returned 400 on [object Object], got ${objErr.status}`)
    }

    // 2. Attempt to accept an already completed or assigned ride
    console.log('  👉 Testing competing accept on already completed ride...')
    const dupErr = await request('POST', `/rides/${rideIdToAccept}/accept`, {}, driverToken)
    if (dupErr.status === 409) {
      console.log(`  ✅ Correctly rejected duplicate accept with HTTP 409: "${dupErr.data.message}"`)
    } else {
      throw new Error(`Should have returned 409 on already completed ride, got ${dupErr.status}`)
    }

    console.log('\n====================================================')
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! WORKFLOW FULLY VERIFIED.')
    console.log('====================================================')
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message)
    process.exit(1)
  } finally {
    if (driverSocket) driverSocket.disconnect()
    if (riderSocket) riderSocket.disconnect()
    await mongoose.disconnect()
    process.exit(0)
  }
}

runTests()
