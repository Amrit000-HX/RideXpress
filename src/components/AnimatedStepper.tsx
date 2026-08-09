/**
 * AnimatedStepper — Ported from the reference prompt.
 * Replaces Tailwind with vanilla CSS (AnimatedStepper.css).
 * Uses RideXpress design tokens (accent, cream, charcoal) for all states.
 */
import {
  useState, Children, useRef, useLayoutEffect,
  type HTMLAttributes, type ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Check } from 'lucide-react'
import './AnimatedStepper.css'

/* ── Types ─────────────────────────────────────────── */
interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  initialStep?: number
  onStepChange?: (step: number) => void
  onFinalStepCompleted?: () => void
  backButtonText?: string
  nextButtonText?: string
  disableStepIndicators?: boolean
}

export interface StepProps {
  children: ReactNode
  title?: string
}

/* ── AnimatedStepper ────────────────────────────────── */
export function AnimatedStepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  disableStepIndicators = false,
  ...rest
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [direction, setDirection] = useState(0)

  const stepsArray = Children.toArray(children)
  const totalSteps  = stepsArray.length
  const isCompleted = currentStep > totalSteps
  const isLastStep  = currentStep === totalSteps

  const updateStep = (n: number) => {
    setCurrentStep(n)
    if (n > totalSteps) onFinalStepCompleted()
    else onStepChange(n)
  }

  const handleBack = () => {
    if (currentStep > 1) { setDirection(-1); updateStep(currentStep - 1) }
  }
  const handleNext = () => {
    if (!isLastStep) { setDirection(1); updateStep(currentStep + 1) }
  }
  const handleComplete = () => { setDirection(1); updateStep(totalSteps + 1) }

  return (
    <div className="as-root" {...rest}>
      <div className="as-card">

        {/* ── Step indicators ── */}
        <div className="as-indicators">
          {stepsArray.map((_, idx) => {
            const num = idx + 1
            return (
              <StepFragment key={num}>
                <StepDot
                  step={num}
                  currentStep={currentStep}
                  disabled={disableStepIndicators}
                  onClick={clicked => {
                    setDirection(clicked > currentStep ? 1 : -1)
                    updateStep(clicked)
                  }}
                />
                {idx < totalSteps - 1 && (
                  <StepConnector done={currentStep > num} />
                )}
              </StepFragment>
            )
          })}
        </div>

        {/* ── Content ── */}
        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {/* ── Footer ── */}
        {!isCompleted && (
          <div className={`as-footer ${currentStep !== 1 ? 'as-footer--split' : 'as-footer--end'}`}>
            {currentStep !== 1 && (
              <button className="as-btn-back" onClick={handleBack}>
                {backButtonText}
              </button>
            )}
            <button
              className="as-btn-next"
              onClick={isLastStep ? handleComplete : handleNext}
            >
              {isLastStep ? 'Complete' : nextButtonText}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

/* A fragment wrapper so we can use key on it */
function StepFragment({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/* ── Step (sub-component) ────────────────────────── */
export function Step({ children, title }: StepProps) {
  return (
    <div className="as-step">
      {title && <h2 className="as-step-title">{title}</h2>}
      <div className="as-step-body">{children}</div>
    </div>
  )
}

/* ── Content wrapper — dynamic height + slide ────── */
function StepContentWrapper({
  isCompleted, currentStep, direction, children,
}: {
  isCompleted: boolean; currentStep: number
  direction: number; children: ReactNode
}) {
  const [parentH, setParentH] = useState(0)

  return (
    <motion.div
      className="as-content"
      animate={{ height: isCompleted ? 0 : parentH || 'auto' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
    >
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        {!isCompleted && (
          <SlidePanel
            key={currentStep}
            direction={direction}
            onHeight={setParentH}
          >
            {children}
          </SlidePanel>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SlidePanel({ children, direction, onHeight }: {
  children: ReactNode; direction: number; onHeight: (h: number) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (ref.current) onHeight(ref.current.offsetHeight)
  }, [children, onHeight])

  return (
    <motion.div
      ref={ref}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.18 },
      }}
      className="as-slide"
    >
      {children}
    </motion.div>
  )
}

const slideVariants: Variants = {
  enter:  (d: number) => ({ x: d >= 0 ? 24 : -24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d >= 0 ? -24 : 24, opacity: 0 }),
}

/* ── Step dot indicator ─────────────────────────── */
function StepDot({ step, currentStep, disabled, onClick }: {
  step: number; currentStep: number
  disabled: boolean; onClick: (n: number) => void
}) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete'

  /* Inline variant values — uses hex so GSAP/framer can animate colours */
  const variants: Variants = {
    inactive: { scale: 1, backgroundColor: '#E8EAED', color: '#9A9A9A', borderColor: '#C8CDD4' },
    active:   { scale: 1, backgroundColor: '#FFFFFF',  color: '#6B9E72', borderColor: '#6B9E72' },
    complete: { scale: 1, backgroundColor: '#6B9E72',  color: '#FFFFFF', borderColor: '#6B9E72' },
  }

  return (
    <div
      className={`as-dot-wrap${disabled ? '' : ' as-dot-clickable'}`}
      onClick={() => !disabled && onClick(step)}
    >
      <motion.div
        className="as-dot"
        animate={status}
        variants={variants}
        transition={{ duration: 0.3 }}
      >
        {status === 'complete'
          ? <Check size={16} />
          : <span className="as-dot-num">{step}</span>
        }
      </motion.div>

      {status === 'active' && (
        <motion.div
          layoutId="as-glow"
          className="as-dot-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </div>
  )
}

/* ── Connector line ─────────────────────────────── */
function StepConnector({ done }: { done: boolean }) {
  return (
    <div className="as-connector">
      <motion.div
        className="as-connector-fill"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: done ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
      />
    </div>
  )
}

export default AnimatedStepper
