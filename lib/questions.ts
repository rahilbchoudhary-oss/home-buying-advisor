export type Answers = Record<string,string>;

export const questions = [
 {key:"city",title:"Where will the AC be used?",sub:"Climate affects cooling load and practical choice.",options:[
  {value:"Mumbai",help:"Warm & humid"},{value:"Delhi NCR",help:"Very hot summers"},{value:"Bengaluru",help:"Milder climate"},{value:"Chennai",help:"Hot & humid"},{value:"Kolkata",help:"Hot & humid"},{value:"Other",help:"General India profile"}]},
 {key:"room",title:"How large is the room?",sub:"Choose the closest size.",options:[
  {value:"<100 sq ft",help:"Small room"},{value:"100–150 sq ft",help:"Typical bedroom"},{value:"150–200 sq ft",help:"Large bedroom"},{value:"200–300 sq ft",help:"Large room"},{value:"300+ sq ft",help:"Very large room"}]},
 {key:"people",title:"How many people normally use the room?",sub:"Occupancy affects cooling load.",options:[
  {value:"1",help:"One person"},{value:"2",help:"Two people"},{value:"3–4",help:"Family / shared"},{value:"5+",help:"Many occupants"}]},
 {key:"hours",title:"How many hours per day will you run the AC?",sub:"This changes the value of efficiency.",options:[
  {value:"<4 hours",help:"Occasional use"},{value:"4–8 hours",help:"Regular use"},{value:"8–12 hours",help:"Heavy use"},{value:"12+ hours",help:"Very heavy use"}]},
 {key:"budget",title:"What's your maximum budget?",sub:"Recommendations stay within this range.",options:[
  {value:"₹30,000",help:"Value focused"},{value:"₹40,000",help:"Mid-range"},{value:"₹50,000",help:"Strong selection"},{value:"₹60,000",help:"Premium options"},{value:"₹75,000+",help:"Premium / flagship"}]},
 {key:"priority",title:"What matters most?",sub:"Pick the priority you care about most.",options:[
  {value:"Electricity savings",help:"Lower running cost"},{value:"Fast cooling",help:"Quick temperature drop"},{value:"Quiet operation",help:"Bedroom friendly"},{value:"Air quality",help:"Filters / purification"},{value:"Smart features",help:"Wi‑Fi / app controls"},{value:"Low maintenance",help:"Practical ownership"}]},
 {key:"star",title:"How important is energy efficiency?",sub:"This separates efficiency from lowest purchase price.",options:[
  {value:"Must have 5 Star",help:"Critical"},{value:"Prefer 5 Star",help:"Strong preference"},{value:"Either is fine",help:"Fit matters more"},{value:"Lowest price first",help:"Purchase price first"}]}
];