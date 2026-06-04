"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  MapPin,
  Star,
  BedDouble,
  Users,
  IndianRupee,
  Wifi,
  Tv,
  Wind,
  Zap,
  ParkingCircle,
  Shirt,
  Building,
  PowerOff,
  Phone,
  Mail,
  MessageSquare,
  UtensilsCrossed,
  ShieldCheck,
  Home as HomeIcon,
  Download,
  Smartphone,
  ChevronLeft,
  AppWindow,
  Heart,
  Share2,
  Camera,
  BadgeCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import PgCard from "@/components/pg-card";
import type { PG, SiteConfig, User } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { getSiteData } from "@/lib/actions/siteActions";

// ─── Icon maps ────────────────────────────────────────────────────────────────

const amenityIcons: { [key: string]: React.ReactNode } = {
  wifi: <Wifi className="w-5 h-5" />,
  ac: <Wind className="w-5 h-5" />,
  "power-backup": <Zap className="w-5 h-5" />,
  tv: <Tv className="w-5 h-5" />,
  laundry: <Shirt className="w-5 h-5" />,
  food: <UtensilsCrossed className="w-5 h-5" />,
  parking: <ParkingCircle className="w-5 h-5" />,
};

const amenityDetails: {
  [key: string]: { icon: React.ElementType; label: string };
} = {
  wifi: { icon: Wifi, label: "Wi-Fi" },
  ac: { icon: Wind, label: "AC" },
  "power-backup": { icon: Zap, label: "Power Backup" },
  tv: { icon: Tv, label: "TV" },
  laundry: { icon: Shirt, label: "Laundry" },
  food: { icon: UtensilsCrossed, label: "Food" },
  parking: { icon: ParkingCircle, label: "Parking" },
  security: { icon: ShieldCheck, label: "Security" },
};

// ─── Default data ─────────────────────────────────────────────────────────────

const defaultFeatureCards = [
  {
    icon: <BedDouble />,
    title: "Clean Rooms",
    description: "Regular housekeeping ensures a spotless living environment.",
  },
  {
    icon: <UtensilsCrossed />,
    title: "Hygienic Food",
    description: "Delicious and healthy meals prepared daily.",
  },
  {
    icon: <Wifi />,
    title: "High-Speed WiFi",
    description: "Stay connected with our reliable, high-speed internet.",
  },
  {
    icon: <ShieldCheck />,
    title: "24/7 Security",
    description: "Your safety is our priority with CCTV and security staff.",
  },
  {
    icon: <Zap />,
    title: "Power Backup",
    description: "Uninterrupted power supply for your comfort and convenience.",
  },
  {
    icon: <Shirt />,
    title: "Laundry Support",
    description: "On-site laundry facilities to make your life easier.",
  },
  {
    icon: <IndianRupee />,
    title: "Digital Payments",
    description: "Pay rent and get receipts online through our tenant app.",
  },
  {
    icon: <Smartphone />,
    title: "Tenant App",
    description:
      "Manage complaints, get notices, and more, right from your phone.",
  },
];

const defaultFaqs = [
  {
    q: "Can I vacate anytime?",
    a: "Yes, you can vacate anytime by providing a notice as per the rental agreement, typically 30 days. You can initiate the process directly from the tenant app.",
  },
  {
    q: "How do I request room cleaning?",
    a: "You can raise a maintenance or cleaning request through the complaints section in the tenant app. Our team will address it promptly.",
  },
  {
    q: "What is the security deposit refund process?",
    a: "The security deposit is fully refundable after your notice period ends, provided there are no damages to the property. It is processed within 7-10 working days.",
  },
  {
    q: "How do I report issues?",
    a: "The best way is to use the 'Complaints' feature in the tenant app. This ensures your issue is logged and tracked until resolved.",
  },
];

const defaultTestimonials = [
  {
    quote:
      "Clean rooms, fast WiFi, and amazing food. Plus, I can manage everything on the app!",
    author: "Akash, Resident",
  },
  {
    quote:
      "Much better than other PGs I stayed in. Support team is responsive and issues are fixed quickly.",
    author: "Priya, Working Professional",
  },
];

// ─── Global styles injection ──────────────────────────────────────────────────

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  * { -webkit-tap-highlight-color: transparent; }

  .spg-root {
    --sand: #F5EFE0;
    --sand-deep: #EDE4CF;
    --ink: #1A1208;
    --ink-soft: #3D3020;
    --ink-muted: #7A6B52;
    --ink-faint: #B8A98E;
    --ember: #E8470A;
    --ember-dark: #C93D08;
    --jade: #1A8C6E;
    --jade-light: rgba(26,140,110,0.12);
    --gold: #C8922A;
    --gold-light: rgba(200,146,42,0.12);
    --card-bg: rgba(255,252,245,0.85);
    --card-border: rgba(180,160,120,0.2);
    font-family: 'DM Sans', sans-serif;
    background: var(--sand);
    color: var(--ink);
  }

  .spg-root .font-display { font-family: 'Syne', sans-serif; }

  .spg-root .grain-overlay::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 9999;
  }

  .spg-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .spg-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 14px;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.01em;
    background: var(--ember);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    box-shadow: 0 4px 24px rgba(232,71,10,0.28), 0 1px 3px rgba(0,0,0,0.1);
    -webkit-font-smoothing: antialiased;
  }
  .spg-btn-primary:hover { background: var(--ember-dark); transform: translateY(-1px); box-shadow: 0 8px 32px rgba(232,71,10,0.35); }
  .spg-btn-primary:active { transform: scale(0.97); }

  .spg-btn-whatsapp {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 14px;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    background: #25D366;
    color: #fff;
    text-decoration: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 4px 20px rgba(37,211,102,0.25);
    -webkit-font-smoothing: antialiased;
  }
  .spg-btn-whatsapp:active { transform: scale(0.97); }

  .spg-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .spg-amenity-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 10px;
    border-radius: 16px;
    background: rgba(255,252,245,0.9);
    border: 1px solid rgba(180,160,120,0.18);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .spg-amenity-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.06); }

  .spg-review-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 18px;
    padding: 18px;
    position: relative;
    overflow: hidden;
  }
  .spg-review-card::before {
    content: '"';
    position: absolute;
    top: -8px;
    left: 16px;
    font-size: 80px;
    font-family: 'Syne', sans-serif;
    color: var(--ember);
    opacity: 0.12;
    line-height: 1;
    pointer-events: none;
  }

  /* Multi PG styles */
  .mpg-root {
    font-family: 'DM Sans', sans-serif;
    background: var(--sand);
    color: var(--ink);
  }

  .mpg-hero-bg {
    background: var(--ink);
    position: relative;
    overflow: hidden;
  }
  .mpg-hero-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232,71,10,0.18) 0%, transparent 70%),
                radial-gradient(ellipse 60% 80% at 80% 100%, rgba(200,146,42,0.12) 0%, transparent 60%);
    pointer-events: none;
  }
  .mpg-hero-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    pointer-events: none;
  }

  .mpg-section-label {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ember);
  }

  .mpg-feature-card {
    padding: 28px 24px;
    border-radius: 20px;
    background: rgba(255,252,245,0.7);
    border: 1px solid rgba(180,160,120,0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .mpg-feature-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.07); }

  .mpg-stat-number {
    font-family: 'Syne', sans-serif;
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, var(--ember), var(--gold));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .mpg-cta-section {
    background: var(--ink);
    position: relative;
    overflow: hidden;
  }
  .mpg-cta-section::before {
    content: '';
    position: absolute;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(232,71,10,0.2) 0%, transparent 70%);
    top: -200px; right: -200px;
    pointer-events: none;
  }

  .mpg-testimonial-card {
    background: rgba(255,252,245,0.7);
    border: 1px solid rgba(180,160,120,0.15);
    border-radius: 20px;
    padding: 28px;
    position: relative;
    overflow: hidden;
  }
  .mpg-testimonial-card::after {
    content: '"';
    position: absolute;
    top: 12px; right: 20px;
    font-family: 'Syne', sans-serif;
    font-size: 72px;
    line-height: 1;
    color: var(--ember);
    opacity: 0.08;
    pointer-events: none;
  }

  .sticky-cta-bar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 50;
    padding: 12px 16px 20px;
    background: linear-gradient(to top, var(--sand) 80%, transparent);
  }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fsu { animation: fadeSlideUp 0.5s ease forwards; }
  .anim-delay-1 { animation-delay: 0.1s; }
  .anim-delay-2 { animation-delay: 0.2s; }
  .anim-delay-3 { animation-delay: 0.3s; }

  /* Nav scroll effect handled inline */
  .spg-topnav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.3s ease, backdrop-filter 0.3s ease, box-shadow 0.3s ease;
  }
  .spg-topnav.scrolled {
    background: rgba(245,239,224,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 1px 0 rgba(180,160,120,0.2);
  }

  /* Progress bar image gallery */
  .img-dot {
    height: 3px;
    border-radius: 99px;
    background: rgba(255,255,255,0.35);
    transition: all 0.3s ease;
    flex: 1;
  }
  .img-dot.active {
    background: #fff;
    flex: 2.5;
  }

  /* Desktop nav inner constraint */
  @media (min-width: 1024px) {
    .spg-topnav-inner {
      max-width: 672px; /* 2xl = 672px */
      margin: 0 auto;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mpg-section-inner { max-width: 1152px; margin: 0 auto; }
  }

  /* Accordion custom */
  .spg-root [data-state="open"] .accordion-icon { transform: rotate(45deg); }
  .accordion-icon { transition: transform 0.25s ease; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2: PROPERTY DETAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────

const SinglePgView = ({
  pg,
  owner,
  siteConfig,
  subdomain,
  websiteStyle,
}: {
  pg: PG;
  owner: User | null;
  siteConfig: SiteConfig;
  subdomain: string;
  websiteStyle: string;
}) => {
  const [currentImg, setCurrentImg] = useState(0);
  const [hearted, setHearted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const images =
    pg.images.length > 0
      ? pg.images
      : ["https://picsum.photos/seed/pg-detail/800/500"];
  const availableBeds = pg.totalBeds - pg.occupancy;

  const whatsappUrl = (msg: string) =>
    `https://wa.me/${siteConfig.contactPhone || pg.contact || ""}?text=${encodeURIComponent(msg)}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const genderLabel =
    pg.gender === "male"
      ? "Boys Only"
      : pg.gender === "female"
        ? "Girls Only"
        : "Co-ed";

  return (
    <div
      className="spg-root grain-overlay min-h-screen pb-32"
      style={{ background: "var(--sand)" }}
    >
      {/* ─── TOP NAV ─────────────────────────── */}
      <nav
        className={`spg-topnav ${scrolled ? "scrolled" : ""}`}
        style={{ maxWidth: "100%" }}
      >
        <div className="spg-topnav-inner w-full flex items-center justify-between">
          <Link
            href={`/site/${subdomain}`}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{
              background: scrolled
                ? "rgba(180,160,120,0.15)"
                : "rgba(0,0,0,0.32)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ChevronLeft
              className="w-5 h-5"
              style={{ color: scrolled ? "var(--ink)" : "#fff" }}
            />
          </Link>

          <span
            className="font-display font-bold text-sm tracking-tight transition-opacity"
            style={{ color: "var(--ink)", opacity: scrolled ? 1 : 0 }}
          >
            {pg.name}
          </span>

          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                background: scrolled
                  ? "rgba(180,160,120,0.15)"
                  : "rgba(0,0,0,0.32)",
                backdropFilter: "blur(8px)",
              }}
              onClick={() =>
                navigator.share
                  ? navigator.share({
                      title: pg.name,
                      url: window.location.href,
                    })
                  : navigator.clipboard.writeText(window.location.href)
              }
            >
              <Share2
                className="w-4 h-4"
                style={{ color: scrolled ? "var(--ink)" : "#fff" }}
              />
            </button>
          </div>
        </div>
      </nav>
      <div className="lg:max-w-2xl lg:mx-auto">
        {/* ─── IMAGE GALLERY ───────────────────── */}
        <div
          className="relative"
          style={{
            height: "100svh",
            maxHeight: 480,
            background: "#2A1F10",
            overflow: "hidden",
          }}
        >
          <Image
            src={images[currentImg]}
            alt={pg.name}
            fill
            className="object-cover"
            style={{ transition: "opacity 0.4s ease" }}
            priority
          />

          {/* gradient layers */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 35%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          {/* heart */}
          <button
            onClick={() => setHearted(!hearted)}
            className="absolute top-16 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(12px)",
              border: hearted
                ? "1.5px solid rgba(232,71,10,0.8)"
                : "1.5px solid rgba(255,255,255,0.3)",
            }}
          >
            <Heart
              className="w-5 h-5"
              style={{
                color: hearted ? "#E8470A" : "#fff",
                fill: hearted ? "#E8470A" : "none",
                transition: "all 0.2s ease",
              }}
            />
          </button>

          {/* arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrentImg((p) => (p - 1 + images.length) % images.length)
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setCurrentImg((p) => (p + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </>
          )}

          {/* dot progress bar */}
          {images.length > 1 && (
            <div className="absolute bottom-5 left-4 right-4 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImg(i)}
                  className={`img-dot ${i === currentImg ? "active" : ""}`}
                />
              ))}
            </div>
          )}

          {/* photo counter */}
          <div
            className="absolute bottom-5 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            <Camera className="w-3 h-3" />
            {currentImg + 1}/{images.length}
          </div>
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div
            className="flex gap-2 px-4 py-3 overflow-x-auto"
            style={{ background: "rgba(26,18,8,0.06)" }}
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImg(i)}
                className="shrink-0 rounded-xl overflow-hidden transition-all"
                style={{
                  width: 56,
                  height: 44,
                  border:
                    i === currentImg
                      ? "2.5px solid var(--ember)"
                      : "2.5px solid transparent",
                  opacity: i === currentImg ? 1 : 0.5,
                  transform: i === currentImg ? "scale(1.05)" : "scale(1)",
                }}
              >
                <Image
                  src={img}
                  alt="thumb"
                  width={56}
                  height={44}
                  className="object-cover w-full h-full"
                />
              </button>
            ))}
          </div>
        )}

        {/* ─── HERO INFO BLOCK ─────────────────── */}
        <div className="px-4 pt-5">
          {/* Gender badge */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="spg-pill"
              style={{
                background: "var(--gold-light)",
                color: "var(--gold)",
                border: "1px solid rgba(200,146,42,0.25)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              {genderLabel}
            </span>
            <span
              className="spg-pill"
              style={{
                background:
                  availableBeds > 0
                    ? "var(--jade-light)"
                    : "rgba(232,71,10,0.1)",
                color: availableBeds > 0 ? "var(--jade)" : "var(--ember)",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "currentColor" }}
              />
              {availableBeds > 0
                ? `${availableBeds} beds free`
                : "Fully booked"}
            </span>
          </div>

          <h1
            className="font-display text-3xl font-extrabold leading-tight mb-2 animate-fsu"
            style={{ color: "var(--ink)" }}
          >
            {pg.name}
          </h1>

          <div className="flex items-center gap-3 mb-4 animate-fsu anim-delay-1">
            <div className="flex items-center gap-1">
              <MapPin
                className="w-3.5 h-3.5"
                style={{ color: "var(--ember)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--ink-muted)" }}
              >
                {pg.location}
              </span>
            </div>
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: "var(--ink-faint)" }}
            />
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--ink)" }}
              >
                {pg.rating || "4.9"}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                · {(siteConfig.testimonials?.length || 0) + 127} reviews
              </span>
            </div>
          </div>

          {/* Price card */}
          <div
            className="spg-card p-4 mb-1 animate-fsu anim-delay-2"
            style={{ background: "var(--ink)", borderColor: "transparent" }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div
                  className="text-xs font-semibold mb-1"
                  style={{
                    color: "rgba(245,239,224,0.45)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Starting from
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-display text-4xl font-extrabold"
                    style={{ color: "#F5EFE0" }}
                  >
                    ₹{pg.priceRange.min.toLocaleString("en-IN")}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "rgba(245,239,224,0.5)" }}
                  >
                    /month
                  </span>
                </div>
              </div>
              {pg.priceRange.max > pg.priceRange.min && (
                <div className="text-right">
                  <div
                    className="text-xs mb-1"
                    style={{ color: "rgba(245,239,224,0.45)" }}
                  >
                    Up to
                  </div>
                  <div
                    className="font-display text-lg font-bold"
                    style={{ color: "rgba(245,239,224,0.7)" }}
                  >
                    ₹{pg.priceRange.max.toLocaleString("en-IN")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── QUICK STATS ─────────────────────── */}
        <div className="grid grid-cols-3 gap-3 px-4 mt-4">
          {[
            {
              label: "Total Beds",
              value: pg.totalBeds,
              icon: BedDouble,
              accent: false,
            },
            {
              label: "Occupied",
              value: pg.occupancy,
              icon: Users,
              accent: false,
            },
            {
              label: "Available",
              value: availableBeds,
              icon: CheckCircle,
              accent: true,
            },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="spg-card p-4 flex flex-col items-center gap-1.5"
              style={{
                borderColor: accent
                  ? "rgba(26,140,110,0.25)"
                  : "var(--card-border)",
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: accent ? "var(--jade)" : "var(--ink-faint)" }}
              />
              <span
                className="font-display text-2xl font-extrabold"
                style={{ color: accent ? "var(--jade)" : "var(--ink)" }}
              >
                {value}
              </span>
              <span
                className="text-xs font-medium text-center"
                style={{ color: "var(--ink-muted)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ─── AMENITIES ───────────────────────── */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-display text-lg font-bold"
              style={{ color: "var(--ink)" }}
            >
              Amenities
            </h2>
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--ink-faint)" }}
            >
              {pg.amenities.length + 1} included
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {pg.amenities.map((amenity) => {
              const detail = amenityDetails[amenity] || {
                icon: Star,
                label: amenity,
              };
              const IconComp = detail.icon;
              return (
                <div key={amenity} className="spg-amenity-chip">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(232,71,10,0.1)" }}
                  >
                    <IconComp
                      className="w-4.5 h-4.5"
                      style={{ color: "var(--ember)" }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium text-center leading-tight"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {detail.label}
                  </span>
                </div>
              );
            })}
            {!pg.amenities.includes("security" as any) && (
              <div className="spg-amenity-chip">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(232,71,10,0.1)" }}
                >
                  <ShieldCheck
                    className="w-4.5 h-4.5"
                    style={{ color: "var(--ember)" }}
                  />
                </div>
                <span
                  className="text-xs font-medium text-center leading-tight"
                  style={{ color: "var(--ink-soft)" }}
                >
                  Security
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── HOUSE RULES ─────────────────────── */}
        {pg.rules.length > 0 && (
          <div className="px-4 mt-6">
            <h2
              className="font-display text-lg font-bold mb-4"
              style={{ color: "var(--ink)" }}
            >
              House Rules
            </h2>
            <div
              className="spg-card p-5"
              style={{ background: "rgba(255,252,245,0.7)" }}
            >
              <ul className="space-y-3">
                {pg.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: "var(--jade-light)" }}
                    >
                      <CheckCircle
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--jade)" }}
                      />
                    </div>
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ─── HOSTED BY ───────────────────────── */}
        <div className="px-4 mt-6">
          <h2
            className="font-display text-lg font-bold mb-4"
            style={{ color: "var(--ink)" }}
          >
            Hosted By
          </h2>
          <div className="spg-card p-5">
            <div className="flex items-center gap-4 mb-5">
              {owner?.avatarUrl ? (
                <Image
                  src={owner.avatarUrl}
                  alt={owner.name}
                  width={56}
                  height={56}
                  className="rounded-full object-cover"
                  style={{ border: "3px solid var(--sand-deep)" }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold font-display"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--ember), var(--gold))",
                    color: "#fff",
                  }}
                >
                  {(owner?.name || siteConfig.siteTitle)
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="font-display font-bold text-base"
                    style={{ color: "var(--ink)" }}
                  >
                    {owner?.name || siteConfig.siteTitle}
                  </span>
                  <span
                    className="spg-pill"
                    style={{
                      background: "var(--jade-light)",
                      color: "var(--jade)",
                      border: "1px solid rgba(26,140,110,0.2)",
                      fontSize: "10px",
                    }}
                  >
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--ink-muted)" }}
                >
                  98% response rate · Usually replies within 1 hour
                </p>
              </div>
            </div>
            {(siteConfig.contactPhone || pg.contact) && (
              <a
                href={whatsappUrl(
                  `Hi, I'm interested in ${pg.name}. Could you please share more details?`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="spg-btn-whatsapp w-full"
              >
                <MessageSquare className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* ─── REVIEWS ─────────────────────────── */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-display text-lg font-bold flex items-center gap-2"
              style={{ color: "var(--ink)" }}
            >
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              {pg.rating || "4.9"} · Reviews
            </h2>
            <button
              className="text-xs font-bold flex items-center gap-1"
              style={{ color: "var(--ember)" }}
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {(siteConfig.testimonials && siteConfig.testimonials.length > 0
              ? siteConfig.testimonials
              : defaultTestimonials
            )
              .slice(0, 2)
              .map((t, i) => (
                <div key={i} className="spg-review-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-display shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--ember), var(--gold))",
                        color: "#fff",
                      }}
                    >
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--ink)" }}
                      >
                        {t.author}
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className="w-3 h-3 fill-yellow-500 text-yellow-500"
                          />
                        ))}
                      </div>
                    </div>
                    <span
                      className="ml-auto spg-pill"
                      style={{
                        background: "var(--jade-light)",
                        color: "var(--jade)",
                        border: "1px solid rgba(26,140,110,0.2)",
                        fontSize: "10px",
                      }}
                    >
                      Verified
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    "{t.quote}"
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* ─── FAQ ─────────────────────────────── */}
        <div className="px-4 mt-6 mb-4">
          <h2
            className="font-display text-lg font-bold mb-4"
            style={{ color: "var(--ink)" }}
          >
            FAQs
          </h2>
          <div
            className="spg-card overflow-hidden divide-y"
            style={{ divideColor: "var(--card-border)" }}
          >
            <Accordion type="single" collapsible>
              {(siteConfig.faqs && siteConfig.faqs.length > 0
                ? siteConfig.faqs
                : defaultFaqs
              ).map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-none"
                  style={{
                    borderBottom:
                      i < (siteConfig.faqs?.length || defaultFaqs.length) - 1
                        ? "1px solid rgba(180,160,120,0.15)"
                        : "none",
                  }}
                >
                  <AccordionTrigger
                    className="px-5 py-4 text-sm font-semibold text-left hover:no-underline font-display"
                    style={{ color: "var(--ink)" }}
                  >
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent
                    className="px-5 pb-4 text-sm leading-relaxed"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
      {/* end lg:max-w-2xl wrapper */}

      {/* ─── DESKTOP SIDEBAR ─────────────────── */}
      <div
        className="hidden lg:block fixed top-20 z-40"
        style={{ left: "calc(50% + 336px + 24px)", width: 296 }}
      >
        <div
          className="spg-card p-6"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.12)" }}
        >
          <div className="flex items-baseline gap-1 mb-5">
            <span
              className="font-display text-3xl font-extrabold"
              style={{ color: "var(--ink)" }}
            >
              ₹{pg.priceRange.min.toLocaleString("en-IN")}
            </span>
            <span className="text-sm" style={{ color: "var(--ink-faint)" }}>
              /month
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              {
                l: "Gender",
                v: pg.gender.charAt(0).toUpperCase() + pg.gender.slice(1),
              },
              { l: "Available", v: `${availableBeds} Beds` },
            ].map(({ l, v }) => (
              <div
                key={l}
                className="rounded-xl p-3"
                style={{ background: "rgba(180,160,120,0.1)" }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-1"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {l}
                </div>
                <div
                  className="text-sm font-bold font-display"
                  style={{ color: "var(--ink)" }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div
            className="rounded-xl p-3 mb-5"
            style={{ background: "rgba(180,160,120,0.1)" }}
          >
            <div
              className="text-xs font-bold uppercase tracking-wide mb-1"
              style={{ color: "var(--ink-faint)" }}
            >
              Location
            </div>
            <div
              className="text-sm font-bold font-display truncate"
              style={{ color: "var(--ink)" }}
            >
              {pg.location}
            </div>
          </div>
          {siteConfig.contactPhone || pg.contact ? (
            <a
              href={whatsappUrl(
                `Hi, I'm interested in "${pg.name}" listed on your site.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="spg-btn-primary w-full"
            >
              Inquire Now <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <button
              disabled
              className="w-full py-4 rounded-xl font-bold text-sm opacity-40 cursor-not-allowed font-display"
              style={{
                background: "rgba(180,160,120,0.2)",
                color: "var(--ink-muted)",
              }}
            >
              Contact Unavailable
            </button>
          )}
          <p
            className="text-center text-xs mt-3"
            style={{ color: "var(--ink-faint)" }}
          >
            No charges until you move in
          </p>
        </div>
      </div>

      {/* ─── STICKY BOTTOM CTA (mobile only) ──── */}
      <div className="lg:hidden sticky-cta-bar">
        <div
          className="spg-card p-3 flex items-center gap-3"
          style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.08)" }}
        >
          <div className="flex-1 min-w-0">
            <div
              className="font-display text-xl font-extrabold"
              style={{ color: "var(--ink)" }}
            >
              ₹{pg.priceRange.min.toLocaleString("en-IN")}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: "var(--ink-muted)" }}
            >
              per month · {availableBeds} beds free
            </div>
          </div>
          {siteConfig.contactPhone || pg.contact ? (
            <a
              href={whatsappUrl(
                `Hi, I'm interested in "${pg.name}". Please share availability.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button
                className="spg-btn-primary"
                style={{ padding: "12px 24px", borderRadius: "12px" }}
              >
                Inquire Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </a>
          ) : (
            <button
              disabled
              className="px-6 py-3 rounded-xl font-bold text-sm opacity-40 cursor-not-allowed font-display"
              style={{
                background: "rgba(180,160,120,0.2)",
                color: "var(--ink-muted)",
              }}
            >
              Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MULTI PG HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

const MultiPgView = ({
  pgs,
  siteConfig,
  owner,
  websiteStyle,
}: {
  pgs: PG[];
  siteConfig: SiteConfig;
  owner: User | null;
  websiteStyle: string;
}) => {
  return (
    <div className="mpg-root w-full" style={{ background: "var(--sand)" }}>
      {/* ─── HERO ────────────────────────────── */}
      <section className="mpg-hero-bg min-h-[100svh] flex flex-col justify-end pb-14 px-5 pt-24 md:pt-36 md:pb-24 relative">
        <div className="max-w-4xl mx-auto w-full relative z-10">
          {siteConfig.logoUrl && (
            <div className="mb-6">
              <Image
                src={siteConfig.logoUrl}
                alt={siteConfig.siteTitle}
                width={64}
                height={64}
                className="object-contain rounded-2xl"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
          )}

          <div className="mpg-section-label mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Premium PG Living
          </div>

          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[0.95] tracking-tight mb-6"
            style={{ color: "#F5EFE0" }}
          >
            {siteConfig.heroHeadline || siteConfig.siteTitle}
          </h1>

          <p
            className="text-lg md:text-xl font-light mb-10 max-w-lg"
            style={{ color: "rgba(245,239,224,0.6)", lineHeight: 1.65 }}
          >
            {siteConfig.heroSubtext || "Comfortable & Hassle-Free Living."}
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="#properties">
              <button
                className="spg-btn-primary"
                style={{
                  padding: "16px 32px",
                  fontSize: "16px",
                  borderRadius: "16px",
                }}
              >
                Explore Properties
                <ArrowRight className="w-4 h-4" />
              </button>
            </a>
            <Link href="/login">
              <button
                className="font-display font-bold text-base px-8 py-4 rounded-2xl transition-all"
                style={{
                  background: "rgba(245,239,224,0.08)",
                  color: "#F5EFE0",
                  border: "1.5px solid rgba(245,239,224,0.2)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Tenant Login
              </button>
            </Link>
          </div>

          {/* Social proof strip */}
          <div className="flex items-center gap-3 mt-10">
            <div className="flex -space-x-2">
              {["A", "K", "P", "R"].map((l, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center font-display"
                  style={{
                    background: `hsl(${20 + i * 15},70%,45%)`,
                    color: "#fff",
                    border: "2px solid rgba(31,18,10,0.6)",
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 mb-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="w-3 h-3 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p
                className="text-xs font-medium"
                style={{ color: "rgba(245,239,224,0.5)" }}
              >
                Trusted by 500+ residents
              </p>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <div
            className="w-px h-8"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(245,239,224,0.5))",
            }}
          />
          <span
            className="text-xs font-medium tracking-widest"
            style={{ color: "rgba(245,239,224,0.5)", fontSize: "10px" }}
          >
            SCROLL
          </span>
        </div>
      </section>

      {/* ─── PROPERTIES ──────────────────────── */}
      <section
        id="properties"
        className="py-20 md:py-28 px-4"
        style={{ background: "var(--sand)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <div className="mpg-section-label mb-3">Available Now</div>
              <h2
                className="font-display text-4xl md:text-5xl font-extrabold tracking-tight"
                style={{ color: "var(--ink)" }}
              >
                Our Properties
              </h2>
            </div>
            <p
              className="text-base md:text-lg font-medium md:text-right max-w-xs"
              style={{ color: "var(--ink-muted)", lineHeight: 1.6 }}
            >
              Find the perfect room that matches your style and budget.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {pgs.map((pg) => (
              <PgCard key={pg.id} pg={pg} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT + STATS ───────────────────── */}
      <section
        className="py-20 md:py-28 px-4"
        style={{ background: "rgba(26,18,8,0.04)" }}
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="relative">
            <div
              className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl"
              style={{
                background: "#2A1F10",
                boxShadow: "0 30px 80px rgba(26,18,8,0.15)",
              }}
            >
              <Image
                src="https://picsum.photos/seed/sutrasite/800/1000"
                fill
                alt="Living space"
                className="object-cover opacity-90"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(26,18,8,0.4) 0%, transparent 50%)",
                }}
              />
            </div>
            {/* floating stat card */}
            <div
              className="absolute -bottom-6 -right-4 spg-card px-5 py-4"
              style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.12)" }}
            >
              <div className="mpg-stat-number" style={{ fontSize: "32px" }}>
                {pgs.length}+
              </div>
              <div
                className="text-sm font-semibold mt-0.5"
                style={{ color: "var(--ink-muted)" }}
              >
                Properties
              </div>
            </div>
          </div>
          <div>
            <div className="mpg-section-label mb-4">Our Story</div>
            <h2
              className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6"
              style={{ color: "var(--ink)" }}
            >
              {siteConfig.aboutTitle || "A Better Way to Live"}
            </h2>
            <p
              className="text-base md:text-lg leading-relaxed mb-8"
              style={{ color: "var(--ink-muted)" }}
            >
              {siteConfig.aboutDescription ||
                `We're a trusted PG management company with properties across ${pgs[0]?.city || "the city"}. Our mission is to simplify shared living with modern amenities and app-based management.`}
            </p>
            <div
              className="grid grid-cols-3 gap-6 pt-8"
              style={{ borderTop: "1px solid rgba(180,160,120,0.2)" }}
            >
              {[
                { num: `${pgs.length}+`, label: "Properties" },
                { num: "24/7", label: "Support" },
                { num: "500+", label: "Residents" },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div className="mpg-stat-number">{num}</div>
                  <div
                    className="text-sm font-semibold mt-1"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────── */}
      <section
        id="features"
        className="py-20 md:py-28 px-4"
        style={{ background: "var(--sand)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="mpg-section-label mb-4 flex justify-center items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Why Choose Us
            </div>
            <h2
              className="font-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
              style={{ color: "var(--ink)" }}
            >
              {siteConfig.featuresTitle || "Everything You Need"}
            </h2>
            <p
              className="text-base md:text-lg font-medium max-w-xl mx-auto"
              style={{ color: "var(--ink-muted)", lineHeight: 1.65 }}
            >
              {siteConfig.featuresDescription ||
                "We provide top-notch facilities to ensure a comfortable and hassle-free stay."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(siteConfig.features && siteConfig.features.length > 0
              ? siteConfig.features
              : defaultFeatureCards
            ).map((feature, index) => (
              <div key={index} className="mpg-feature-card group">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--ember), var(--gold))",
                  }}
                >
                  {React.cloneElement(feature.icon as React.ReactElement, {
                    className: "w-5 h-5 stroke-[1.5]",
                    style: { color: "#fff" },
                  })}
                </div>
                <h3
                  className="font-display font-bold text-base mb-2"
                  style={{ color: "var(--ink)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────── */}
      <section
        className="py-20 md:py-28 px-4"
        style={{ background: "rgba(26,18,8,0.04)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="mpg-section-label mb-4 flex justify-center items-center gap-2">
              <Heart className="w-3.5 h-3.5" />
              Resident Stories
            </div>
            <h2
              className="font-display text-4xl md:text-5xl font-extrabold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              What Residents Say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {(siteConfig.testimonials && siteConfig.testimonials.length > 0
              ? siteConfig.testimonials
              : defaultTestimonials
            ).map((testimonial, index) => (
              <div key={index} className="mpg-testimonial-card">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
                <p
                  className="text-base md:text-lg font-medium leading-relaxed mb-6"
                  style={{ color: "var(--ink)", lineHeight: 1.65 }}
                >
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center font-display shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--ember), var(--gold))",
                      color: "#fff",
                    }}
                  >
                    {testimonial.author.charAt(0)}
                  </div>
                  <span
                    className="font-semibold text-sm"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {testimonial.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────── */}
      <section
        className="py-20 md:py-28 px-4"
        style={{ background: "var(--sand)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <div className="mpg-section-label mb-4 flex justify-center items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Got Questions?
            </div>
            <h2
              className="font-display text-4xl md:text-5xl font-extrabold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Frequently Asked
            </h2>
          </div>
          <div
            className="spg-card overflow-hidden divide-y"
            style={{ divideColor: "rgba(180,160,120,0.15)" }}
          >
            <Accordion type="single" collapsible>
              {(siteConfig.faqs && siteConfig.faqs.length > 0
                ? siteConfig.faqs
                : defaultFaqs
              ).map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-none"
                  style={{ borderBottom: "1px solid rgba(180,160,120,0.12)" }}
                >
                  <AccordionTrigger
                    className="px-6 py-5 text-base font-bold hover:no-underline text-left font-display"
                    style={{ color: "var(--ink)" }}
                  >
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent
                    className="px-6 pb-5 text-sm leading-relaxed"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ──────────────────────── */}
      <section className="mpg-cta-section py-24 md:py-32 px-5">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div
            className="mpg-section-label mb-5 text-center"
            style={{ color: "var(--ember)" }}
          >
            Limited Spots Available
          </div>
          <h2
            className="font-display text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-5"
            style={{ color: "#F5EFE0" }}
          >
            Ready to move in?
          </h2>
          <p
            className="text-lg font-light mb-10 max-w-md mx-auto"
            style={{ color: "rgba(245,239,224,0.55)", lineHeight: 1.7 }}
          >
            Schedule a visit and see why our residents love calling this place
            home.
          </p>
          <a
            href={`https://wa.me/${siteConfig.contactPhone || owner?.phone}?text=Hi, I'm interested in your properties.`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button
              className="spg-btn-primary"
              style={{
                fontSize: "16px",
                padding: "16px 36px",
                borderRadius: "16px",
              }}
            >
              <MessageSquare className="w-5 h-5" />
              Chat on WhatsApp
            </button>
          </a>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────── */}
      <footer
        className="px-5 pt-16 pb-10"
        style={{
          background: "rgba(26,18,8,0.98)",
          borderTop: "1px solid rgba(180,160,120,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2 space-y-4">
              {siteConfig.logoUrl ? (
                <Image
                  src={siteConfig.logoUrl}
                  alt="Logo"
                  width={48}
                  height={48}
                  className="object-contain rounded-xl"
                />
              ) : (
                <h3
                  className="font-display font-extrabold text-2xl"
                  style={{ color: "#F5EFE0" }}
                >
                  {siteConfig.siteTitle}
                </h3>
              )}
              <p
                className="text-sm leading-relaxed max-w-xs"
                style={{ color: "rgba(245,239,224,0.4)" }}
              >
                Providing high-quality, safe, and comfortable shared living
                experiences. Make yourself at home.
              </p>
            </div>
            <div className="space-y-4">
              <h3
                className="font-display font-bold text-sm"
                style={{
                  color: "rgba(245,239,224,0.6)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Contact
              </h3>
              <ul className="space-y-3">
                {(siteConfig.contactPhone || owner?.phone) && (
                  <li className="flex items-center gap-3">
                    <Phone
                      className="w-4 h-4 shrink-0"
                      style={{ color: "var(--ember)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "rgba(245,239,224,0.5)" }}
                    >
                      {siteConfig.contactPhone || owner?.phone}
                    </span>
                  </li>
                )}
                {(siteConfig.contactEmail || owner?.email) && (
                  <li className="flex items-center gap-3">
                    <Mail
                      className="w-4 h-4 shrink-0"
                      style={{ color: "var(--ember)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "rgba(245,239,224,0.5)" }}
                    >
                      {siteConfig.contactEmail || owner?.email}
                    </span>
                  </li>
                )}
              </ul>
            </div>
            <div className="space-y-4">
              <h3
                className="font-display font-bold text-sm"
                style={{
                  color: "rgba(245,239,224,0.6)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Powered By
              </h3>
              <a
                href="https://rentsutra.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-display font-bold text-base block"
                style={{ color: "#F5EFE0" }}
              >
                RentSutra App
              </a>
              <p
                className="text-sm"
                style={{ color: "rgba(245,239,224,0.35)" }}
              >
                The Modern OS for PG Owners.
              </p>
            </div>
          </div>
          <div
            className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8"
            style={{ borderTop: "1px solid rgba(180,160,120,0.1)" }}
          >
            <p className="text-xs" style={{ color: "rgba(245,239,224,0.25)" }}>
              &copy; {new Date().getFullYear()} {siteConfig.siteTitle}. All
              rights reserved.
            </p>
            <div className="flex gap-6">
              {["Privacy", "Terms", "Sitemap"].map((item) => (
                <span
                  key={item}
                  className="text-xs cursor-pointer transition-colors hover:text-opacity-70"
                  style={{ color: "rgba(245,239,224,0.3)" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

type SitePageClientProps = {
  initialData: Awaited<ReturnType<typeof getSiteData>>;
  subdomain: string;
};

export default function SitePageClient({
  initialData,
  subdomain,
}: SitePageClientProps) {
  const searchParams = useSearchParams();
  const pgIdToShow = searchParams.get("pgId");
  const { pgs, siteConfig, owner, status } = initialData!;

  if (status === "suspended" && searchParams.get("preview") !== "true") {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center text-center p-4"
        style={{ background: "#F5EFE0" }}
      >
        <PowerOff
          className="mb-4 h-16 w-16"
          style={{ color: "var(--ink-faint)" }}
        />
        <h1
          className="font-display text-2xl font-bold"
          style={{ color: "var(--ink)" }}
        >
          Site Temporarily Offline
        </h1>
        <p style={{ color: "var(--ink-muted)" }}>
          This website is currently suspended. Please check back later.
        </p>
      </div>
    );
  }

  if (pgs.length === 0) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center text-center p-4"
        style={{ background: "#F5EFE0" }}
      >
        <Building
          className="mb-4 h-16 w-16"
          style={{ color: "var(--ink-faint)" }}
        />
        <h1
          className="font-display text-2xl font-bold"
          style={{ color: "var(--ink)" }}
        >
          No Properties Found
        </h1>
        <p style={{ color: "var(--ink-muted)" }}>
          No properties are listed on this domain yet. Please check back later.
        </p>
      </div>
    );
  }

  const singlePg = pgIdToShow
    ? pgs.find((p) => p.id === pgIdToShow)
    : pgs.length === 1
      ? pgs[0]
      : null;

  const themeColor = siteConfig.themeColor || "#E8470A";
  const websiteStyle = siteConfig.websiteStyle || "classic";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          :root {
            --owner-primary: ${themeColor};
            --ember: ${themeColor};
            --ember-dark: ${themeColor}dd;
          }
        `,
        }}
      />
      <div className="spg-root">
        {singlePg ? (
          <SinglePgView
            pg={singlePg}
            owner={owner}
            siteConfig={siteConfig}
            subdomain={subdomain}
            websiteStyle={websiteStyle}
          />
        ) : (
          <MultiPgView
            pgs={pgs}
            siteConfig={siteConfig}
            owner={owner}
            websiteStyle={websiteStyle}
          />
        )}
      </div>
    </>
  );
}
