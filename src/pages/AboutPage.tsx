import React from 'react';
import { sampleAboutData } from '../data/sampleData';
import { Lock, Star, Users, Calendar } from 'lucide-react';
import './AboutPage.css';

export const AboutPage: React.FC = () => {
  const { title, tagline, heroImage, saadBanner, pillars, objective, weeklySchedule } = sampleAboutData;

  return (
    <div className="about-page layout-2col">
      {/* Main Content Column */}
      <div className="about-main">
        {/* About Header Card */}
        <div className="about-hero-card skool-card">
          <div className="about-title-row">
            <h1 className="about-main-title">{title}</h1>
            <div className="about-rating-badge">
              <div className="stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <span className="rating-text">5.0 • Founder Operating System</span>
            </div>
          </div>

          {/* Hero Banner Image */}
          <div className="about-hero-image-wrap">
            <img
              src={heroImage}
              alt="Build100 Mentors & Schedule"
              className="about-hero-img"
            />
          </div>

          {/* Metadata Row */}
          <div className="about-meta-row">
            <div className="meta-item">
              <Lock size={15} className="meta-icon" />
              <span>Private System</span>
            </div>
            <div className="meta-item">
              <Users size={15} className="meta-icon" />
              <span>Jason Harris (1 Operator)</span>
            </div>
            <div className="meta-item">
              <Calendar size={15} className="meta-icon" />
              <span>6 Live Sessions / Wk</span>
            </div>
          </div>

          {/* Main Statement */}
          <div className="about-statement-banner">
            <h2 className="statement-text">{tagline}</h2>
          </div>

          {/* Core Philosophy Body */}
          <div className="about-body-text">
            <p className="philosophy-intro">
              For businesses and operators committed to closing their first 100 paying clients.
              It is rarely effort alone. It is never "the market." When a business stalls, the bottleneck
              is always located inside one of three foundational pillars:
            </p>

            {/* 3 Major Pillars */}
            <div className="about-pillars-grid">
              {pillars.map((p) => (
                <div key={p.category} className="pillar-card">
                  <div className="pillar-top">
                    <span className={`pillar-indicator ${p.category.toLowerCase()}`} />
                    <span className="pillar-cat">{p.category}</span>
                  </div>
                  <h3 className="pillar-headline">{p.headline}</h3>
                  <p className="pillar-desc">{p.description}</p>
                  <span className="pillar-coach">Lead Coach: {p.coach}</span>
                </div>
              ))}
            </div>

            {/* The Real Objective Callout */}
            <div className="real-objective-card">
              <span className="objective-label">{objective.title}</span>
              <p className="objective-body">{objective.body}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Column */}
      <aside className="about-sidebar">
        {/* Brand Card with Saad Banner */}
        <div className="about-sidebar-card skool-card">
          <div className="sidebar-banner-img-wrap">
            <img
              src={saadBanner}
              alt="Build100 Saad Mohamed"
              className="sidebar-banner-img"
            />
          </div>
          <div className="sidebar-card-body">
            <h3 className="sidebar-brand-name">Build100</h3>
            <span className="sidebar-brand-sub">by saadsells & team</span>
            <p className="sidebar-bio">
              We help you get 100 paying clients by fixing content, offer, and sales. Live training 6 days a week.
            </p>

            <div className="sidebar-quick-stats">
              <div className="quick-stat">
                <span className="qs-val">100</span>
                <span className="qs-lbl">Client Target</span>
              </div>
              <div className="quick-stat">
                <span className="qs-val">6</span>
                <span className="qs-lbl">Clients Won</span>
              </div>
              <div className="quick-stat">
                <span className="qs-val">6 / wk</span>
                <span className="qs-lbl">Live Drills</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Live Schedule Sidebar Card */}
        <div className="schedule-sidebar-card skool-card">
          <span className="section-label">TRAINING CADENCE</span>
          <h4 className="cadence-title">Weekly Live Sessions</h4>

          <div className="cadence-list">
            {weeklySchedule.map((item, idx) => (
              <div key={idx} className="cadence-row">
                <div className="cadence-day-time">
                  <span className="cadence-day">{item.day}</span>
                  <span className="cadence-time">{item.time}</span>
                </div>
                <div className="cadence-track">
                  <span className="cadence-track-name">{item.track}</span>
                  <span className="cadence-coach">w/ {item.coach}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};
