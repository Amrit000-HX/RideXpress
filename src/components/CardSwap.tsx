/**
 * CardSwap — GSAP-powered perspective card swapping.
 * Adapted from the reference prompt for RideXpress Services section.
 */
import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useMemo,
  useEffect,
  useRef,
} from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import gsap from 'gsap'
import './CardSwap.css'

/* ── Types ─────────────────────────────────────────────── */
export interface CardSwapProps {
  width?: number | string
  height?: number | string
  cardDistance?: number
  verticalDistance?: number
  delay?: number
  pauseOnHover?: boolean
  onCardClick?: (idx: number) => void
  skewAmount?: number
  easing?: 'linear' | 'elastic'
  children: ReactNode
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string
}

/* ── Card ──────────────────────────────────────────────── */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ customClass, className, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={['rx-card', customClass, className].filter(Boolean).join(' ')}
    />
  ),
)
Card.displayName = 'Card'

/* ── Helpers ───────────────────────────────────────────── */
type CardRef = RefObject<HTMLDivElement | null>

interface Slot { x: number; y: number; z: number; zIndex: number }

const makeSlot = (i: number, dx: number, dy: number, total: number): Slot => ({
  x: i * dx,
  y: -i * dy,
  z: -i * dx * 1.5,
  zIndex: total - i,
})

const placeNow = (el: HTMLElement, slot: Slot, skew: number) =>
  gsap.set(el, {
    x: slot.x, y: slot.y, z: slot.z,
    xPercent: -50, yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  })

/* ── CardSwap ──────────────────────────────────────────── */
export const CardSwap: React.FC<CardSwapProps> = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  easing = 'elastic',
  children,
}) => {
  const cfg =
    easing === 'elastic'
      ? { ease: 'elastic.out(0.6,0.9)', durDrop: 2, durMove: 2, durReturn: 2, promoteOverlap: 0.9, returnDelay: 0.05 }
      : { ease: 'power1.inOut',          durDrop: 0.8, durMove: 0.8, durReturn: 0.8, promoteOverlap: 0.45, returnDelay: 0.2 }

  const childArr = useMemo(
    () => Children.toArray(children) as ReactElement<CardProps>[],
    [children],
  )
  const refs = useMemo<CardRef[]>(
    () => childArr.map(() => React.createRef<HTMLDivElement>()),
    [childArr.length],
  )
  const order       = useRef<number[]>(Array.from({ length: childArr.length }, (_, i) => i))
  const tlRef       = useRef<gsap.core.Timeline | null>(null)
  const intervalRef = useRef<number>(0)
  const container   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const total = refs.length
    refs.forEach((r, i) => {
      if (r.current) placeNow(r.current, makeSlot(i, cardDistance, verticalDistance, total), skewAmount)
    })

    const swap = () => {
      if (order.current.length < 2) return
      const [front, ...rest] = order.current
      const elFront = refs[front].current
      if (!elFront) return

      const tl = gsap.timeline()
      tlRef.current = tl

      tl.to(elFront, { y: '+=500', duration: cfg.durDrop, ease: cfg.ease })

      tl.addLabel('promote', `-=${cfg.durDrop * cfg.promoteOverlap}`)
      rest.forEach((idx, i) => {
        const el   = refs[idx].current
        if (!el) return
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length)
        tl.set(el, { zIndex: slot.zIndex }, 'promote')
        tl.to(el, { x: slot.x, y: slot.y, z: slot.z, duration: cfg.durMove, ease: cfg.ease },
          `promote+=${i * 0.15}`)
      })

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length)
      tl.addLabel('return', `promote+=${cfg.durMove * cfg.returnDelay}`)
      tl.call(() => { gsap.set(elFront, { zIndex: backSlot.zIndex }) }, undefined, 'return')
      tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: cfg.durReturn, ease: cfg.ease }, 'return')
      tl.call(() => { order.current = [...rest, front] })
    }

    intervalRef.current = window.setInterval(swap, delay)

    if (pauseOnHover && container.current) {
      const node   = container.current
      const pause  = () => { tlRef.current?.pause(); clearInterval(intervalRef.current) }
      const resume = () => { tlRef.current?.play();  intervalRef.current = window.setInterval(swap, delay) }
      node.addEventListener('mouseenter', pause)
      node.addEventListener('mouseleave', resume)
      return () => {
        node.removeEventListener('mouseenter', pause)
        node.removeEventListener('mouseleave', resume)
        clearInterval(intervalRef.current)
      }
    }

    return () => clearInterval(intervalRef.current)
  }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing, refs])

  const rendered = childArr.map((child, i) =>
    isValidElement<CardProps>(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
          style: { width, height, ...(child.props.style ?? {}) },
          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            child.props.onClick?.(e)
            onCardClick?.(i)
          },
        } as CardProps & React.RefAttributes<HTMLDivElement>)
      : child,
  )

  return (
    <div
      ref={container}
      className="rx-cardswap-root"
      style={{ width, height }}
    >
      <div className="rx-cardswap-inner">{rendered}</div>
    </div>
  )
}

export default CardSwap
