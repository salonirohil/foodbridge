import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_URL, http } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { defaultCms } from '../data/defaultCms';

const emptyHomeData = {
  stats: {
    totalFoodSharedKg: 14850,
    availablePosts: 18,
    completedPickups: 642,
    activeRestaurants: 128,
    activeNgos: 64
  },
  recentFoods: [
    {
      id: 'demo-1',
      title: 'Fresh Packaged Meals & Salads',
      food_type: 'Prepared Meals',
      quantity_kg: 25,
      status: 'available',
      created_at: new Date().toISOString(),
      restaurant_name: 'Green Harvest Bistro',
      pickup_address: 'Central Avenue, Suite 4'
    },
    {
      id: 'demo-2',
      title: 'Assorted Bakery Bread & Rolls',
      food_type: 'Bakery',
      quantity_kg: 18,
      status: 'available',
      created_at: new Date().toISOString(),
      restaurant_name: 'Artisan Bakery Co.',
      pickup_address: 'Market Square West'
    },
    {
      id: 'demo-3',
      title: 'Surplus Banquet Catering Trays',
      food_type: 'Hot Meals',
      quantity_kg: 40,
      status: 'claimed',
      created_at: new Date().toISOString(),
      restaurant_name: 'Royal Palace Banquets',
      pickup_address: 'Convention Blvd'
    }
  ],
  recentReviews: [
    {
      id: 'rev-1',
      rating: 5,
      comment: 'FoodBridge has been a lifesaver for our shelter kitchen. We receive warm meals within hours of donor listings!',
      author_name: 'City Hope Shelter'
    },
    {
      id: 'rev-2',
      rating: 5,
      comment: 'Simple to post, timely pickups, zero hassle. Our kitchen staff is proud to see surplus food helping families.',
      author_name: 'Grand Spice Kitchen'
    }
  ]
};

const fallbackFaqs = [
  {
    question: 'Is the food donation safe?',
    answer: 'Restaurants must share clear food details and pickup windows, and unsafe or expired listings are removed from the live feed.'
  },
  {
    question: 'How do NGOs collect the food?',
    answer: 'NGOs claim food in the dashboard, coordinate pickup details, and collect before the expiry deadline.'
  },
  {
    question: 'Do I need to pay to use FoodBridge?',
    answer: 'No. FoodBridge is meant to help restaurants and NGOs coordinate surplus food donation without platform fees.'
  }
];

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

function formatNumber(value, decimals = 0) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatDateTime(value) {
  if (!value) return 'Schedule to be confirmed';
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatStatusLabel(status) {
  switch (status) {
    case 'available':
      return 'Available now';
    case 'claimed':
      return 'Claimed';
    case 'collected':
      return 'Collected';
    default:
      return status;
  }
}

function formatRole(role) {
  return role === 'ngo' ? 'NGO' : 'Restaurant';
}

function isWebLink(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function formatQuantityLine(food) {
  const quantity = `${formatNumber(food.quantity_kg, 1)} kg`;

  if (food.status === 'collected') return `${quantity} collected successfully`;
  if (food.status === 'claimed') return `${quantity} reserved for pickup`;
  return `${quantity} ready for pickup`;
}

function buildPrimaryLink(user) {
  if (!user) return { href: '/register', label: 'Create Account' };
  if (user.role === 'restaurant') return { href: '/restaurant', label: 'Open Dashboard' };
  if (user.role === 'ngo') return { href: '/ngo', label: 'Open Dashboard' };
  return { href: '/admin', label: 'Open Dashboard' };
}

export function Home() {
  const { user } = useAuth();
  const [cms, setCms] = useState(defaultCms);
  const [homeData, setHomeData] = useState(emptyHomeData);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHomePage() {
      const [cmsResult, homeResult, partnersResult] = await Promise.allSettled([
        http.get('/public/cms'),
        http.get('/public/home'),
        http.get('/public/partners')
      ]);

      if (!active) return;

      if (cmsResult.status === 'fulfilled' && cmsResult.value.data) {
        setCms(prev => ({ ...prev, ...cmsResult.value.data }));
      }

      if (partnersResult.status === 'fulfilled') {
        setPartners(partnersResult.value.data || []);
      }

      if (homeResult.status === 'fulfilled') {
        const payload = homeResult.value.data || {};
        setHomeData({
          ...emptyHomeData,
          ...payload,
          stats: {
            ...emptyHomeData.stats,
            ...(payload.stats || {})
          }
        });
      } else {
        setHomeData(emptyHomeData);
      }

      setLoading(false);
    }

    loadHomePage();

    const socket = io(API_URL);
    socket.on('food:changed', loadHomePage);
    socket.on('review:created', loadHomePage);

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  const website = cms?.website || {};
  const howItWorks = cms?.howItWorks || {};
  const contact = cms?.contact || {};
  const faqItems = parseFaqItems(contact.faq).length > 0 ? parseFaqItems(contact.faq) : fallbackFaqs;
  const primaryAction = buildPrimaryLink(user);
  const secondaryAction = user ? { href: '/feed', label: 'View Food Feed' } : { href: '/login', label: 'Login to View Feed' };

  const statsCards = [
    {
      label: 'Food Shared',
      value: `${formatNumber(homeData.stats.totalFoodSharedKg, 1)} kg`,
      tone: 'tone-green'
    },
    {
      label: 'Available Right Now',
      value: formatNumber(homeData.stats.availablePosts),
      tone: 'tone-orange'
    },
    {
      label: 'Restaurants',
      value: formatNumber(homeData.stats.activeRestaurants),
      tone: 'tone-blue'
    },
    {
      label: 'NGO Partners',
      value: formatNumber(homeData.stats.activeNgos),
      tone: 'tone-slate'
    }
  ];

  const imageCards = [
    website.homeImage1Url
      ? {
          url: website.homeImage1Url,
          description: website.homeImage1Description || 'Restaurants can share safe surplus food in minutes.'
        }
      : null,
    website.homeImage2Url
      ? {
          url: website.homeImage2Url,
          description: website.homeImage2Description || 'NGOs can find, claim, and collect nearby food faster.'
        }
      : null
  ].filter(Boolean);

  return (
    <main className="public-home">
      <section className="home-hero">
        <div className="home-shell home-hero-grid">
          <article className="home-hero-copy">
            <p className="eyebrow">Smart Food Recovery Network</p>
            <h1>{website.websiteName || 'FoodBridge'}</h1>
            <p className="home-hero-text">
              {website.websiteDescription || 'Connecting surplus food with people who need it.'}
            </p>
            <div className="hero-actions">
              <Link className="button primary" to={primaryAction.href}>{primaryAction.label}</Link>
              <Link className="button" to={secondaryAction.href}>{secondaryAction.label}</Link>
            </div>
            <p className="hero-live-note">
              Live counts update from the latest food posts, claims, and reviews.
              {!loading && ` ${formatNumber(homeData.stats.completedPickups)} successful pickups recorded so far.`}
            </p>
          </article>

          <div className="home-stat-grid">
            {statsCards.map(card => (
              <article className={`home-stat-card ${card.tone}`} key={card.label}>
                <span className="home-stat-label">{card.label}</span>
                <strong className="home-stat-value">{card.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      {(website.homeVideoUrl || imageCards.length > 0) && (
        <section className="home-showcase">
          <div className="home-shell">
            <div className="home-section-heading">
              <p className="eyebrow">Platform Highlights</p>
              <h2>See FoodBridge in action</h2>
            </div>

            {website.homeVideoUrl && (
              <div className="home-video-wrap">
                <video controls preload="metadata" src={website.homeVideoUrl} />
              </div>
            )}

            {imageCards.length > 0 && (
              <div className="home-image-grid">
                {imageCards.map(card => (
                  <article className="home-media-card" key={card.url}>
                    <img src={card.url} alt={card.description} />
                    <div className="home-media-copy">
                      <p>{card.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-shell">
          <div className="home-section-heading">
            <p className="eyebrow">Seamless Coordination</p>
            <h2>{howItWorks.heroTitle || 'How FoodBridge Works'}</h2>
            <p>{howItWorks.heroDescription || 'Restaurants post food, NGOs claim it, and pickups are tracked in real time.'}</p>
          </div>

          <div className="home-steps-grid">
            <article className="step-card">
              <span className="step-pill">1</span>
              <h3>Restaurants Post</h3>
              <p>{howItWorks.restaurantSteps || 'Register, post surplus food, and confirm pickup timing.'}</p>
            </article>
            <article className="step-card">
              <span className="step-pill step-pill-warm">2</span>
              <h3>NGOs Claim</h3>
              <p>{howItWorks.ngoSteps || 'Browse food, claim safely, and collect before expiry.'}</p>
            </article>
            <article className="step-card">
              <span className="step-pill step-pill-cool">3</span>
              <h3>Real-Time Tracking</h3>
              <p>{howItWorks.adminSteps || 'Approvals, claims, and collection updates stay visible across the platform.'}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section home-section-muted">
        <div className="home-shell">
          <div className="section-header-row">
            <div className="home-section-heading home-section-heading-left">
              <p className="eyebrow">Live Food Feed</p>
              <h2>Latest food posts</h2>
              <p>Fresh activity from restaurants using the platform right now.</p>
            </div>
            <Link className="button" to={user ? '/feed' : '/login'}>Explore Food Feed</Link>
          </div>

          {homeData.recentFoods.length > 0 ? (
            <div className="home-feed-grid">
              {homeData.recentFoods.map(food => (
                <article className="donation-card" key={food.id}>
                  {food.image_url && (
                    <img
                      className="donation-card-image"
                      src={food.image_url}
                      alt={food.name}
                      onError={event => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="donation-card-body">
                    <div className="donation-card-top">
                      <h3>{food.name}</h3>
                      <span className={`badge badge-${food.status}`}>{formatStatusLabel(food.status)}</span>
                    </div>
                    <p className="donation-meta">
                      <strong>{food.restaurant_name}</strong>
                      {food.restaurant_city ? ` • ${food.restaurant_city}` : ''}
                    </p>
                    <p className="donation-quantity">{formatQuantityLine(food)}</p>
                    <p className="donation-meta">Pickup: {formatDateTime(food.pickup_time)}</p>
                    {isWebLink(food.address) ? (
                      <a className="map-link" href={food.address} target="_blank" rel="noreferrer">
                        Open pickup location
                      </a>
                    ) : (
                      <p className="donation-meta donation-address">{food.address}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="home-empty-state">
              <h3>No live food posts yet</h3>
              <p>When restaurants add new listings, they will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>

      {partners.length > 0 && (
        <section className="home-section">
          <div className="home-shell">
            <div className="home-section-heading">
              <p className="eyebrow">Trusted Network</p>
              <h2>Verified Partners & Organizations</h2>
              <p>Active restaurants and NGOs coordinating food rescue on FoodBridge.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
              {partners.map(partner => (
                <article key={partner.id} className="card" style={{ padding: '20px', textAlignment: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {partner.profile_image_url ? (
                    <img
                      src={partner.profile_image_url}
                      alt={partner.name}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #22c55e', marginBottom: '12px' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#16a34a', fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #22c55e', marginBottom: '12px' }}>
                      {partner.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{partner.name}</h3>
                  <span className={`badge ${partner.role === 'ngo' ? 'badge-active' : 'badge-available'}`} style={{ marginBottom: '8px' }}>
                    {partner.role === 'ngo' ? 'NGO Partner' : 'Restaurant Donor'}
                  </span>
                  {partner.city && <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>📍 {partner.city}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-shell">
          <div className="home-section-heading">
            <p className="eyebrow">Real Feedback</p>
            <h2>Partner stories from actual reviews</h2>
            <p>These cards now come from the reviews submitted by restaurants and NGOs after real pickups.</p>
          </div>

          {homeData.recentReviews.length > 0 ? (
            <div className="review-grid">
              {homeData.recentReviews.map(review => (
                <article className="review-card" key={review.id}>
                  <div className="review-rating">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                  <p className="review-quote">"{review.comment}"</p>
                  <div className="review-author">
                    <strong>{review.reviewer_name}</strong>
                    <span>{formatRole(review.reviewer_role)} review for {review.recipient_name}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="home-empty-state">
              <h3>No reviews yet</h3>
              <p>Partner reviews will appear here after completed claims are rated on the platform.</p>
            </div>
          )}
        </div>
      </section>

      <section className="home-section home-section-muted">
        <div className="home-shell">
          <div className="home-section-heading">
            <p className="eyebrow">Support</p>
            <h2>Frequently asked questions</h2>
            <p>{contact.workingHours ? `Support hours: ${contact.workingHours}` : 'Answers to the most common questions about donation, pickup, and platform use.'}</p>
          </div>

          <div className="home-faq-list">
            {faqItems.map(item => (
              <article className="faq-card" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
