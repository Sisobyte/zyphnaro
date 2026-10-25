// The skills Zyphnaro can recognise in a job posting or a CV, grouped by field.
// Zyphnaro is for every profession, so this list deliberately covers far more
// than tech: trades, health, education, law, finance, hospitality, agriculture,
// transport, languages and more.
//
// FORMAT: each entry is "Canonical name|alias|alias". The canonical name is what
// is stored and shown. Aliases are other spellings that count as the same skill
// (so "MS Excel" on a CV and "Microsoft Excel" in a posting both become "Excel").
//
// RULES FOR ADDING ENTRIES
//  - Prefer specific skills ("Lesson Planning") over generic words ("Planning",
//    "Management", "Sales", "Design", "Care"). Generic words appear in almost
//    every posting, so they say nothing about fit.
//  - If a skill's name is also an ordinary English word, give it a stricter
//    pattern in PATTERN_OVERRIDES (skill-vocabulary.ts) or use a more specific
//    alias, e.g. "German Language" and not bare "German".
//  - Keep one canonical name per skill. Put synonyms in as aliases.
//  - After editing, run `npm run sync:sources` so existing listings are re-read.

export const SKILL_CATALOG: Record<string, string[]> = {
  "Software engineering": [
    "React|React.js|ReactJS", "TypeScript", "JavaScript", "Python", "Java", "Node.js|NodeJS", "SQL",
    "AWS|Amazon Web Services", "Azure|Microsoft Azure", "Google Cloud|GCP", "Docker", "Kubernetes|K8s",
    "Terraform", "Next.js|NextJS", "Vue|Vue.js", "Angular", "React Native", "Flutter", "HTML|HTML5", "CSS|CSS3",
    "Tailwind CSS|Tailwind", "GraphQL", "REST APIs|REST API|RESTful", "PostgreSQL|Postgres", "MySQL", "MongoDB",
    "Redis", "Linux", "Git|GitHub|GitLab", "CI/CD", "DevOps", "Machine Learning", "Deep Learning", "PyTorch",
    "TensorFlow", "Data Engineering", "Swift", "Kotlin", "Go", "Ruby", "Ruby on Rails", "Rust", "PHP",
    "Laravel", "Django", "Flask", "FastAPI", "Spring Boot", ".NET|dotnet", "C#", "C++", "Scala", "Elixir",
    "Android Development|Android", "iOS Development|iOS", "WordPress", "Shopify", "Webflow", "Microservices",
    "System Design", "Software Architecture", "Unit Testing", "Test Automation", "Selenium", "Cypress",
    "QA Testing|Quality Assurance Testing", "Agile", "Scrum", "Jira", "Kafka", "Firebase", "Supabase",
    "Blockchain", "Solidity", "Smart Contracts", "Web3", "Game Development", "Unity", "Unreal Engine",
    "Embedded Systems", "Firmware", "API Development", "Web Development", "Mobile App Development",
  ],
  "Data and AI": [
    "Excel|MS Excel|Microsoft Excel", "Google Sheets", "Tableau", "Power BI", "Looker", "Data Analysis|Data Analytics",
    "Data Visualization|Data Visualisation", "SQL Reporting", "Google Analytics", "A/B Testing", "Statistics",
    "Forecasting", "R Programming", "SPSS", "SAS", "Data Science", "Data Modeling", "ETL", "Data Warehousing",
    "Snowflake", "BigQuery", "Spark|Apache Spark", "Hadoop", "NLP|Natural Language Processing", "Computer Vision",
    "Generative AI|GenAI", "Prompt Engineering", "LLMs|Large Language Models", "MLOps", "Business Intelligence|BI Reporting",
    "Data Cleaning", "Data Entry", "Survey Design", "Statistical Modeling", "Econometrics",
  ],
  "IT support and security": [
    "IT Support|Technical Support|Help Desk", "Network Administration|Networking", "Cisco", "CCNA", "Windows Server",
    "Active Directory", "Microsoft 365|Office 365", "System Administration|Sysadmin", "Cybersecurity|Cyber Security|Information Security",
    "Penetration Testing|Pentesting", "SIEM", "Firewall", "VPN", "Cloud Security", "ITIL", "Hardware Repair",
    "Troubleshooting", "Database Administration", "VMware", "Technical Writing",
  ],
  "Design and creative": [
    "Figma", "Adobe Creative Suite|Adobe CC", "Photoshop|Adobe Photoshop", "Illustrator|Adobe Illustrator",
    "InDesign", "After Effects", "Premiere Pro", "Canva", "UI Design|User Interface Design", "UX Design|User Experience Design",
    "UX Research|User Research", "Prototyping", "Wireframing", "Graphic Design", "Logo Design", "Branding",
    "Illustration", "Motion Graphics", "Video Editing", "Video Production", "Photography|Photographer", "Photo Editing",
    "3D Modeling|3D Modelling", "Blender", "AutoCAD", "SketchUp", "Revit", "Interior Design", "Fashion Design",
    "Pattern Making", "Tailoring|Tailor|Sewing", "Textile Design", "Product Design", "Industrial Design", "Animation",
    "Sound Design", "Audio Editing", "Music Production", "Podcast Production", "Cinematography", "Set Design",
  ],
  "Marketing and content": [
    "SEO|Search Engine Optimization", "SEM|Search Engine Marketing", "Content Marketing", "Content Strategy",
    "Content Creation", "Social Media Marketing", "Social Media Management", "Community Management",
    "Copywriting", "Email Marketing", "Brand Strategy", "Google Ads|Google AdWords", "Facebook Ads|Meta Ads",
    "TikTok Marketing", "Influencer Marketing", "Affiliate Marketing", "HubSpot", "Mailchimp", "CRM",
    "Market Research", "Digital Marketing", "Performance Marketing", "Marketing Automation", "Public Relations",
    "Event Planning|Event Management", "Product Marketing", "Growth Marketing", "Campaign Management",
    "Marketing Analytics", "Brand Management", "Media Planning", "Newsletter Writing", "Blogging",
  ],
  "Sales and business": [
    "Salesforce", "Business Development", "Account Management", "Negotiation", "Lead Generation", "Cold Outreach",
    "Client Relations|Client Relationship Management", "Customer Success", "B2B Sales", "B2C Sales", "Inside Sales",
    "Field Sales", "Sales Strategy", "Retail Sales", "Key Account Management", "Territory Management",
    "Pipeline Management", "Merchandising", "Visual Merchandising", "Category Management", "E-commerce|Ecommerce",
    "Amazon Seller|Amazon FBA", "Dropshipping", "Point of Sale|POS Systems", "Cash Handling", "Upselling",
    "Business Analysis|Business Analyst", "Strategic Planning", "Business Plan Writing", "Consulting", "Entrepreneurship",
    "Stakeholder Management", "Product Management", "Product Roadmapping", "OKRs",
  ],
  "Administration and customer service": [
    "Scheduling", "Calendar Management", "Email Management", "Customer Support", "Customer Service", "Zendesk",
    "Intercom", "Live Chat Support|Chat Support", "Call Center|Call Centre", "Telemarketing", "Receptionist Duties|Front Desk",
    "Project Management", "Project Coordination", "Logistics", "Procurement", "Vendor Management",
    "Process Improvement", "Process Automation", "Workflow Automation", "Zapier", "Make.com", "Airtable",
    "Notion", "Asana", "Trello", "Slack", "Google Workspace|G Suite", "Microsoft Office|MS Office",
    "Microsoft Word|MS Word", "PowerPoint|Microsoft PowerPoint", "Transcription", "Time Management", "Data Entry Clerk",
    "Records Management", "Filing", "Minute Taking|Minutes Taking", "Travel Booking|Travel Coordination", "Office Administration|Administrative Support",
    "Executive Assistance|Executive Assistant Duties", "Document Management", "Bookings Management", "Office Management",
  ],
  "Finance and accounting": [
    "Bookkeeping", "QuickBooks", "Xero", "Sage Accounting", "Financial Modeling|Financial Modelling", "Financial Reporting",
    "Financial Analysis", "Accounts Payable", "Accounts Receivable", "Budgeting", "Payroll", "Tax Preparation",
    "Taxation|Tax Compliance", "Auditing|Internal Audit", "IFRS", "GAAP", "Reconciliation|Bank Reconciliation",
    "Cost Accounting", "Management Accounting", "Treasury", "Credit Analysis", "Risk Management", "Investment Analysis",
    "Portfolio Management", "Equity Research", "Banking Operations|Retail Banking", "Loan Processing|Loan Origination",
    "Mortgage Processing", "Insurance Underwriting|Underwriting", "Claims Processing|Claims Handling", "Actuarial Analysis",
    "Anti-Money Laundering|AML", "KYC|Know Your Customer", "Fundraising", "Grant Writing", "Invoicing", "Fintech",
  ],
  "Human resources and recruiting": [
    "Recruiting|Recruitment", "Onboarding", "HRIS", "Employee Relations", "Talent Acquisition", "Interviewing",
    "Performance Management", "Compensation and Benefits|Compensation & Benefits", "Training and Development|Learning and Development",
    "HR Policy", "Labour Law|Labor Law|Employment Law", "Workforce Planning", "Headhunting|Executive Search", "Applicant Tracking Systems|ATS",
    "Conflict Resolution", "Payroll Administration", "Employee Engagement", "Diversity and Inclusion",
  ],
  "Legal and compliance": [
    "Compliance", "Contract Drafting|Contract Review", "Legal Research", "Litigation", "Corporate Law", "Intellectual Property",
    "Paralegal Duties", "Legal Writing", "Regulatory Affairs", "Data Protection|GDPR", "Conveyancing", "Arbitration",
    "Notary Services", "Legal Compliance", "Policy Analysis", "Case Management", "Criminal Law", "Family Law",
  ],
  "Healthcare": [
    "Patient Care", "Nursing|Registered Nurse", "Midwifery", "Medical Billing", "Medical Coding", "Clinical Research",
    "Phlebotomy", "Triage", "Vital Signs Monitoring", "Wound Care", "Medication Administration", "BLS|Basic Life Support",
    "ACLS|Advanced Cardiac Life Support", "CPR|Cardiopulmonary Resuscitation", "First Aid", "Electronic Health Records|EHR|EMR",
    "Pharmacy|Pharmacist", "Dispensing Medication|Dispensing", "Dentistry|Dental Care", "Dental Hygiene", "Physiotherapy|Physical Therapy",
    "Occupational Therapy", "Radiography|Radiology", "Ultrasound", "Medical Laboratory|Laboratory Testing", "Anaesthesia|Anesthesia",
    "Surgery|Surgical Assistance", "Emergency Medicine", "General Practice", "Paediatrics|Pediatrics", "Obstetrics and Gynaecology|Obstetrics",
    "Mental Health Counselling|Psychotherapy", "Clinical Psychology", "Public Health", "Epidemiology", "Community Health",
    "Health Education", "Infection Control", "Elderly Care|Geriatric Care", "Home Care|Caregiving", "Caregiver Duties",
    "Medical Records", "Nutrition|Dietetics", "Optometry", "Veterinary Care|Veterinary Medicine", "Medical Device Sales",
    "Healthcare Administration", "Patient Education", "HIPAA",
  ],
  "Education and training": [
    "Teaching|Teacher", "Lesson Planning", "Curriculum Development", "Classroom Management", "Student Assessment", "Tutoring|Tutor",
    "Special Education", "Early Childhood Education|Early Years", "Primary Education", "Secondary Education",
    "Higher Education", "Lecturing", "Academic Research", "Educational Technology|EdTech", "Online Teaching|Online Tutoring",
    "TEFL|TESOL|Teaching English", "Montessori", "Phonics", "Mathematics Teaching|Maths Teaching", "Science Teaching",
    "Instructional Design", "E-learning Development|eLearning", "Corporate Training", "Coaching", "Mentoring", "Career Counselling|Career Guidance",
    "Education Administration|School Administration", "Childcare|Child Care", "Nannying|Nanny Duties", "Public Speaking", "Facilitation",
    "Exam Preparation", "Academic Writing", "Library Management|Librarianship",
  ],
  "Engineering": [
    "Civil Engineering", "Structural Engineering", "Mechanical Engineering", "Electrical Engineering", "Electronics Engineering",
    "Chemical Engineering", "Industrial Engineering", "Petroleum Engineering", "Mining Engineering", "Environmental Engineering",
    "Biomedical Engineering", "Aerospace Engineering", "Automotive Engineering", "Project Engineering", "Site Engineering",
    "CAD|Computer-Aided Design", "SolidWorks", "MATLAB", "PLC Programming|PLC", "SCADA", "Control Systems", "Circuit Design",
    "Power Systems", "Renewable Energy", "Solar Installation|Solar PV", "HVAC Design", "Geotechnical Engineering", "Surveying|Land Surveying",
    "GIS|Geographic Information Systems", "Quantity Surveying", "Cost Estimation|Estimating", "Technical Drawing|Blueprint Reading",
    "Finite Element Analysis|FEA", "Reliability Engineering", "Process Engineering", "Instrumentation",
  ],
  "Construction and skilled trades": [
    "Plumbing|Plumber", "Pipefitting", "Electrical Installation|Electrical Wiring|Wiring", "Electrician Duties|Electrician", "Carpentry|Carpenter|Joinery",
    "Welding|Welder", "Arc Welding|MIG Welding|TIG Welding", "Bricklaying|Bricklayer|Masonry", "Plastering", "Tiling|Tile Laying", "Painting and Decorating|Painting",
    "Roofing", "Scaffolding", "Concrete Work|Concreting", "Steel Fixing|Steel Fabrication", "Fabrication", "Machining|CNC Machining", "CNC Operation|CNC",
    "Lathe Operation", "HVAC|Air Conditioning|Refrigeration", "Generator Repair|Generator Maintenance", "Mechanical Maintenance|Maintenance Technician",
    "Automotive Repair|Auto Mechanic|Vehicle Repair", "Motorcycle Repair", "Diesel Mechanics", "Heavy Equipment Operation|Excavator Operation",
    "Crane Operation", "Forklift Operation|Forklift", "Building Construction", "Site Supervision|Site Management", "Health and Safety|HSE|OSHA",
    "Safety Inspection", "Drywall", "Flooring", "Glazing", "Landscaping", "Gardening", "Pest Control", "Locksmith", "Fire Safety",
    "Cable Installation", "Fibre Optic Installation|Fiber Optic Installation", "Telecom Installation", "Solar Panel Installation", "Plant Operation",
    "Equipment Maintenance", "Machine Operation|Machine Operator", "Boiler Maintenance",
  ],
  "Manufacturing and production": [
    "Quality Control", "Quality Assurance", "Lean Manufacturing", "Six Sigma", "Production Planning", "Production Supervision",
    "Assembly Line", "Packaging", "Inventory Control", "Warehouse Operations|Warehousing", "Supply Chain Management|Supply Chain",
    "ERP|SAP", "Oracle", "Kaizen", "5S", "Root Cause Analysis", "ISO 9001", "GMP|Good Manufacturing Practice", "Food Safety|HACCP",
    "Textile Production", "Printing", "Bottling", "Fabric Cutting",
  ],
  "Transport and logistics": [
    "Freight Forwarding", "Customs Clearance|Customs Brokerage", "Fleet Management", "Route Planning", "Dispatching|Dispatch",
    "Truck Driving|HGV Driving|Class A CDL|CDL", "Delivery Driving|Courier Services", "Driver's Licence|Driving Licence|Driving License", "Chauffeur Services",
    "Cargo Handling", "Port Operations", "Maritime Operations|Seafaring", "Aviation Operations", "Pilot Licence|Commercial Pilot",
    "Cabin Crew|Flight Attendant", "Air Traffic Control", "Aircraft Maintenance", "Ground Handling", "Railway Operations", "Last-Mile Delivery",
    "Stock Control", "Order Picking|Picking and Packing", "Stores Management", "Demand Planning", "Import and Export|Import/Export",
  ],
  "Hospitality, food and tourism": [
    "Cooking|Culinary Arts|Chef", "Food Preparation", "Baking|Pastry", "Catering", "Menu Planning", "Kitchen Management", "Barista Skills|Barista",
    "Bartending|Bartender|Mixology", "Waiting Tables|Table Service", "Food Service", "Hotel Management", "Front Office Operations", "Housekeeping",
    "Guest Relations", "Concierge Services", "Reservations Management", "Revenue Management", "Event Catering", "Tour Guiding|Tour Guide",
    "Travel Planning|Travel Consulting", "Ticketing", "Restaurant Management", "Food Costing", "Butchery", "Hospitality Management",
  ],
  "Beauty, wellness and fitness": [
    "Hairdressing|Hairdresser|Hair Styling", "Barbering|Barber", "Braiding", "Makeup Artistry|Makeup Artist", "Nail Technician|Manicure", "Skincare|Esthetician",
    "Massage Therapy", "Spa Therapy", "Personal Training|Personal Trainer", "Fitness Instruction", "Yoga Instruction|Yoga", "Pilates",
    "Sports Coaching", "Nutrition Coaching", "Lash Technician",
  ],
  "Agriculture, environment and energy": [
    "Crop Production", "Farm Management", "Livestock Management|Animal Husbandry", "Poultry Farming", "Fish Farming|Aquaculture", "Agronomy",
    "Irrigation", "Horticulture", "Agribusiness", "Soil Science", "Agricultural Extension", "Food Processing", "Environmental Impact Assessment|EIA",
    "Waste Management", "Water Treatment", "Sustainability", "ESG", "Conservation", "Forestry", "Oil and Gas|Oil & Gas", "Drilling Operations",
    "Pipeline Operations", "Wellsite Operations", "Mining Operations", "Geology", "Power Plant Operations", "Climate Analysis",
  ],
  "Real estate and property": [
    "Property Management", "Real Estate Sales", "Real Estate Valuation|Property Valuation", "Leasing", "Facilities Management", "Property Inspection",
    "Estate Agency", "Tenant Relations", "Building Maintenance", "Mortgage Advising",
  ],
  "Security and public service": [
    "Security Operations|Security Guard Duties", "CCTV Monitoring|CCTV", "Loss Prevention", "Risk Assessment", "Emergency Response", "Firefighting",
    "Law Enforcement", "Intelligence Analysis", "Customs Enforcement", "Military Service", "Public Administration",
    "Policy Development", "Public Policy", "Grant Management", "Government Relations",
  ],
  "Social work and development": [
    "Social Work", "Case Work", "Community Outreach", "Counselling|Counseling", "Child Protection", "Youth Work", "Humanitarian Aid",
    "Programme Management|Program Management", "Monitoring and Evaluation|M&E", "NGO Management", "Advocacy", "Volunteer Coordination",
    "Crisis Intervention", "Disability Support", "Refugee Support", "Social Research", "Fundraising Campaigns", "Needs Assessment",
  ],
  "Media, writing and languages": [
    "Journalism", "Editing", "Proofreading", "Content Writing", "Creative Writing", "Scriptwriting", "Ghostwriting",
    "Translation|Translator", "Interpreting|Interpreter", "Localization|Localisation", "Subtitling", "Broadcasting", "Voice-over|Voiceover",
    "Radio Production", "Publishing", "Research Writing", "Speech Writing", "Technical Documentation",
    "French Language|French Speaking|Fluent French", "German Language|German Speaking|Fluent German|Deutschkenntnisse|Deutsch",
    "Spanish Language|Spanish Speaking|Fluent Spanish", "Portuguese Language|Portuguese Speaking", "Arabic Language|Arabic Speaking|Fluent Arabic",
    "Mandarin Chinese|Mandarin Speaking", "Italian Language|Italian Speaking", "Dutch Language|Dutch Speaking", "Swahili", "Yoruba", "Igbo", "Hausa",
  ],
  "Science and research": [
    "Laboratory Techniques|Lab Techniques", "Clinical Trials", "Research Methodology|Research Methods", "Chemistry", "Biology", "Microbiology",
    "Biochemistry", "Molecular Biology", "PCR", "Chromatography", "Physics", "Quality Control Testing", "Scientific Writing", "Data Collection",
    "Field Research", "Peer Review", "Statistical Analysis", "Pharmaceutical Research", "Biotechnology", "Genomics",
  ],
  "Arts, music and performance": [
    "Acting", "Singing|Vocal Performance", "Music Performance", "Piano", "Guitar", "Songwriting", "Dancing|Choreography", "Event Hosting|Emcee",
    "Stage Management", "Art Direction", "Curating", "Fine Art",
  ],
};
