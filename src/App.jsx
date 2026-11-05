import { useState } from "react";
import Dashboard from "./dashboard/dashboard";
import {
  Leaf,
  ArrowUpRight,
  Sprout,
  ShieldCheck,
  Wifi,
  Menu,
  X,
} from "lucide-react";
import "./App.css";

export default function App() {
   const [showDashboard, setShowDashboard] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
    if (showDashboard) {
    return (
      <Dashboard
        onGoHome={() => setShowDashboard(false)}
      />
    );
  } 
  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  return (
    <main className="landing-page">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* Navigation */}
      <header className="landing-header">
        <a
          className="landing-brand"
          href="#home"
          aria-label="FIELDZY home"
        >
          <span className="brand-icon">
  <img src="/Fieldzy Smart Farm Emblem.png" alt="FIELDZY" />
</span>

          <span className="brand-name">FIELDZY</span>
        </a>

        <nav className={menuOpen ? "landing-nav nav-visible" : "landing-nav"}>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About
          </a>

          <a href="#features" onClick={() => setMenuOpen(false)}>
            Our vision
          </a>

          <button
            className="nav-cta"
            onClick={() => {
  setMenuOpen(false);
  setShowDashboard(true);
}}
          >
            Discover FIELDZY
            <ArrowUpRight size={16} />
          </button>
        </nav>

        <button
          className="mobile-toggle"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Hero */}
      <section className="hero" id="home">
        <div className="hero-content">

  <div className="hero-brand-emblem">
    <img
      src="/Fieldzy Smart Farm Emblem.png"
      alt="FIELDZY emblem"
    />
  </div>

  <h1>
            Growing a
            <br />
            <span>greener future.</span>
          </h1>

          <p className="hero-description">
            Agriculture deserves smarter protection.
            FIELDZY is building a connected, offline-capable
            early-warning experience to help farmers monitor
            their fields and respond to potential threats.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() =>
                showNotice(
                  "FIELDZY is currently a prototype. Stay tuned as we build!"
                )
              }
            >
              Discover our vision
              <ArrowUpRight size={18} />
            </button>

            <a className="secondary-button" href="#features">
              See what we're building
            </a>
          </div>

          <div className="hero-footnote">
            <span className="footnote-icon">
              <ShieldCheck size={17} />
            </span>
            <span>
              <b>Built around the farmer</b>
              <small>Resilient. Practical. Evidence-aware.</small>
            </span>
          </div>
        </div>

        {/* Decorative field illustration */}
        <div className="hero-art" aria-label="Illustration of green farmland">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />

          <div className="sun-disc" />


          <div className="field-landscape">
            <div className="hill hill-back" />
            <div className="hill hill-middle" />
            <div className="hill hill-front" />

            <div className="crop-row crop-one" />
            <div className="crop-row crop-two" />
            <div className="crop-row crop-three" />
            <div className="crop-row crop-four" />

            <div className="farm-path" />

            <div className="plant plant-one">
              <Sprout size={37} />
            </div>

            <div className="plant plant-two">
              <Sprout size={29} />
            </div>

            <div className="plant plant-three">
              <Sprout size={33} />
            </div>
          </div>

          <div className="art-label label-bottom">
            <span className="label-leaf">
              <Leaf size={17} />
            </span>
            <span>
              <b>Rooted in resilience</b>
              <small>Growing better, together.</small>
            </span>
          </div>
        </div>

        <div className="hero-bottom-line">
          <span>SMARTER FIELDS</span>
          <span className="line-divider" />
          <span>SAFER HARVESTS</span>
          <span className="line-divider" />
          <span>A BETTER TOMORROW</span>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-intro" id="about">
          <span className="section-eyebrow">OUR VISION</span>

          <h2>
            Because every field
            <br />
            <span>has a story to protect.</span>
          </h2>

          <p>
            FIELDZY explores how early warnings, evidence-aware
            alerts, and offline-first technology can support
            more resilient farming communities.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-item">
            <div className="feature-icon">
              <Sprout size={23} />
            </div>
            <h3>Understand your fields</h3>
            <p>
              Bring field observations and environmental
              information together in one place.
            </p>
          </article>

          <article className="feature-item">
            <div className="feature-icon">
              <ShieldCheck size={23} />
            </div>
            <h3>Verify before acting</h3>
            <p>
              Keep potential threats distinct from verified
              observations, with evidence clearly tracked.
            </p>
          </article>

          <article className="feature-item">
            <div className="feature-icon">
              <Wifi size={23} />
            </div>
            <h3>Designed for weak signals</h3>
            <p>
              Explore an offline-first approach to keeping
              essential field information accessible.
            </p>
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <a className="footer-brand" href="#home">
  <img src="/Fieldzy Smart Farm Emblem.png" alt="" />
  FIELDZY
</a>

        <p>Your fields. Connected. Protected.</p>

        <span>© 2026 FIELDZY · Prototype</span>
      </footer>

      {notice && (
        <div className="landing-toast" role="status">
          <Leaf size={18} />
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}