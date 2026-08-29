import Advisor from "@/components/Advisor";

export default function ACAdvisorPage() {
  return (
    <main>
      <section className="advisorShell">
        <div className="advisorIntro">
          <div className="eyebrow">AC decision engine</div>

          <h1>Which AC should you buy?</h1>

          <p>
            Answer a few questions and we'll rank the products that fit
            your needs.
          </p>
        </div>

        <Advisor />
      </section>
    </main>
  );
}
