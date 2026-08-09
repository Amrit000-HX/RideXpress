import { motion } from 'framer-motion'
import './HowItWorks.css'

const steps = [
  { num: 'Step 01', title: 'Create Your Account', desc: 'Sign up in under 60 seconds. No paperwork, no hassle.' },
  { num: 'Step 02', title: 'Choose Your Service', desc: 'Select a ride or schedule a parcel pickup from the dashboard.' },
  { num: 'Step 03', title: 'Set Your Location', desc: 'Enter pickup and drop-off points. Live map auto-suggests routes.' },
  { num: 'Step 04', title: 'Confirm & Track Live', desc: 'Pay securely and track your ride or delivery in real time.' },
  { num: 'Step 05', title: 'Arrive & Rate', desc: 'Reach your destination or receive your parcel. Leave feedback.' },
]

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
})

export default function HowItWorks() {
  const handleScroll = (href: string) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="how-it-works" className="how">
      <div className="how-header">
        <motion.span className="section-label" {...fadeUp(0)}>Simple Process</motion.span>
        <motion.h2 className="section-heading" {...fadeUp(0.1)}>How It<br />Works</motion.h2>
      </div>

      <div className="capabilities-grid">
        {/* Left: Steps */}
        <div className="cap-left">
          <motion.span className="cap-left-lbl" {...fadeUp(0.15)}>Step by Step</motion.span>
          <ul className="steps-list">
            {steps.map((s, i) => (
              <motion.li
                key={s.num}
                className="step-item"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="step-line" aria-hidden="true" />
                <div>
                  <span className="step-num">{s.num}</span>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Right: Editorial heading */}
        <div className="cap-right">
          <motion.h3 className="cap-heading" {...fadeUp(0.1)}>
            Built for<br />
            <em>the people</em><br />
            who move<br />
            <span className="cr">cities</span><br />
            forward.
          </motion.h3>
          <motion.p className="cap-sub" {...fadeUp(0.25)}>
            RideXpress is designed with obsessive attention to detail — from the moment you
            tap "Book" to the moment you arrive. Every feature exists to remove friction,
            increase trust, and make your daily movement effortless.
          </motion.p>
          <motion.button
            className="cap-cta"
            onClick={() => handleScroll('#footer')}
            {...fadeUp(0.35)}
          >
            Get Started Free
          </motion.button>
        </div>
      </div>
    </section>
  )
}
