import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";
import { vi } from "vitest";

// Helps React Testing Library + React 18 avoid act(...) warnings in some cases.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

if (!globalThis.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserver;
}

if (!globalThis.IntersectionObserver) {
  class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  globalThis.IntersectionObserver = IntersectionObserver as unknown as typeof globalThis.IntersectionObserver;
}

if (!HTMLElement.prototype.scrollIntoView) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
}

if (!HTMLElement.prototype.setPointerCapture) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  HTMLElement.prototype.setPointerCapture = function setPointerCapture() {};
}

if (!HTMLElement.prototype.releasePointerCapture) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  HTMLElement.prototype.releasePointerCapture = function releasePointerCapture() {};
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = cb => window.setTimeout(() => cb(Date.now()), 0);
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = id => window.clearTimeout(id);
}

// Framer Motion is great in the browser, but it can be a common source of
// jsdom test flakiness (RAF timing, layout reads, invalid DOM props). Mock it
// globally so UI tests can render deterministically.
vi.mock("framer-motion", async () => {
  const React = await import("react");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripMotionProps = (props: any) => {
    const {
      initial,
      animate,
      exit,
      transition,
      variants,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      ...rest
    } = props;

    return rest;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMotionComponent = (tag: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.forwardRef<any, any>(({ children, ...props }, ref) =>
      React.createElement(tag, { ...stripMotionProps(props), ref }, children),
    );

  const cache = new Map<string, unknown>();

  // Allow <motion.div>, <motion.button>, <motion.aside>, etc without needing
  // to enumerate each tag.
  const motion = new Proxy(
    {},
    {
      get(_target, key) {
        if (typeof key !== "string") return undefined;
        if (cache.has(key)) return cache.get(key);
        const c = createMotionComponent(key);
        cache.set(key, c);
        return c;
      },
    },
  );

  const AnimatePresence = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children);

  return { motion, AnimatePresence };
});
