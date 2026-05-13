import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Phone, Github, Sparkles, Zap, Shield, Cpu } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Devansh Sah — Senior Software Engineer" },
      {
        name: "description",
        content:
          "Senior Backend Engineer building high-availability payment & fraud systems at scale. 10M+ txns/month, sub-50ms APIs.",
      },
      { property: "og:title", content: "Devansh Sah — Senior Software Engineer" },
      {
        property: "og:description",
        content:
          "Backend, distributed systems, payments. 6+ years shipping platforms that scale.",
      },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  }),
});

const skills = [
  { icon: Cpu, label: "Java · TypeScript · SQL" },
  { icon: Zap, label: "Spring Boot · Microservices" },
  { icon: Shield, label: "PCI DSS · Tokenization" },
  { icon: Sparkles, label: "Kafka · Docker · K8s · GCP" },
];

const stats = [
  { k: "10M+", v: "monthly transactions" },
  { k: "100K+", v: "concurrent txns" },
  { k: "98.9%", v: "fraud accuracy" },
  { k: "<50ms", v: "API latency" },
];

const experience = [
  {
    co: "Cellpoint Digital",
    role: "Software Engineer",
    when: "Jan 2022 — Present",
    bullets: [
      "Owned end-to-end payment orchestration: PSP routing, split payments, refunds, callbacks, PayPal in-context.",
      "Designed extensible orchestration integrating PayPal, Chase, Amex, Airwallex + fraud providers (Cybersource, Riskified, Accertify).",
      "Architected fraud rule-engine hitting 98.9% accuracy while reducing false declines.",
      "Led settlement pipeline upgrades reliably processing 100K+ concurrent transactions.",
      "Tuned services & queries to sub-50ms response times on critical APIs.",
    ],
  },
  {
    co: "AP Techpins",
    role: "Software Engineer",
    when: "Sept 2019 — Jan 2022",
    bullets: [
      "Built backend services & analytics dashboards for LMS and e-commerce.",
      "Optimised MySQL/PLSQL systems for backend performance.",
      "Contributed to scalable architecture for concurrent workloads.",
    ],
  },
];

function Landing() {
  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        background:
          "radial-gradient(60% 50% at 15% 10%, #d6f0ff 0%, transparent 60%), radial-gradient(50% 40% at 90% 20%, #f5e1ff 0%, transparent 60%), radial-gradient(60% 50% at 50% 100%, #e6ffe9 0%, transparent 60%), #fafbff",
        fontFamily:
          "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      {/* nav */}
      <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block size-2.5 rounded-full bg-gradient-to-tr from-sky-400 to-fuchsia-400" />
          devansh.sah
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <a
            href="#work"
            className="px-3 py-1.5 rounded-full hover:bg-white/60 transition"
          >
            work
          </a>
          <a
            href="#contact"
            className="px-3 py-1.5 rounded-full hover:bg-white/60 transition"
          >
            contact
          </a>
          <Link
            to="/biodata"
            className="px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition"
          >
            biodata
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-white shadow-sm">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          open to senior backend / platform roles
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          building payment rails
          <br />
          that just{" "}
          <span className="bg-gradient-to-r from-sky-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
            don't break
          </span>
          .
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          I'm Devansh — a senior software engineer with 6+ years architecting
          high-availability payment and fraud systems. Distributed systems,
          orchestration engines, and APIs that stay fast under load.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="mailto:sah.devansh@gmail.com"
            className="group inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-3 text-sm font-medium hover:bg-slate-700 transition"
          >
            let's talk
            <ArrowUpRight className="size-4 group-hover:rotate-45 transition-transform" />
          </a>
          <Link
            to="/biodata"
            className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-white px-5 py-3 text-sm font-medium hover:bg-white transition shadow-sm"
          >
            view biodata
          </Link>
        </div>

        {/* stats */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.k}
              className="rounded-2xl bg-white/70 backdrop-blur border border-white p-5 shadow-sm"
            >
              <div className="text-3xl font-semibold tracking-tight">{s.k}</div>
              <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* skills */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {skills.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-2xl bg-white/60 backdrop-blur border border-white p-5 shadow-sm hover:-translate-y-0.5 transition"
            >
              <Icon className="size-5 text-fuchsia-500" />
              <div className="mt-3 font-medium text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* work */}
      <section id="work" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            where I've shipped
          </h2>
          <span className="text-sm text-slate-500">2019 — now</span>
        </div>

        <div className="space-y-4">
          {experience.map((e) => (
            <article
              key={e.co}
              className="rounded-3xl bg-white/70 backdrop-blur border border-white p-6 md:p-8 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
                    {e.co}
                  </h3>
                  <p className="text-slate-600 text-sm mt-0.5">{e.role}</p>
                </div>
                <span className="text-xs font-medium text-slate-500 px-2.5 py-1 rounded-full bg-slate-100">
                  {e.when}
                </span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {e.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-[15px] text-slate-700">
                    <span className="mt-2 size-1.5 rounded-full bg-gradient-to-tr from-sky-400 to-fuchsia-400 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* education */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-white/70 backdrop-blur border border-white p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight">Education</h3>
            <p className="mt-3 text-sm text-slate-700">
              Bachelor of Technology
              <br />
              <span className="text-slate-500">
                Teerthanker Mahaveer University · 2019
              </span>
            </p>
          </div>
          <div className="rounded-3xl bg-white/70 backdrop-blur border border-white p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight">
              Certifications
            </h3>
            <p className="mt-3 text-sm text-slate-700">
              Google Cloud Associate Cloud Engineer
              <br />
              <span className="text-slate-500">in progress</span>
            </p>
          </div>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-sky-100 via-fuchsia-100 to-amber-100 border border-white shadow-sm">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-2xl">
            got a hard backend problem?
          </h2>
          <p className="mt-3 text-slate-700 max-w-xl">
            DMs are open. Payments, orchestration, distributed systems — happy
            to chat.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="mailto:sah.devansh@gmail.com"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-3 text-sm font-medium hover:bg-slate-700 transition"
            >
              <Mail className="size-4" /> sah.devansh@gmail.com
            </a>
            <a
              href="tel:+918302879298"
              className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-white px-5 py-3 text-sm font-medium hover:bg-white transition"
            >
              <Phone className="size-4" /> +91 8302879298
            </a>
            <a
              href="https://github.com/devanshsah"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-white px-5 py-3 text-sm font-medium hover:bg-white transition"
            >
              <Github className="size-4" /> /devanshsah
            </a>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-xs text-slate-500 flex justify-between">
        <span>© {new Date().getFullYear()} Devansh Sah</span>
        <span>made with ☕ in Pune</span>
      </footer>
    </div>
  );
}
