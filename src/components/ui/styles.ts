// Shared class names so links, focus states and secondary text look the same
// in both workspaces.

/** Visible keyboard focus for every interactive element. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/** Record link (work-order ID, ATM number): blue, underlined on hover. */
export const recordLink = `rounded-sm font-medium text-blue-800 underline-offset-2 hover:underline ${focusRing}`;

/** Navigational text link (back links, "show all"): always underlined. */
export const textLink = `rounded-sm font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950 ${focusRing}`;
