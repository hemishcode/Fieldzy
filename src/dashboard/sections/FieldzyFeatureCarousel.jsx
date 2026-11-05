import { useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  CloudSun,
  TrendingUp,
  Droplets,
  Bot,
  ArrowUpRight,
} from "lucide-react";

import "./FieldzyFeatureCarousel.css";

const FEATURES = [
  {
    id: "overview",
    title: "Overview",
    description: "Your farm at a glance.",
    detail: "Dashboard summary",
    icon: LayoutDashboard,
  },
  {
    id: "fields",
    title: "My Fields",
    description: "Monitor your registered fields.",
    detail: "Field monitoring",
    icon: Sprout,
  },
  {
    id: "warnings",
    title: "Early Warnings",
    description: "Review potential agricultural threats.",
    detail: "Threat monitoring",
    icon: CloudSun,
  },
  {
    id: "observations",
    title: "Observations",
    description: "Record your findings and evidence.",
    detail: "Evidence tracking",
    icon: TrendingUp,
  },
  {
    id: "acoustic",
    title: "Acoustic Intelligence",
    description: "Explore sound monitoring tools.",
    detail: "Sound monitoring",
    icon: Droplets,
  },
  {
    id: "network",
    title: "Network Systems",
    description: "Explore network status.",
    detail: "Network monitoring",
    icon: Bot,
  },
    {
    id: "soil",
    title: "Soil Moisture",
    description: "Monitor soil moisture levels in your fields.",
    detail: "Moisture monitoring",
    icon: Droplets,
  },
];

export default function FieldzyFeatureCarousel({ onNavigate }) {
  const [paused, setPaused] = useState(false);

  // Duplicate the cards to create a continuous scrolling loop.
  const allFeatures = [...FEATURES, ...FEATURES];

  return (
    <section
      className={`fieldzy-carousel ${paused ? "is-paused" : ""}`}
      aria-label="Explore FIELDZY features"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
          <p>Everything you need, all in one place.</p>
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
                key={`${feature.id}-${index}`}
                type="button"
                className="fieldzy-feature-card"
                aria-label={`Open ${feature.title}`}
                tabIndex={isDuplicate ? -1 : 0}
                onClick={() => onNavigate?.(feature.id)}
              >
                <div className="fieldzy-feature-top">
                  <span className="fieldzy-feature-icon">
                    <Icon size={22} strokeWidth={1.8} />
                  </span>

                  <ArrowUpRight
                    size={19}
                    className="fieldzy-feature-arrow"
                  />
                </div>

                <h3>{feature.title}</h3>

                <p className="fieldzy-feature-description">
                  {feature.description}
                </p>

                <span className="fieldzy-feature-detail">
                  {feature.detail}
                  <span aria-hidden="true"> →</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}