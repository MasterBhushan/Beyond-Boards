-- =============================================
-- BEYOND BOARDS — SUPABASE SCHEMA
-- Paste this into: Supabase → SQL Editor → Run
-- =============================================

-- 1. Sessions (anonymous users, one per device)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Careers (content from your App.js, now in DB so you can edit without redeploying)
CREATE TABLE IF NOT EXISTS careers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  color TEXT NOT NULL,
  wiring TEXT[] NOT NULL,
  roadmap JSONB NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Watch events (THE core engagement data — this is your algorithm input)
CREATE TABLE IF NOT EXISTS watch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  career_id TEXT REFERENCES careers(id),
  seconds_watched INT DEFAULT 0,
  is_saved BOOLEAN DEFAULT FALSE,
  opened_youtube BOOLEAN DEFAULT FALSE,
  viewed_roadmap BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, career_id)
);

-- 4. Wiring reports (computed results, saved so user can revisit)
CREATE TABLE IF NOT EXISTS wiring_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  wiring JSONB NOT NULL,
  top_careers JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for speed
CREATE INDEX IF NOT EXISTS idx_watch_session ON watch_events(session_id);
CREATE INDEX IF NOT EXISTS idx_report_session ON wiring_reports(session_id);

-- =============================================
-- SEED — All 10 careers from your App.js
-- =============================================
INSERT INTO careers (id, name, emoji, title, description, youtube_id, color, wiring, roadmap, display_order) VALUES

('doctor','Doctor','🩺','The Harsh Truth of Being a Doctor in India',
'Raw. Real. No filter. Dr. Anuj Pachhel breaks down what medical life actually looks like.',
'xTexCkSI1Sc','#4FC3F7',ARRAY['impact','precision','endurance'],
'{"subjects":["Biology (mandatory)","Chemistry","Physics","English"],"exams":["NEET-UG","AIIMS (via NEET)","JIPMER (via NEET)"],"colleges":["AIIMS New Delhi","CMC Vellore","JIPMER Puducherry","MAMC Delhi"],"timeline":[{"year":"Class 11-12","task":"Take PCB stream. Focus hard on Biology and Chemistry."},{"year":"Age 17-18","task":"Start NEET prep. Join coaching or self-study."},{"year":"After 12th","task":"Crack NEET. Score 600+ for govt MBBS seat."},{"year":"Age 18-23","task":"5.5 year MBBS including 1 year internship."},{"year":"Age 23+","task":"MD/MS specialization or start practice."}],"tip":"NEET is everything. Start Biology from Class 11 Day 1 — most toppers study 4 hours daily for 2 years."}',
1),

('engineer','Engineer','💻','Day in the Life of a Software Engineer in India',
'Pune office, real work, real commute. Engineering at a tech company — unfiltered.',
'x6KrgPSiHzg','#5A7BFF',ARRAY['precision','logic','creation'],
'{"subjects":["Mathematics (mandatory)","Physics","Computer Science","English"],"exams":["JEE Main","JEE Advanced (for IITs)","MHT-CET","BITSAT"],"colleges":["IIT Bombay","IIT Delhi","BITS Pilani","NIT Trichy","VIT Vellore"],"timeline":[{"year":"Class 11-12","task":"Take PCM stream. Maths and Physics are your foundation."},{"year":"Age 16-18","task":"Start JEE coaching. Solve NCERT + previous year papers."},{"year":"After 12th","task":"Clear JEE Main for NITs, JEE Advanced for IITs."},{"year":"Age 18-22","task":"4 year B.Tech. Do internships from 2nd year itself."},{"year":"Age 22+","task":"Campus placement or build projects for product companies."}],"tip":"Your GitHub profile matters more than your college after 2 years of work. Start coding real projects from 1st year."}',
2),

('artist','Visual Artist','🎨','A Day In The Life of a UI/UX Designer',
'7-day design challenge. Real briefs. Real deadlines. Real creative pressure.',
'_y9sgKEkrJY','#CE93D8',ARRAY['creation','expression','aesthetics'],
'{"subjects":["Fine Arts or any stream","English","Computer Science (helpful)"],"exams":["NID DAT","UCEED (for IIT design)","NIFT Entrance","CEED (postgrad)"],"colleges":["NID Ahmedabad","IIT Bombay IDC","NIFT Delhi","Srishti Bangalore"],"timeline":[{"year":"Class 11-12","task":"Any stream works. Start building a design portfolio NOW."},{"year":"Age 16-18","task":"Learn Figma, Canva, Photoshop. Do free design projects."},{"year":"After 12th","task":"Crack NID DAT or UCEED. Both need design thinking practice."},{"year":"Age 18-22","task":"4 year B.Des degree. Intern at startups and agencies."},{"year":"Age 22+","task":"UI/UX roles at tech companies or freelance internationally."}],"tip":"Your portfolio is your degree. Even without a top college, 10 strong Behance projects get you hired faster."}',
3),

('govt','Government Official','🏛️','A Productive Day of a UPSC IAS Aspirant',
'The grind behind the badge. Long hours, discipline, and the weight of serving a nation.',
'ENHl14bLyT0','#81C784',ARRAY['power','endurance','purpose'],
'{"subjects":["Any stream works","History, Polity, Geography are helpful","English and Hindi"],"exams":["UPSC CSE (after graduation)","State PSC exams","SSC CGL for Group B/C"],"colleges":["Any good graduation college","Delhi University","JNU","Loyola Chennai"],"timeline":[{"year":"Class 11-12","task":"Any stream. Start reading newspapers daily — The Hindu."},{"year":"Age 18-21","task":"Graduate in any subject. Start UPSC basics in 2nd year."},{"year":"Age 21-23","task":"Serious UPSC prep. GS + Optional subject + Essay."},{"year":"Age 23-26","task":"Give UPSC attempts. Average topper takes 2-3 attempts."},{"year":"Age 26+","task":"IAS/IPS/IFS posting after training at Lal Bahadur Academy."}],"tip":"Start reading NCERT History, Geography and Polity books right after 10th. They are the base of UPSC GS."}',
4),

('lawyer','Lawyer','⚖️','A Day in the Life of an Advocate in India',
'Vacation bench, court filings, and real talk about what being a lawyer in India means.',
'Zazf-Tr-za8','#FFD54F',ARRAY['logic','persuasion','power'],
'{"subjects":["Any stream","English (very important)","Political Science helpful"],"exams":["CLAT","AILET (for NLU Delhi)","LSAT India","MH CET Law"],"colleges":["NLSIU Bangalore","NLU Delhi","NALSAR Hyderabad","Symbiosis Law Pune"],"timeline":[{"year":"Class 11-12","task":"Any stream. English skills are critical. Read, debate, argue."},{"year":"Age 17-18","task":"Prepare for CLAT. Focus on English, GK, Legal Reasoning."},{"year":"After 12th","task":"Join 5-year BA LLB or BBA LLB at a top NLU."},{"year":"Age 18-23","task":"Intern at law firms and courts every summer. Network hard."},{"year":"Age 23+","task":"Junior at a law firm, litigation, or LLM for specialization."}],"tip":"CLAT is crackable in 6 months of focused prep. Reading newspapers daily for GK and English gives a massive edge."}',
5),

('business','Entrepreneur','🚀','Day in Life of a 26-Year-Old Indian Entrepreneur',
'Building in Dubai. Meetings, decisions, pressure — the real life of a young Indian founder.',
'z6v8pCuyqnc','#00D8FF',ARRAY['risk','creation','leadership'],
'{"subjects":["Any stream","Mathematics helpful","Commerce if interested in business basics"],"exams":["CAT (for MBA later)","IPM IIM Indore (after 12th directly)","NPAT for NMIMS"],"colleges":["IIM Indore IPM","NMIMS Mumbai","Ashoka University","SP Jain Mumbai"],"timeline":[{"year":"Class 11-12","task":"Any stream. Start a small business or side hustle NOW."},{"year":"Age 16-18","task":"Sell something. Anything. Learn what customers want."},{"year":"After 12th","task":"BBA or B.Com or directly build. College = network + safety."},{"year":"Age 18-22","task":"Build your first real startup. Fail fast, learn fast."},{"year":"Age 22+","task":"Raise funding, scale, or MBA from IIM for the network."}],"tip":"No one teaches you entrepreneurship. Start selling before you finish studying. Your first 100 customers teach you more than any MBA."}',
6),

('ca','Chartered Accountant','📊','Day in the Life of a CA at EY — Big 4 India',
'Corporate floor, client work, and what Big 4 life actually looks like from the inside.',
'DUPsy3Wfl1A','#B39DDB',ARRAY['precision','logic','security'],
'{"subjects":["Commerce stream preferred","Accountancy","Mathematics","Economics"],"exams":["CA Foundation (after 12th)","CA Intermediate","CA Final"],"colleges":["ICAI (Institute of Chartered Accountants)","No college needed — ICAI is the authority"],"timeline":[{"year":"Class 11-12","task":"Take Commerce stream. Score well in Accounts and Maths."},{"year":"After 12th","task":"Register for CA Foundation. Clear it in first attempt."},{"year":"Age 18-20","task":"CA Intermediate — 2 groups, 8 papers. Tough but doable."},{"year":"Age 20-23","task":"3 year articleship (internship) at a CA firm while studying."},{"year":"Age 23+","task":"CA Final exam. Clear it → Big 4 offers start at 7-12 LPA."}],"tip":"CA has a low pass rate but rewards consistency. Study 6 hours daily during articleship and you will crack it."}',
7),

('army','Army Personnel','🎖️','A Day In The Life of an Indian Army Soldier',
'Getting recruited is tough. Surviving training is tougher. Discovery+ goes inside.',
'TpaxycOiApw','#A5D6A7',ARRAY['endurance','purpose','discipline'],
'{"subjects":["Any stream","Physics and Maths for technical roles","English important"],"exams":["NDA (after 12th)","CDS (after graduation)","Technical Entry Scheme","SSB Interview"],"colleges":["NDA Pune","IMA Dehradun","OTA Chennai","AFA Hyderabad (Air Force)"],"timeline":[{"year":"Class 11-12","task":"Any stream. Start physical fitness NOW — running, pull-ups."},{"year":"Age 16-18","task":"Prepare for NDA exam. Maths and English are the key papers."},{"year":"After 12th","task":"Clear NDA written exam then 5-day SSB interview."},{"year":"Age 18-21","task":"3 year training at NDA Pune — academic + military + physical."},{"year":"Age 21+","task":"Commissioned as Lieutenant. Posted to regiment across India."}],"tip":"SSB interview tests your personality, not your marks. Leadership, confidence and teamwork matter more than academics."}',
8),

('creator','Content Creator','🎬','Day in the Life of an Indian Content Creator',
'Work from home, content life, juggling two worlds — the modern Indian creator reality.',
'iwUoYwymWXI','#F48FB1',ARRAY['expression','creation','connection'],
'{"subjects":["Any stream","Mass Media or Journalism helpful","English and Hindi"],"exams":["FTII entrance","Symbiosis Media entrance","Xavier Institute of Communications"],"colleges":["FTII Pune","Symbiosis Pune","XIC Mumbai","AJK MCRC Jamia Delhi"],"timeline":[{"year":"Class 11-12","task":"Any stream. Start your YouTube or Instagram channel TODAY."},{"year":"Age 16-18","task":"Post consistently. 1 video/week minimum. Study what works."},{"year":"After 12th","task":"BMM or Mass Media degree OR just go full time if growing."},{"year":"Age 18-22","task":"Build audience. Monetize via brand deals, courses, merchandise."},{"year":"Age 22+","task":"Full time creator, agency, or media production company."}],"tip":"Start before you are ready. Your first 100 videos will be bad. Post them anyway — that is how everyone starts."}',
9),

('sport','Sportsperson','🏏','Liam Livingstone: A Day in the Life',
'Training, technique, mindset. What the daily grind of a professional cricketer looks like.',
'_hrP9b5K03M','#FFCC80',ARRAY['endurance','discipline','risk'],
'{"subjects":["Any stream","Physical Education as a subject","Minimum academics needed"],"exams":["Sports quota admissions","SAI (Sports Authority of India) trials","State level selection trials"],"colleges":["LNIPE Gwalior","Sports colleges via sports quota","Any college with sports quota"],"timeline":[{"year":"Class 11-12","task":"Represent school and district level. Get noticed by selectors."},{"year":"Age 16-18","task":"Join state academy or SAI centre. Train 6 hours daily."},{"year":"Age 18-20","task":"State U-19 or U-23 team. This is where careers are made."},{"year":"Age 20-23","task":"Ranji Trophy or national level. Get a coach and agent."},{"year":"Age 23+","task":"National team selection or professional league contracts."}],"tip":"Start competing at district level by age 14-15. Late starters rarely make it to the top in sports. Start NOW."}',
10)

ON CONFLICT (id) DO NOTHING;
