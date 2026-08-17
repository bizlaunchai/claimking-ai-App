"use client";
import * as React from "react";

/**
 * App-wide loaders. Replaces plain "Loading…" text with real spinners/skeletons.
 * Styles live in app/globals.css (.ck-spinner / .ck-skel / .ck-load-block).
 *
 *   <Spinner />                     inline spinner (sized by font-size)
 *   <Spinner size="lg" tone="gold"/>
 *   <LoadingBlock label="…" />      centered spinner + message (page/section)
 *   <ButtonSpinner /> Saving…       inline spinner for busy buttons
 *   <Skeleton className="h-4 w-40"/> shimmer placeholder block
 */

export function Spinner({ size, tone, className = "", style, ...props }) {
  const cls = ["ck-spinner", size === "sm" ? "sm" : size === "lg" ? "lg" : "", tone || "", className]
    .filter(Boolean)
    .join(" ");
  return <span className={cls} role="status" aria-label="Loading" style={style} {...props} />;
}

/** Small spinner meant to sit inside a button, before the label. */
export function ButtonSpinner({ className = "", ...props }) {
  return <Spinner size="sm" className={`ck-btn-spin ${className}`} aria-hidden="true" {...props} />;
}

/** Centered spinner + optional message — drop-in for a full "Loading…" panel. */
export function LoadingBlock({ label = "Loading…", className = "", style, ...props }) {
  return (
    <div className={`ck-load-block ${className}`} role="status" aria-live="polite" style={style} {...props}>
      <Spinner />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

/** Inline spinner + message on one row (e.g. small hints). */
export function LoadingInline({ label = "Loading…", className = "", ...props }) {
  return (
    <span className={`ck-load-inline ${className}`} role="status" aria-live="polite" {...props}>
      <Spinner size="sm" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

/** Shimmer placeholder block. Pass sizing via className/style. */
export function Skeleton({ variant, className = "", style, ...props }) {
  const cls = ["ck-skel", variant || "", className].filter(Boolean).join(" ");
  return <span className={cls} style={style} aria-hidden="true" {...props} />;
}

export default Spinner;
