import './Marquee.css'

const items = [
  'City Rides', 'Parcel Delivery', 'Real-Time Tracking',
  'Scheduled Bookings', 'Business Logistics', 'Flexible Pricing',
  'Last-Mile Delivery', '24/7 Support',
]

export default function Marquee() {
  const doubled = [...items, ...items]
  return (
    <div className="marquee-strip" aria-hidden="true">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i}>
            {item}
            <span className="sep"> ✦ </span>
          </span>
        ))}
      </div>
    </div>
  )
}
