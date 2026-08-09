import { motion } from 'framer-motion'
import { CardSwap, Card } from './CardSwap'
import imgRide      from '../assets/service_ride.png'
import imgParcel    from '../assets/service_parcel.png'
import imgScheduled from '../assets/service_scheduled.png'
import imgBusiness  from '../assets/service_business.png'
import imgTracking  from '../assets/service_tracking.png'
import imgPricing   from '../assets/service_pricing.png'
import './ServicesGrid.css'

const services = [
  { num: '01', title: 'City Ride Booking',       desc: 'On-demand urban rides at your fingertips. Book a verified driver in seconds.',        img: imgRide      },
  { num: '02', title: 'Parcel Pickup & Delivery', desc: 'Same-day parcel logistics. Schedule a doorstep pickup and we handle the rest.',       img: imgParcel    },
  { num: '03', title: 'Scheduled Rides',          desc: 'Plan ahead with confidence. Book rides hours or days in advance.',                    img: imgScheduled },
  { num: '04', title: 'Business Courier',         desc: 'Dedicated B2B bulk delivery for merchants and enterprises needing scale.',            img: imgBusiness  },
  { num: '05', title: 'Real-Time Tracking',       desc: 'Live GPS for rides and parcels. Know exactly where your delivery is, every second.', img: imgTracking  },
  { num: '06', title: 'Flexible Pricing',         desc: 'Pay-as-you-go or subscription plans. Zero hidden charges, always.',                  img: imgPricing   },
]

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
})

/* Responsive card size */
const CARD_W = 380
const CARD_H = 300

export default function ServicesGrid() {
  return (
    <section id="services" className="services">
      <div className="services-layout">

        {/* ── Left: Copy + mini list ─────────────────────── */}
        <div className="services-left">
          <motion.span className="services-eyebrow" {...fadeUp(0)}>
            What We Offer
          </motion.span>

          <motion.h2 className="services-heading" {...fadeUp(0.1)}>
            Our<br />
            <span className="outline">Services</span>
          </motion.h2>

          <motion.p className="services-sub" {...fadeUp(0.2)}>
            From instant city rides to same-day parcel delivery, RideXpress covers
            every dimension of your daily mobility needs — all in one seamless platform.
          </motion.p>

          {/* Mini list */}
          <motion.ul
            className="services-mini-list"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.07 } },
            }}
          >
            {services.map(s => (
              <motion.li
                key={s.num}
                className="services-mini-item"
                variants={{
                  hidden:  { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                <span className="mini-num">{s.num}</span>
                <span className="mini-line" aria-hidden="true" />
                <span className="mini-name">{s.title}</span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.span className="services-count-badge" {...fadeUp(0.5)}>
            06 Services Available
          </motion.span>
        </div>

        {/* ── Right: GSAP CardSwap stack ─────────────────── */}
        <div className="services-right">
          <div className="cardswap-wrapper">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <CardSwap
                width={CARD_W}
                height={CARD_H}
                cardDistance={48}
                verticalDistance={44}
                delay={3800}
                pauseOnHover={true}
                skewAmount={5}
                easing="elastic"
              >
                {services.map(s => (
                  <Card key={s.num}>
                    {/* Image */}
                    <img
                      className="rx-card-img"
                      src={s.img}
                      alt={s.title}
                      loading="lazy"
                    />
                    {/* Gradient overlay */}
                    <div className="rx-card-overlay" aria-hidden="true" />
                    {/* Text content */}
                    <div className="rx-card-body">
                      <span className="rx-card-num">{s.num}</span>
                      <h3 className="rx-card-title">{s.title}</h3>
                      <p className="rx-card-desc">{s.desc}</p>
                    </div>
                  </Card>
                ))}
              </CardSwap>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  )
}
