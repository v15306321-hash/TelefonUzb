"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

/**
 * next/image with a shimmering placeholder underneath until the photo has loaded.
 * The image itself is never hidden, so nothing disappears if scripts are slow or off.
 */
export default function SkeletonImage({ onLoad, skeletonClassName = "", ...props }: ImageProps & { skeletonClassName?: string }) {
  const [loaded, setLoaded] = useState(false);
  // a cached image may finish loading before hydration — check on mount
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  return (
    <>
      {!loaded && <span aria-hidden className={`skeleton pointer-events-none absolute inset-0 ${skeletonClassName}`} />}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through props */}
      <Image
        ref={ref}
        {...props}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
      />
    </>
  );
}
