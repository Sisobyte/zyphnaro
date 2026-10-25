// Example results for the hero demo. These are illustrations of what Zyphnaro
// shows, not live listings: the companies are invented and the page says so.

export interface DemoMatch {
  title: string;
  company: string;
  where: string;
  score: number;
  skills: string[];
  /** One honest thing worth checking, shown in amber. */
  watch?: string;
}

export interface DemoProfession {
  id: string;
  label: string;
  read: number;
  inField: number;
  fit: number;
  matches: DemoMatch[];
}

export const PROFESSIONS: DemoProfession[] = [
  {
    id: "va",
    label: "Virtual assistant",
    read: 1284,
    inField: 212,
    fit: 37,
    matches: [
      { title: "Virtual Assistant, Calendar and Inbox", company: "Harbor Studio", where: "Remote, worldwide", score: 94, skills: ["Scheduling", "Email Management", "Google Workspace"] },
      { title: "Executive Assistant", company: "Kestrel Advisory", where: "Remote, Africa", score: 88, skills: ["Calendar Management", "Travel Booking", "Excel"] },
      { title: "Customer Support Associate", company: "Lumen Retail", where: "Lagos", score: 81, skills: ["Customer Support", "Zendesk", "Live Chat Support"] },
      { title: "Operations Assistant", company: "Delta Freight", where: "Hybrid, Abuja", score: 74, skills: ["Scheduling", "Logistics"], watch: "Asks for 3 years of experience. Your CV shows 2." },
    ],
  },
  {
    id: "nurse",
    label: "Nurse",
    read: 1912,
    inField: 340,
    fit: 58,
    matches: [
      { title: "Registered Nurse, Medical-Surgical", company: "St. Anne's Hospital", where: "On-site, Manchester", score: 92, skills: ["Patient Care", "Wound Care", "BLS"] },
      { title: "Community Health Nurse", company: "Riverside Health Trust", where: "On-site, Leeds", score: 86, skills: ["Patient Care", "Community Health", "Health Education"] },
      { title: "Clinic Nurse", company: "Northgate Medical Group", where: "Hybrid, Birmingham", score: 79, skills: ["Medication Administration", "Vital Signs Monitoring"] },
      { title: "ICU Staff Nurse", company: "Crown General", where: "On-site, London", score: 71, skills: ["Patient Care", "ACLS"], watch: "Requires ACLS certification. It isn't on your profile yet." },
    ],
  },
  {
    id: "electrician",
    label: "Electrician",
    read: 986,
    inField: 143,
    fit: 29,
    matches: [
      { title: "Commercial Electrician", company: "Brightline Contracting", where: "On-site, Accra", score: 93, skills: ["Electrical Installation", "Health and Safety", "Cable Installation"] },
      { title: "Maintenance Electrician", company: "Meridian Plant Services", where: "On-site, Port Harcourt", score: 85, skills: ["Equipment Maintenance", "Electrical Wiring"] },
      { title: "Solar Installer", company: "Sunroute Energy", where: "On-site, Kumasi", score: 78, skills: ["Solar Installation", "Electrical Wiring"] },
      { title: "Electrical Supervisor", company: "Ironwood Builders", where: "On-site, Lagos", score: 69, skills: ["Site Supervision", "Electrical Installation"], watch: "Supervisory role. It asks for team-lead experience." },
    ],
  },
  {
    id: "teacher",
    label: "Teacher",
    read: 1431,
    inField: 266,
    fit: 44,
    matches: [
      { title: "Primary School Teacher", company: "Oakfield Academy", where: "On-site, Nairobi", score: 95, skills: ["Lesson Planning", "Classroom Management", "Phonics"] },
      { title: "Online English Tutor", company: "Lingua Bridge", where: "Remote, worldwide", score: 87, skills: ["Online Tutoring", "Teaching English"] },
      { title: "Curriculum Developer", company: "Mapleton Learning", where: "Remote, Africa", score: 80, skills: ["Curriculum Development", "Instructional Design"] },
      { title: "Special Needs Teaching Assistant", company: "Willow Park School", where: "On-site, Kampala", score: 72, skills: ["Special Education", "Childcare"], watch: "Prefers a special-education certificate." },
    ],
  },
  {
    id: "developer",
    label: "Software developer",
    read: 2603,
    inField: 689,
    fit: 91,
    matches: [
      { title: "Frontend Developer", company: "Fieldnote", where: "Remote, EMEA", score: 96, skills: ["React", "TypeScript", "Tailwind CSS"] },
      { title: "Full-Stack Engineer", company: "Quillworks", where: "Remote, worldwide", score: 89, skills: ["Node.js", "PostgreSQL", "React"] },
      { title: "Mobile Developer", company: "Tallow Labs", where: "Hybrid, Lagos", score: 82, skills: ["React Native", "TypeScript"] },
      { title: "Backend Engineer", company: "Arcadia Pay", where: "Remote, US only", score: 55, skills: ["Node.js", "AWS"], watch: "Open to US residents only. Capped at 55 for your location." },
    ],
  },
  {
    id: "accountant",
    label: "Accountant",
    read: 1177,
    inField: 198,
    fit: 33,
    matches: [
      { title: "Accounts Officer", company: "Cedarway Group", where: "On-site, Lagos", score: 91, skills: ["Bookkeeping", "QuickBooks", "Accounts Payable"] },
      { title: "Financial Reporting Analyst", company: "Anchor and Vale", where: "Hybrid, Nairobi", score: 84, skills: ["Financial Reporting", "IFRS", "Excel"] },
      { title: "Remote Bookkeeper", company: "Pennywise Studio", where: "Remote, worldwide", score: 80, skills: ["Bookkeeping", "Xero", "Reconciliation"] },
      { title: "Tax Associate", company: "Greaves and Co", where: "On-site, Abuja", score: 70, skills: ["Tax Preparation", "Taxation"], watch: "Peak-season contract, not permanent." },
    ],
  },
];
