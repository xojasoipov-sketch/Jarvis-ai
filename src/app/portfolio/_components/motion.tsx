"use client";

/**
 * Premium interaction primitives.
 *
 * Every effect here degrades to a plain, static element when the visitor has
 * asked for reduced motion — the layout never depends on the animation.
 */

import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type ElementType,
} from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useReducedMotion,
  animate,
  type Variants,
} from "framer-motion";
import { gold, RADIUS, REVEAL_EASE, REVEAL_DURATION } from "./theme";

/* ── Scroll reveal ────────────────────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: REVEAL_DURATION, ease: REVEAL_EASE } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "50px" }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shablondagi FadeIn bilan bir xil ishlaydigan yakka element wrapper —
 * stagger kerak bo'lmagan joylarda (masalan bitta sarlavha) Reveal o'rniga
 * shuni ishlating. Xatti-harakati aynan bir xil: bir marta ko'ringanda
 * ko'tarilib chiqadi, sahifa oldindan yuklangan bo'lsa ham darhol ishga tushadi.
 */
export function FadeIn({
  children,
  as: Tag = "div",
  delay = 0,
  duration = REVEAL_DURATION,
  x = 0,
  y = 30,
  className,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion.create(Tag);
  return (
    <MotionTag
      initial={reduce ? undefined : { opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "50px" }}
      transition={{ delay, duration, ease: REVEAL_EASE }}
      className={className}
      style={style}
    >
      {children}
    </MotionTag>
  );
}

/* ── Text reveal — words rise into place ──────────────────────────────────── */

export function TextReveal({
  text,
  className,
  highlight,
  as: Tag = "h1",
  style,
}: {
  text: string;
  className?: string;
  /** Substring rendered in gold. */
  highlight?: string;
  as?: ElementType;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const highlightWords = highlight ? highlight.split(" ") : [];

  const isHighlighted = (word: string) =>
    highlightWords.some((h) => h.replace(/[.,]/g, "") === word.replace(/[.,]/g, ""));

  if (reduce) {
    return (
      <Tag className={className} style={style}>
        {words.map((w, i) => (
          <span key={i} style={isHighlighted(w) ? { color: gold(1) } : undefined}>
            {w}{i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className} style={style}>
      {words.map((word, i) => (
        // The observer must sit on the *unclipped* outer span. Watching the
        // inner one deadlocks: it starts translated fully outside this
        // overflow-hidden box, so its intersection rect is permanently empty
        // and the "entered view" callback never fires.
        <motion.span
          key={i}
          className="inline-block overflow-hidden align-bottom"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "110%" }, visible: { y: 0 } }}
            transition={{ duration: REVEAL_DURATION, delay: i * 0.055, ease: REVEAL_EASE }}
            style={isHighlighted(word) ? { color: gold(1) } : undefined}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && " "}
        </motion.span>
      ))}
    </Tag>
  );
}

/* ── Counter — counts up the first time it scrolls into view ──────────────── */

export function Counter({
  value,
  className,
  style,
}: {
  /** Any label: "120+", "99.9%", "24/7", "$499". Digits animate, the rest stays. */
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView || reduce) return;

    // Parsed inside the effect on purpose: String.match returns a fresh array
    // every render, so depending on it would restart the count on each frame
    // that onUpdate triggers — leaving the number pinned near zero forever.
    const match = value.match(/^([^\d]*)([\d.]+)(.*)$/);
    if (!match) return;

    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
    const render = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;

    const controls = animate(0, target, {
      duration: 1.6,
      ease: REVEAL_EASE,
      onUpdate: (v) => setDisplay(render(v)),
      // Land exactly on the source string so rounding never shows "119.99%".
      onComplete: () => setDisplay(value),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  // Labels with no leading number ("24/7") simply render as given.
  return (
    <span ref={ref} className={className} style={style}>
      {display}
    </span>
  );
}

/* ── Magnetic button — pulls slightly toward the cursor ───────────────────── */

export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 22, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 22, mass: 0.4 });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className ?? ""}`}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Spotlight card — a soft gold glow tracks the cursor ──────────────────── */

export function Spotlight({
  children,
  className = "",
  style,
  radius = 420,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  radius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(-9999);
  const my = useMotionValue(-9999);

  const background = useTransform(
    [mx, my],
    ([px, py]: number[]) =>
      `radial-gradient(${radius}px circle at ${px}px ${py}px, ${gold(0.12)}, transparent 70%)`,
  );

  return (
    <div
      ref={ref}
      className={`relative group ${className}`}
      style={style}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        mx.set(-9999);
        my.set(-9999);
      }}
    >
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background, borderRadius: (style?.borderRadius as number) ?? RADIUS }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/* ── Hover lift ───────────────────────────────────────────────────────────── */

export function Lift({
  children,
  className,
  y = -6,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Parallax on scroll ───────────────────────────────────────────────────── */

export function Parallax({
  children,
  distance = 60,
  className,
}: {
  children: ReactNode;
  /** Pixels travelled across the element's full scroll pass. */
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y }}>{children}</motion.div>
    </div>
  );
}

/* ── Floating object ──────────────────────────────────────────────────────── */

export function Floating({
  children,
  amplitude = 10,
  duration = 6,
  delay = 0,
  className,
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [-amplitude, amplitude, -amplitude] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/* ── Pointer parallax — tilts content toward the cursor ───────────────────── */

export function PointerTilt({
  children,
  intensity = 12,
  className,
}: {
  children: ReactNode;
  /** Max rotation in degrees. */
  intensity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [intensity, -intensity]), {
    stiffness: 150,
    damping: 20,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-intensity, intensity]), {
    stiffness: 150,
    damping: 20,
  });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 1000 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
