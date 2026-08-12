import { useEffect, useState } from 'react'

const SLIDES = [
  {
    src: '/hero-1.jpg',
    alt: 'Eicher Pro orange trucks',
    position: '88% 45%',
  },
  {
    src: '/hero-5.jpg',
    alt: 'Commercial truck on the open road',
    position: '62% center',
  },
  {
    src: '/hero-7.jpg',
    alt: 'Tata Ultra T7 truck',
    position: '58% center',
  },
  {
    src: '/hero-6.jpg',
    alt: 'Tata LPT cargo truck',
    position: '55% center',
  },
  {
    src: '/hero-2.jpg',
    alt: 'Eicher Pro on the highway',
    position: '78% center',
  },
] as const

const INTERVAL_MS = 5500

export function HeroSlideshow() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paused])

  return (
    <div
      className="hero-slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slideshow-frames" aria-hidden="true">
        {SLIDES.map((slide, index) => (
          <img
            key={slide.src}
            className={index === active ? 'is-active' : undefined}
            src={slide.src}
            alt=""
            style={{ objectPosition: slide.position }}
            fetchPriority={index === 0 ? 'high' : 'low'}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      <div className="hero-scenic-shade" aria-hidden="true" />
      <div className="hero-slideshow-dots" role="tablist" aria-label="Hero images">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={index === active ? 'is-active' : undefined}
            aria-label={slide.alt}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  )
}
