import omLogo from "@/assets/om-symbol.png";

const sectionTitle = "text-2xl md:text-3xl font-semibold text-[color:var(--maroon)] tracking-wide";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] md:grid-cols-[200px_1fr] gap-4 py-2 border-b border-[color:var(--gold-soft)]/60 last:border-0">
      <div className="text-[color:var(--maroon)] font-semibold uppercase text-xs md:text-sm tracking-widest">
        {label}
      </div>
      <div className="text-foreground text-base md:text-lg leading-snug">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className={sectionTitle}>{title}</h2>
      </div>
      <div className="ornament mb-4" aria-hidden />
      <div>{children}</div>
    </section>
  );
}

export function BiodataDocument() {
  return (
    <article
      id="biodata-document"
      className="biodata-document mx-auto bg-card text-card-foreground rounded-2xl shadow-[var(--shadow-elegant)] border border-[color:var(--gold-soft)] px-8 md:px-14 py-10 md:py-14 max-w-3xl"
    >
      {/* Header */}
      <header className="text-center">
        <div className="flex justify-center mb-3">
          <img src={omLogo} alt="Jain Om symbol" className="w-14 h-14 opacity-90" />
        </div>
        <p className="text-xs md:text-sm tracking-[0.4em] text-[color:var(--gold)] uppercase">
          ॥ Shri Mahaveeraya Namah ॥
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold text-[color:var(--maroon)]">
          Biodata
        </h1>
        <div className="ornament mt-4" aria-hidden />
        <p className="mt-4 text-2xl md:text-3xl font-semibold">Devansh Sah</p>
      </header>

      <Section title="Personal Details">
        <Row label="Name" value="Devansh Sah" />
        <Row label="Date of Birth" value="10 March 1998 · 12:30 AM" />
        <Row label="Height" value={`5' 9"`} />
        <Row label="Complexion" value="Fair" />
        <Row label="Religion" value="Jain" />
        <Row label="Gotra" value="Self – Sah · Maternal – Kala" />
      </Section>

      <Section title="Education & Profession">
        <Row label="Education" value="Computer Science Engineering" />
        <Row
          label="Profession"
          value="Software Engineer at Cellpoint Digital Pvt. Ltd., Pune"
        />
      </Section>

      <Section title="Family Details">
        <Row
          label="Father"
          value="Shri Rajeev Kumar Sah — Businessman, Devrishi Enterprises, Jaipur"
        />
        <Row
          label="Mother"
          value="Smt. Ritu Sah — Ex Jewellery Designer, Homemaker"
        />
        <Row
          label="Brother"
          value="Shri Rishi Sah — Mechanical Engineer, Assembly Line Manager at Mercedes Benz India Pvt. Ltd., Pune"
        />
        <Row
          label="Paternal Grandfather"
          value="Late Shri Prem Chand Sah — Rtd. Director Marketing, Rajshri Production Pvt. Ltd."
        />
        <Row
          label="Paternal Grandmother"
          value="Smt. Pushpa Lata Sah — Homemaker"
        />
        <Row
          label="Maternal Grandfather"
          value="Late Shri Kamal Chand Kala — Rtd. Superintendent, Dept. of Finance Ministry, Rajasthan"
        />
        <Row
          label="Maternal Grandmother"
          value="Smt. Sushila Devi Kala — Homemaker"
        />
        <Row
          label="Uncles"
          value="Shri Dinesh Kumar Sah (Jaipur) · Shri Sanjay Kumar Sah (Indore)"
        />
        <Row label="Assistant" value="Smt. Sangeeta Devi (Lady Helper)" />
      </Section>

      <Section title="Contact">
        <Row
          label="Address"
          value="B-39, Sangam Vihar, Bani Park, Jaipur – 302016"
        />
        <Row label="Mobile" value="+91 73400 07777 · +91 73740 97655" />
      </Section>

      <footer className="mt-10 text-center">
        <div className="ornament mb-3" aria-hidden />
        <p className="text-xs tracking-[0.3em] uppercase text-[color:var(--gold)]">
          With Blessings of Elders
        </p>
      </footer>
    </article>
  );
}
