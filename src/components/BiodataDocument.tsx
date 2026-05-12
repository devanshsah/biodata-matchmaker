function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-x-6 gap-y-1 py-3 border-b border-[color:var(--rule)] last:border-0">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground pt-1">
        {label}
      </dt>
      <dd className="text-[15px] md:text-base text-foreground leading-relaxed">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-3">
        {title}
      </h2>
      <dl>{children}</dl>
    </section>
  );
}

export function BiodataDocument() {
  return (
    <article className="biodata-document mx-auto bg-card text-card-foreground border border-[color:var(--rule)] px-8 md:px-16 py-12 md:py-20 max-w-2xl">
      <header className="text-center pb-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Personal Profile
        </p>
        <h1 className="mt-6 text-5xl md:text-6xl font-serif text-foreground">
          Devansh Sah
        </h1>
        <p className="mt-4 text-sm text-muted-foreground italic font-serif">
          Software Engineer · Pune
        </p>
        <div className="mx-auto mt-8 h-px w-12 bg-foreground/40" />
      </header>

      <Section title="Personal">
        <Field label="Date of Birth" value="10 March 1998 · 12:30 AM" />
        <Field label="Height" value={`5' 9"`} />
        <Field label="Complexion" value="Fair" />
        <Field label="Religion" value="Jain" />
        <Field label="Gotra" value="Self — Sah · Maternal — Kala" />
      </Section>

      <Section title="Education & Work">
        <Field label="Education" value="B.E. Computer Science Engineering" />
        <Field label="Profession" value="Software Engineer" />
        <Field label="Company" value="Cellpoint Digital Pvt. Ltd., Pune" />
      </Section>

      <Section title="Family">
        <Field
          label="Father"
          value={
            <>
              Rajeev Kumar Sah
              <span className="block text-sm text-muted-foreground">
                Businessman · Devrishi Enterprises, Jaipur
              </span>
            </>
          }
        />
        <Field
          label="Mother"
          value={
            <>
              Ritu Sah
              <span className="block text-sm text-muted-foreground">
                Homemaker · Ex Jewellery Designer
              </span>
            </>
          }
        />
        <Field
          label="Brother"
          value={
            <>
              Rishi Sah
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
            </>
          }
        />
        <Field
          label="Uncles"
          value="Dinesh Kumar Sah (Jaipur) · Sanjay Kumar Sah (Indore)"
        />
      </Section>

      <Section title="Contact">
        <Field label="Address" value="B-39, Sangam Vihar, Bani Park, Jaipur — 302016" />
        <Field label="Mobile" value="+91 73400 07777 · +91 73740 97655" />
      </Section>
    </article>
  );
}
