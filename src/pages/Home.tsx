import '../index.css'
import Hero         from '../components/Hero'
import Marquee      from '../components/Marquee'
import ServicesGrid from '../components/ServicesGrid'
import Featured     from '../components/Featured'
import Stats        from '../components/Stats'
import HowItWorks   from '../components/HowItWorks'
import Testimonials from '../components/Testimonials'

export default function Home() {
  return (
    <main>
      <Hero />
      <Marquee />
      <ServicesGrid />
      <Featured />
      <Stats />
      <HowItWorks />
      <Testimonials />
    </main>
  )
}
