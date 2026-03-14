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
      "Free account required",
      "Own content unlocked",
      "3 objectives per generation",
      "5 generations per month",
      "Activities included",
      "Email results",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$4.99",
    period: "/mo",
    cta: "Subscribe",
    badge: null,
    features: [
      "Own content",
      "3 objectives per generation",
      "20 generations per month",
      "Activities included",
      "Email results",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    cta: "Subscribe",
    badge: "Most popular",
    features: [
      "Own content",
      "10 objectives per generation",
      "100 generations per month",
      "Activities included",
      "Email results",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$49.99",
    period: "/mo",
    cta: "Contact us",
    badge: "Multiple seats coming soon",
    features: [
      "Own content",
      "10 objectives per generation",
      "500 generations per month",
      "Activities included",
      "Email results",
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
      <h1 className="pricingTitle">Pricing</h1>
      <p className="pricingSubtitle" id="pricing-desc">
        Choose the plan that fits your needs. All plans include activity suggestions and email delivery.
      </p>
      <ul
        className="pricingGrid"
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
                  aria-label={tier.id === "pro" ? "Most popular plan" : "Note: Multiple seats coming soon"}
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
