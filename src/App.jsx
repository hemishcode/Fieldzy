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
      {/* Farmer story — photographic section */}
      <section className="farmer-story" id="about">
        <div className="farmer-story-overlay" />

        <div className="farmer-story-content">
          <span className="landing-eyebrow">
            ROOTED IN REAL FARMING
          </span>

          <h2>
            Every harvest
            <br />
            begins with a
            <br />
            <span>field worth protecting.</span>
          </h2>

          <p>
            Behind every crop is a farmer, a season of hard work,
            and a livelihood worth protecting. FIELDZY brings
            agricultural observations and intelligent tools
            together to support better-informed decisions.
          </p>

          <a href="#vision" className="story-link">
            Discover our approach
            <ArrowUpRight size={18} />
          </a>
        </div>

        <div className="farmer-story-caption">
          <Leaf size={16} />
          <span>Technology with its roots in the field.</span>
        </div>
      </section>

      {/* The problem and our vision */}
      <section className="fieldzy-intro-section" id="vision">
        <div className="fieldzy-intro-heading">
          <span className="landing-eyebrow">WHY FIELDZY EXISTS</span>

          <h2>
            Farming is complex.
            <br />
            <span>Understanding it shouldn't be.</span>
          </h2>

          <p>
            Field conditions change. Crop symptoms can be uncertain.
            Measurements need context. Farmers deserve tools that
            bring information together without pretending that
            every prediction is a proven fact.
          </p>
        </div>

        <div className="fieldzy-values-grid">
          <article className="fieldzy-value-card">
            <span className="value-number">01</span>
            <Sprout size={27} />
            <h3>Understand</h3>
            <p>
              Bring field information, observations and crop
              health predictions into one organised workspace.
            </p>
          </article>

          <article className="fieldzy-value-card">
            <span className="value-number">02</span>
            <ShieldCheck size={27} />
            <h3>Question</h3>
            <p>
              Identify missing, conflicting and unverified
              evidence before relying on an assessment.
            </p>
          </article>

          <article className="fieldzy-value-card">
            <span className="value-number">03</span>
            <Wifi size={27} />
            <h3>Connect</h3>
            <p>
              Explore a more connected way to organise field
              information, observations and agricultural insights.
            </p>
          </article>
        </div>
      </section>

      {/* How FIELDZY works */}
      <section className="fieldzy-process-section">
        <div className="fieldzy-process-image">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600"
            alt="Farmer observing crops in an agricultural field"
            loading="lazy"
          />

          <div className="process-image-overlay">
            <span>FROM FIELD TO INSIGHT</span>
            <h2>
              Better information.
              <br />
              More informed decisions.
            </h2>
          </div>
        </div>

        <div className="fieldzy-process-content">
          <span className="landing-eyebrow">HOW IT WORKS</span>

          <h2>
            A clearer picture
            <br />
            of your fields.
          </h2>

          <div className="process-step">
            <span>01</span>
            <div>
              <h3>Collect field evidence</h3>
              <p>
                Record field observations, soil readings and
                plant images in one place.
              </p>
            </div>
          </div>

          <div className="process-step">
            <span>02</span>
            <div>
              <h3>Analyse available information</h3>
              <p>
                Use plant disease model predictions and
                field assessment tools to organise the evidence.
              </p>
            </div>
          </div>

          <div className="process-step">
            <span>03</span>
            <div>
              <h3>Review before acting</h3>
              <p>
                Examine missing evidence, conflicting records
                and verification limitations before making decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FIELDZY capabilities */}
      <section className="fieldzy-capabilities-section" id="features">
        <div className="capabilities-heading">
          <span className="landing-eyebrow">EXPLORE FIELDZY</span>

          <h2>
            Everything begins
            <br />
            <span>with understanding.</span>
          </h2>

          <p>
            A collection of agricultural tools designed to
            bring field information into one place.
          </p>
        </div>

        <div className="fieldzy-capabilities-grid">
          <article className="capability-card capability-large">
            <div className="capability-topline">
              <span>01 / CROP INTELLIGENCE</span>
              <Leaf size={21} />
            </div>

            <h3>Plant health insights</h3>

            <p>
              Analyse uploaded plant images using a trained
              prediction model. Review the model's output
              and confidence without confusing a prediction
              with a confirmed diagnosis.
            </p>

            <div className="capability-decoration">
              <Sprout size={74} strokeWidth={0.8} />
            </div>
          </article>

          <article className="capability-card">
            <div className="capability-topline">
              <span>02 / FIELD MONITORING</span>
              <Sprout size={21} />
            </div>

            <h3>Soil moisture</h3>

            <p>
              Record and review soil moisture readings.
              Demonstration readings are clearly identified
              as simulated.
            </p>
          </article>

          <article className="capability-card">
            <div className="capability-topline">
              <span>03 / EVIDENCE INTELLIGENCE</span>
              <ShieldCheck size={21} />
            </div>

            <h3>Evidence Debt</h3>

            <p>
              Track unresolved evidence gaps, unverified
              observations and information that needs review.
            </p>
          </article>

          <article className="capability-card capability-wide">
            <div>
              <div className="capability-topline">
                <span>04 / UNIFIED FIELD VIEW</span>
                <ArrowUpRight size={21} />
              </div>

              <h3>One assessment. A broader picture.</h3>

              <p>
                Bring available plant predictions, soil information
                and field observations into a single assessment
                with clearly stated limitations.
              </p>
            </div>

            <div className="capability-decoration">
              <ShieldCheck size={65} strokeWidth={0.9} />
            </div>
          </article>
        </div>
      </section>

      {/* Final call to action */}
      <section className="fieldzy-final-section">
        <div className="final-section-decoration">
          <Sprout size={100} strokeWidth={0.7} />
        </div>

        <span className="landing-eyebrow">THE FIELDZY EXPERIENCE</span>

        <h2>
          Smarter fields.
          <br />
          <span>Safer harvests.</span>
        </h2>

        <p>
          Explore a new way to bring agricultural information,
          evidence and insights together.
        </p>

        <button
          className="fieldzy-final-button"
          onClick={() => setShowDashboard(true)}
        >
          Explore the FIELDZY dashboard
          <ArrowUpRight size={18} />
        </button>
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