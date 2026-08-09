import { motion } from 'framer-motion'
import featuredImg from '../assets/featured_person.png'
import './Featured.css'

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
})

const stats = [
  { num: '1.2', unit: 'M+', label: 'Rides Completed' },
  { num: '850', unit: 'K+', label: 'Parcels Delivered' },
  { num: '40',  unit: '+',  label: 'Cities Covered' },
  { num: '4.9', unit: '★', label: 'Avg. User Rating' },
]

export default function Featured() {
  const handleScroll = (href: string) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="featured" className="featured">
      <div className="featured-grid">

        {/* Left: Image */}
        <motion.div
          className="featured-img-wrap"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="featured-deco" aria-hidden="true" />
          <div className="featured-img-inner">
            <img src={featuredImg} alt="Person using RideXpress app at a city street" loading="lazy" />
          </div>
        </motion.div>

        {/* Right: Content */}
        <div className="featured-content">
          <motion.span className="featured-label" {...fadeUp(0.1)}>
            Why RideXpress
          </motion.span>

          <motion.h2 className="featured-heading" {...fadeUp(0.2)}>
            One App.<br />
            <span className="silver">Infinite</span><br />
            Possibilities.
          </motion.h2>

          <motion.p className="featured-body" {...fadeUp(0.3)}>
            RideXpress is engineered for the modern city. We merge personal transportation and
            last-mile delivery into a single intuitive experience — reducing friction, saving time,
            and putting control back in your hands. Whether you're a daily commuter, a local
            business, or an individual sending a parcel across town, RideXpress adapts seamlessly.
          </motion.p>

          <motion.button
            className="featured-arrow-link"
            onClick={() => handleScroll('#how-it-works')}
            {...fadeUp(0.4)}
          >
            See How It Works
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>

          <div className="featured-stats">
            {stats.map((s, i) => (
              <motion.div key={s.label} {...fadeUp(0.15 * i + 0.45)}>
                <div className="stat-num">
                  {s.num}<span className="unit">{s.unit}</span>
                </div>
                <div className="stat-lbl">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
