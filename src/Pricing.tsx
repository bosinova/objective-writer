import React from "react";
import { Link } from "react-router-dom";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cta: "Get started",
    badge: null,
    features: [
      "Access to both Prism tools",
      "1 objective per generation",
      "3 outline generations/month",
      "5 objective generations/month",
      "Activity suggestions",
      "Email results",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$15.99",
    period: "/mo",
    cta: "Subscribe",
    badge: "Best value",
    features: [
      "Access to all Prism tools",
      "10 objectives per generation",
      "Unlimited generations",
      "Activity suggestions",
      "Email results",
      "Save to Projects dashboard",
      "Priority support",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$69.99",
    period: "/mo",
    cta: "Contact us",
    badge: "Multiple seats",
    features: [
      "Everything in Pro",
      "Multiple seats (up to 10)",
      "Team project sharing",
      "Usage analytics",
      "Dedicated support",
    ],
  },
];

function getCtaAriaLabel(tier: (typeof tiers)[number]): string {
  if (tier.cta === "Get started") return `Get started with ${tier.name} plan`;
  if (tier.cta === "Subscribe") return `Subscribe to ${tier.name} plan`;
  if (tier.cta === "Contact us") return `Contact us about ${tier.name} plan`;
  return tier.cta;
}

export default function Pricing() {
  return (
    <div className="pricingPage">
      <div className="pricingBackRow">
        <Link to="/" className="pricingBackButton" aria-label="Return to the main Objective Writer app">
          ← Back to app
        </Link>
      </div>
      <h1 className="pricingTitle">Simple pricing for the whole Prism suite.</h1>
      <p className="pricingSubtitle" id="pricing-desc">
        Choose the plan that fits your needs. All plans include activity suggestions and email delivery.
      </p>
      <ul
        className="pricingGrid pricingGridThreeCol"
        role="list"
        aria-label="Available pricing plans"
        aria-describedby="pricing-desc"
      >
        {tiers.map((tier) => {
          const headingId = `pricing-heading-${tier.id}`;
          const featuresId = `pricing-features-${tier.id}`;
          return (
            <li
              key={tier.id}
              className={`pricingCard ${tier.id === "pro" ? "pricingCardHighlight" : ""}`}
              role="listitem"
              aria-labelledby={headingId}
              aria-describedby={featuresId}
            >
              {tier.badge && (
                <span
                  className={`pricingBadge ${tier.id === "pro" ? "pricingBadgePopular" : "pricingBadgeMuted"}`}
                  aria-label={tier.id === "pro" ? "Best value plan" : tier.id === "team" ? "Multiple seats plan" : ""}
                >
                  {tier.badge}
                </span>
              )}
              <h2 id={headingId} className="pricingCardName">
                {tier.name}
              </h2>
              <div className="pricingCardPrice">
                <span className="pricingPriceAmount">{tier.price}</span>
                {tier.period && (
                  <span className="pricingPricePeriod" aria-hidden="true">
                    {tier.period}
                  </span>
                )}
              </div>
              <ul id={featuresId} className="pricingCardFeatures" aria-label={`${tier.name} plan features`}>
                {tier.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              {tier.cta === "Get started" ? (
                <Link
                  to="/"
                  className={`pricingCta pricingCtaLink ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
                  aria-label={getCtaAriaLabel(tier)}
                >
                  {tier.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  className={`pricingCta ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
                  aria-label={getCtaAriaLabel(tier)}
                >
                  {tier.cta}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="pricingBackRow pricingBackRowBottom">
        <Link
          to="/"
          className="pricingBackButton"
          aria-label="Return to the main Objective Writer app"
        >
          ← Back to app
        </Link>
      </div>
    </div>
  );
}
