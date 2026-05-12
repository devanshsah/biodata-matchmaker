function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] gap-x-6 gap-y-1 py-3 border-b border-[color:var(--rule)]/40 last:border-0">
      <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold-deep)] font-medium pt-1">
        {label}
      </dt>
      <dd className="text-[15px] md:text-base text-foreground leading-relaxed font-serif">
        {value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="ornament mb-5">
        <h2 className="text-[12px] uppercase tracking-[0.32em] text-[color:var(--maroon)] font-medium px-3 whitespace-nowrap">
          {title}
        </h2>
      </div>
      <dl>{children}</dl>
    </section>
  );
}

export function BiodataDocument() {
  return (
    <article
      className="biodata-document mx-auto bg-card text-card-foreground px-8 md:px-16 py-12 md:py-16 max-w-3xl border border-[color:var(--gold)]/40 shadow-[var(--shadow-elegant)] relative"
    >
      <div className="pointer-events-none absolute inset-3 border border-[color:var(--gold)]/30" />

      <header className="text-center pb-2 relative">
        <p className="text-[10px] uppercase tracking-[0.45em] text-[color:var(--gold-deep)] font-medium">
          Biodata
        </p>
        <h1 className="mt-5 text-5xl md:text-7xl font-serif text-[color:var(--maroon)] leading-none">
          Devansh Sah
        </h1>
        <div className="mt-5 flex items-center justify-center gap-3 text-[color:var(--gold-deep)]">
          <span className="h-px w-10 bg-[color:var(--gold)]" />
          <span className="text-xs uppercase tracking-[0.3em]">Software Engineer · Pune</span>
          <span className="h-px w-10 bg-[color:var(--gold)]" />
        </div>
      </header>

      <Section title="Personal Details">
        <Field label="Date of Birth" value="10 March 1998 · 12:30 AM" />
        <Field label="Height" value={`5' 9"`} />
        <Field label="Complexion" value="Fair" />
        <Field label="Religion" value="Jain" />
        <Field label="Gotra" value="Self — Sah · Maternal — Kala" />
      </Section>

      <Section title="Education & Profession">
        <Field label="Education" value="B.Tech Computer Science Engineering" />
        <Field label="Profession" value="Software Engineer" />
        <Field label="Company" value="Cellpoint Digital Pvt. Ltd., Pune" />
      </Section>

      <Section title="Family Details">
        <Field
          label="Father"
          value={
            <>
              Shri Rajeev Kumar Sah
              <span className="block text-sm text-muted-foreground">
                Businessman · Devrishi Enterprises, Jaipur
              </span>
            </>
          }
        />
        <Field
          label="Brother"
          value={
            <>
              Shri Rishi Sah
              <span className="block text-sm text-muted-foreground">
                Mechanical Engineer · Assembly Line Manager, Mercedes Benz India, Pune
              </span>
            </>
          }
        />
        <Field
          label="Mother"
          value={
            <>
              Smt. Ritu Sah
              <span className="block text-sm text-muted-foreground">
                Homemaker · Ex Jewellery Designer
              </span>
            </>
          }
        />
        <Field
          label="Paternal Grandparents"
          value={
            <>
              Late Shri Prem Chand Sah
              <span className="block text-sm text-muted-foreground">
                Rtd. Director Marketing, Rajshri Production Pvt. Ltd.
              </span>
              <span className="block mt-1">Smt. Pushpa Lata Sah</span>
              <span className="block text-sm text-muted-foreground">Homemaker</span>
            </>
          }
        />
        <Field
          label="Paternal Uncles"
          value="Shri Dinesh Kumar Sah (Jaipur) · Shri Sanjay Kumar Sah (Indore)"
        />
        <Field
          label="Maternal Grandparents"
          value={
            <>
              Late Shri Kamal Chand Kala
              <span className="block text-sm text-muted-foreground">
                Rtd. Superintendent, Dept. of Finance Ministry, Rajasthan
              </span>
              <span className="block mt-1">Smt. Sushila Devi Kala</span>
              <span className="block text-sm text-muted-foreground">Homemaker</span>
            </>
          }
        />
      </Section>

      <Section title="Contact">
        <Field label="Devansh Sah" value="+91 73400 07777" />
        <Field label="Rajeev Kumar Sah" value="+91 73740 97655" />
        <Field label="Ritu Sah" value="+91 73401 99958" />
      </Section>

      <p className="mt-12 text-center text-[11px] uppercase tracking-[0.3em] text-[color:var(--gold-deep)]">
        With Best Wishes
      </p>
    </article>
  );
}
