import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Briefcase,
  Sparkles,
  Code2,
  Layers,
  Cpu,
  Zap,
  Coffee,
  Linkedin,
} from "lucide-react";

export const Route = createFileRoute("/assignment")({
  component: AboutNowPage,
  head: () => ({
    meta: [
      { title: "About — Devansh Sah" },
      { name: "description", content: "What Devansh is building right now and how to get in touch." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "About — Devansh Sah" },
      { property: "og:description", content: "What Devansh is building right now and how to get in touch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const rightNow = {
  role: "Software Engineer at Cellpoint Digital",
  focus: "Payment orchestration, routing, fraud rule-engines, and high-throughput pipelines.",
  based: "Pune, India · open to remote",
};

const building = [
  { icon: Code2, label: "React · Next.js · TypeScript · Tailwind" },
  { icon: Cpu, label: "Java · Spring Boot · Node · Python" },
  { icon: Layers, label: "REST · GraphQL · Microservices" },
  { icon: Zap, label: "Kafka · Docker · K8s · GCP" },
];

const openTo = [
  "Full-stack products from zero to launch",
  "Frontend magic and design systems",
  "Backend APIs, rule-engines, and data pipelines",
  "Side projects, MVPs, and weird ideas",
];

function AboutNowPage() {
  return (
    <div
      className="min-h-screen text-breeze-text"
      style={{
        background:
          "radial-gradient(60% 50% at 10% 20%, #e0f2fe 0%, transparent 60%), radial-gradient(50% 40% at 90% 80%, #fef9c3 0%, transparent 60%), radial-gradient(60% 50% at 50% 0%, #f0f9ff 0%, transparent 60%), #f8fbff",
        fontFamily:
          "'DM Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-10 lg:py-16">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-breeze-muted hover:text-breeze-text transition"
        >
          <span className="inline-block size-2 rounded-full bg-breeze-sky-deep" />
          devansh/sah
        </a>
      </div>

      <main className="max-w-6xl mx-auto px-6 pb-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* left: sticky intro */}
          <div className="lg:sticky lg:top-10 lg:self-start">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full bg-white/80 border border-breeze-border shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              OPEN TO COOL WORK
            </div>

            <h1
              className="mt-6 text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              hey, I’m
              <br />
              <span className="text-breeze-sky-deep">Devansh</span>
            </h1>

            <p className="mt-6 text-lg text-breeze-muted max-w-md leading-relaxed">
              A full-stack engineer who enjoys turning vague ideas into working
              software. Currently deep in payments, but happy to build anything
              that ships.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:seehdev@gmail.com"
                className="group inline-flex items-center gap-2 rounded-full bg-breeze-text text-white px-5 py-3 text-sm font-medium hover:bg-breeze-text/90 transition shadow-sm"
              >
                <Mail className="size-4" />
                say hi
                <ArrowUpRight className="size-4 group-hover:rotate-45 transition-transform" />
              </a>
              <a
                href="https://www.linkedin.com/in/devanshsah/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-breeze-border px-5 py-3 text-sm font-medium hover:bg-white transition shadow-sm"
              >
                <Linkedin className="size-4" />
                linkedin
              </a>
            </div>

            <div className="mt-10 hidden lg:block">
              <div className="relative rounded-3xl bg-white/70 backdrop-blur border border-breeze-border p-6 shadow-sm max-w-xs">
                <div className="absolute -top-3 -right-3 size-12 rounded-2xl bg-gradient-to-br from-breeze-sky to-breeze-sky-deep flex items-center justify-center shadow-md">
                  <Sparkles className="size-6 text-white" />
                </div>
                <p className="text-sm text-breeze-muted leading-relaxed">
                  “The best projects are the ones that start with ‘this probably
                  won’t work’ and end with ‘wait, it actually works.’”
                </p>
              </div>
            </div>
          </div>

          {/* right: scrollable content */}
          <div className="space-y-6">
            <section className="rounded-3xl bg-white/80 backdrop-blur border border-breeze-border p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-10 rounded-xl bg-breeze-sky/20 flex items-center justify-center">
                  <Briefcase className="size-5 text-breeze-sky-deep" />
                </div>
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  right now
                </h2>
              </div>
              <p className="text-breeze-text leading-relaxed">
                {rightNow.role}. {rightNow.focus}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-breeze-muted">
                <MapPin className="size-4" />
                {rightNow.based}
              </div>
            </section>

            <section className="rounded-3xl bg-white/80 backdrop-blur border border-breeze-border p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-10 rounded-xl bg-breeze-sand/60 flex items-center justify-center">
                  <Code2 className="size-5 text-breeze-text" />
                </div>
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  building things with
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {building.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl bg-breeze-soft/60 p-4 border border-breeze-border/60"
                  >
                    <Icon className="size-5 text-breeze-sky-deep shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white/80 backdrop-blur border border-breeze-border p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-10 rounded-xl bg-breeze-sky/20 flex items-center justify-center">
                  <Coffee className="size-5 text-breeze-sky-deep" />
                </div>
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  open to
                </h2>
              </div>
              <ul className="space-y-3">
                {openTo.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-breeze-text">
                    <span className="mt-2 size-1.5 rounded-full bg-breeze-sky-deep shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-breeze-sky/30 via-breeze-sand/40 to-breeze-sky/20 border border-breeze-border shadow-sm">
              <h2
                className="text-xl font-semibold tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                want to build something together?
              </h2>
              <p className="mt-2 text-sm text-breeze-muted max-w-md">
                Send an email with what you’re working on. I read everything and
                usually reply within a day or two.
              </p>
              <a
                href="mailto:seehdev@gmail.com"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/90 border border-breeze-border px-5 py-3 text-sm font-medium hover:bg-white transition shadow-sm"
              >
                <Mail className="size-4" />
                seehdev@gmail.com
              </a>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-xs text-breeze-muted">
        <span>© {new Date().getFullYear()} Devansh Sah</span>
      </footer>
    </div>
  );
}
