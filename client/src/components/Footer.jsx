import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../api/http';

export function Footer() {
  const [cms, setCms] = useState(null);

  useEffect(() => {
    let active = true;

    http.get('/public/cms')
      .then(({ data }) => {
        if (active) setCms(data);
      })
      .catch(() => {
        if (active) setCms(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const website = cms?.website || {};
  const contact = cms?.contact || {};
  const year = new Date().getFullYear();
  const address = contact.address || website.websiteAddress;
  const email = contact.email || website.supportEmail || 'support@foodbridge.local';
  const phone = contact.phoneNumber || website.supportPhone;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-footer-mark">{website.websiteName || 'FoodBridge'}</span>
          <p>
            {website.websiteDescription || 'Connecting surplus food with people who need it.'}
          </p>
          <div className="site-footer-contact">
            <span>{email}</span>
            {phone && <span>{phone}</span>}
            {contact.emergencyContact && <span>Emergency: {contact.emergencyContact}</span>}
          </div>
        </div>

        <div className="site-footer-column">
          <h3>Platform</h3>
          <div className="site-footer-links">
            <Link to="/about">About</Link>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/impact">Impact</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>

        <div className="site-footer-column">
          <h3>Reach Us</h3>
          <div className="site-footer-links">
            {address && <span>{address}</span>}
            {contact.workingHours && <span>{contact.workingHours}</span>}
            {contact.whatsappNumber && <span>WhatsApp: {contact.whatsappNumber}</span>}
          </div>
        </div>

        <div className="site-footer-column">
          <h3>Social</h3>
          <div className="site-footer-links">
            {website.facebook && <a href={website.facebook} target="_blank" rel="noreferrer">Facebook</a>}
            {website.instagram && <a href={website.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {website.linkedin && <a href={website.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
            {!website.facebook && !website.instagram && !website.linkedin && (
              <span>Social links will appear here when the admin adds them.</span>
            )}
          </div>
        </div>
      </div>

      <div className="site-footer-meta">
        <span>{year} FoodBridge</span>
        <span>Food donation coordination for restaurants and NGOs.</span>
      </div>
    </footer>
  );
}
