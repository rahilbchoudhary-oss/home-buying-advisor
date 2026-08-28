import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="container navin">
          <Link className="logo" href="/">Home<span>Buying</span>Advisor</Link>
          <nav><Link href="#how">How it works</Link><Link href="#why">Why us</Link></nav>
          <Link className="button primary" href="/ac-advisor">Find my AC</Link>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="container heroGrid">
            <div>
              <div className="eyebrow">Personalized buying decisions</div>
              <h1>Stop comparing ACs.<br/>Find the right one.</h1>
              <p>Tell us about your room, city, usage and budget. Our decision engine turns your needs into a personalized shortlist and helps you compare where to buy.</p>
              <div className="actions"><Link className="button primary" href="/ac-advisor">Start AC Advisor →</Link><a className="button secondary" href="#how">See how it works</a></div>
            </div>
            <div className="heroCard">
              <div className="mock">
                <div className="mockTop"><b>YOUR AC MATCH</b><span>94% match</span></div>
                <div className="ac"></div>
                <small>Based on room size, climate, usage & budget</small>
                <h3>1.5 Ton • 5 Star • Inverter</h3>
                <p>Personalized instead of a generic “top 10”.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="section" id="how">
          <div className="container">
            <div className="sectionHead"><div className="eyebrow">The product</div><h2>A buying decision, not another list.</h2><p>We score products against a shopper's actual requirements.</p></div>
            <div className="cards">
              <Card n="1" title="Tell us your needs" text="Room size, city, occupants, usage, budget and priorities."/>
              <Card n="2" title="Get your match" text="The engine estimates capacity and scores suitable ACs for your profile."/>
              <Card n="3" title="Compare where to buy" text="See retailer offers and use tracked affiliate links when you are ready."/>
            </div>
          </div>
        </section>
        <section className="dark">
          <div className="container cta"><div><div className="eyebrow">AC decision engine</div><h2>Which AC should you buy?</h2><p>Answer seven questions. Get a personalized shortlist.</p></div><Link className="button primary" href="/ac-advisor">Start now →</Link></div>
        </section>
        <section className="section" id="why">
          <div className="container"><div className="sectionHead"><div className="eyebrow">Why it works</div><h2>Rank products for a person.</h2></div><div className="cards"><Card title="Room-first sizing" text="Capacity is a core part of the match, not a footnote."/><Card title="Usage-aware" text="Long daily use makes efficiency more important."/><Card title="Budget-aware" text="The shortlist respects the shopper's maximum budget."/></div></div>
        </section>
      </main>
      <footer><div className="container"><b>Home Buying Advisor</b><span>Buy smarter. Buy for your needs.</span></div></footer>
    </>
  );
}
function Card({n,title,text}:{n?:string,title:string,text:string}) {
  return <article className="card">{n && <div className="num">{n}</div>}<h3>{title}</h3><p>{text}</p></article>;
}