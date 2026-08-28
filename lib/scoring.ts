import type { Answers } from "./questions";

export function targetCapacity(answers:Answers) {
  if (answers.room === "300+ sq ft" || answers.room === "200–300 sq ft") return 2;
  if (answers.room === "150–200 sq ft" || answers.room === "100–150 sq ft") return 1.5;
  return 1.2;
}

export function scoreProduct(p:any, a:Answers) {
  const cap=targetCapacity(a);
  let score=50;
  if (p.capacity===cap) score+=22; else if (Math.abs(p.capacity-cap)===0.5) score+=8;
  const budget = {"₹30,000":30000,"₹40,000":40000,"₹50,000":50000,"₹60,000":60000,"₹75,000+":75000}[a.budget as keyof object] ?? 50000;
  if (p.price <= budget) score+=15; else score-=25;
  if (a.star==="Must have 5 Star" && p.star_rating===5) score+=9;
  if (a.star==="Prefer 5 Star" && p.star_rating===5) score+=5;
  if ((a.hours==="8–12 hours"||a.hours==="12+ hours") && p.star_rating===5) score+=7;
  if (a.priority==="Electricity savings" && p.iseer>=5) score+=8;
  if (a.priority==="Quiet operation" && p.noise_db<=31) score+=8;
  if (a.priority==="Air quality" && p.air_quality) score+=8;
  if (a.priority==="Smart features" && p.smart) score+=7;
  if (a.priority==="Fast cooling" && p.capacity>=cap) score+=5;
  if ((a.people==="5+"||a.people==="3–4") && p.capacity>=cap) score+=4;
  return Math.max(50,Math.min(98,Math.round(score)));
}