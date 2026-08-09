import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import heroBg from '../assets/hero_bg.png'
import './Hero.css'

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
})

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, 120])
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, 80])
  const orb3Y = useTransform(scrollYProgress, [0, 1], [0, 60])

  const navigate = useNavigate()

  return (
    <section id="hero" className="hero" ref={ref}>
      <img className="hero-bg" src={heroBg} alt="" aria-hidden="true" />

      {/* Ambient Orbs */}
      <motion.div className="orb orb-1" style={{ y: orb1Y }} />
      <motion.div className="orb orb-2" style={{ y: orb2Y }} animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="orb orb-3" style={{ y: orb3Y }} animate={{ y: [0, -14, 0] }} transition={{ duration: 6, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="hero-inner">
        <motion.div className="hero-eyebrow" {...fadeUp(0.1)}>
          <span className="hero-eyebrow-dot" />
          Smart Mobility &amp; Logistics Platform
        </motion.div>

        <h1 className="hero-heading" aria-label="Move Smarter. Deliver Faster.">
          <motion.span className="solid" {...fadeUp(0.2)}>Move Smarter.</motion.span>
          <motion.span className="solid" {...fadeUp(0.35)}>Deliver Faster.</motion.span>
        </h1>
      </div>

      <div className="hero-bottom">
        <div className="hero-sub">
          <motion.p {...fadeUp(0.55)}>
            One seamless platform for booking rides and scheduling parcel deliveries.
            Fast, secure, and always on time — for commuters, businesses &amp; individuals.
          </motion.p>
          <motion.div className="hero-btns" {...fadeUp(0.65)}>
            <button className="btn-hero-primary" onClick={() => navigate('/book')}>
              <span className="btn-hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
              <span className="btn-hero-text">
                <span className="btn-hero-label">Book a Ride</span>
                <span className="btn-hero-sub">Instant city rides</span>
              </span>
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate('/deliver')}>
              <span className="btn-hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/>
                  <path d="M16.5 9.4 7.55 4.24M3.29 7 12 12l8.71-5M12 22V12"/>
                  <circle cx="18.5" cy="15.5" r="2.5"/><path d="M20.27 17.27 22 19"/>
                </svg>
              </span>
              <span className="btn-hero-text">
                <span className="btn-hero-label">Send a Parcel</span>
                <span className="btn-hero-sub">Same-day delivery</span>
              </span>
            </button>
          </motion.div>
        </div>

        <motion.div className="hero-scroll" {...fadeUp(0.75)} aria-label="Scroll down">
          <span className="scroll-label">Scroll</span>
          <motion.div
            className="scroll-ring"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
