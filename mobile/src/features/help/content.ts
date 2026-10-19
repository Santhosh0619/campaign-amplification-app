// Plain-language help content. Kept as data so every help page shares one layout.

export type HelpSection = { title: string; body: string[] };
export type HelpTopic = { title: string; intro: string; sections: HelpSection[] };

export const helpTopics: Record<string, HelpTopic> = {
  'how-it-works': {
    title: 'How it works',
    intro: 'Three steps take a message from one person’s idea to people who have never heard it.',
    sections: [
      { title: '1. Create', body: ['A creator writes the message, lists the sources behind it and says who it should reach. Drafts save automatically and stay private until submitted.'] },
      { title: '2. Review', body: ['A reviewer checks the claims against the sources before anything is published or advertised. Nothing goes live, and no ads run, until review is complete.'] },
      { title: '3. Amplify', body: ['Backers contribute a few dollars each. Together it pays for ads that carry the message to people outside the creator’s network. Everyone who backs a campaign gets a report.'] },
      { title: 'Is this a donation?', body: ['No. A contribution pays for the message to be shown to more people. It does not pay for the cause, person or organisation the message is about.'] },
    ],
  },
  'how-we-review': {
    title: 'How we review campaigns',
    intro: 'Every campaign is checked before it is published.',
    sections: [
      { title: 'Fact-checking', body: ['Reviewers open the listed sources and check that the main claims are backed by them.'] },
      { title: 'Communication integrity', body: ['Does the message acknowledge complexity and present a balanced framing? Reviewers look at fairness across several dimensions.'] },
      { title: 'Shared reality', body: ['Could people who disagree still read this together? Messages that help people think across divides score higher.'] },
      { title: 'What a score means', body: ['A score reflects reviewer judgement of the evidence and framing. It is not a guarantee of accuracy. If an assessment has not been scored yet, we say so rather than showing a number.'] },
    ],
  },
  'why-fund': {
    title: 'Why fund a campaign',
    intro: 'Strengthen your community by helping reviewed, sourced messages reach people outside their usual circles.',
    sections: [
      { title: 'Creators', body: ['Individuals and organisations with a message worth amplifying. They write it, source it and submit it for review.'] },
      { title: 'Backers', body: ['People who contribute so that reviewed content reaches people outside their own bubble. Names stay private unless you choose to show your first name.'] },
      { title: 'Audience', body: ['People who see a campaign in their feed and can read the full story and its sources before deciding what they think.'] },
      { title: 'One account', body: ['You can be all three. There are no separate logins for creators, backers or readers.'] },
    ],
  },
  faq: {
    title: 'FAQ and help',
    intro: 'Short answers to common questions.',
    sections: [
      { title: 'Is it free to create a campaign?', body: ['Yes. Creating a draft and submitting it for approval is free. A platform fee applies only when an approved campaign raises money.'] },
      { title: 'How is my support spent?', body: ['About 80% goes to ads that show the message. About 20% is the platform fee. A card processing fee of roughly 2.9% + $0.30 is added at checkout so you always see the total first.'] },
      { title: 'How long does review take?', body: ['Usually about 24 hours. You are notified when there is a decision or when changes are requested.'] },
      { title: 'When do ads start?', body: ['Contributions are used for ads once the campaign passes 25% of its goal and distribution is prepared. Reaching the goal does not start ads by itself.'] },
      { title: 'Can I get a refund?', body: ['You can ask for a refund until the campaign’s activation date. After ads start, funds are committed to delivery.'] },
      { title: 'How long do campaigns run?', body: ['You choose a funding window of 14, 30, 45 or 60 days, or no deadline.'] },
      { title: 'Is my information secure?', body: ['Payments in this prototype are simulated and no card details are collected. Backer names are private by default.'] },
    ],
  },
  partners: {
    title: 'Partners',
    intro: 'Who the platform is built to work with.',
    sections: [
      { title: 'Content creators', body: ['Reach audiences beyond your followers with a message your community funds.'] },
      { title: 'Journalists and media', body: ['Let readers fund the reach of a story they want told.'] },
      { title: 'Non-profits', body: ['Carry your evidence to people who have not yet heard from you.'] },
      { title: 'Small businesses', body: ['Share a message about your community or industry with new local audiences.'] },
    ],
  },
  legal: {
    title: 'About, contact and policies',
    intro: 'Campaign is a community-funded way to get a message in front of people outside your own network.',
    sections: [
      { title: 'About', body: ['Campaign is a mobile-first take on a community-funded message amplification platform. Payments in this version are simulated.'] },
      { title: 'Contact', body: ['There is no live support desk yet. Send questions to the team that shared this app with you.'] },
      { title: 'Terms of service', body: ['By submitting a campaign you confirm every claim is one you can stand behind and that you have the right to use the images you upload. Editing an approved campaign sends it back for review.'] },
      { title: 'Privacy', body: ['Targeting uses grouped location, interests and age ranges, never personal information about individuals. Your payment details are never stored in this prototype.'] },
      { title: 'Community guidelines', body: ['Be accurate and fair, cite your sources, and respect the people your message is about. Content that cannot be backed by its sources is not approved.'] },
    ],
  },
};
