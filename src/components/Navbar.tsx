import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Navbar.css'

const links = [
  { label: 'Services',     href: '#services' },
  { label: 'About',        href: '#featured' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Reviews',      href: '#testimonials' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, logout } = useAuth()

  const handleNav = (href: string) => {
    setMenuOpen(false)
    if (location.pathname !== '/') {
      navigate('/' + href)
    } else {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <Link className="nav-logo" to="/">
          Ride<span className="rx">X</span>press
        </Link>

        <ul className="nav-links">
          {links.map(l => (
            <li key={l.label}>
              <a href={l.href} onClick={e => { e.preventDefault(); handleNav(l.href) }}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link className="nav-cta" to="/book" onClick={() => setMenuOpen(false)}>
              Book a Ride
            </Link>
          </li>
          <li>
            {isAuthenticated ? (
              <button className="nav-login" onClick={() => { logout(); setMenuOpen(false) }} aria-label="Logout" style={{ background: 'transparent', cursor: 'pointer' }}>
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            ) : (
              <Link className="nav-login" to="/login" onClick={() => setMenuOpen(false)} aria-label="Login">
                <User size={14} />
                <span>Login</span>
              </Link>
            )}
          </li>
        </ul>

        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(v => !v)}
        >
          <span /><span /><span />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <button className="close-btn" onClick={() => setMenuOpen(false)}>✕</button>
            {links.map((l, i) => (
              <motion.a
                key={l.label}
                href={l.href}
                onClick={e => { e.preventDefault(); handleNav(l.href) }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {l.label}
              </motion.a>
            ))}
            <motion.div
              style={{ color: 'var(--accent)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: links.length * 0.08 }}
            >
              <Link to="/book" onClick={() => setMenuOpen(false)} style={{ color: 'inherit' }}>
                Book a Ride
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
