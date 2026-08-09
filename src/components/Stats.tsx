import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import './Stats.css'

const data = [
  { val: 3,  suffix: 'min', label: 'Avg. Pickup Time' },
  { val: 99, suffix: '%',   label: 'On-Time Delivery' },
  { val: 24, suffix: '/7',  label: 'Customer Support' },
  { val: 50, suffix: 'K+',  label: 'Active Drivers' },
]

function Counter({ val, suffix }: { val: number; suffix: string }) {
  const [display, setDisplay] = useState(0)
  const ran = useRef(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !ran.current) {
        ran.current = true
        const dur = 1800
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1)
          const ease = 1 - Math.pow(1 - t, 3)
          setDisplay(Math.floor(ease * val))
          if (t < 1) requestAnimationFrame(tick)
          else setDisplay(val)
        }
        requestAnimationFrame(tick)
        obs.disconnect()
      }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [val])

  return (
    <div className="stats-big-num" ref={ref}>
      {display}<span className="u">{suffix}</span>
    </div>
  )
}

export default function Stats() {
  return (
    <section id="stats" className="stats-strip" aria-label="Platform statistics">
      <div className="stats-grid">
        {data.map((d, i) => (
          <motion.div
            key={d.label}
            className="stat-item"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Counter val={d.val} suffix={d.suffix} />
            <div className="stats-lbl">{d.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
