
import { useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  CloudSun,
  TrendingUp,
  Droplets,
  RadioTower,
  ArrowUpRight,
  Bird,
} from "lucide-react";

import "./FieldzyFeatureCarousel.css";

const FEATURES = [
  {
    id: "overview",
    title: "Overview",
    description: "Your farm, its activity and everything that matters.",
    detail: "Dashboard summary",
    icon: LayoutDashboard,
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Wide green agricultural landscape",
    category: "THE BIG PICTURE",
  },
  {
    id: "fields",
    title: "My Fields",
    description: "Explore and monitor your registered farmland.",
    detail: "Field monitoring",
    icon: Sprout,
    image:
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Lush cultivated agricultural crops",
    category: "YOUR LAND",
  },
  {
    id: "warnings",
    title: "Early Warnings",
    description: "Stay informed about potential threats around your farm.",
    detail: "Threat monitoring",
    icon: CloudSun,
    image:
      "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Agricultural landscape with rows of growing crops",
    category: "STAY ALERT",
  },
  {
    id: "observations",
    title: "Observations",
    description: "Capture field findings and build a record of evidence.",
    detail: "Evidence tracking",
    icon: TrendingUp,
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Close view of green plants being cared for",
    category: "LOOK CLOSER",
  },
  {
    id: "acoustic",
    title: "Acoustic Intelligence",
    description: "Explore sound-based monitoring across your fields.",
    detail: "Sound monitoring",
    icon: Bird,
    image:
      "https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Bird in a natural outdoor environment",
    category: "LISTEN TO NATURE",
  },
  {
    id: "network",
    title: "Network Systems",
    description: "Keep track of connected farm devices and systems.",
    detail: "Network monitoring",
    icon: RadioTower,
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Solar panels under the open sky",
    category: "CONNECTED FARM",
  },
  {
    id: "soil",
    title: "Soil Moisture",
    description: "Understand moisture conditions beneath your crops.",
    detail: "Moisture monitoring",
    icon: Droplets,
    image:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Healthy green plant growing in soil",
    category: "UNDER THE SURFACE",
  },
];

export default function FieldzyFeatureCarousel({ onNavigate }) {
  const [activeCard, setActiveCard] = useState(null);
  const [paused, setPaused] = useState(false);

  // Duplicate cards for the continuous scrolling effect.
  const allFeatures = [...FEATURES, ...FEATURES];

  return (
    <section
      className={`fieldzy-carousel ${paused ? "is-paused" : ""}`}
      aria-label="Explore FIELDZY features"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
  setPaused(false);
  setActiveCard(null);
}}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false);
        }
      }}
    >
      <div className="fieldzy-carousel-heading">
        <div>
          <span className="fieldzy-eyebrow">
            YOUR FARM, CONNECTED
          </span>

          <h2>Explore FIELDZY</h2>

          <p>
            A closer look at the tools that help you care for your farm.
          </p>
        </div>

        <span className="fieldzy-carousel-label">
          <span className="fieldzy-live-dot" />
          Explore features
        </span>
      </div>

      <div className="fieldzy-carousel-window">
        <div className="fieldzy-carousel-track">
          {allFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const isDuplicate = index >= FEATURES.length;

            return (
             <button
  className={`fieldzy-feature-card ${
    activeCard === index ? "is-active" : ""
  }`}
  key={`${feature.id}-${index}`}
  onClick={() => onNavigate?.(feature.id)}
  onMouseEnter={() => setActiveCard(index)}
  onFocus={() => setActiveCard(index)}
  onBlur={() => setActiveCard(null)}
  tabIndex={index >= FEATURES.length ? -1 : 0}
>
                <img
                  className="fieldzy-feature-image"
                  src={feature.image}
                  alt=""
                  aria-hidden="true"
                  loading={index < FEATURES.length ? "eager" : "lazy"}
                  draggable="false"
                />

                <span className="fieldzy-feature-overlay" />

                <div className="fieldzy-feature-content">
                  <div className="fieldzy-feature-top">
                    <span className="fieldzy-feature-category">
                      <span className="fieldzy-feature-category-dot" />
                      {feature.category}
                    </span>

                    <span className="fieldzy-feature-icon">
                      <Icon size={21} strokeWidth={1.7} />
                    </span>
                  </div>

                  <div className="fieldzy-feature-bottom">
                    <h3>{feature.title}</h3>

                    <p className="fieldzy-feature-description">
                      {feature.description}
                    </p>

                    <div className="fieldzy-feature-footer">
                      <span className="fieldzy-feature-detail">
                        {feature.detail}
                      </span>

                      <span className="fieldzy-feature-arrow">
                        <ArrowUpRight size={19} />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="fieldzy-carousel-progress">
        <div className="fieldzy-carousel-progress-fill" />
      </div>
    </section>
  );
}
