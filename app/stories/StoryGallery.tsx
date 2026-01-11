"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type GalleryImage = {
  src: string;
  alt: string;
};

type StoryGalleryProps = {
  images: GalleryImage[];
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export default function StoryGallery({
  images,
  className,
  sizes,
  priority
}: StoryGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxIndex = Math.max(images.length - 1, 0);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(0);
    }
  }, [currentIndex, maxIndex]);

  if (images.length === 0) {
    return null;
  }

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;
  const frameClassName = ["story-gallery-frame", className]
    .filter(Boolean)
    .join(" ");
  const activeImage = images[currentIndex];

  return (
    <div className={frameClassName}>
      <Image
        src={activeImage.src}
        alt={activeImage.alt}
        fill
        sizes={sizes}
        priority={priority}
      />
      {images.length > 1 ? (
        <>
          <button
            className="story-gallery-nav story-gallery-nav-prev"
            type="button"
            onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
            disabled={!canGoPrev}
            aria-label="Previous photo"
          >
            ←
          </button>
          <button
            className="story-gallery-nav story-gallery-nav-next"
            type="button"
            onClick={() => setCurrentIndex((index) => Math.min(index + 1, maxIndex))}
            disabled={!canGoNext}
            aria-label="Next photo"
          >
            →
          </button>
          <div className="story-gallery-indicator">
            {currentIndex + 1}/{images.length}
          </div>
        </>
      ) : null}
    </div>
  );
}
