import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { api, auth } from '@appdeploy/client';
import { read, utils } from 'xlsx';
import {
  ArrowRight, Bell, BookOpen, Building2, CheckCircle2, ClipboardList, Coins, Download,
  FileImage, FileText, HandHeart, Inbox, LayoutDashboard, LogOut, Menu, Newspaper, Plus,
  Printer, QrCode,          Search, Settings, Sparkles, Trash2, Upload, UserRound,
  Users, X
} from 'lucide-react';

type View = 'home' | 'beneficiary' | 'helpdesk' | 'partner' | 'admin';
type AdminTab = 'overview' | 'profiles' | 'tracker' | 'inbox' | 'media' | 'staff' | 'settings' | 'audit';
type SettingsData = {
  heroTitle: string;
  heroDescription: string;
  mission: string;
  vision: string;
  announcement: string;
  accentColor: string;
  surfaceColor: string;
};
type Beneficiary = {
  id?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  age?: string;
  address?: string;
  location: string;
  tier: string;
  bowId: string;
  status: string;
  points: number;
  coins: number;
};
type Request = {
  id?: string;
  beneficiaryUserId: string;
  bowId: string;
  beneficiaryName: string;
  location: string;
  category: string;
  urgency: string;
  nature: string;
  description: string;
  referenceId: string;
  status: string;
  updatedAt: string;
};
type Partner = {
  id?: string;
  name: string;
  category: string;
  contributionType: string;
  frequency: string;
  status: string;
  contact: string;
  notes?: string;
};
type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  status: string;
  assignedCases: number;
  lastActivity: string;
  notes: string;
};
type MediaItem = {
  id?: string;
  type: 'Picture' | 'Slideshow' | 'Newsletter' | 'Update';
  title: string;
  caption: string;
  body: string;
  storagePath?: string;
  url?: string;
  status: 'Draft' | 'Published';
  createdAt?: string;
  updatedAt?: string;
};
type TrackerRow = Record<string, unknown> & { id: string };
type InboxItem = Record<string, unknown> & { id: string; type: 'Applicant' | 'Partner'; status: string; name?: string; referenceId?: string; response?: string };
type Profile = {
  application: TrackerRow;
  verification?: TrackerRow;
};

const TRACKER_RESOURCE = './resources/General Registration Verification Tracker.xlsx';
const DESIGN_REFS = [
  { type: 'Seedling', path: './resources/BOW File Jacket Seedling Account.pdf.pdf', color: '#2f7136', tagline: 'For young people finding their feet.' },
  { type: 'Anchor', path: './resources/BOW File Jacket Anchor Account.pdf.pdf', color: '#1e3a63', tagline: 'For working adults steadying the ground beneath their family.' },
  { type: 'Harvest', path: './resources/BOW File Jacket Harvest Account.pdf.pdf', color: '#b48608', tagline: 'For homes carrying the weight of children and dependents.' },
  { type: 'Elder', path: './resources/BOW File Jacket Elder Account.pdf.pdf', color: '#4d2d65', tagline: 'For those owed rest, dignity, and companionship.' },
  { type: 'Crisis Relief', path: './resources/BOW File Jacket CrisisRelief Account.pdf.pdf', color: '#9f373a', tagline: 'For the sudden fall that needs an immediate hand.' }
];
const defaults: SettingsData = {
  heroTitle: 'Welfare organised around dignity.',
  heroDescription: 'Bank of Welfare (BOW) is a structured, non-monetary welfare account system designed to connect people with practical support, opportunities and compassionate community care.',
  mission: 'To uplift individuals and communities through compassion, support and sustainable welfare initiatives.',
  vision: 'A world where every person has access to the resources, opportunities and support they need to thrive.',
  announcement: 'BOW connects beneficiaries, help desks, partners and administrators through one coordinated welfare system.',
  accentColor: '#97762e',
  surfaceColor: '#f8f5ef'
};
const tiers = [
  ['Seedling Account', 'Youth / Young Adults • Ages 18–30', 'For young people finding their feet.'],
  ['Anchor Account', 'Adults • Ages 31–50 • Single or Married', 'For working adults steadying the ground beneath their family.'],
  ['Harvest Account', 'Families / Households', 'For homes carrying the weight of children and dependents.'],
  ['Elder Account', 'Ages 60+ • Dignity & Care', 'For those owed rest, dignity, and companionship.'],
  ['Crisis Relief Account', 'Temporary / Emergency Needs', 'For the sudden fall that needs an immediate hand.']
];

function designFor(accountType: string) {
  const normalized = accountType.replace(' Account', '').trim();
  return DESIGN_REFS.find((item) => normalized.toLowerCase() === item.type.toLowerCase()) ?? null;
}

function value(row: TrackerRow | undefined, key: string) {
  return row?.[key] == null ? '' : String(row[key]);
}

function App() {
  const [view, setView] = useState<View>('home');
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(defaults);
  const [user, setUser] = useState<any>(null);
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [adminBeneficiaries, setAdminBeneficiaries] = useState<Beneficiary[]>([]);
  const [adminRequests, setAdminRequests] = useState<Request[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [publicMedia, setPublicMedia] = useState<MediaItem[]>([]);
  const [applications, setApplications] = useState<TrackerRow[]>([]);
  const [verification, setVerification] = useState<TrackerRow[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxResponse, setInboxResponse] = useState<Record<string, string>>({});
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [toast, setToast] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trackerFile, setTrackerFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('All');
  const [requestStatus, setRequestStatus] = useState('All');
  const [trackerSearch, setTrackerSearch] = useState('');
  const [trackerDecision, setTrackerDecision] = useState('All');
  const [profileFilter, setProfileFilter] = useState('All');
  const [profileSearch, setProfileSearch] = useState('');
  const [status, setStatus] = useState<Record<string, string>>({});
  const [alloc, setAlloc] = useState<Record<string, { points: string; coins: string; reason: string }>>({});
  const [report, setReport] = useState<any>(null);
  const [mediaDraft, setMediaDraft] = useState({ type: 'Update' as MediaItem['type'], title: '', caption: '', body: '' });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [reg, setReg] = useState({ name: '', phone: '', age: '', address: '', location: 'NCC', email: '', reason: '', priority: 'Pending', title: '', gender: '', maritalStatus: '' });
  const [req, setReq] = useState({ category: 'Food support', urgency: 'Normal', nature: 'Welfare', description: '' });
  const [partner, setPartner] = useState({ name: '', category: 'Associate Partner', contributionType: 'Services / Expertise', frequency: 'One-time', contact: '', notes: '' });
  const [staffDraft, setStaffDraft] = useState({ name: '', email: '', role: 'Account Manager', location: 'NCC', notes: '' });

  useEffect(() => {
    api.get('/api/public/settings').then((r) => setSettings({ ...defaults, ...r.data })).catch(() => {});
    api.get('/api/public/content').then((r) => setPublicMedia(r.data.items || [])).catch(() => {});
    auth.getUser().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    const openPrivateControlRoom = () => {
      if (window.location.hash !== '#control-room') return;
      if (!auth.isSignedIn()) {
        signIn('admin');
        return;
      }
      auth.getUser().then((current) => {
        if (current) {
          setUser(current);
          setView('admin');
        } else {
          signIn('admin');
        }
      }).catch(() => signIn('admin'));
    };
    openPrivateControlRoom();
    window.addEventListener('hashchange', openPrivateControlRoom);
    return () => window.removeEventListener('hashchange', openPrivateControlRoom);
  }, []);

  useEffect(() => {
    if (view === 'beneficiary' && user) loadBeneficiary();
    if (view === 'admin' && user) loadAdmin();
  }, [view, user]);

  const go = (next: View) => {
    setView(next);
    setMenu(false);
    if (next === 'admin') window.history.replaceState(null, '', '#control-room');
    else if (window.location.hash === '#control-room') window.history.replaceState(null, '', window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadBeneficiary = async () => {
    const r = await api.get('/api/beneficiary/dashboard');
    setBeneficiary(r.data.beneficiary || null);
    setRequests(r.data.requests || []);
    setLedger(r.data.ledger || []);
    setNotifications(r.data.notifications || []);
  };

  const loadAdmin = async () => {
    try {
      const current = await auth.getUser();
      if (!current) throw new Error('AUTH_REQUIRED');
      if (!user) setUser(current);
      const r = await api.get('/api/admin/overview');
      setSettings({ ...defaults, ...r.data.settings });
      setStaff(r.data.staff || []);
      setAdminBeneficiaries(r.data.beneficiaries || []);
      setAdminRequests(r.data.requests || []);
      setPartners(r.data.partners || []);
      setActivity(r.data.activity || []);
      setMedia(r.data.media || []);
      setApplications(r.data.tracker?.applications || []);
      setVerification(r.data.tracker?.verification || []);
      setInbox(r.data.intake?.inbox || []);
      if (!(r.data.tracker?.applications || []).length) await importTrackerResource();
    } catch (e) {
      if (String(e instanceof Error ? e.message : e).includes('AUTH_REQUIRED')) {
        setAuthError('Your administrator session is no longer available. Open the private control room route and sign in again.');
        go('home');
      } else {
        setAuthError('The BOW control room could not refresh right now. Your administrator session has been kept open.');
      }
    }
  };

  const signIn = async (target: View) => {
    if (authBusy) return;
    setAuthError('');
    setAuthBusy(true);
    try {
      if (auth.isSignedIn()) {
        const current = await auth.getUser();
        if (current) {
          setUser(current);
          go(target);
          return;
        }
      }
      const result = await auth.signIn({ scope: 'openid email profile offline_access' });
      setUser(result.user);
      go(target);
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code) : '';
      if (code === 'popup_blocked') setAuthError('Your browser blocked the BOW sign-in window. Allow pop-ups for this site, then select Sign in again.');
      else if (code === 'popup_closed') setAuthError('The BOW sign-in window was closed before sign-in finished. Select Sign in again to retry.');
      else setAuthError('BOW sign-in could not be completed. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const register = async () => {
    if (!reg.name || !reg.phone) {
      setToast('Name and phone are required.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.post('/api/beneficiary/register', reg);
      setBeneficiary(r.data);
      setToast('BOW account created.');
      await loadBeneficiary();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async () => {
    if (!req.description.trim()) {
      setToast('Describe the support you are requesting.');
      return;
    }
    try {
      await api.post('/api/beneficiary/requests', req);
      setReq({ ...req, description: '' });
      setToast('Support request submitted.');
      await loadBeneficiary();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Request failed.');
    }
  };

  const submitPartner = async () => {
    if (!partner.name || !partner.contact) {
      setToast('Partner name and contact are required.');
      return;
    }
    try {
      await api.post('/api/public/partner-apply', partner);
      setToast('Partnership application submitted. BOW will review it and respond through the partner inbox.');
      setPartner({ ...partner, name: '', contact: '', notes: '' });
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Partner application failed.');
    }
  };

  const submitPublicApplication = async () => {
    if (!reg.name || !reg.phone || !reg.address || !reg.reason) {
      setToast('Name, phone, address and reason for application are required.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.post('/api/public/apply', reg);
      setToast('Application received. Your reference is ' + r.data.referenceId + '.');
      setReg({ ...reg, name: '', phone: '', address: '', email: '', reason: '' });
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Application could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  const sendInboxResponse = async (item: InboxItem) => {
    const response = String(inboxResponse[item.id] ?? item.response ?? '').trim();
    if (!response) { setToast('Write a response before saving it.'); return; }
    try {
      const r = await api.put('/api/admin/intake/' + item.id, { response, status: 'Responded' });
      setInbox((items) => items.map((x) => x.id === item.id ? r.data : x));
      setInboxResponse((items) => ({ ...items, [item.id]: '' }));
      setToast('Response saved to the inbox record.');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Response could not be saved.');
    }
  };

  const importTrackerFile = async () => {
    if (!trackerFile) { setToast('Select the General Registration Verification Tracker workbook first.'); return; }
    setBusy(true);
    try {
      const buffer = await trackerFile.arrayBuffer();
      const workbook = read(buffer);
      const sheetToRows = (name: string) => {
        const sheet = workbook.Sheets[name];
        if (!sheet) return [];
        return utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      };
      const imported = await api.post('/api/admin/tracker/import', { applications: sheetToRows('Applications'), verification: sheetToRows('Verification') });
      setApplications(imported.data.applications || []);
      setVerification(imported.data.verification || []);
      setTrackerFile(null);
      setToast('Authoritative tracker uploaded and synced to the BOW database.');
      await loadAdmin();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Workbook import failed.');
    } finally {
      setBusy(false);
    }
  };

  const importTrackerResource = async () => {
    setBusy(true);
    try {
      const response = await fetch(TRACKER_RESOURCE);
      if (!response.ok) throw new Error('The tracker workbook resource is not available yet.');
      const buffer = await response.arrayBuffer();
      const workbook = read(buffer);
      const sheetToRows = (name: string) => {
        const sheet = workbook.Sheets[name];
        if (!sheet) return [];
        return utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      };
      const imported = await api.post('/api/admin/tracker/import', {
        applications: sheetToRows('Applications'),
        verification: sheetToRows('Verification')
      });
      setApplications(imported.data.applications || []);
      setVerification(imported.data.verification || []);
      setToast('General Registration & Verification Tracker imported and synced.');
      await loadAdmin();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Tracker import failed. Check that the workbook resource is available.');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    await api.put('/api/admin/settings', settings);
    setToast('Website settings published.');
  };

  const addStaff = async () => {
    try {
      const r = await api.post('/api/admin/staff', staffDraft);
      setStaff((items) => [r.data, ...items]);
      setStaffDraft({ ...staffDraft, name: '', email: '', notes: '' });
      setToast('Staff record created.');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Staff creation failed.');
    }
  };

  const updateRequest = async (id: string) => {
    const r = await api.put('/api/admin/requests/' + id, { status: status[id] || 'Under Review' });
    setAdminRequests((items) => items.map((item) => item.id === id ? r.data : item));
    setToast('Request status updated.');
  };

  const allocate = async (id: string) => {
    const d = alloc[id] || { points: '', coins: '', reason: 'Approved welfare allocation' };
    try {
      const r = await api.post('/api/admin/allocations', {
        requestId: id,
        points: Number(d.points || 0),
        coins: Number(d.coins || 0),
        reason: d.reason
      });
      setAdminBeneficiaries((items) => items.map((b) => b.id === r.data.beneficiary.id ? r.data.beneficiary : b));
      setAdminRequests((items) => items.map((q) => q.id === id ? r.data.request : q));
      setToast('Ledger allocation recorded.');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Allocation failed.');
    }
  };

  const updateBeneficiary = async (id: string) => {
    const r = await api.put('/api/admin/beneficiaries/' + id, { status: status[id] || 'Active' });
    setAdminBeneficiaries((items) => items.map((b) => b.id === id ? r.data : b));
  };

  const updatePartner = async (id: string) => {
    const r = await api.put('/api/admin/partners/' + id, { status: status[id] || 'Active' });
    setPartners((items) => items.map((p) => p.id === id ? r.data : p));
  };

  const updateApplication = async (id: string, patch: Record<string, unknown>) => {
    const r = await api.put('/api/admin/tracker/applications/' + id, patch);
    setApplications((items) => items.map((item) => item.id === id ? r.data : item));
  };

  const updateVerification = async (id: string, patch: Record<string, unknown>) => {
    const r = await api.put('/api/admin/tracker/verification/' + id, patch);
    setVerification((items) => items.map((item) => item.id === id ? r.data : item));
    setToast('Verification record updated.');
  };

  const createMedia = async () => {
    if (!mediaDraft.title.trim()) {
      setToast('Add a title first.');
      return;
    }
    try {
      let storagePath = '';
      if (mediaFile) {
        if (mediaFile.size > 6 * 1024 * 1024) throw new Error('Please keep uploads under 6 MB.');
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read the selected file.'));
          reader.readAsDataURL(mediaFile);
        });
        const upload = await api.post('/api/admin/media/upload', {
          fileName: mediaFile.name,
          contentType: mediaFile.type || 'application/octet-stream',
          base64: dataUrl.split(',')[1] || ''
        });
        storagePath = upload.data.path;
      }
      const r = await api.post('/api/admin/media', { ...mediaDraft, storagePath });
      setMedia((items) => [r.data, ...items]);
      setMediaDraft({ type: 'Update', title: '', caption: '', body: '' });
      setMediaFile(null);
      setToast('Content item created.');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Content creation failed.');
    }
  };

  const togglePublished = async (item: MediaItem) => {
    const r = await api.put('/api/admin/media/' + item.id, { status: item.status === 'Published' ? 'Draft' : 'Published' });
    setMedia((items) => items.map((m) => m.id === item.id ? r.data : m));
    api.get('/api/public/content').then((x) => setPublicMedia(x.data.items || [])).catch(() => {});
  };

  const deleteMedia = async (item: MediaItem) => {
    await api.delete('/api/admin/media/' + item.id);
    setMedia((items) => items.filter((m) => m.id !== item.id));
    setToast('Content item deleted.');
  };

  const generateReport = async () => {
    const r = await api.get('/api/admin/reports');
    setReport(r.data);
  };

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['BOW ID', 'Name', 'Location', 'Tier', 'Status', 'Points', 'Coins'],
      ...(report.beneficiaries || []).map((b: Beneficiary) => [b.bowId, b.name, b.location, b.tier, b.status, b.points, b.coins])
    ];
    const csv = rows.map((row: unknown[]) => row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'BOW-beneficiary-report.csv';
    a.click();
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setBeneficiary(null);
    go('home');
  };

  const style = useMemo(() => ({
    '--accent': settings.accentColor,
    '--surface': settings.surfaceColor
  }) as CSSProperties, [settings]);

  const filteredBeneficiaries = adminBeneficiaries.filter((b) =>
    (location === 'All' || b.location === location) &&
    (!search || (b.name + ' ' + b.bowId).toLowerCase().includes(search.toLowerCase()))
  );
  const filteredRequests = adminRequests.filter((r) =>
    (location === 'All' || r.location === location) &&
    (requestStatus === 'All' || r.status === requestStatus)
  );
  const filteredApplications = applications.filter((a) => {
    const haystack = Object.values(a).join(' ').toLowerCase();
    return (!trackerSearch || haystack.includes(trackerSearch.toLowerCase())) &&
      (trackerDecision === 'All' || value(a, 'Decision') === trackerDecision);
  });
  const profiles: Profile[] = applications.map((application) => ({
    application,
    verification: verification.find((v) => value(v, 'S/N') === value(application, 'S/N')) ||
      verification.find((v) => value(v, 'Full Name').trim() === value(application, 'Full Name').trim())
  }));
  const filteredProfiles = profiles.filter((profile) => {
    const account = value(profile.verification, 'Account Type') || 'Pending Classification';
    return (profileFilter === 'All' || account === profileFilter) &&
      (!profileSearch || (value(profile.application, 'Full Name') + ' ' + value(profile.verification, 'Verification ID')).toLowerCase().includes(profileSearch.toLowerCase()));
  });
  const summary = {
    applications: applications.length,
    verified: verification.filter((v) => value(v, 'Accepted / Declined') === 'Accepted').length,
    pending: verification.filter((v) => value(v, 'Accepted / Declined') === 'Pending').length,
    profiles: profiles.length,
    media: media.length,
    activeAccounts: adminBeneficiaries.filter((b) => b.status === 'Active' && !String(b.userId).startsWith('demo-')).length
  };

  return (
    <div className="site" style={style}>
      <header className="nav">
        <button className="brand" onClick={() => go('home')}>
          <img className="brandLogo" src="./resources/BOW LOGO TRANSPARENT.png" alt="Bank of Welfare logo" />
          <span><strong>BANK OF WELFARE</strong><small>BOW • RELIEF • STABILITY • SUSTAINABILITY</small></span>
        </button>
        <button className="menuBtn" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        <nav className={menu ? 'navLinks open' : 'navLinks'}>
          <button onClick={() => go('home')}>Home</button>
          <button onClick={() => { go('home'); window.setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 0); }}>How it works</button>
          <button onClick={() => { go('home'); window.setTimeout(() => document.getElementById('welfare-tiers')?.scrollIntoView({ behavior: 'smooth' }), 0); }}>Welfare tiers</button>
          <button onClick={() => go('partner')}>Partner opportunities</button>
          <button className="primary navApply" onClick={() => go('beneficiary')}>Apply for Support <ArrowRight size={16} /></button>
        </nav>
      </header>

      {settings.announcement && <div className="announcement">{settings.announcement}</div>}
      {authError && <div className="errorBox">{authError}</div>}
      {toast && <div className="toast">{toast}<button onClick={() => setToast('')}><X size={14} /></button></div>}

      {view === 'home' && (
        <main>
          <section className="hero">
            <div className="heroGlow" />
            <div className="heroCopy">
              <span className="eyebrow">RELIEF • STABILITY • SUSTAINABILITY</span>
              <h1>{settings.heroTitle}</h1>
              <p>{settings.heroDescription}</p>
              <div className="heroActions">
                <button className="primary" onClick={() => go('beneficiary')}>Apply for BOW Support <ArrowRight size={18} /></button>
                <button className="secondary" onClick={() => go('partner')}>Become a Partner</button>
              </div>
            </div>
            <div className="heroCard">
              <img className="heroLogo" src="./resources/BOW LOGO TRANSPARENT.png" alt="Bank of Welfare logo" />
              <div className="heroStats">
                <span><strong>5</strong><small>Welfare Tiers</small></span>
                <span><strong>2</strong><small>Help Desks</small></span>
                <span><strong>1</strong><small>Coordinated system</small></span>
              </div>
            </div>
          </section>

          <section className="section twoCol">
            <div><span className="eyebrow">ABOUT BOW</span><h2>One welfare account. Many pathways to support.</h2><p>BOW is organised to make welfare easier to request, coordinate, document and follow through, while preserving dignity.</p></div>
            <div className="quoteCard"><span className="quote">“</span><p>EMPOWERING LIVES. BUILDING COMMUNITIES. CREATING IMPACT.</p><small>Bank of Welfare</small></div>
          </section>

          <section className="section" id="how-it-works">
            <div className="sectionHeading"><span className="eyebrow">HOW IT WORKS</span><h2>Support starts with a simple application</h2><p className="lead">BOW connects applicants with the right Help Desk and coordinates follow-up with care and accountability.</p></div>
            <div className="valueGrid">
              <article><span className="eyebrow">01</span><h3>Apply</h3><p>Share your details, choose NCC or Kagini, and explain the support you need. No sign-in is required.</p></article>
              <article><span className="eyebrow">02</span><h3>Review</h3><p>The selected Help Desk reviews the application and may contact you for more information.</p></article>
              <article><span className="eyebrow">03</span><h3>Follow through</h3><p>BOW records decisions and coordinates suitable support while keeping applicants informed.</p></article>
            </div>
            <button className="primary" onClick={() => go('beneficiary')}>Apply for Support <ArrowRight size={17} /></button>
          </section>

          <section className="section">
            <div className="sectionHeading"><span className="eyebrow">OUR FOUNDATION</span><h2>Mission, vision and values</h2></div>
            <div className="valueGrid">
              <article><HandHeart /><h3>Mission</h3><p>{settings.mission}</p></article>
              <article><Building2 /><h3>Vision</h3><p>{settings.vision}</p></article>
              <article><CheckCircle2 /><h3>Values</h3><p>Compassion • Integrity • Accountability • Service Excellence • Impact Driven</p></article>
            </div>
          </section>

          <section className="section" id="welfare-tiers">
            <div className="sectionHeading"><span className="eyebrow">WELFARE ACCOUNTS</span><h2>Five profile pathways, one coordinated system</h2></div>
            <div className="tierGrid">{tiers.map((tier, i) => {
              const design = designFor(tier[0]);
              return <article className="tierCard" style={{ background: design?.color }} key={tier[0]}><span>0{i + 1}</span><h3>{tier[0]}</h3><small>{tier[1]}</small><p>{tier[2]}</p></article>;
            })}</div>
          </section>

          <section className="section">
            <div className="pointsCard">
              <div><span className="eyebrow">DIGITAL WELFARE</span><h2>Welfare Points + Kingdom Coins</h2><p>Every allocation is recorded with beneficiary, location, reason, actor, timestamp, reference and before/after balance.</p></div>
              <div className="coinStack"><span><Coins /> Welfare Points</span><span><Coins /> Kingdom Coins</span></div>
            </div>
          </section>

          {publicMedia.length > 0 && (
            <section className="section">
              <div className="sectionHeading"><span className="eyebrow">BOW STORIES & UPDATES</span><h2>Pictures, slideshows, newsletters and updates.</h2></div>
              <div className="mediaPublicGrid">
                {publicMedia.slice(0, 6).map((item) => (
                  <article className="publicMediaCard" key={item.id}>
                    {item.url ? <img src={item.url} alt={item.title} /> : <div className="mediaPlaceholder">{item.type === 'Newsletter' ? <Newspaper /> : <Sparkles />}</div>}
                    <div><span className="mediaType">{item.type}</span><h3>{item.title}</h3><p>{item.caption || item.body}</p></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="section contactBand" id="help-desk-contact"><span className="eyebrow">NCC + KAGINI HELP DESKS</span><h2>Speak with the BOW team</h2><div className="dashboardGrid"><article className="dashboardCard"><Users /><h3>NCC Help Desk</h3><p>Office A, Main Cathedral, National Christian Centre, Opposite the CBN Central Business District, 900211 Abuja, FCT.</p><p><a href="tel:+2348066001110">+234 (0) 806 600 1110</a><br /><a href="mailto:bankofwelfare@gmail.com">bankofwelfare@gmail.com</a></p></article><article className="dashboardCard"><Users /><h3>Kagini Help Desk</h3><p>Community-based access for applicants and families in Kagini. Contact the BOW team and ask to be connected to the Kagini Help Desk.</p><p><a href="tel:+2348066001110">+234 (0) 806 600 1110</a><br /><a href="mailto:bankofwelfare@gmail.com">bankofwelfare@gmail.com</a></p></article></div></section>
        </main>
      )}

      {view === 'beneficiary' && (
        <main className="section page">
          <div className="pageTop"><div><span className="eyebrow">BOW APPLICATION & BENEFICIARY PORTAL</span><h1>Apply for welfare support.</h1><p className="lead">New applicants can submit an application without signing in. Approved beneficiaries can sign in later to manage their BOW account, requests and welfare history.</p></div>{user && <button className="secondary" onClick={signOut}><LogOut size={16} /> Sign out</button>}</div>
          {!user ? (
            <section className="sectionCard">
              <div className="sectionHeading"><span className="eyebrow">NEW APPLICANT</span><h2>Submit a BOW application</h2><p>Your application enters the BOW registration and verification tracker for Help Desk review. Submitting an application does not mean an account has already been approved.</p></div>
              <div className="formGrid"><label><span>Title</span><select value={reg.title} onChange={(e) => setReg({ ...reg, title: e.target.value })}><option value="">Select</option><option>Mr</option><option>Mrs</option><option>Miss</option><option>Ms</option><option>Pst.</option><option>Rev.</option></select></label><label><span>Full name</span><input value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} /></label><label><span>Gender</span><select value={reg.gender} onChange={(e) => setReg({ ...reg, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option></select></label><label><span>Marital status</span><select value={reg.maritalStatus} onChange={(e) => setReg({ ...reg, maritalStatus: e.target.value })}><option value="">Select</option><option>Single</option><option>Married</option><option>Separated</option><option>Divorced</option><option>Widowed</option></select></label><label><span>Date of birth / Age</span><input value={reg.age} onChange={(e) => setReg({ ...reg, age: e.target.value })} /></label><label><span>Phone number</span><input value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} /></label><label><span>Email address</span><input value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} /></label><label><span>Home address</span><input value={reg.address} onChange={(e) => setReg({ ...reg, address: e.target.value })} /></label><label><span>Help Desk</span><select value={reg.location} onChange={(e) => setReg({ ...reg, location: e.target.value })}><option>NCC</option><option>Kagini</option></select></label><label><span>Priority</span><select value={reg.priority} onChange={(e) => setReg({ ...reg, priority: e.target.value })}><option>Pending</option><option>High</option><option>Mid</option><option>Low</option></select></label><label className="wide"><span>Reason for application</span><textarea value={reg.reason} onChange={(e) => setReg({ ...reg, reason: e.target.value })} /></label></div>
              <button className="primary" disabled={busy} onClick={submitPublicApplication}><Plus size={17} /> Submit application</button>
            </section>
          ) : !beneficiary ? (
            <section className="sectionCard">
              <h2>Open your BOW account</h2><p>Your BOW ID is generated automatically and linked to NCC or Kagini.</p>
              <div className="formGrid">
                {(['name', 'phone', 'age', 'address'] as const).map((key) => <label key={key}><span>{key}</span><input value={reg[key]} onChange={(e) => setReg({ ...reg, [key]: e.target.value })} /></label>)}
                <label><span>Help Desk</span><select value={reg.location} onChange={(e) => setReg({ ...reg, location: e.target.value })}><option>NCC</option><option>Kagini</option></select></label>
              </div>
              <button className="primary" disabled={busy} onClick={register}><Plus size={17} /> Create BOW account</button>
            </section>
          ) : (
            <>
              <div className="identityCard"><div><span className="eyebrow">BOW DIGITAL IDENTITY</span><h2>{beneficiary.name}</h2><strong>{beneficiary.bowId}</strong><p>{beneficiary.location} • {beneficiary.tier} • {beneficiary.status}</p></div><div className="qrReady"><QrCode /><small>QR-READY PAYLOAD</small><code>{beneficiary.bowId}</code></div></div>
              <div className="dashboardGrid">
                <article className="dashboardCard"><UserRound /><h3>{beneficiary.tier}</h3><p>{beneficiary.location} Help Desk</p></article>
                <article className="dashboardCard"><Coins /><h3>{beneficiary.points}</h3><p>Welfare Points</p></article>
                <article className="dashboardCard"><Coins /><h3>{beneficiary.coins}</h3><p>Kingdom Coins</p></article>
                <article className="dashboardCard"><Bell /><h3>{notifications.filter((n) => !n.read).length}</h3><p>Unread notifications</p></article>
              </div>
              <section className="sectionCard"><div className="sectionHeading"><span className="eyebrow">REQUEST SUPPORT</span><h2>Tell the Help Desk what you need</h2></div><div className="formGrid"><label><span>Category</span><select value={req.category} onChange={(e) => setReq({ ...req, category: e.target.value })}><option>Food support</option><option>Transport</option><option>Household welfare</option><option>Education</option><option>Health / care</option><option>Skills / opportunity</option><option>Other</option></select></label><label><span>Urgency</span><select value={req.urgency} onChange={(e) => setReq({ ...req, urgency: e.target.value })}><option>Normal</option><option>High</option><option>Crisis</option></select></label><label><span>Nature</span><select value={req.nature} onChange={(e) => setReq({ ...req, nature: e.target.value })}><option>Welfare</option><option>Financial Resource</option></select></label><label className="wide"><span>Description</span><textarea value={req.description} onChange={(e) => setReq({ ...req, description: e.target.value })} /></label></div><button className="primary" onClick={submitRequest}>Submit support request</button></section>
              <section className="sectionCard"><div className="sectionHeading"><span className="eyebrow">REQUEST HISTORY</span><h2>Status timeline</h2></div>{requests.length ? requests.map((r) => <div className="notice" key={r.id}><strong>{r.referenceId} • {r.status}</strong><p>{r.category} • {r.urgency}<br />{r.description}</p><small>{new Date(r.updatedAt).toLocaleString()}</small></div>) : <p>No support requests yet.</p>}</section>
              <section className="sectionCard"><div className="sectionHeading"><span className="eyebrow">LEDGER</span><h2>Welfare history</h2></div>{ledger.length ? <div className="tableWrap"><table><thead><tr><th>Currency</th><th>Amount</th><th>Reason</th><th>Reference</th><th>After</th></tr></thead><tbody>{ledger.map((x) => <tr key={x.id}><td>{x.currency}</td><td>{x.amount}</td><td>{x.reason}</td><td>{x.referenceId}</td><td>{x.afterBalance}</td></tr>)}</tbody></table></div> : <p>No ledger entries yet.</p>}</section>
            </>
          )}
        </main>
      )}

      {view === 'helpdesk' && <main className="section page"><span className="eyebrow">HELP DESK COMMAND CENTRE</span><h1>NCC + Kagini operations.</h1><p className="lead">Location-based case intake, registry, review, allocation and audit.</p><div className="dashboardGrid"><article className="dashboardCard"><Users /><h3>NCC Help Desk</h3><p>National Christian Centre</p></article><article className="dashboardCard"><Users /><h3>Kagini Help Desk</h3><p>Community-based access</p></article></div><div className="sectionCard"><h2>Workflow</h2><div className="statusSteps">{['Submitted', 'Under Review', 'Approved / Declined', 'Allocated', 'Disbursed', 'Completed'].map((x) => <span key={x}>{x}</span>)}</div><button className="primary" onClick={() => user ? go('admin') : signIn('admin')}><LayoutDashboard size={17} /> Open authorised management tools</button></div></main>}

      {view === 'partner' && <main className="section page"><span className="eyebrow">PARTNER WITH BOW</span><h1>Give, collaborate, build impact.</h1><p className="lead">Join BOW as an Associate, Affiliate or Donor Partner and help connect people with practical, coordinated welfare support.</p><div className="partnerGrid">{[['Associate Partner', 'Build relationships and contribute services or expertise.'], ['Affiliate Partner', 'Extend BOW’s community network and local reach.'], ['Donor Partner', 'Provide financial or in-kind support for welfare initiatives.']].map((x) => <article className="dashboardCard" key={x[0]}><Building2 /><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div><section className="sectionCard"><h2>Become a BOW partner</h2><p>Share your organisation or initiative details. The BOW team will review your expression of interest and follow up.</p><div className="formGrid"><label><span>Partner name</span><input value={partner.name} onChange={(e) => setPartner({ ...partner, name: e.target.value })} /></label><label><span>Type</span><select value={partner.category} onChange={(e) => setPartner({ ...partner, category: e.target.value })}><option>Associate Partner</option><option>Affiliate Partner</option><option>Donor Partner</option></select></label><label><span>Contribution</span><select value={partner.contributionType} onChange={(e) => setPartner({ ...partner, contributionType: e.target.value })}><option>Financial / Periodic</option><option>Goods / Services</option><option>Services / Expertise</option></select></label><label><span>Frequency</span><select value={partner.frequency} onChange={(e) => setPartner({ ...partner, frequency: e.target.value })}><option>One-time</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>Crisis / Emergency</option></select></label><label><span>Contact</span><input value={partner.contact} onChange={(e) => setPartner({ ...partner, contact: e.target.value })} /></label><label><span>Notes</span><input value={partner.notes} onChange={(e) => setPartner({ ...partner, notes: e.target.value })} /></label></div><button className="primary" onClick={submitPartner}>Submit partnership</button></section></main>}

      {view === 'admin' && (
        <main className="section page adminPage">
          <div className="adminTop"><div><span className="eyebrow">PRIVATE CONTROL ROOM</span><h1>BOW Operations & Impact Studio</h1><p className="lead">Profiles, the General Registration & Verification Tracker, welfare operations, media, newsletters and public updates.</p></div><button className="secondary" onClick={signOut}><LogOut size={16} /> Sign out</button></div>
          <div className="adminTabs">{(['overview', 'profiles', 'tracker', 'inbox', 'media', 'staff', 'settings', 'audit'] as AdminTab[]).map((tab) => <button className={adminTab === tab ? 'active' : ''} key={tab} onClick={() => setAdminTab(tab)}>{tab === 'profiles' ? 'Profiles' : tab === 'tracker' ? 'General Tracker' : tab === 'inbox' ? 'Applicant & Partner Inbox' : tab === 'media' ? 'Media & Updates' : tab}</button>)}</div>

          {adminTab === 'overview' && <section className="adminSection">
            <div className="kpiGrid"><article><span>Tracker applications</span><strong>{summary.applications}</strong></article><article><span>Verified / accepted</span><strong>{summary.verified}</strong></article><article><span>Active BOW accounts</span><strong>{summary.activeAccounts}</strong></article><article><span>Pending verification</span><strong>{summary.pending}</strong></article><article><span>Content items</span><strong>{summary.media}</strong></article></div>
            <div className="sectionCard"><div className="sectionHeading"><span className="eyebrow">OPERATIONS</span><h2>Beneficiary registry</h2></div><div className="filterBar"><input placeholder="Search BOW ID or beneficiary" value={search} onChange={(e) => setSearch(e.target.value)} /><select value={location} onChange={(e) => setLocation(e.target.value)}><option>All</option><option>NCC</option><option>Kagini</option></select></div><div className="tableWrap"><table><thead><tr><th>Profile</th><th>Location</th><th>Tier</th><th>Status</th><th>Points</th><th>Coins</th><th>Action</th></tr></thead><tbody>{filteredBeneficiaries.map((b) => <tr key={b.id}><td><strong>{b.name}</strong><small>{b.bowId}</small></td><td>{b.location}</td><td>{b.tier}</td><td><select value={status[b.id || ''] || b.status} onChange={(e) => setStatus({ ...status, [b.id || '']: e.target.value })}><option>Active</option><option>Under Review</option><option>Support Completed</option><option>Closed</option></select></td><td>{b.points}</td><td>{b.coins}</td><td><button className="iconBtn" onClick={() => b.id && updateBeneficiary(b.id)}><CheckCircle2 size={15} /></button></td></tr>)}</tbody></table></div></div>
            <div className="sectionCard"><div className="sectionHeading"><span className="eyebrow">REQUEST QUEUE</span><h2>Welfare requests</h2></div><div className="filterBar"><select value={requestStatus} onChange={(e) => setRequestStatus(e.target.value)}><option>All</option><option>Submitted</option><option>Under Review</option><option>Approved</option><option>Declined</option><option>Allocated</option><option>Disbursed</option><option>Completed</option></select></div><div className="tableWrap"><table><thead><tr><th>Request</th><th>Beneficiary</th><th>Urgency</th><th>Status</th><th>Allocation</th></tr></thead><tbody>{filteredRequests.map((r) => <tr key={r.id}><td><strong>{r.referenceId}</strong><small>{r.category}</small></td><td>{r.beneficiaryName}<small>{r.location}</small></td><td>{r.urgency}</td><td><select value={status[r.id || ''] || r.status} onChange={(e) => setStatus({ ...status, [r.id || '']: e.target.value })}>{['Submitted', 'Under Review', 'Approved', 'Declined', 'Allocated', 'Disbursed', 'Completed'].map((s) => <option key={s}>{s}</option>)}</select><button className="textBtn" onClick={() => r.id && updateRequest(r.id)}>Save</button></td><td><input className="miniInput" placeholder="Points" value={alloc[r.id || '']?.points || ''} onChange={(e) => setAlloc({ ...alloc, [r.id || '']: { ...(alloc[r.id || ''] || { coins: '', reason: '' }), points: e.target.value } })} /><input className="miniInput" placeholder="Coins" value={alloc[r.id || '']?.coins || ''} onChange={(e) => setAlloc({ ...alloc, [r.id || '']: { ...(alloc[r.id || ''] || { points: '', reason: '' }), coins: e.target.value } })} /><button className="textBtn" onClick={() => r.id && allocate(r.id)}>Allocate</button></td></tr>)}</tbody></table></div></div>
            <div className="adminActions"><button className="primary" onClick={generateReport}><Download size={16} /> Generate report</button>{report && <button className="secondary" onClick={exportCsv}>Download CSV</button>}</div>
          </section>}

          {adminTab === 'profiles' && <section className="adminSection">
            <div className="sectionHeading"><span className="eyebrow">BENEFICIARY PROFILE STUDIO</span><h2>File-jacket profiles built from the tracker</h2><p>Each profile mirrors the supplied BOW case-file structure: beneficiary name, verification ID, account/ID number, case officer, date opened and status.</p></div>
            <div className="designLibrary">{DESIGN_REFS.map((d) => <a className="designRef" href={d.path} target="_blank" rel="noreferrer" key={d.type} style={{ borderColor: d.color }}><span style={{ background: d.color }}>{d.type}</span><strong>{d.tagline}</strong><small>Open supplied design reference</small></a>)}</div>
            <div className="filterBar"><input placeholder="Search name, BOW ID or verification ID" value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)} /><select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)}><option>All</option><option>Active Accounts</option><option>Seedling</option><option>Anchor</option><option>Harvest</option><option>Elder</option><option>Crisis Relief</option><option>Pending Classification</option></select></div>
            <div className="sectionCard"><div className="sectionHeading"><span className="eyebrow">ACTIVE ACCOUNT REGISTRY</span><h2>Live BOW accounts</h2><p>Accepted and classified tracker records are promoted into actual BOW account records for ongoing data input, balances, requests and welfare tracking.</p></div><div className="tableWrap"><table><thead><tr><th>BOW Account</th><th>Beneficiary</th><th>Account Type</th><th>Help Desk</th><th>Status</th><th>Points</th><th>Coins</th></tr></thead><tbody>{adminBeneficiaries.filter((b) => b.status === 'Active' && !String(b.userId).startsWith('demo-')).map((b) => <tr key={b.id}><td><strong>{b.bowId}</strong><small>{b.verificationId || 'Tracker account'}</small></td><td><strong>{b.name}</strong><small>{b.phone}</small></td><td>{b.tier}</td><td>{b.location}</td><td><span className="statusPill">ACTIVE</span></td><td>{b.points}</td><td>{b.coins}</td></tr>)}</tbody></table></div></div>
            <div className="profileGrid">{filteredProfiles.filter((profile) => profileFilter !== 'Active Accounts' || String(profile.verification?.['Accepted / Declined'] ?? '') === 'Accepted').slice(0, 120).map((profile) => { const account = value(profile.verification, 'Account Type') || 'Pending Classification'; const design = designFor(account); const active = value(profile.verification, 'Accepted / Declined') === 'Accepted' && Boolean(value(profile.verification, 'Account/ID No.')); return <button className="profileTile" key={profile.application.id} onClick={() => setSelectedProfile(profile)}><div className="profileColor" style={{ background: design?.color || '#1f3a63' }} /><span>{account}{active ? ' • ACTIVE ACCOUNT' : ''}</span><h3>{value(profile.application, 'Full Name')}</h3><small>{value(profile.verification, 'Account/ID No.') || value(profile.verification, 'Verification ID') || 'Verification pending'}</small><em>{active ? 'Active' : value(profile.application, 'Decision') || 'Pending'}</em></button>; })}</div>
            {selectedProfile && (() => { const account = value(selectedProfile.verification, 'Account Type') || 'Pending Classification'; const design = designFor(account); return <div className="profileOverlay"><div className="profileSheet" style={{ borderTopColor: design?.color || '#1f3a63' }}><div className="profileSheetHead" style={{ background: design?.color || '#1f3a63' }}><button className="iconBtn lightBtn" onClick={() => setSelectedProfile(null)}><X size={16} /></button><span className="eyebrow">BANK OF WELFARE (BOW)</span><h2>{account} Profile</h2><p>{design?.tagline || 'Confidential beneficiary record awaiting classification.'}</p></div><div className="fileJacket"><span>FILE JACKET</span><div className="profileFields"><div><small>BENEFICIARY FULL NAME</small><strong>{value(selectedProfile.application, 'Full Name')}</strong></div><div><small>VERIFICATION ID</small><strong>{value(selectedProfile.verification, 'Verification ID') || 'Pending'}</strong></div><div><small>ACCOUNT / ID NO.</small><strong>{value(selectedProfile.verification, 'Account/ID No.') || 'Pending'}</strong></div><div><small>CASE OFFICER</small><strong>{value(selectedProfile.verification, 'Verified By') || 'Pending assignment'}</strong></div><div><small>DATE OPENED</small><strong>{value(selectedProfile.application, 'Timestamp')}</strong></div><div><small>STATUS</small><strong>{value(selectedProfile.application, 'Decision') || 'Pending'}</strong></div></div><div className="profileBridge">RELIEF <span>STABILITY</span> SUSTAINABILITY <em>…bridging the gap</em></div></div><div className="profileActions"><button className="secondary" onClick={() => window.print()}><Printer size={16} /> Print profile</button><button className="secondary" onClick={() => setSelectedProfile(null)}>Close</button></div></div></div>; })()}
          </section>}

          {adminTab === 'inbox' && <section className="adminSection">
            <div className="sectionHeading"><span className="eyebrow">RESPONSE CENTRE</span><h2>Applicant & Partner Inbox</h2><p>New applications and partnership submissions appear here. Open a record, review the submitted information, write a response and keep the response with the record.</p></div>
            <div className="filterBar"><input placeholder="Search applicant, partner or reference" value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)} /></div>
            <div className="inboxGrid">{inbox.filter((item) => { const q = inboxSearch.trim().toLowerCase(); return !q || [item.name, item.referenceId, item.email, item.contact].some((v) => String(v ?? '').toLowerCase().includes(q)); }).map((item) => <article className="inboxCard" key={item.id}><div className="inboxCardTop"><div><span className="statusPill">{item.type} • {item.status}</span><h3>{item.name || 'Unnamed submission'}</h3><small>{item.referenceId || 'No reference'}{item.location ? ' • ' + String(item.location) : ''}</small></div><select value={item.status} onChange={async (e) => { try { const r = await api.put('/api/admin/intake/' + item.id, { status: e.target.value, response: item.response || '' }); setInbox((items) => items.map((x) => x.id === item.id ? r.data : x)); } catch { setToast('Inbox status could not be updated.'); } }}><option>New</option><option>Under Review</option><option>Needs Review</option><option>Responded</option><option>Processed</option><option>Closed</option></select></div><div className="inboxMeta"><span>{String(item.email || item.contact || item.phone || 'No contact supplied')}</span><span>{String(item.contributionType || item.message || 'No message supplied')}</span></div><label className="wide"><span>Response box</span><textarea value={inboxResponse[item.id] ?? String(item.response ?? '')} onChange={(e) => setInboxResponse({ ...inboxResponse, [item.id]: e.target.value })} placeholder="Write the response, next steps, appointment details or information requested from this applicant/partner." /></label><button className="primary" onClick={() => sendInboxResponse(item)}><CheckCircle2 size={16} /> Save response</button></article>)}</div>
            {!inbox.length && <div className="emptyState"><Inbox size={24}/><strong>No new applicant or partner submissions yet.</strong><span>Public applications will appear here automatically.</span></div>}
          </section>}

          {adminTab === 'tracker' && <section className="adminSection">
            <div className="sectionHeading"><span className="eyebrow">GENERAL REGISTRATION & VERIFICATION TRACKER</span><h2>Applications + verification in one workspace</h2><p>The current workbook structure is preserved as Applications and Verification, with the source dropdown logic represented as editable controls.</p></div>
            <div className="adminActions"><label className="filePickerButton"><Upload size={16} /> Select tracker workbook<input type="file" accept=".xlsx" onChange={(e) => setTrackerFile(e.target.files?.[0] || null)} /></label><button className="primary" disabled={busy || !trackerFile} onClick={importTrackerFile}><Upload size={16} /> Import into database</button><button className="secondary" disabled={busy} onClick={importTrackerResource}>Refresh from app resource</button><span className="sourceNote">Authoritative source: General Registration Verification Tracker.xlsx{trackerFile ? ' • ' + trackerFile.name + ' selected' : ''}</span></div>
            <div className="trackerStats"><span><strong>{applications.length}</strong> Applications</span><span><strong>{verification.filter((v) => value(v, 'Accepted / Declined') === 'Accepted').length}</strong> Accepted</span><span><strong>{adminBeneficiaries.filter((b) => b.status === 'Active' && !String(b.userId).startsWith('demo-')).length}</strong> Active Accounts</span><span><strong>{verification.filter((v) => value(v, 'Accepted / Declined') === 'Pending').length}</strong> Pending</span><span><strong>{verification.filter((v) => value(v, 'Accepted / Declined') === 'Declined').length}</strong> Declined</span></div>
            <div className="filterBar"><input placeholder="Search applications" value={trackerSearch} onChange={(e) => setTrackerSearch(e.target.value)} /><select value={trackerDecision} onChange={(e) => setTrackerDecision(e.target.value)}><option>All</option><option>Pending</option><option>Accepted</option><option>Declined</option></select></div>
            <div className="tableWrap"><table><thead><tr><th>S/N</th><th>Applicant</th><th>Area</th><th>Age / DOB</th><th>Priority</th><th>Decision</th><th>Reason</th></tr></thead><tbody>{filteredApplications.slice(0, 128).map((a) => <tr key={a.id}><td>{value(a, 'S/N')}</td><td><strong>{value(a, 'Full Name')}</strong><small>{value(a, 'Email Address')} • {value(a, 'Phone Number')}</small></td><td>{value(a, 'Area')}</td><td>{value(a, 'Date of Birth / Age')}</td><td><select value={value(a, 'Priority Status') || 'Low'} onChange={(e) => updateApplication(a.id, { 'Priority Status': e.target.value })}><option>High</option><option>Mid</option><option>Low</option></select></td><td><select value={value(a, 'Decision') || 'Pending'} onChange={(e) => updateApplication(a.id, { Decision: e.target.value })}><option>Pending</option><option>Accepted</option><option>Declined</option></select></td><td>{value(a, 'Reason for Application')}</td></tr>)}</tbody></table></div>
            <div className="sectionCard"><div className="sectionHeading"><span className="eyebrow">VERIFICATION</span><h2>Verification register</h2></div><div className="tableWrap"><table><thead><tr><th>Verification ID</th><th>Full Name</th><th>Account Type</th><th>Needs Classification</th><th>Priority</th><th>Decision</th><th>Verified By</th></tr></thead><tbody>{verification.slice(0, 128).map((v) => <tr key={v.id}><td>{value(v, 'Verification ID')}</td><td>{value(v, 'Full Name')}</td><td><select value={value(v, 'Account Type')} onChange={(e) => updateVerification(v.id, { 'Account Type': e.target.value })}><option value="">Pending</option><option>Seedling</option><option>Anchor</option><option>Harvest</option><option>Elder</option><option>Crisis Relief</option></select></td><td>{value(v, 'Needs Classification')}</td><td>{value(v, 'Priority Status')}</td><td>{value(v, 'Accepted / Declined')}</td><td>{value(v, 'Verified By')}</td></tr>)}</tbody></table></div></div>
          </section>}

          {adminTab === 'media' && <section className="adminSection">
            <div className="sectionHeading"><span className="eyebrow">COMMUNICATIONS & IMPACT STUDIO</span><h2>Pictures • Slideshows • Newsletters • Updates</h2><p>A dedicated content space for documenting BOW activity, publishing community updates and keeping partners informed.</p></div>
            <div className="mediaComposer"><div className="formGrid"><label><span>Content type</span><select value={mediaDraft.type} onChange={(e) => setMediaDraft({ ...mediaDraft, type: e.target.value as MediaItem['type'] })}><option>Update</option><option>Picture</option><option>Slideshow</option><option>Newsletter</option></select></label><label><span>Title</span><input value={mediaDraft.title} onChange={(e) => setMediaDraft({ ...mediaDraft, title: e.target.value })} /></label><label><span>Caption / summary</span><input value={mediaDraft.caption} onChange={(e) => setMediaDraft({ ...mediaDraft, caption: e.target.value })} /></label><label className="wide"><span>Newsletter / update body</span><textarea value={mediaDraft.body} onChange={(e) => setMediaDraft({ ...mediaDraft, body: e.target.value })} /></label><label><span>Picture / slideshow file</span><input type="file" accept="image/*,.pdf" onChange={(e) => setMediaFile(e.target.files?.[0] || null)} /></label></div><button className="primary" onClick={createMedia}><Plus size={16} /> Add to content library</button></div>
            <div className="mediaAdminGrid">{media.map((item) => <article className="mediaAdminCard" key={item.id}>{item.url ? <img src={item.url} alt={item.title} /> : <div className="mediaPlaceholder"><FileText /></div>}<div><span className="mediaType">{item.type}</span><h3>{item.title}</h3><p>{item.caption || item.body}</p><small>{item.status}</small></div><div className="mediaActions"><button className="secondary" onClick={() => togglePublished(item)}>{item.status === 'Published' ? 'Unpublish' : 'Publish'}</button><button className="iconBtn" onClick={() => deleteMedia(item)}><Trash2 size={15} /></button></div></article>)}</div>
          </section>}

          {adminTab === 'staff' && <section className="adminSection">
            <div className="sectionHeading"><span className="eyebrow">ACCOUNT MANAGER TRACKING</span><h2>Staff, roles and assigned cases</h2></div>
            <div className="staffForm"><input placeholder="Name" value={staffDraft.name} onChange={(e) => setStaffDraft({ ...staffDraft, name: e.target.value })} /><input placeholder="Email" value={staffDraft.email} onChange={(e) => setStaffDraft({ ...staffDraft, email: e.target.value })} /><select value={staffDraft.role} onChange={(e) => setStaffDraft({ ...staffDraft, role: e.target.value })}><option>Account Manager</option><option>Admin Manager</option><option>Help Desk Officer</option><option>Help Desk Supervisor</option></select><select value={staffDraft.location} onChange={(e) => setStaffDraft({ ...staffDraft, location: e.target.value })}><option>NCC</option><option>Kagini</option><option>Central</option></select><input placeholder="Notes" value={staffDraft.notes} onChange={(e) => setStaffDraft({ ...staffDraft, notes: e.target.value })} /><button className="primary" onClick={addStaff}><Plus size={16} /> Add staff</button></div>
            <div className="tableWrap"><table><thead><tr><th>Name</th><th>Role</th><th>Location</th><th>Status</th><th>Assigned Cases</th><th>Last Activity</th><th>Notes</th></tr></thead><tbody>{staff.map((s) => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.email}</small></td><td>{s.role}</td><td>{s.location}</td><td>{s.status}</td><td>{s.assignedCases}</td><td>{s.lastActivity}</td><td>{s.notes}</td></tr>)}</tbody></table></div>
          </section>}

          {adminTab === 'settings' && <section className="adminSection">
            <div className="sectionHeading"><span className="eyebrow">FRONTEND CONTROL</span><h2>Publish the public BOW experience</h2></div>
            <div className="formGrid"><label><span>Hero title</span><input value={settings.heroTitle} onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })} /></label><label><span>Announcement</span><input value={settings.announcement} onChange={(e) => setSettings({ ...settings, announcement: e.target.value })} /></label><label className="wide"><span>Hero description</span><textarea value={settings.heroDescription} onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })} /></label><label className="wide"><span>Mission</span><textarea value={settings.mission} onChange={(e) => setSettings({ ...settings, mission: e.target.value })} /></label><label className="wide"><span>Vision</span><textarea value={settings.vision} onChange={(e) => setSettings({ ...settings, vision: e.target.value })} /></label><label><span>Accent color</span><input value={settings.accentColor} onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })} /></label><label><span>Surface color</span><input value={settings.surfaceColor} onChange={(e) => setSettings({ ...settings, surfaceColor: e.target.value })} /></label></div><button className="primary" onClick={saveSettings}><Settings size={16} /> Publish changes</button>
          </section>}

          {adminTab === 'audit' && <section className="adminSection"><div className="sectionHeading"><span className="eyebrow">GOVERNANCE</span><h2>Administrative activity trail</h2></div><div className="activityList">{activity.map((a) => <div key={a.id}><strong>{a.action}</strong><span>{a.target} • {a.actorEmail} • {a.timestamp}</span></div>)}</div></section>}
        </main>
      )}

      <footer className="footer"><div><strong>BANK OF WELFARE (BOW)</strong><p>Manus Dei Global Initiative For Transformation (GIFT)</p></div><div className="footerLinks"><button onClick={() => go('home')}><BookOpen size={15} /> About</button><button onClick={() => go('partner')}><Building2 size={15} /> Partner</button></div></footer>
    </div>
  );
}

export default App;