import React, { useState } from "react";
import { Link } from "react-router-dom";

function CheckIcon() {
  return (
    <svg className="pricingCheck" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const suiteTiers = [
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

const OUTLINE_GENERATOR_URL = "https://outline-generator-rho.vercel.app";

const individualTiers = {
  objectiveWriter: [
    { id: "free", name: "Free", price: "$0", cta: "Get started", ctaHref: "/", features: ["1 objective per generation", "5 generations/month"] },
    { id: "pro", name: "Pro", price: "$9.99", period: "/mo", cta: "Subscribe", features: ["10 objectives per generation", "Unlimited generations"] },
  ],
  outlineGenerator: [
    { id: "free", name: "Free", price: "$0", cta: "Get started", ctaHref: OUTLINE_GENERATOR_URL, features: ["1 outline per generation", "5 generations/month"] },
    { id: "pro", name: "Pro", price: "$9.99", period: "/mo", cta: "Subscribe", features: ["10 outlines per generation", "Unlimited generations"] },
  ],
};

function getCtaAriaLabel(cta: string, name: string): string {
  if (cta === "Get started") return `Get started with ${name} plan`;
  if (cta === "Subscribe") return `Subscribe to ${name} plan`;
  if (cta === "Contact us") return `Contact us about ${name} plan`;
  return cta;
}

type SuiteTier = (typeof suiteTiers)[number];
type IndividualTier = (typeof individualTiers.objectiveWriter)[number] & { ctaHref?: string };

function SuiteCard({ tier }: { tier: SuiteTier }) {
  const headingId = `pricing-heading-${tier.id}`;
  const featuresId = `pricing-features-${tier.id}`;
  return (
    <li
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
          <li key={i}>
            <CheckIcon />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {tier.cta === "Get started" ? (
        <Link
          to="/"
          className={`pricingCta pricingCtaLink ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
          aria-label={getCtaAriaLabel(tier.cta, tier.name)}
        >
          {tier.cta}
        </Link>
      ) : (
        <button
          type="button"
          className={`pricingCta ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
          aria-label={getCtaAriaLabel(tier.cta, tier.name)}
        >
          {tier.cta}
        </button>
      )}
    </li>
  );
}

function IndividualCard({ tier, toolName }: { tier: IndividualTier; toolName: string }) {
  const headingId = `pricing-ind-heading-${toolName}-${tier.id}`;
  const featuresId = `pricing-ind-features-${toolName}-${tier.id}`;
  return (
    <li
      className={`pricingCard ${tier.id === "pro" ? "pricingCardHighlight" : ""}`}
      role="listitem"
      aria-labelledby={headingId}
      aria-describedby={featuresId}
    >
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
          <li key={i}>
            <CheckIcon />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {tier.cta === "Get started" ? (
        "ctaHref" in tier && tier.ctaHref ? (
          tier.ctaHref.startsWith("http") ? (
            <a
              href={tier.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`pricingCta pricingCtaLink ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
              aria-label={getCtaAriaLabel(tier.cta, tier.name)}
            >
              {tier.cta}
            </a>
          ) : (
            <Link
              to={tier.ctaHref}
              className={`pricingCta pricingCtaLink ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
              aria-label={getCtaAriaLabel(tier.cta, tier.name)}
            >
              {tier.cta}
            </Link>
          )
        ) : (
          <Link
            to="/"
            className={`pricingCta pricingCtaLink ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
            aria-label={getCtaAriaLabel(tier.cta, tier.name)}
          >
            {tier.cta}
          </Link>
        )
      ) : (
        <button
          type="button"
          className={`pricingCta ${tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary"}`}
          aria-label={getCtaAriaLabel(tier.cta, tier.name)}
        >
          {tier.cta}
        </button>
      )}
    </li>
  );
}

export default function Pricing() {
  const [pricingMode, setPricingMode] = useState<"suite" | "individual">("suite");

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

      <div className="pricingToggleRow" role="group" aria-label="Pricing plan type">
        <button
          type="button"
          className={`pricingToggleBtn ${pricingMode === "suite" ? "pricingToggleBtnActive" : ""}`}
          onClick={() => setPricingMode("suite")}
          aria-pressed={pricingMode === "suite"}
        >
          Suite (Save 20%)
        </button>
        <button
          type="button"
          className={`pricingToggleBtn ${pricingMode === "individual" ? "pricingToggleBtnActive" : ""}`}
          onClick={() => setPricingMode("individual")}
          aria-pressed={pricingMode === "individual"}
        >
          Individual tools
        </button>
      </div>

      {pricingMode === "suite" ? (
        <ul
          className="pricingGrid pricingGridThreeCol"
          role="list"
          aria-label="Available pricing plans"
          aria-describedby="pricing-desc"
        >
          {suiteTiers.map((tier) => (
            <SuiteCard key={tier.id} tier={tier} />
          ))}
        </ul>
      ) : (
        <>
          <div className="pricingIndividualGrid">
            <div className="pricingToolColumn">
              <h2 className="pricingToolHeading">Objective Writer</h2>
              <ul className="pricingToolList" aria-label="Objective Writer pricing plans">
                {individualTiers.objectiveWriter.map((tier) => (
                  <IndividualCard key={tier.id} tier={tier} toolName="objective-writer" />
                ))}
              </ul>
            </div>
            <div className="pricingToolColumn">
              <h2 className="pricingToolHeading">Outline Generator</h2>
              <ul className="pricingToolList" aria-label="Outline Generator pricing plans">
                {individualTiers.outlineGenerator.map((tier) => (
                  <IndividualCard key={tier.id} tier={tier} toolName="outline-generator" />
                ))}
              </ul>
            </div>
          </div>
          <p className="pricingIndividualNote">
            Save 20% by switching to the suite plan.
          </p>
        </>
      )}

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
