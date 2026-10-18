import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { demoTrustReview, metricsFor } from '../modules/campaigns/campaign.lifecycle.js';
import { defaultPrefs, defaultProfile } from '../modules/auth/auth.service.js';
import { slugify } from '../lib/ids.js';
import type { Campaign, CampaignStatus, Comment, Contribution, Notification, Report, StoryBlock, User } from '../types/domain.js';

export const DEMO_EMAIL = 'demo@campaign.app';
export const DEMO_PASSWORD = 'demo1234';

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * DAY).toISOString();

let n = 0;
const bid = () => `blk_seed${(n += 1)}`;
const p = (text: string): StoryBlock => ({ id: bid(), type: 'paragraph', text });
const h = (text: string): StoryBlock => ({ id: bid(), type: 'heading', text });
const stat = (value: string, label: string): StoryBlock => ({ id: bid(), type: 'stat', value, label });
const quote = (text: string, credit?: string): StoryBlock => ({ id: bid(), type: 'quote', text, credit });
const list = (...items: string[]): StoryBlock => ({ id: bid(), type: 'list', items });

type Seed = {
  key: string;
  title: string;
  category: string;
  creator: string;
  owner?: 'demo';
  short: string;
  story: StoryBlock[];
  why: string;
  sources: [string, string][];
  raised: number;
  goal: number;
  backers: number;
  status?: CampaignStatus;
  days?: number;
  featured?: boolean;
  audience: string;
  matters: string;
  platforms?: string[];
  window?: Campaign['fundingWindow'];
};

const seeds: Seed[] = [
  {
    key: 'school-water-stations',
    title: 'Clean drinking water in every public school',
    category: 'Health',
    creator: 'Marisol Everett',
    short: 'A district-by-district push to replace lead service lines in the thirty oldest public schools in the county.',
    story: [
      p('Thirty schools in this county still draw drinking water through service lines installed before 1970. Testing last spring found elevated lead in eleven of them.'),
      stat('11 of 30', 'schools tested above the lead action level last spring'),
      p('The replacement programme is already funded at the state level, but districts have to apply, and most do not have the grant staff to do it. This campaign pays for the outreach that gets those applications filed before the deadline.'),
      h('What the money does'),
      p('Every contribution buys ad placements that reach parents, school board members and facilities managers in the districts that have not yet applied, with a plain link to the application checklist.'),
    ],
    why: 'The money to fix this already exists. What is missing is anyone telling the districts it is there.',
    sources: [
      ['County water testing results, 2026', 'https://example.org/county-water-testing-2026'],
      ['State lead service line fund', 'https://example.org/state-lead-service-line-fund'],
    ],
    raised: 5240,
    goal: 8000,
    backers: 142,
    days: 18,
    featured: true,
    audience: 'Parents and school board members in the 19 districts that have not yet applied.',
    matters: 'Lead exposure at school is invisible and avoidable, and the fix is already paid for.',
  },
  {
    key: 'bus-network',
    title: 'Redraw the bus network around where people actually work',
    category: 'Civic',
    creator: 'Devin Okonkwo',
    short: 'Most routes still converge downtown, but the jobs moved to the ring road a decade ago. This is the case for redrawing them.',
    story: [
      p('Most bus routes were drawn when the factories and offices sat downtown. Today more than six in ten jobs are on the ring road, and a ride there can take two transfers and ninety minutes.'),
      stat('62%', 'of the metro area’s jobs are now outside the downtown core'),
      p('The transit authority opens its route review in the spring. Public comment is the only lever riders have, and fewer than two hundred people responded last time.'),
      quote('If the route does not go where the work is, it is not a transit system, it is a museum.', 'Route 14 rider, interviewed for this campaign'),
    ],
    why: 'A few thousand informed comments during the review window can change which routes are funded for the next ten years.',
    sources: [
      ['Regional jobs by district, 2025', 'https://example.org/regional-jobs-by-district'],
      ['Transit authority route review schedule', 'https://example.org/route-review-schedule'],
    ],
    raised: 9100,
    goal: 12000,
    backers: 231,
    days: 12,
    featured: true,
    audience: 'Daily bus riders and shift workers along the ring road corridor.',
    matters: 'Your commute is decided by a route map almost nobody has read.',
  },
  {
    key: 'farm-repair',
    title: 'Let farmers repair the equipment they own',
    category: 'Consumer',
    creator: 'Hannah Breit',
    short: 'Software locks mean a dealer technician has to authorise repairs farmers used to do themselves. A state bill would change that.',
    story: [
      p('A planter stops in the field at the worst possible week. The fix is a software unlock that only a dealer technician can authorise, and the technician is three days out.'),
      stat('3 days', 'median wait for a dealer technician during planting season'),
      p('A state right-to-repair bill would give farmers and independent shops the same diagnostic tools dealers use. The vote is close, and rural legislators say they have heard little from the people it affects.'),
    ],
    why: 'Legislators respond to what reaches them. This puts the farmers’ side of the story in front of their own constituents.',
    sources: [
      ['Farm equipment downtime survey', 'https://example.org/farm-downtime-survey'],
      ['State right-to-repair bill text', 'https://example.org/state-repair-bill'],
    ],
    raised: 4300,
    goal: 15000,
    backers: 88,
    days: 25,
    audience: 'Farm owners and rural voters in the three counties of the bill’s sponsors.',
    matters: 'It is your equipment, and in the middle of harvest every lost day costs real money.',
  },
  {
    key: 'winter-shelter',
    title: 'Keep the winter shelter open past 7am',
    category: 'Community',
    creator: 'Ray Alcantara',
    short: 'The shelter closes at 7am year-round under a rule written in 1998. Extending hours during freeze warnings costs less than one night of emergency calls.',
    story: [
      p('Every morning at seven the shelter doors open onto the street, whatever the temperature. The rule was written in 1998 and has never been revisited.'),
      stat('$4,100', 'estimated cost of extending hours for the whole winter'),
      p('A single night of emergency calls during a freeze costs more than that. The city council can change the rule at its next meeting, if enough residents tell it they want it changed.'),
    ],
    why: 'We are almost at the goal. The last few hundred dollars reach the council’s own voters before the vote.',
    sources: [['City council shelter ordinance', 'https://example.org/shelter-ordinance-1998'], ['Emergency call costs, winter 2025', 'https://example.org/emergency-call-costs']],
    raised: 5880,
    goal: 6000,
    backers: 301,
    days: 6,
    featured: true,
    audience: 'Residents of the three council wards with the highest shelter use.',
    matters: 'A rule from 1998 decides where people stand in the cold at 7am.',
  },
  {
    key: 'plain-language-ballots',
    title: 'Write ballot measures at a tenth-grade reading level',
    category: 'Civic',
    creator: 'Priscilla Nwosu',
    short: 'Five of seven measures on the last ballot scored above college reading level. Plain-language summaries are cheap, legal and already used elsewhere.',
    story: [
      p('Voters are asked to decide on measures written in the language of legal contracts. On the last ballot five of seven scored above a college reading level.'),
      stat('5 of 7', 'measures read above college level on the last county ballot'),
      p('Two neighbouring counties already publish plain-language summaries next to the legal text. It costs almost nothing and is allowed under state law. We want the county clerk to adopt it before the next election.'),
    ],
    why: 'If a ballot is hard to read, fewer people finish it. Clearer wording raises participation without changing a single law.',
    sources: [['Ballot readability analysis', 'https://example.org/ballot-readability'], ['Neighbouring county summaries', 'https://example.org/plain-language-summaries']],
    raised: 2100,
    goal: 9000,
    backers: 64,
    days: 30,
    audience: 'Registered voters aged 25 to 60 in the county.',
    matters: 'You should not need a law degree to understand what you are voting on.',
  },
  {
    key: 'shade-trees',
    title: 'Plant the shade where the heat actually is',
    category: 'Environment',
    creator: 'Tobias Lund',
    short: 'Surface temperatures vary by up to 11C across the city. The canopy budget is currently split evenly by district rather than by need.',
    story: [
      p('A summer thermal survey found surface temperatures differing by up to 11 degrees Celsius between neighbourhoods. The hottest streets have the least tree cover.'),
      stat('11 °C', 'surface temperature gap between the hottest and coolest districts'),
      p('The tree budget is split evenly across districts, which sounds fair and is not. Splitting it by heat exposure would put shade where it saves the most.'),
      h('Where we are in the process'),
      p('The parks committee drafts next year’s budget in six weeks. We want its members to hear from the residents who live on the hottest blocks.'),
    ],
    why: 'Shade is the cheapest cooling a city can buy, and it only works if it goes to the streets that need it.',
    sources: [['City thermal survey, summer 2026', 'https://example.org/thermal-survey-2026'], ['Parks committee budget calendar', 'https://example.org/parks-budget-calendar']],
    raised: 7650,
    goal: 11000,
    backers: 197,
    days: 9,
    featured: true,
    audience: 'Residents of the five hottest neighbourhoods and parks committee constituents.',
    matters: 'Whether your street has shade is a budget decision, and the budget is being written now.',
  },
  {
    key: 'cello-lessons',
    title: 'A free school year of cello lessons for forty kids',
    category: 'Music',
    creator: 'Eastside Youth Orchestra',
    short: 'Forty children on the waiting list, eleven instruments in storage and one grant window closing. Here is how we get them playing.',
    story: [
      p('The Eastside Youth Orchestra has forty children on its cello waiting list and eleven instruments sitting unused in a storage room.'),
      stat('40', 'children waiting for a place in the beginner cello programme'),
      p('A county arts grant covers the teachers if we can show broad community interest by the end of the month. This campaign carries our story to families across the county who have never heard of the programme.'),
    ],
    why: 'Interest from outside our own circle is exactly what the grant panel is asking us to prove.',
    sources: [['County arts grant criteria', 'https://example.org/arts-grant-criteria']],
    raised: 1850,
    goal: 4000,
    backers: 73,
    days: 21,
    audience: 'Parents of children aged 7 to 12 across the county.',
    matters: 'A child can start an instrument this year, not after three more years on a list.',
  },
  {
    key: 'inspection-scores',
    title: 'Publish restaurant inspection scores at the door',
    category: 'Public Policy',
    creator: 'Lena Hartmann',
    short: 'Inspection results are public, but only if you know where to look. A window card would put them where diners decide.',
    story: [
      p('Every restaurant in the county is inspected, and every result is public. In practice almost nobody finds them, because they sit on a database page three clicks deep.'),
      stat('1 in 20', 'diners say they have ever looked up an inspection score'),
      p('Cities that require a window card see inspection scores improve within a year. The county board is considering the change this quarter.'),
    ],
    why: 'A score nobody sees does not change behaviour. A score on the door does.',
    sources: [['Inspection result database', 'https://example.org/inspection-database'], ['Window card programme evaluation', 'https://example.org/window-card-evaluation']],
    raised: 3200,
    goal: 5000,
    backers: 96,
    days: 15,
    audience: 'Diners and restaurant owners in the county’s three largest towns.',
    matters: 'You choose where to eat every week with less information than the county already has.',
  },
  {
    key: 'heatstroke-signs',
    title: 'Teach neighbours to spot heatstroke before it happens',
    category: 'Safety',
    creator: 'Riverside Mutual Aid',
    short: 'Heatstroke looks like confusion, not collapse. A short, clear guide in the right feeds could prevent the next emergency.',
    story: [
      p('Heatstroke often begins quietly. People become confused, irritable or unusually tired, and bystanders assume they are just having a bad day.'),
      stat('2 hours', 'is about how long early signs can last before a medical emergency'),
      p('We have a one-page guide written with an emergency physician. This campaign puts it in front of older residents, outdoor workers and their families before the next heat wave.'),
    ],
    why: 'The guide already exists and is free. What is missing is the reach.',
    sources: [['Emergency physician review of the guide', 'https://example.org/heatstroke-guide-review']],
    raised: 960,
    goal: 2500,
    backers: 41,
    days: 28,
    audience: 'Adults over 60, outdoor workers and their families in the county.',
    matters: 'Knowing what confusion can mean on a hot day can save a neighbour.',
  },
  {
    key: 'bakery-tariff',
    title: 'What the new tariff really does to small bakeries',
    category: 'Economic Policy',
    creator: 'Joaquin Reyes',
    short: 'Flour, butter and packaging all moved. Here is the arithmetic for a ten-person bakery, with every number sourced.',
    story: [
      p('The new tariff schedule touches flour, packaging and imported butter. Individually the changes look small. Together they add up to a double-digit rise in the cost of a loaf.'),
      stat('+14%', 'estimated rise in the ingredient cost of a standard loaf'),
      p('We worked through the numbers with three local bakeries and published every assumption. The goal is for the arithmetic, not the slogans, to be in the conversation before the comment period closes.'),
    ],
    why: 'Policy debates move on slogans. Real invoices show what a change costs the shop on your corner.',
    sources: [['Tariff schedule amendment', 'https://example.org/tariff-amendment'], ['Bakery cost worksheet', 'https://example.org/bakery-cost-worksheet']],
    raised: 6400,
    goal: 10000,
    backers: 154,
    days: 11,
    audience: 'Small business owners and shoppers in cities with more than 50,000 people.',
    matters: 'The price of a loaf is the first place a trade policy reaches the kitchen table.',
  },
  {
    key: 'community-radio',
    title: 'Keep the 6am community radio news on air',
    category: 'Journalism',
    creator: 'KLOW Community Radio',
    short: 'The only local news bulletin in the valley loses its funding in March. Listeners decide whether it survives.',
    story: [
      p('For nineteen years KLOW has read the local news at six every morning: road closures, school delays, council decisions and the weather over the pass.'),
      stat('19 years', 'of uninterrupted morning bulletins'),
      p('A regional grant ends in March. We want to reach listeners who rely on the station but have never donated, and people in the valley who do not yet know it exists.'),
    ],
    why: 'A community learns about itself through its local news. When it goes, the information gap rarely closes.',
    sources: [['Station audience survey', 'https://example.org/klow-audience-survey']],
    raised: 2750,
    goal: 6000,
    backers: 119,
    days: 20,
    audience: 'Residents of the valley towns within the station’s broadcast range.',
    matters: 'Road closures and school delays reach you first from a voice you know.',
  },
  {
    key: 'flood-map',
    title: 'Open-source the flood map the city already paid for',
    category: 'Technology',
    creator: 'Ines Okafor',
    short: 'The city commissioned a detailed flood model in 2024. Residents can only see it as a flattened PDF. The data should be open.',
    story: [
      p('The city paid for a street-level flood model in 2024. It exists as a detailed dataset, but the public version is a flattened PDF where individual streets cannot be read.'),
      stat('2024', 'year the flood model was commissioned with public money'),
      p('Releasing the data would let residents, insurers and local developers check their own risk. Two neighbouring cities already publish theirs.'),
    ],
    why: 'A map that cannot be read does not protect anyone. Open data does.',
    sources: [['City flood model contract', 'https://example.org/flood-model-contract'], ['Open data policy comparison', 'https://example.org/open-data-comparison']],
    raised: 1200,
    goal: 3500,
    backers: 37,
    days: 24,
    audience: 'Homeowners and renters in the neighbourhoods near the river.',
    matters: 'You can only prepare for a risk if you can see it.',
  },
  {
    key: 'library-cards',
    title: 'Every child’s first library card',
    category: 'Education',
    creator: 'Greenfield Library Friends',
    owner: 'demo',
    short: 'A library card is free, but half the families in two districts have never been told. Funding is complete and ads are running.',
    story: [
      p('A library card is free for every child in the county. In two districts, more than half of families told us they did not know that.'),
      stat('52%', 'of families surveyed in two districts did not know cards are free'),
      p('This campaign reached its goal and its ads are now running, explaining how to get a card and what a first visit looks like.'),
    ],
    why: 'The service is already paid for. People only have to be told it exists.',
    sources: [['Library access survey', 'https://example.org/library-access-survey']],
    raised: 4000,
    goal: 4000,
    backers: 148,
    status: 'promoting',
    days: 0,
    audience: 'Parents of children under 12 in the two districts with the lowest card use.',
    matters: 'A first library card can be a child’s first piece of independence.',
  },
  {
    key: 'cheaper-water-test',
    title: 'How a quiet lab found a cheaper water test',
    category: 'Science',
    creator: 'Dr Anil Kapoor',
    owner: 'demo',
    short: 'A university lab cut the cost of a lead water test from forty dollars to four. This campaign told small towns it exists. Final report published.',
    story: [
      p('A small university lab developed a lead screening method that costs about four dollars per sample instead of forty. The method is open and tested, but small town water boards had not heard of it.'),
      stat('$4', 'per sample, down from about $40'),
      p('The campaign has finished. The final report shows delivery numbers measured by the ad platforms, and how many viewers followed through.'),
    ],
    why: 'Better science only helps people when the people who can use it hear about it.',
    sources: [['Method validation paper', 'https://example.org/lead-screening-method'], ['Cost comparison', 'https://example.org/water-test-costs']],
    raised: 5000,
    goal: 5000,
    backers: 176,
    status: 'completed',
    days: 0,
    audience: 'Water board members and municipal managers in towns under 20,000 people.',
    matters: 'A cheaper test means more towns can afford to check their water.',
  },
];

type DemoOwned = Omit<Seed, 'key'> & { key: string; status: CampaignStatus; review?: Campaign['review'] };

const demoOwned: DemoOwned[] = [
  {
    key: 'night-bus-tickets',
    title: 'Night-time bus tickets for shift workers',
    category: 'Civic',
    creator: 'Maya Rao',
    short: 'Hospital and warehouse shifts end after the last cheap fare. A night pass would fix it.',
    story: [
      p('Hospital cleaners, warehouse packers and bakers finish after the last discounted fare ends. Many pay double to get home.'),
      stat('2x', 'typical fare paid by workers finishing after 11pm'),
      p('The transit board can approve a night pass with one vote. This campaign puts the issue in front of the voters in the districts it would serve.'),
    ],
    why: 'The people who need this are asleep when the board meets. This reaches them where they scroll.',
    sources: [['Night shift commuter survey', 'https://example.org/night-shift-survey']],
    raised: 1150,
    goal: 3000,
    backers: 39,
    status: 'available_for_funding',
    days: 22,
    audience: 'Shift workers and their families in the northern districts.',
    matters: 'Getting home from work should not cost twice as much as getting there.',
  },
  {
    key: 'bike-lanes',
    title: 'Bike lanes that connect to the bus stops',
    category: 'Public Policy',
    creator: 'Maya Rao',
    short: 'Three separate bike lanes end a block short of the bus stop. Joining them is a small budget line.',
    story: [
      p('Three protected bike lanes end one block before the nearest bus stop. Riders then share a fast road with traffic for the last stretch.'),
      p('Joining them costs a small fraction of the transport budget and is already in the long-term plan, just not scheduled.'),
    ],
    why: 'Connected lanes are used. Disconnected ones are not.',
    sources: [['Bike lane network map', 'https://example.org/bike-lane-map']],
    raised: 0,
    goal: 2500,
    backers: 0,
    status: 'submitted',
    audience: 'Cyclists and bus commuters in the central districts.',
    matters: 'The last block decides whether people choose the bike.',
  },
  {
    key: 'mill-street-crossing',
    title: 'Fix the school crossing on Mill Street',
    category: 'Safety',
    creator: 'Maya Rao',
    short: 'Children cross four lanes with no signal. A signal and a refuge island are already budgeted.',
    story: [
      p('Every morning two hundred children cross four lanes on Mill Street with no signal.'),
      p('A signal and a refuge island have been in the budget for two years without a start date.'),
    ],
    why: 'It is a known, costed fix that needs a start date.',
    sources: [['Traffic count, Mill Street', 'https://example.org/mill-street-traffic']],
    raised: 0,
    goal: 1800,
    backers: 0,
    status: 'changes_requested',
    audience: 'Parents of students at the two Mill Street schools.',
    matters: 'A safe crossing is the simplest promise a street can make to a child.',
    review: {
      reviewedAt: ago(1),
      changeRequest: 'Please add a second source for the traffic count and shorten the headline so it reads clearly as an ad.',
    },
  },
];

function toCampaign(s: Seed | DemoOwned, ownerId: string, status: CampaignStatus, isDemo: boolean): Campaign {
  const created = ago(40);
  const published = ['available_for_funding', 'goal_reached', 'distribution_preparation', 'promoting', 'completed'].includes(status);
  const c: Campaign = {
    id: `cmp_${slugify(s.key).replace(/-/g, '')}`.slice(0, 22),
    slug: s.key,
    creatorId: ownerId,
    status,
    title: s.title,
    category: s.category,
    creatorName: s.creator,
    shortDescription: s.short,
    story: s.story,
    whyBackersCare: s.why,
    sources: s.sources.map(([title, url], i) => ({ id: `src_${s.key.slice(0, 8)}${i}`, title, url })),
    cover: { generated: true, alt: s.title },
    ad: { useOwn: false, headline: '', primaryText: '' },
    goalAmount: s.goal,
    fundingWindow: s.window ?? 30,
    targetAudience: s.audience,
    whyItMatters: s.matters,
    platforms: s.platforms ?? ['Facebook', 'Instagram'],
    reach: { locations: ['United States'], interests: [s.category], budget: (s.platforms ?? ['Facebook', 'Instagram']).length > 1 ? { Facebook: 60, Instagram: 40 } : { [(s.platforms ?? ['Facebook'])[0]]: 100 } },
    suggestedActions: ['Share this page with someone who should see it', 'Read the sources before you decide what you think'],
    storySummary: { about: s.short, whoFor: s.audience, whyMatters: s.matters, sameForBackers: true },
    raisedAmount: s.raised,
    backersCount: s.backers,
    featured: Boolean('featured' in s && s.featured),
    isDemo,
    review: ('review' in s && s.review) || {},
    submittedAt: status === 'draft' ? undefined : ago(36),
    publishedAt: published ? ago(22) : undefined,
    fundingEndsAt: status === 'available_for_funding' ? ahead(s.days ?? 20) : published ? ago(2) : undefined,
    createdAt: created,
    updatedAt: ago(1),
  };
  if (published) c.review = { reviewedAt: ago(30), notes: 'Approved in demo review.', trust: demoTrustReview(c) };
  return c;
}

export async function seedIfEmpty() {
  if ((await db.count('users')) > 0) return;

  const mk = async (name: string, email: string, password: string): Promise<User> => {
    const u: User = {
      id: `usr_${slugify(name).replace(/-/g, '').slice(0, 14)}`,
      email,
      passwordHash: await bcrypt.hash(password, 8),
      name,
      slug: slugify(name),
      joinedAt: ago(90),
      notificationPrefs: defaultPrefs(),
      publicProfile: defaultProfile(name),
    };
    await db.put('users', u);
    return u;
  };

  const demo = await mk('Maya Rao', DEMO_EMAIL, DEMO_PASSWORD);
  const curator = await mk('Platform Curator', 'curator@campaign.app', `locked-${Math.random()}`);

  const campaigns: Campaign[] = [];
  for (const s of seeds) {
    const status = s.status ?? 'available_for_funding';
    campaigns.push(toCampaign(s, s.owner === 'demo' ? demo.id : curator.id, status, true));
  }
  for (const s of demoOwned) campaigns.push(toCampaign(s, demo.id, s.status, false));
  for (const c of campaigns) await db.put('campaigns', c);

  const byKey = (k: string) => campaigns.find((c) => c.slug === k)!;

  // Reports for the finished campaigns so tracking screens have real content.
  const promoting = byKey('library-cards');
  const completed = byKey('cheaper-water-test');
  const reports: Report[] = [
    { id: 'rpt_seed1', campaignId: promoting.id, kind: 'milestone', title: 'Funding goal reached', body: 'The funding goal has been reached. Ads start only after distribution is prepared.', createdAt: ago(10) },
    { id: 'rpt_seed2', campaignId: promoting.id, kind: 'progress', title: 'Promotion has started', body: 'Ads are live. Delivery numbers below are early readings and will change.', metrics: metricsFor(promoting, 0.4, 'estimated'), createdAt: ago(4) },
    { id: 'rpt_seed3', campaignId: completed.id, kind: 'milestone', title: 'Funding goal reached', body: 'The funding goal has been reached.', createdAt: ago(35) },
    { id: 'rpt_seed4', campaignId: completed.id, kind: 'final', title: 'Final distribution report', body: 'The campaign has finished. These are the measured delivery results from the ad platforms (demo figures).', metrics: { ...metricsFor(completed, 1, 'measured'), perceptionShiftPct: 31 }, createdAt: ago(5) },
  ];
  for (const r of reports) await db.put('reports', r);

  const backed: [string, number, number][] = [['school-water-stations', 25, 9], ['winter-shelter', 10, 6], ['cheaper-water-test', 20, 33]];
  for (const [key, amount, days] of backed) {
    const c = byKey(key);
    const fee = Math.round((amount * 0.029 + 0.3) * 100) / 100;
    const con: Contribution = {
      id: `con_seed_${key.slice(0, 6)}`,
      campaignId: c.id,
      userId: demo.id,
      amount,
      fee,
      total: Math.round((amount + fee) * 100) / 100,
      estimatedReach: amount * 27,
      status: 'succeeded',
      showFirstName: false,
      receiptNo: `RCP-SEED-${key.slice(0, 3).toUpperCase()}`,
      createdAt: ago(days),
      updatedAt: ago(days),
    };
    await db.put('contributions', con);
  }

  const notes: Omit<Notification, 'id'>[] = [
    { userId: demo.id, category: 'reports', type: 'final_report', title: 'Final report is ready', body: 'The distribution report for "How a quiet lab found a cheaper water test" is available.', campaignId: completed.id, readAt: null, createdAt: ago(5) },
    { userId: demo.id, category: 'reports', type: 'promotion_started', title: 'Promotion has begun', body: 'Ads for "Every child’s first library card" are now running.', campaignId: promoting.id, readAt: null, createdAt: ago(4) },
    { userId: demo.id, category: 'campaigns', type: 'changes_requested', title: 'Changes requested', body: 'A reviewer left notes on "Fix the school crossing on Mill Street". Update it and resubmit.', campaignId: byKey('mill-street-crossing').id, readAt: null, createdAt: ago(1) },
    { userId: demo.id, category: 'funding', type: 'milestone_25', title: '25% of your goal is funded', body: '"Night-time bus tickets for shift workers" is now $1,150 of $3,000.', campaignId: byKey('night-bus-tickets').id, readAt: ago(0.5), createdAt: ago(2) },
    { userId: demo.id, category: 'campaigns', type: 'submission_received', title: 'Submission received', body: '"Bike lanes that connect to the bus stops" is in the review queue. Review usually takes about 24 hours.', campaignId: byKey('bike-lanes').id, readAt: ago(0.2), createdAt: ago(3) },
  ];
  for (const [i, nt] of notes.entries()) await db.put('notifications', { id: `ntf_seed${i}`, ...nt });

  const comments: Comment[] = [
    { id: 'com_seed1', campaignId: byKey('school-water-stations').id, userId: curator.id, authorName: 'Priya N.', body: 'Our district had no idea the state money existed. Sharing this with the board.', createdAt: ago(3) },
    { id: 'com_seed2', campaignId: byKey('school-water-stations').id, userId: curator.id, authorName: 'Tom A.', body: 'Good to see the sources listed. The second link answered my question about eligibility.', createdAt: ago(1) },
  ];
  for (const cm of comments) await db.put('comments', cm);
}
