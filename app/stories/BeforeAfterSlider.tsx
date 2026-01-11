"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import Image from "next/image";

type BeforeAfterSliderProps = {
  beforeSrc: string;
  afterSrc?: string | null;
  beforeAlt: string;
  afterAlt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  className,
  priority = false,
  sizes = "(max-width: 720px) 100vw, 50vw"
}: BeforeAfterSliderProps) {
  const [showAfter, setShowAfter] = useState(false);
  const hasAfter = Boolean(afterSrc);
  const hintAction = showAfter ? "before" : "after";
  const ariaLabel = showAfter ? "Show before photo" : "Show after photo";

  const toggle = () => {
    if (!hasAfter) {
      return;
    }
    setShowAfter((current) => !current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasAfter) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={`before-after ${className ?? ""}${
        hasAfter ? " before-after-toggleable" : ""
      }`}
      role={hasAfter ? "button" : undefined}
      tabIndex={hasAfter ? 0 : undefined}
      onClick={hasAfter ? toggle : undefined}
      onKeyDown={hasAfter ? handleKeyDown : undefined}
      aria-label={hasAfter ? ariaLabel : undefined}
    >
      <div className={`before-after-layer ${showAfter ? "is-hidden" : ""}`}>
        <Image
          src={beforeSrc}
          alt={beforeAlt}
          fill
          sizes={sizes}
          className="before-after-image"
          priority={priority}
        />
      </div>
      {hasAfter ? (
        <div className={`before-after-layer ${showAfter ? "" : "is-hidden"}`}>
          <Image
            src={afterSrc!}
            alt={afterAlt ?? beforeAlt}
            fill
            sizes={sizes}
            className="before-after-image"
            priority={priority}
          />
        </div>
      ) : null}
      <span className="before-after-label">
        {showAfter ? "After" : "Before"}
      </span>
      {hasAfter ? (
        <span className="before-after-hint" aria-hidden="true">
          Tap or click to see {hintAction}
        </span>
      ) : null}
    </div>
  );
}
