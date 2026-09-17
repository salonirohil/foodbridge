import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../api/http';
import { defaultCms } from '../data/defaultCms';

const fallbackContent = {
  about: {
    title: 'About FoodBridge',
    body: 'FoodBridge connects restaurants with surplus food to NGOs that can distribute it safely.'
  },
  'how-it-works': {
    title: 'How FoodBridge Works',
    body: 'Restaurants post surplus food, NGOs claim it, and pickups are coordinated in real time.'
  },
  impact: {
    title: 'Impact',
    body: 'Connecting surplus food with communities in need, reducing waste and carbon emissions.'
  },
  contact: {
    title: 'Contact Us',
    body: 'Reach out to FoodBridge for inquiries, support, or partnership opportunities.'
  },
  policy: {
    title: 'Platform Food Safety & Quality Policy',
    body: 'Food must be safe, accurately described, and collected before expiry. Users must follow local food safety rules.'
  },
  profile: {
    title: 'Profile',
    body: 'Profile management allows managing organization details, profile picture, address, and activity summaries.'
  },
  notifications: {
    title: 'Notifications',
    body: 'This page shows claim, expiry, cancellation, collection, and admin approval updates.'
  },
  history: {
    title: 'History',
    body: 'Food and claim history pages include search, filter, sorting, and export reports.'
  },
  unauthorized: {
    title: 'Unauthorized Access',
    body: 'You do not have permission to view this page. Please sign in with an authorized account.'
  },
  notfound: {
    title: 'Page Not Found',
    body: 'The page you requested does not exist or has been moved.'
  }
};

function parseImageList(value) {
  if (!value) return [];
  return String(value)
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseFaqItems(value) {
  if (!value) return [];

  return String(value)
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const parts = block.split(':');
      if (parts.length > 1) {
        return {
          question: parts.shift().trim(),
          answer: parts.join(':').trim()
        };
      }

      return { question: 'Support', answer: block };
    });
}

function parseBulletList(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function InfoPage({ type }) {
  const [cms, setCms] = useState(defaultCms);
  const [homeData, setHomeData] = useState(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactNotice, setContactNotice] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);

  useEffect(() => {
    if (['about', 'how-it-works', 'impact', 'contact', 'policy'].includes(type)) {
      http.get('/public/cms')
        .then(({ data }) => {
          if (data) setCms(prev => ({ ...prev, ...data }));
        })
        .catch(() => setCms(defaultCms));
    }

    if (type === 'impact') {
      http.get('/public/home')
        .then(({ data }) => setHomeData(data))
        .catch(() => setHomeData(null));
    }
  }, [type]);

  function handleContactSubmit(e) {
    e.preventDefault();
    setContactSubmitting(true);
    setContactNotice('');

    setTimeout(() => {
      setContactSubmitting(false);
      setContactNotice('Thank you! Your message has been received. Our support team will get back to you shortly.');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 800);
  }

  // --- ABOUT PAGE ---
  if (type === 'about' && cms?.about) {
    const images = parseImageList(cms.about.images);

    return (
      <main className="info-page">
        <section className="info-hero">
          <div className="home-shell">
            <p className="eyebrow">About FoodBridge</p>
            <h1>{cms.about.heroTitle}</h1>
            <p>{cms.about.heroDescription}</p>
          </div>
        </section>

        <section className="info-section">
          <div className="home-shell info-grid">
            <article className="info-card">
              <h2>Mission</h2>
              <p>{cms.about.mission}</p>
            </article>
            <article className="info-card">
              <h2>Vision</h2>
              <p>{cms.about.vision}</p>
            </article>
            <article className="info-card info-card-wide">
              <h2>Our Story</h2>
              <p>{cms.about.ourStory}</p>
            </article>
          </div>
        </section>

        {(cms.about.videoUrl || images.length > 0) && (
          <section className="info-section info-section-muted">
            <div className="home-shell">
              {cms.about.videoUrl && (
                <div className="home-video-wrap">
                  <video controls preload="metadata" src={cms.about.videoUrl} />
                </div>
              )}

              {images.length > 0 && (
                <div className="info-media-grid">
                  {images.map(image => (
                    <article className="home-media-card" key={image}>
                      <img src={image} alt="FoodBridge community" />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    );
  }

  // --- HOW IT WORKS PAGE ---
  if (type === 'how-it-works' && cms?.howItWorks) {
    return (
      <main className="info-page">
        <section className="info-hero">
          <div className="home-shell">
            <p className="eyebrow">How It Works</p>
            <h1>{cms.howItWorks.heroTitle}</h1>
            <p>{cms.howItWorks.heroDescription}</p>
          </div>
        </section>

        <section className="info-section">
          <div className="home-shell info-grid">
            <article className="step-card">
              <span className="step-pill">1</span>
              <h2>Restaurant Flow</h2>
              <p>{cms.howItWorks.restaurantSteps}</p>
            </article>
            <article className="step-card">
              <span className="step-pill step-pill-warm">2</span>
              <h2>NGO Flow</h2>
              <p>{cms.howItWorks.ngoSteps}</p>
            </article>
            <article className="step-card">
              <span className="step-pill step-pill-cool">3</span>
              <h2>Admin Flow</h2>
              <p>{cms.howItWorks.adminSteps}</p>
            </article>
          </div>
        </section>
      </main>
    );
  }

  // --- IMPACT PAGE ---
  if (type === 'impact' && cms?.impact) {
    const liveStats = homeData?.stats || {};
    const stats = [
      ['Food Saved (kg)', liveStats.foodSavedKg ?? cms.impact.totalFoodSavedKg],
      ['Meals Served', liveStats.mealsServed ?? cms.impact.mealsServed],
      ['Restaurants', liveStats.activeRestaurants ?? cms.impact.activeRestaurants],
      ['NGOs', liveStats.activeNgos ?? cms.impact.activeNgos],
      ['Cities Covered', liveStats.citiesCovered ?? cms.impact.citiesCovered],
      ['Successful Donations', liveStats.successfulDonations ?? 0],
      ['CO2 Saved (kg)', liveStats.co2SavedKg ?? cms.impact.co2Saved]
    ];

    return (
      <main className="info-page">
        <section className="info-hero">
          <div className="home-shell">
            <p className="eyebrow">Impact</p>
            <h1>Impact at a glance</h1>
            <p>These numbers update from the current FoodBridge platform records and published impact stories.</p>
          </div>
        </section>

        <section className="info-section">
          <div className="home-shell info-stat-grid">
            {stats.map(([label, value]) => (
              <article className="home-stat-card tone-green" key={label}>
                <span className="home-stat-label">{label}</span>
                <strong className="home-stat-value">{value || 0}</strong>
              </article>
            ))}
          </div>
        </section>

        {(cms.impact.successStories || []).length > 0 && (
          <section className="info-section info-section-muted">
            <div className="home-shell">
              <div className="home-section-heading">
                <p className="eyebrow">Success Stories</p>
                <h2>Stories from the network</h2>
              </div>

              <div className="review-grid">
                {cms.impact.successStories.map((story, index) => (
                  <article className="review-card" key={`${story.title}-${index}`}>
                    <h3>{story.title}</h3>
                    <p className="review-quote">{story.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    );
  }

  // --- CONTACT PAGE ---
  if (type === 'contact' && cms?.contact) {
    const faqItems = parseFaqItems(cms.contact.faq);

    return (
      <main className="info-page">
        <section className="info-hero">
          <div className="home-shell">
            <p className="eyebrow">Get in Touch</p>
            <h1>We are here to help</h1>
            <p>Have questions about surplus food donation, NGO verification, or platform support? Send us a message or contact our team directly.</p>
          </div>
        </section>

        <section className="info-section">
          <div className="home-shell" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Left: Contact Info Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <article className="info-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' }}>✉</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>Email Support</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{cms.contact.email || 'support@foodbridge.local'}</p>
                </div>
              </article>

              <article className="info-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' }}>📞</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>Phone Line</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{cms.contact.phoneNumber || '+91 98765 43210'}</p>
                </div>
              </article>

              <article className="info-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' }}>💬</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>WhatsApp Helpline</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{cms.contact.whatsappNumber || '+91 98765 43210'}</p>
                </div>
              </article>

              <article className="info-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' }}>🕒</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>Working Hours</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{cms.contact.workingHours || 'Mon - Sat, 9:00 AM - 6:00 PM'}</p>
                </div>
              </article>

              <article className="info-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' }}>🚨</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>Emergency Hotline</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{cms.contact.emergencyContact || '+91 1800-FOOD-BRIDGE'}</p>
                </div>
              </article>

              {cms.contact.address && (
                <article className="info-card">
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Office Address</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{cms.contact.address}</p>
                  {cms.contact.googleMapLink && (
                    <a className="button primary" style={{ marginTop: '14px', width: 'fit-content', padding: '6px 14px', fontSize: '12px' }} href={cms.contact.googleMapLink} target="_blank" rel="noreferrer">
                      Open in Google Maps
                    </a>
                  )}
                </article>
              )}
            </div>

            {/* Right: Interactive Contact Form */}
            <form className="card" onSubmit={handleContactSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Send us a Message</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>Fill out the form below and our team will get back to you within 24 hours.</p>

                {contactNotice && <p className="notice" style={{ marginBottom: '20px' }}>{contactNotice}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label>Full Name *
                    <input required value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder="John Doe" />
                  </label>
                  <label>Email Address *
                    <input type="email" required value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="john@example.com" />
                  </label>
                </div>

                <label>Subject *
                  <input required value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder="Inquiry about NGO verification / donation" />
                </label>

                <label>Your Message *
                  <textarea required rows="5" value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Describe how we can assist you..." />
                </label>
              </div>

              <button type="submit" className="primary" disabled={contactSubmitting} style={{ width: '100%', minHeight: '48px', fontSize: '15px' }}>
                {contactSubmitting ? 'Sending message...' : 'Send Message'}
              </button>
            </form>
          </div>
        </section>

        {faqItems.length > 0 && (
          <section className="info-section info-section-muted">
            <div className="home-shell">
              <div className="home-section-heading">
                <p className="eyebrow">FAQ</p>
                <h2>Frequently asked questions</h2>
              </div>

              <div className="home-faq-list">
                {faqItems.map(item => (
                  <article className="faq-card" key={`${item.question}-${item.answer}`}>
                    <h3>{item.question}</h3>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    );
  }

  // --- POLICY PAGE ---
  if (type === 'policy') {
    const policyData = cms?.policy || {};
    const safetyRules = parseBulletList(policyData.foodSafetyRules || fallbackContent.policy.body);
    const ngoGuidelines = parseBulletList(policyData.ngoGuidelines || '');
    const terms = policyData.termsOfService || 'Users must follow local food safety rules and coordinate collection before expiry.';

    return (
      <main className="info-page">
        <section className="info-hero">
          <div className="home-shell">
            <p className="eyebrow">Food Safety & Quality</p>
            <h1>{policyData.heroTitle || 'Platform Policy & Quality Guidelines'}</h1>
            <p>{policyData.heroDescription || 'FoodBridge enforces strict safety standards to guarantee that surplus food is shared responsibly, safely, and hygienically.'}</p>
          </div>
        </section>

        <section className="info-section">
          <div className="home-shell" style={{ display: 'grid', gap: '32px' }}>

            {/* Food Safety Rules */}
            <article className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' }}>✓</div>
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Donor Food Safety Rules</h2>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {safetyRules.map((rule, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ background: '#22c55e', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0, marginTop: '2px' }}>{idx + 1}</span>
                    <p style={{ margin: 0, color: '#334155', fontWeight: '500', fontSize: '14px' }}>{rule}</p>
                  </div>
                ))}
              </div>
            </article>

            {/* NGO Guidelines */}
            {ngoGuidelines.length > 0 && (
              <article className="card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' }}>🛡</div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800' }}>NGO Collection Protocols</h2>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {ngoGuidelines.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ background: '#3b82f6', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0, marginTop: '2px' }}>{idx + 1}</span>
                      <p style={{ margin: 0, color: '#334155', fontWeight: '500', fontSize: '14px' }}>{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {/* Terms of Service */}
            <article className="card" style={{ padding: '32px', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: '#16a34a' }}>Terms of Service & Platform Enforcement</h2>
              <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>{terms}</p>
            </article>

          </div>
        </section>
      </main>
    );
  }

  const page = fallbackContent[type] || fallbackContent.notfound;

  return (
    <main className="info-page">
      <section className="info-hero">
        <div className="home-shell">
          <p className="eyebrow">FoodBridge</p>
          <h1>{page.title}</h1>
          <p>{page.body}</p>
          {type === 'notfound' && <Link className="button primary" to="/">Back to Home</Link>}
        </div>
      </section>
    </main>
  );
}
