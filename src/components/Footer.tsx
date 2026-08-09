import { motion } from 'framer-motion'
import './Footer.css'

const serviceLinks = ['City Ride Booking', 'Parcel Delivery', 'Scheduled Rides', 'Business Courier', 'Live Tracking']
const companyLinks = ['About Us', 'How It Works', 'Reviews', 'Careers', 'Press']
const contactLinks = ['hello@ridexpress.io', '+91 1800 000 000', 'Support Center', 'Partner With Us']

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
})

export default function Footer() {
  return (
    <footer id="footer" className="footer" aria-label="Footer">
      <div className="footer-orb" aria-hidden="true" />

      <div className="footer-content">
        {/* Massive heading */}
        <motion.h2 className="footer-heading" {...fadeUp(0)}>
          Let's<br />
          <span className="outline">Ride</span><br />
          Together.
        </motion.h2>

        {/* Email */}
        <motion.a
          href="mailto:hello@ridexpress.io"
          className="footer-email"
          {...fadeUp(0.12)}
        >
          hello@ridexpress.io
        </motion.a>

        {/* Columns */}
        <div className="footer-cols">
          <motion.div {...fadeUp(0.05)}>
            <div className="footer-logo">Ride<span className="rx">X</span>press</div>
            <p className="footer-brand-desc">
              Your all-in-one smart mobility and logistics platform. Connecting rides
              and deliveries for a faster, smarter city.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <div className="footer-col-title">Services</div>
            <ul className="footer-links">
              {serviceLinks.map(l => <li key={l}><a href="#services">{l}</a></li>)}
            </ul>
          </motion.div>

          <motion.div {...fadeUp(0.15)}>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              {companyLinks.map(l => <li key={l}><a href="#">{l}</a></li>)}
            </ul>
          </motion.div>

          <motion.div {...fadeUp(0.2)}>
            <div className="footer-col-title">Contact</div>
            <ul className="footer-links">
              {contactLinks.map(l => <li key={l}><a href="#">{l}</a></li>)}
            </ul>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p className="footer-copy">© 2025 RideXpress. All rights reserved.</p>
          <nav className="footer-legal" aria-label="Legal links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
