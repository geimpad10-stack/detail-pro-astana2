import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, Phone, MapPin, Clock, ChevronRight, Star,
  Shield, Wrench, Users, Award, Sparkles, MessageCircle, ChevronDown
} from 'lucide-react'
import { api } from '../lib/api'

/* ───────── Data ───────── */
const SERVICES = [
  {
    id: 1,
    title: 'Полировка кузова',
    desc: 'Устраняем мелкие царапины, возвращаем блеск и глубину цвета.',
    price: 'от 25 000 ₸',
    img: '/images/IMG_7542.jpg',
  },
  {
    id: 2,
    title: 'Керамическое покрытие',
    desc: 'Защита лакокрасочного покрытия на длительный срок.',
    price: 'от 60 000 ₸',
    img: '/images/IMG_7543.jpg',
  },
  {
    id: 3,
    title: 'Химчистка салона',
    desc: 'Удаляем загрязнения, неприятные запахи и восстанавливаем свежесть.',
    price: 'от 20 000 ₸',
    img: '/images/IMG_7544.jpg',
  },
  {
    id: 4,
    title: 'Мойка подкапотного пространства',
    desc: 'Чистота и порядок в самых важных местах двигателя.',
    price: 'от 15 000 ₸',
    img: '/images/IMG_7546.jpg',
  },
]

const GALLERY = [
  { id: 1, title: 'Полировка кузова', car: 'BMW 5 Series', img: '/images/IMG_7541.jpg' },
  { id: 2, title: 'Химчистка салона', car: 'Mercedes-Benz E-Class', img: '/images/IMG_7544.jpg' },
  { id: 3, title: 'Керамическое покрытие', car: 'BMW M8', img: '/images/IMG_7547.jpg' },
  { id: 4, title: 'Детейлинг дисков', car: 'Mercedes-AMG', img: '/images/IMG_7546.jpg' },
  { id: 5, title: 'Салон после детейлинга', car: 'Lexus LX', img: '/images/IMG_7545.jpg' },
  { id: 6, title: 'Полировка капота', car: 'Premium', img: '/images/IMG_7542.jpg' },
]

const REVIEWS = [
  {
    name: 'Алексей Петров',
    car: 'BMW 5 Series',
    text: 'Отличный сервис! Сделали полировку на высшем уровне. Машина выглядит как новая. Рекомендую!',
    rating: 5,
  },
  {
    name: 'Дамир Султанов',
    car: 'Mercedes-Benz E-Class',
    text: 'Профессиональный подход, большой опыт и знание. Теперь только к вам!',
    rating: 5,
  },
  {
    name: 'Ержан Кайратов',
    car: 'Audi Q7',
    text: 'Очень доволен результатом. Качественная работа, вежливый персонал. Спасибо!',
    rating: 5,
  },
]

const ADVANTAGES = [
  { icon: Wrench, title: 'Премиальное оборудование', text: 'Используем только профессиональное оборудование и качественную химию.' },
  { icon: Users, title: 'Опытные мастера', text: 'Наши специалисты имеют большой опыт и знают, как работать с разными покрытиями.' },
  { icon: Sparkles, title: 'Индивидуальный подход', text: 'Подбираем оптимальное решение под ваш автомобиль и ваши задачи.' },
  { icon: Shield, title: 'Гарантия на услуги', text: 'Мы уверены в качестве своей работы и даём гарантию.' },
]

const NAV = [
  { label: 'Главная', href: '#hero' },
  { label: 'Услуги', href: '#services' },
  { label: 'Галерея', href: '#gallery' },
  { label: 'О нас', href: '#about' },
  { label: 'Отзывы', href: '#reviews' },
  { label: 'Контакты', href: '#contacts' },
]

const WHATSAPP = 'https://wa.me/77001234567'

/* ───────── Animation helpers ───────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

/* ───────── Components ───────── */
function Header({ menuOpen, setMenuOpen }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        {/* Logo */}
        <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #A7FF36, #6bc41a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#0a0a0a',
          }}>DP</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.02em' }}>DETAIL PRO</div>
            <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.12em' }}>ASTANA</div>
          </div>
        </a>

        {/* Desktop nav */}
        <nav style={{ display: 'none', gap: 28 }} className="desktop-nav">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} style={{ fontSize: 14, color: 'var(--text-muted)', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.target.style.color = '#fff')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="tel:+77001234567" style={{ display: 'none', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)' }} className="desktop-phone">
            <Phone size={16} /> +7 700 123 45 67
          </a>
          <Link to="/booking" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
            Записаться
          </Link>
          <Link to="/account" style={{ fontSize: 13, color: 'var(--text-muted)' }} className="desktop-phone">
            Кабинет
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'flex', padding: 8, color: '#fff' }}
            className="mobile-menu-btn"
            aria-label="Меню"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', overflow: 'hidden' }}
          >
            <nav style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px 24px', gap: 4 }}>
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={{ padding: '12px 0', fontSize: 16, borderBottom: '1px solid var(--border)' }}
                >
                  {item.label}
                </a>
              ))}
              <a href="tel:+77001234567" style={{ padding: '12px 0', fontSize: 16, color: 'var(--accent)' }}>
                +7 700 123 45 67
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 900px) {
          .desktop-nav { display: flex !important; }
          .desktop-phone { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </header>
  )
}

function Hero() {
  const sectionRef = useRef(null)
  const frameRef = useRef(null)
  const hintRef = useRef(null)
  const rafRef = useRef(0)
  const framesRef = useRef([])
  const lastIdxRef = useRef(-1)
  const FRAME_COUNT = 73

  // Image-sequence scrub — works on phone and desktop, no video seek lag
  useEffect(() => {
    const frames = []
    const pad = (n) => String(n).padStart(3, '0')
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image()
      img.decoding = 'async'
      img.src = `/images/garage-frames/frame-${pad(i)}.jpg`
      img.onload = () => {
        if (i === 1 && frameRef.current) {
          frameRef.current.src = img.src
        }
      }
      frames.push(img)
    }
    framesRef.current = frames

    const setFrame = (p) => {
      const imgs = framesRef.current
      if (!imgs.length || !frameRef.current) return
      const idx = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(p * (FRAME_COUNT - 1))))
      if (idx === lastIdxRef.current) return
      lastIdxRef.current = idx
      const src = imgs[idx]?.src
      if (src) frameRef.current.src = src
    }

    const tick = () => {
      const el = sectionRef.current
      if (!el) {
        rafRef.current = 0
        return
      }
      const total = Math.max(el.offsetHeight - window.innerHeight, 1)
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), total)
      const p = Math.min(Math.max(scrolled / total, 0), 1)
      setFrame(p)
      if (hintRef.current) {
        hintRef.current.style.opacity = String(Math.max(1 - p * 2.5, 0))
      }
      rafRef.current = 0
    }

    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.addEventListener('touchmove', onScroll, { passive: true })
    tick()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('touchmove', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      {/* Кадры по скроллу — одинаково плавно на телефоне и ПК */}
      <section
        ref={sectionRef}
        className="garage-section"
        aria-label="Открытие гаража"
      >
        <div className="garage-sticky">
          <img
            ref={frameRef}
            className="garage-video"
            src="/images/garage-frames/frame-001.jpg"
            alt="Открытие гаража Detail Pro"
            draggable={false}
            decoding="async"
          />
          <div className="garage-video-shade" />

          <div ref={hintRef} className="garage-scroll-hint">
            <span>Листайте — крыша откроется</span>
            <ChevronDown size={20} className="bounce-y" />
          </div>
        </div>
      </section>


function Services() {
  return (
    <section id="services" className="section">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <div className="section-label">Наши услуги</div>
          <h2 className="section-title">Профессиональный уход за вашим автомобилем</h2>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
          marginTop: 40,
        }}>
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.id}
              className="card card-live"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              custom={i}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="card-img-wrap" style={{ height: 180, overflow: 'hidden' }}>
                <img src={s.img} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{s.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }}>{s.price}</span>
                  <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
                    <ChevronRight size={18} />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Gallery() {
  return (
    <section id="gallery" className="section" style={{ background: '#0d0d0d' }}>
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 40 }}
        >
          <div>
            <div className="section-label">Наши работы</div>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Галерея работ</h2>
            <p className="section-desc" style={{ marginTop: 8 }}>Реальные примеры наших проектов</p>
          </div>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {GALLERY.map((g, i) => (
            <motion.div
              key={g.id}
              className="card card-live"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              custom={i}
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{ position: 'relative', height: 280 }}
            >
              <img className="gallery-img" src={g.img} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '40px 16px 16px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{g.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{g.car}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="section">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <div className="section-label">Преимущества</div>
          <h2 className="section-title">Почему выбирают нас</h2>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 20,
          marginTop: 40,
        }}>
          {ADVANTAGES.map((a, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              style={{
                padding: 24,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(167,255,54,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <a.icon size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{a.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{a.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Banner */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          style={{
            marginTop: 48,
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            position: 'relative',
            height: 280,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img src="/images/IMG_7547.jpg" alt="Ваш автомобиль в надёжных руках"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.5) 100%)',
          }} />
          <div style={{ position: 'relative', zIndex: 1, padding: '0 40px' }}>
            <h3 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, maxWidth: 400 }}>
              Ваш автомобиль<br />
              в <span style={{ color: 'var(--accent)' }}>надёжных руках</span>
            </h3>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Reviews() {
  const [list, setList] = useState(REVIEWS)

  useEffect(() => {
    api.getReviews()
      .then(d => {
        if (d.reviews?.length) setList(d.reviews)
      })
      .catch(() => {})
  }, [])

  return (
    <section id="reviews" className="section" style={{ background: '#0d0d0d' }}>
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <div className="section-label">Отзывы</div>
          <h2 className="section-title">Отзывы клиентов</h2>
          <p className="section-desc">Нам доверяют владельцы премиальных автомобилей</p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
          marginTop: 40,
        }}>
          {list.map((r, i) => (
            <motion.div
              key={r.id || i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              style={{
                padding: 24,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {Array.from({ length: r.rating || 5 }).map((_, j) => (
                  <Star key={j} size={16} fill="var(--accent)" color="var(--accent)" />
                ))}
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                «{r.text}»
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(167,255,54,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, color: 'var(--accent)',
                }}>
                  {(r.name || '?')[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.car || ''}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contacts() {
  return (
    <section id="contacts" className="section">
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 40,
          alignItems: 'center',
        }} className="contacts-grid">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <div className="section-label">Контакты</div>
            <h2 className="section-title">Запишитесь на детейлинг уже сегодня</h2>
            <p className="section-desc" style={{ marginBottom: 32 }}>
              Оставьте заявку, и мы свяжемся с вами в ближайшее время, чтобы подобрать удобное время.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
              <a href="tel:+77001234567" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(167,255,54,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Phone size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Телефон</div>
                  <div style={{ fontWeight: 600 }}>+7 700 123 45 67</div>
                </div>
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(167,255,54,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MapPin size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Адрес</div>
                  <div style={{ fontWeight: 600 }}>Астана, ул. Мангилик Ел 55 (ТЦ Mega Silk Way)</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(167,255,54,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Clock size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Режим работы</div>
                  <div style={{ fontWeight: 600 }}>Ежедневно 09:00 — 21:00</div>
                </div>
              </div>
            </div>

            <Link to="/booking" className="btn btn-primary">
              Записаться онлайн
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn btn-outline">
              <MessageCircle size={18} /> WhatsApp
            </a>
          </motion.div>

          {/* Map placeholder */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            style={{
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              height: 360,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <iframe
              title="Карта"
              src="https://www.openstreetmap.org/export/embed.html?bbox=71.41%2C51.08%2C71.45%2C51.11&layer=mapnik&marker=51.095%2C71.43"
              style={{ width: '100%', height: '100%', border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
              loading="lazy"
            />
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (min-width: 800px) {
          .contacts-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '32px 0',
      background: '#080808',
    }}>
      <div className="container" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #A7FF36, #6bc41a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 12, color: '#0a0a0a',
          }}>DP</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>DETAIL PRO</div>
            <div style={{ fontSize: 10, color: 'var(--accent)' }}>ASTANA</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {NAV.map((item) => (
            <a key={item.href} href={item.href} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Detail Pro Astana. Все права защищены.
        </div>
      </div>
    </footer>
  )
}

/* ───────── App ───────── */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main>
        <Hero />
        <Services />
        <Gallery />
        <About />
        <Reviews />
        <Contacts />
      </main>
      <Footer />
    </>
  )
}
