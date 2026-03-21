import React, { useState } from "react";
import { Link } from "react-router-dom";

function CheckIcon() {
  return (
    <svg className="pricingCheck" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const OUTLINE_GENERATOR_URL = "https://outline-generator-rho.vercel.app";

/** Shared shape for Suite and Individual tool pricing cards (SuiteCard). */
type PricingCardTier = {
  id: string;
  name: string;
  price: string;
  period?: string;
  cta: string;
  badge: string | null;
  features: string[];
  /** When cta is Get started: internal path or full URL */
  ctaHref?: string;
};

const individualTiers: {
  objectiveWriter: PricingCardTier[];
  outlineGenerator: PricingCardTier[];
} = {
  objectiveWriter: [
    {
      id: "free",
      name: "Free",
      price: "$0",
      cta: "Get started",
      badge: null,
      ctaHref: "/",
      features: ["1 objective per generation", "5 generations/month"],
    },
    {
      id: "pro",
      name: "Pro",
      price: "$9.99",
      period: "/mo",
      cta: "Subscribe",
      badge: "Best value",
      features: ["10 objectives per generation", "Unlimited generations"],
    },
  ],
  outlineGenerator: [
    {
      id: "free",
      name: "Free",
      price: "$0",
      cta: "Get started",
      badge: null,
      ctaHref: OUTLINE_GENERATOR_URL,
      features: ["1 outline per generation", "5 generations/month"],
    },
    {
      id: "pro",
      name: "Pro",
      price: "$9.99",
      period: "/mo",
      cta: "Subscribe",
      badge: "Best value",
      features: ["10 outlines per generation", "Unlimited generations"],
    },
  ],
};

const suiteTiers: PricingCardTier[] = [
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
    badge: "Multiple seats · Coming soon",
    features: [
      "Everything in Pro",
      "Multiple seats (up to 10)",
      "Team project sharing",
      "Usage analytics",
      "Dedicated support",
    ],
  },
];

function getCtaAriaLabel(cta: string, name: string): string {
  if (cta === "Get started") return `Get started with ${name} plan`;
  if (cta === "Subscribe") return `Subscribe to ${name} plan`;
  if (cta === "Contact us") return `Contact us about ${name} plan`;
  return cta;
}

function SuiteCard({ tier, listKey }: { tier: PricingCardTier; listKey: string }) {
  const headingId = `pricing-heading-${listKey}-${tier.id}`;
  const featuresId = `pricing-features-${listKey}-${tier.id}`;
  const ctaClassPro = tier.id === "pro" ? "pricingCtaPrimary" : "pricingCtaSecondary";

  const getStartedLink = (child: React.ReactNode) => {
    const href = tier.ctaHref;
    if (href?.startsWith("http")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`pricingCta pricingCtaLink ${ctaClassPro}`}
          aria-label={getCtaAriaLabel(tier.cta, tier.name)}
        >
          {child}
        </a>
      );
    }
    if (href) {
      return (
        <Link
          to={href}
          className={`pricingCta pricingCtaLink ${ctaClassPro}`}
          aria-label={getCtaAriaLabel(tier.cta, tier.name)}
        >
          {child}
        </Link>
      );
    }
    return (
      <Link
        to="/"
        className={`pricingCta pricingCtaLink ${ctaClassPro}`}
        aria-label={getCtaAriaLabel(tier.cta, tier.name)}
      >
        {child}
      </Link>
    );
  };

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
          aria-label={
            tier.id === "pro"
              ? "Best value plan"
              : tier.id === "team"
                ? "Multiple seats plan, coming soon"
                : ""
          }
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
        getStartedLink(tier.cta)
      ) : (
        <button
          type="button"
          className={`pricingCta ${ctaClassPro}`}
          aria-label={getCtaAriaLabel(tier.cta, tier.name)}
        >
          {tier.cta}
        </button>
      )}
    </li>
  );
}

function IndividualTeamTier() {
  const headingId = "pricing-ind-team-heading";
  const featuresId = "pricing-ind-team-features";
  return (
    <section
      className="pricingIndividualTeam"
      aria-labelledby={headingId}
      aria-describedby={featuresId}
    >
      <div className="pricingIndividualTeamCard">
        <span
          className="pricingBadge pricingBadgeMuted"
          aria-label="Multiple seats plan, coming soon"
        >
          Multiple seats · Coming soon
        </span>
        <div className="pricingIndividualTeamLayout">
          <div className="pricingIndividualTeamMain">
            <h2 id={headingId} className="pricingCardName">
              Team
            </h2>
            <div className="pricingCardPrice pricingIndividualTeamPriceBlock">
              <div className="pricingIndividualTeamPriceLine">
                <span className="pricingPriceAmount">$19.99</span>
                <span className="pricingPricePeriod">/month per tool</span>
              </div>
              <p className="pricingIndividualTeamBundle">
                or <strong>$34.99</strong>/month for both tools bundled
              </p>
            </div>
            <ul id={featuresId} className="pricingCardFeatures" aria-label="Team plan features">
              <li>
                <CheckIcon />
                <span>Everything in Pro for one tool</span>
              </li>
            </ul>
            <p className="pricingIndividualTeamSuiteNote">
              Save more with the Suite plan at <strong>$69.99/month</strong> for both tools and up
              to 10 seats.
            </p>
          </div>
          <div className="pricingIndividualTeamCtaWrap">
            <button
              type="button"
              className="pricingCta pricingCtaSecondary"
              aria-label={getCtaAriaLabel("Contact us", "Team")}
            >
              Contact us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Pricing() {
  /** Default tab: Suite (Save 20%) */
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
            <SuiteCard key={tier.id} tier={tier} listKey="suite" />
          ))}
        </ul>
      ) : (
        <>
          <div className="pricingIndividualGrid">
            <div className="pricingToolColumn">
              <h2 className="pricingToolHeading">Objective Writer</h2>
              <ul className="pricingToolList" aria-label="Objective Writer pricing plans">
                {individualTiers.objectiveWriter.map((tier) => (
                  <SuiteCard key={tier.id} tier={tier} listKey="objective-writer" />
                ))}
              </ul>
            </div>
            <div className="pricingToolColumn">
              <h2 className="pricingToolHeading">Outline Generator</h2>
              <ul className="pricingToolList" aria-label="Outline Generator pricing plans">
                {individualTiers.outlineGenerator.map((tier) => (
                  <SuiteCard key={tier.id} tier={tier} listKey="outline-generator" />
                ))}
              </ul>
            </div>
          </div>
          <IndividualTeamTier />
          <p className="pricingIndividualNote">
            Prefer both tools with shared seats? Switch to the <strong>Suite</strong> tab for the full
            bundle and team pricing.
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
