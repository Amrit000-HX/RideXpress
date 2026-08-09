import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './Testimonials.css'

const testimonials = [
  {
    quote: 'RideXpress changed how I manage my daily commute. The app is lightning fast and my driver is always on time. I have never missed a meeting since switching.',
    name: 'Arjun Mehta',
    role: 'Senior Product Manager, TechVentures',
    av: 'av-a',
  },
  {
    quote: 'We ship hundreds of parcels daily using RideXpress Business. The reliability is unmatched — our delivery success rate jumped to 99% within the first month.',
    name: 'Priya Sharma',
    role: 'Founder, QuickMart Online Store',
    av: 'av-b',
  },
  {
    quote: 'The real-time tracking gives me complete peace of mind. I can watch my package move live. It feels like magic — and it is surprisingly affordable.',
    name: 'Rohan Desai',
    role: 'Logistics Coordinator, Metro Goods Co.',
    av: 'av-c',
  },
]

export default function Testimonials() {
  const [cur, setCur] = useState(0)
  const [fading, setFading] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = (idx: number) => {
    setFading(true)
    setTimeout(() => {
      setCur(idx)
      setFading(false)
    }, 380)
  }

  const startTimer = () => {
    timer.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCur(c => {
          const next = (c + 1) % testimonials.length
          return next
        })
        setFading(false)
      }, 380)
    }, 6000)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])

  const t = testimonials[cur]

  return (
    <section id="testimonials" className="testimonials" aria-label="Testimonials">
      <div className="deco-quote" aria-hidden="true">"</div>

      <div className="testimonials-inner">
        <motion.span
          className="testimonials-label"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          What People Say
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <blockquote
            className={`testimonial-quote${fading ? ' fading' : ''}`}
            aria-live="polite"
          >
            {t.quote}
          </blockquote>

          <div className="testimonial-bio">
            <div className={`bio-avatar ${t.av}`} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div className="bio-name">{t.name}</div>
              <div className="bio-role">{t.role}</div>
            </div>
          </div>
        </motion.div>

        <nav className="t-nav" aria-label="Testimonial navigation">
          {testimonials.map((_, i) => (
            <button
              key={i}
              className={`t-dot${i === cur ? ' active' : ''}`}
              aria-label={`Testimonial ${i + 1}`}
              onClick={() => {
                if (timer.current) clearInterval(timer.current)
                goTo(i)
                startTimer()
              }}
            />
          ))}
        </nav>
      </div>
    </section>
  )
}
