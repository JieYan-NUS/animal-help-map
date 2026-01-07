"use client";

import { useId, useState } from "react";
import Image from "next/image";

type BeforeAfterSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
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
  const [value, setValue] = useState(50);
  const inputId = useId();

  return (
    <div className={`before-after ${className ?? ""}`}>
      <div className="before-after-layer">
        <Image
          src={beforeSrc}
          alt={beforeAlt}
          fill
          sizes={sizes}
          className="before-after-image"
          priority={priority}
        />
      </div>
      <div
        className="before-after-layer before-after-after"
        style={{ width: `${value}%` }}
      >
        <Image
          src={afterSrc}
          alt={afterAlt}
          fill
          sizes={sizes}
          className="before-after-image"
          priority={priority}
        />
      </div>
      <span className="before-after-label before-after-label-before">
        Before
      </span>
      <span className="before-after-label before-after-label-after">After</span>
      <div
        className="before-after-divider"
        style={{ left: `${value}%` }}
        aria-hidden="true"
      />
      <label className="sr-only" htmlFor={inputId}>
        Reveal after photo
      </label>
      <input
        id={inputId}
        className="before-after-range"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        aria-label="Reveal after photo"
      />
    </div>
  );
}
