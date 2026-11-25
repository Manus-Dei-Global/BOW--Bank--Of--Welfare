import { useState } from 'react';
import { ArrowRight, CheckCircle2, HandHeart, Building2, Phone, MessageCircle, Menu, X } from 'lucide-react';

const WHATSAPP_NUMBER = '2348086001110';

const tiers = [
  { name: 'Seedling', audience: 'Youth and young adults', description: 'A starting point for young people building stability and finding their feet.', color: '#2f7136', image: '11_education_support.jpg', alt: 'Education support' },
  { name: 'Anchor', audience: 'Adults and working households', description: 'Steady support for adults carrying responsibilities and supporting families.', color: '#244d3a', image: '12_skills_and_empowerment.jpg', alt: 'Empowerment and skills' },
  { name: 'Harvest', audience: 'Families and households', description: 'A pathway for households seeking practical support and stronger foundations.', color: '#a17b27', image: '13_family_care.jpg', alt: 'Family care' },
  { name: 'Elder', audience: 'Older adults', description: 'Care that honours dignity, wellbeing, companionship and the value of experience.', color: '#59406d', image: '15_elderly_welfare.jpg', alt: 'A volunteer helping an older man' },
  { name: 'Crisis Relief', audience: 'Urgent and temporary needs', description: 'A compassionate response when unexpected circumstances create immediate need.', color: '#9b4141', image: '16_crisis_relief.jpg', alt: 'Crisis relief volunteer' }
];

function openWhatsApp(message: string) {
  const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function WelfareImage({ file, alt, className = '' }: { file: string; alt: string; className?: string }) {
  return <img className={`welfareImage ${className}`} src={`${import.meta.env.BASE_URL}resources/welfare/${file}`} alt={alt} loading={className === 'heroPhoto' ? 'eager' : 'lazy'} decoding="async" />;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [application, setApplication] = useState({ name: '', phone: '', email: '', location: 'NCC', address: '', reason: '' });
  const [partner, setPartner] = useState({ name: '', contact: '', category: 'Associate Partner', contribution: 'Services / Expertise', frequency: 'One-time', notes: '' });
  const [notice, setNotice] = useState('');

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  const submitApplication = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!application.name.trim() || !application.phone.trim() || !application.address.trim() || !application.reason.trim()) {
      setNotice('Please complete all required fields before continuing.');
      return;
    }
    const message = [
      'BANK OF WELFARE (BOW) | APPLICATION FOR SUPPORT',
      'Full name: ' + application.name,
      'Phone: ' + application.phone,
      'Email: ' + (application.email || 'Not supplied'),
      'Help Desk: ' + application.location,
      'Address: ' + application.address,
      'Reason for application: ' + application.reason
    ].join('\n');
    openWhatsApp(message);
    setNotice('Your application details are ready in WhatsApp. Please send the message there to complete your application.');
  };

  const submitPartner = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partner.name.trim() || !partner.contact.trim()) {
      setNotice('Please provide your organisation or name and a contact detail.');
      return;
    }
    const message = [
      'BANK OF WELFARE (BOW) | PARTNERSHIP ENQUIRY',
      'Name / organisation: ' + partner.name,
      'Contact: ' + partner.contact,
      'Partner category: ' + partner.category,
      'Contribution: ' + partner.contribution,
      'Frequency: ' + partner.frequency,
      'Notes: ' + (partner.notes || 'None')
    ].join('\n');
    openWhatsApp(message);
    setNotice('Your partnership details are ready in WhatsApp. Please send the message there to complete your enquiry.');
  };

  return (
    <div className="site">
      <header className="nav">
        <a className="brand" href="#top" onClick={(event) => { event.preventDefault(); goTo('top'); }}>
          <img className="brandLogo" src="/resources/bow-logo.png" alt="Bank of Welfare logo" />
          <span className="brandTagline"><strong>RELIEF • STABILITY • SUSTAINABILITY</strong><small>Compassion in action</small></span>
        </a>
        <button className="menuButton" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? 'navLinks open' : 'navLinks'}>
          <button onClick={() => goTo('about')}>About</button>
          <button onClick={() => goTo('how-it-works')}>How it works</button>
          <button onClick={() => goTo('tiers')}>Welfare tiers</button>
          <button onClick={() => goTo('partners')}>Partners</button>
          <button className="navCta" onClick={() => goTo('apply')}>Apply for Support <ArrowRight size={16} /></button>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="heroGlow" />
          <div className="heroCopy">
            <span className="eyebrow">A COMMUNITY-ROOTED WELFARE INITIATIVE</span>
            <h1>Support that sees people, not just needs.</h1>
            <p>Bank of Welfare (BOW) is a structured, non-monetary welfare initiative connecting individuals and families with practical support, opportunities and compassionate community care.</p>
            <div className="heroActions">
              <button className="primary" onClick={() => goTo('apply')}>Apply for Support <ArrowRight size={17} /></button>
              <button className="secondary" onClick={() => goTo('partners')}>Become a Partner</button>
            </div>
            <div className="heroFootnote">A dignity-first approach to relief, stability and sustainable impact.</div>
          </div>
          <div className="heroPanel">
            <WelfareImage file="hero-portrait.png" alt="Woman looking up in warm sunlight" className="heroPhoto" />
            <span className="panelLabel">OUR COMMITMENT</span>
            <h2>Compassion with structure. Support with purpose.</h2>
            <div className="panelStats"><span><b>05</b><small>Welfare pathways</small></span><span><b>02</b><small>Help Desk locations</small></span><span><b>01</b><small>Shared purpose</small></span></div>
          </div>
        </section>

        <section className="intro section" id="about">
          <div><span className="eyebrow">ABOUT BOW</span><h2>A coordinated pathway to practical care.</h2></div>
          <div><p>Bank of Welfare is a non-monetary welfare account system. It is designed to help organise requests for support, connect people to relevant assistance and encourage responsible collaboration between beneficiaries, community support points and partners.</p><p>BOW is not a bank or a cash-transfer service. Its focus is people, access, dignity and practical welfare outcomes.</p></div>
        </section>

        <section className="section darkSection" id="how-it-works">
          <div className="sectionHeading"><span className="eyebrow">HOW IT WORKS</span><h2>A clear first step. A human follow-through.</h2><p>Start with an application. The BOW team can then contact you through the Help Desk details you provide.</p></div>
          <div className="steps">
            <article><span>01</span><h3>Apply</h3><p>Share your details, select your preferred Help Desk and explain the support you need.</p></article>
            <article><span>02</span><h3>Connect</h3><p>Your details are sent to BOW through WhatsApp so the team can follow up with you.</p></article>
            <article><span>03</span><h3>Follow through</h3><p>The team reviews your enquiry and discusses suitable next steps with you.</p></article>
          </div>
          <button className="primary lightPrimary" onClick={() => goTo('apply')}>Start an application <ArrowRight size={17} /></button>
        </section>

        <section className="section foundation">
          <div className="sectionHeading"><span className="eyebrow">OUR FOUNDATION</span><h2>Guided by purpose. Grounded in service.</h2></div>
          <div className="foundationLayout">
            <WelfareImage file="05_mission_and_vision.jpg" alt="A smiling family" className="foundationPhoto" />
            <div className="foundationGrid">
            <article><HandHeart /><h3>Our Mission</h3><p>To uplift individuals and communities through compassion, support and sustainable welfare initiatives.</p></article>
            <article><Building2 /><h3>Our Vision</h3><p>A world where every person has access to the resources, opportunities and support they need to thrive.</p></article>
            <article><CheckCircle2 /><h3>Our Values</h3><p>Compassion, Integrity, Accountability, Service Excellence and Impact Driven.</p></article>
            </div>
          </div>
        </section>

        <section className="section tiersSection" id="tiers">
          <div className="sectionHeading"><span className="eyebrow">WELFARE PATHWAYS</span><h2>Five pathways. One commitment to dignity.</h2><p>Each pathway reflects a different stage or circumstance of life. Final eligibility and support are assessed by the BOW team.</p></div>
          <div className="tierGrid">{tiers.map((tier) => <article className="tierCard" key={tier.name} style={{ borderTopColor: tier.color }}><WelfareImage file={tier.image} alt={tier.alt} /><h3>{tier.name}</h3><small>{tier.audience}</small><p>{tier.description}</p></article>)}</div>
        </section>

        <section className="section supportPhotos">
          <div className="sectionHeading"><h2>Practical support in the community</h2><p>Food assistance, health support and community outreach illustrate the kinds of needs BOW helps people address.</p></div>
          <div className="supportPhotoGrid">
            <WelfareImage file="09_food_support.jpg" alt="Food support" />
            <WelfareImage file="10_healthcare_support.jpg" alt="Health support" />
            <WelfareImage file="14_community_outreach.jpg" alt="Community outreach" />
          </div>
        </section>

        <section className="section partnerSection" id="partners">
          <div className="partnerCopy"><span className="eyebrow">PARTNER WITH BOW</span><h2>Bring your resources, skills and compassion into the circle.</h2><p>We welcome individuals, organisations, service providers and community-minded institutions interested in contributing goods, services, expertise, opportunities or other practical support.</p><ul><li>Donor and resource partners</li><li>Professional and service partners</li><li>Community and institutional partners</li></ul>
            <WelfareImage file="19_partnership_and_volunteers.jpg" alt="BOW partnership and volunteering" />
          </div>
          <form className="formCard" onSubmit={submitPartner}>
            <h3>Become a BOW Partner</h3>
            <label>Name / organisation<input required value={partner.name} onChange={(e) => setPartner({ ...partner, name: e.target.value })} placeholder="Your name or organisation" /></label>
            <label>Phone or email<input required value={partner.contact} onChange={(e) => setPartner({ ...partner, contact: e.target.value })} placeholder="How we can reach you" /></label>
            <div className="formRow"><label>Partner category<select value={partner.category} onChange={(e) => setPartner({ ...partner, category: e.target.value })}><option>Associate Partner</option><option>Donor Partner</option><option>Institutional Partner</option><option>Service Partner</option></select></label><label>Contribution type<select value={partner.contribution} onChange={(e) => setPartner({ ...partner, contribution: e.target.value })}><option>Services / Expertise</option><option>Goods / In-kind support</option><option>Opportunities</option><option>Resources</option><option>Other</option></select></label></div>
            <label>Frequency<select value={partner.frequency} onChange={(e) => setPartner({ ...partner, frequency: e.target.value })}><option>One-time</option><option>Monthly</option><option>Quarterly</option><option>Ongoing</option></select></label>
            <label>Additional notes<textarea rows={3} value={partner.notes} onChange={(e) => setPartner({ ...partner, notes: e.target.value })} placeholder="Tell us a little about how you would like to partner." /></label>
            <button className="primary formSubmit" type="submit">Continue on WhatsApp <ArrowRight size={16} /></button>
          </form>
        </section>

        <section className="section applySection" id="apply">
          <div className="applyIntro"><span className="eyebrow">APPLY FOR SUPPORT</span><h2>Tell us what support would make a difference.</h2><p>Complete the form and continue to WhatsApp. Your message will be prepared for the BOW Help Desk at the number below. You must press Send in WhatsApp to deliver it.</p><div className="helpDeskNote"><strong>Help Desk locations</strong><span>NCC • National Christian Centre, Abuja</span><span>Kagini • BOW Help Desk</span></div>
          </div>
          <form className="formCard applicationCard" onSubmit={submitApplication}>
            <h3>Support application</h3>
            <div className="formRow"><label>Full name<input required value={application.name} onChange={(e) => setApplication({ ...application, name: e.target.value })} placeholder="Your full name" /></label><label>Phone number<input required type="tel" value={application.phone} onChange={(e) => setApplication({ ...application, phone: e.target.value })} placeholder="Your phone number" /></label></div>
            <label>Email address <span className="optional">(optional)</span><input type="email" value={application.email} onChange={(e) => setApplication({ ...application, email: e.target.value })} placeholder="you@example.com" /></label>
            <label>Preferred Help Desk<select value={application.location} onChange={(e) => setApplication({ ...application, location: e.target.value })}><option value="NCC">NCC</option><option value="Kagini">Kagini</option></select></label>
            <label>Home address<input required value={application.address} onChange={(e) => setApplication({ ...application, address: e.target.value })} placeholder="Your residential address" /></label>
            <label>What support are you applying for?<textarea required rows={4} value={application.reason} onChange={(e) => setApplication({ ...application, reason: e.target.value })} placeholder="Briefly explain your situation and the support you need." /></label>
            <button className="primary formSubmit" type="submit">Continue to WhatsApp <ArrowRight size={16} /></button>
            <small className="formDisclaimer">Please do not include passwords, bank details or other highly sensitive information.</small>
          </form>
        </section>

        {notice && <div className="noticeBar" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div>}

        <section className="contactSection section" id="contact">
          <div className="contactCopy"><span className="eyebrow">GET IN TOUCH</span><h2>Let’s make the next step easier.</h2><p>For support applications, partnership enquiries or general questions, contact the BOW team.</p><a className="phoneLink" href="tel:08086001110"><Phone size={19} /> 08086001110</a><a className="whatsappLink" href="https://wa.me/2348086001110" target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chat with BOW on WhatsApp</a><small>Manus Dei Global Initiative for Transformation</small></div>
          <div className="qrCard"><img src="/resources/bow-contact-qr.jpg" alt="Scan to contact Bank of Welfare on WhatsApp" /><strong>Scan to connect with BOW</strong><span>WhatsApp contact QR code</span></div>
        </section>
      </main>

      <footer className="footer"><div className="footerBrand"><img className="footerLogo" src="/resources/bow-logo.png" alt="Bank of Welfare logo" /><p>Relief • Stability • Sustainability</p></div><div className="footerContact"><a href="tel:08086001110">08086001110</a><button onClick={() => goTo('contact')}>Contact us</button></div><small>© {new Date().getFullYear()} Bank of Welfare. A non-monetary welfare initiative.</small></footer>
    </div>
  );
}

export default App;
