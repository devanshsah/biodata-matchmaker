import omSymbol from "@/assets/jain-om.png";

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
      {/* Corner ornaments */}
      <div className="pointer-events-none absolute inset-3 border border-[color:var(--gold)]/30" />

      <header className="text-center pb-2 relative">
        <img
          src={omSymbol}
          alt="Jain Om"
          width={72}
          height={72}
          className="mx-auto h-16 w-16 object-contain"
        />
        <h1 className="mt-6 text-5xl md:text-6xl font-serif text-[color:var(--maroon)]">
          Devansh Sah
        </h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground italic font-serif">
          Software Engineer · Pune
        </p>
        <hr className="gold-rule mx-auto mt-8 w-2/3" />
      </header>

      <Section title="Personal Details">
        <Field label="Date of Birth" value="10 March 1998 · 12:30 AM" />
        <Field label="Height" value={`5' 9"`} />
        <Field label="Complexion" value="Fair" />
        <Field label="Religion" value="Jain" />
        <Field label="Gotra" value="Self — Sah · Maternal — Kala" />
      </Section>

      <Section title="Education & Profession">
        <Field label="Education" value="B.E. Computer Science Engineering" />
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
        <Field label="Address" value="B-39, Sangam Vihar, Bani Park, Jaipur — 302016" />
        <Field label="Mobile" value="+91 73400 07777 · +91 73740 97655" />
      </Section>

      <hr className="gold-rule mt-12" />
      <p className="mt-4 text-center text-[11px] uppercase tracking-[0.3em] text-[color:var(--gold-deep)]">
        With Best Wishes
      </p>
    </article>
  );
}
