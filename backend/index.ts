import { router, json, error, db, storage, requireAuth, requireAdminEmailAllowlist } from '@appdeploy/sdk';

const ADMIN_EMAILS = ['vjaja32@gmail.com'];
const T = {
  settings: 'bow_settings',
  staff: 'bow_staff',
  beneficiaries: 'bow_beneficiaries',
  requests: 'bow_requests',
  ledger: 'bow_ledger',
  partners: 'bow_partners',
  activity: 'bow_staff_activity',
  notifications: 'bow_notifications',
  counters: 'bow_counters',
  applications: 'bow_tracker_applications',
  verification: 'bow_tracker_verification',
  media: 'bow_media',
  inbox: 'bow_intake_inbox'
};
const defaults = {
  heroTitle: 'Welfare organised around dignity.',
  heroDescription: 'Bank of Welfare (BOW) is a structured, non-monetary welfare account system designed to connect people with practical support, opportunities and compassionate community care.',
  mission: 'To uplift individuals and communities through compassion, support and sustainable welfare initiatives.',
  vision: 'A world where every person has access to the resources, opportunities and support they need to thrive.',
  announcement: 'BOW connects beneficiaries, help desks, partners and administrators through one coordinated welfare system.',
  accentColor: '#97762e',
  surfaceColor: '#f8f5ef'
};

type RecordMap = Record<string, unknown>;
async function list<T extends RecordMap = RecordMap>(table: string, limit = 500) {
  return (await db.list<T>(table, { limit })).items;
}
async function find<T extends RecordMap = RecordMap>(table: string, field: string, value: string) {
  return (await list<T>(table)).find((item) => String(item[field] ?? '') === value) ?? null;
}
async function getSettings() {
  return (await list(T.settings, 5))[0] ?? null;
}
async function logActivity(ctx: { user?: { email?: string } }, action: string, target: string) {
  await db.add(T.activity, [{
    action,
    target,
    actorEmail: ctx.user?.email ?? 'system',
    timestamp: new Date().toISOString()
  }]);
}
async function notify(userId: string, title: string, message: string) {
  await db.add(T.notifications, [{ userId, title, message, read: false, createdAt: new Date().toISOString() }]);
}
async function sequence(prefix: string) {
  const row = (await list(T.counters, 50)).find((item) => item.prefix === prefix);
  if (!row) {
    const [id] = await db.add(T.counters, [{ prefix, value: 1 }]);
    if (!id) throw new Error('counter');
    return 1;
  }
  const value = Number(row.value ?? 0) + 1;
  await db.update(T.counters, [{ id: row.id, record: { prefix, value } }]);
  return value;
}
async function seed() {
  if (!(await getSettings())) await db.add(T.settings, [defaults]);
  if ((await list(T.staff, 10)).length === 0) {
    await db.add(T.staff, [
      { name: 'NCC Account Manager', email: 'ncc@bankofwelfare.org', role: 'Account Manager', location: 'NCC', status: 'Active', assignedCases: 0, lastActivity: 'Initial setup', notes: '' },
      { name: 'Kagini Account Manager', email: 'kagini@bankofwelfare.org', role: 'Account Manager', location: 'Kagini', status: 'Active', assignedCases: 0, lastActivity: 'Initial setup', notes: '' },
      { name: 'BOW Admin Manager', email: 'admin@bankofwelfare.org', role: 'Admin Manager', location: 'Central', status: 'Active', assignedCases: 0, lastActivity: 'Initial setup', notes: 'System governance and administration' }
    ]);
  }
  if ((await list(T.beneficiaries, 10)).length === 0) {
    await db.add(T.beneficiaries, [
      { userId: 'demo-ncc', name: 'Demo Beneficiary NCC', email: 'demo.ncc@example.org', phone: '', location: 'NCC', tier: 'Seedling Account', bowId: 'BOW-NCC-000124', status: 'Active', points: 120, coins: 25, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { userId: 'demo-kagini', name: 'Demo Beneficiary Kagini', email: 'demo.kagini@example.org', phone: '', location: 'Kagini', tier: 'Anchor Account', bowId: 'BOW-KAG-000087', status: 'Active', points: 80, coins: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]);
  }
  if ((await list(T.requests, 10)).length === 0) {
    await db.add(T.requests, [
      { beneficiaryUserId: 'demo-ncc', bowId: 'BOW-NCC-000124', beneficiaryName: 'Demo Beneficiary NCC', location: 'NCC', category: 'Food support', urgency: 'Normal', nature: 'Welfare', description: 'Food support and transport assistance', referenceId: 'BOW-REQ-0001', status: 'Under Review', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { beneficiaryUserId: 'demo-kagini', bowId: 'BOW-KAG-000087', beneficiaryName: 'Demo Beneficiary Kagini', location: 'Kagini', category: 'Household welfare', urgency: 'High', nature: 'Welfare', description: 'Household welfare support', referenceId: 'BOW-REQ-0002', status: 'Under Review', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]);
  }
  if ((await list(T.partners, 10)).length === 0) {
    await db.add(T.partners, [
      { name: 'Demo Impact Partner', category: 'Donor Partner', contributionType: 'Financial / Periodic', frequency: 'Monthly', status: 'Active', contact: 'partner@example.org' },
      { name: 'Demo In-Kind Partner', category: 'Associate Partner', contributionType: 'Goods / Services', frequency: 'One-time', status: 'Pending', contact: 'partner2@example.org' }
    ]);
  }
  if ((await list(T.media, 10)).length === 0) {
    await db.add(T.media, [
      { type: 'Update', title: 'BOW 2.0 operations studio', caption: 'A new digital home for welfare coordination and impact storytelling.', body: 'BOW now brings beneficiary profiles, tracker operations and communications into one coordinated workspace.', status: 'Published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { type: 'Newsletter', title: 'BOW Impact Brief', caption: 'Use this space for monthly or quarterly partner communication.', body: 'Add a newsletter narrative here, then publish it to the public BOW stories section.', status: 'Draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]);
  }
}
const auth = [requireAuth()];
const admin = [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS)];

async function publicMedia() {
  const items = (await list<RecordMap>(T.media)).filter((item) => item.status === 'Published').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const withUrls = await Promise.all(items.map(async (item) => {
    if (!item.storagePath) return { ...item, id: item.id };
    const [signed] = await storage.url([String(item.storagePath)]);
    return { ...item, id: item.id, url: signed?.url ?? '' };
  }));
  return withUrls;
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ ok: true, service: 'BOW' })],
  'GET /api/public/settings': [async () => { await seed(); return json({ ...((await getSettings()) ?? defaults) }); }],
  'GET /api/public/content': [async () => { await seed(); return json({ items: await publicMedia() }); }],
  'POST /api/public/apply': [async (ctx) => {
    const body = ctx.body as RecordMap;
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const location = String(body.location ?? 'NCC').trim();
    if (!name || !phone || !['NCC', 'Kagini'].includes(location)) return error('Name, phone and a valid Help Desk are required', 400);
    const now = new Date().toISOString();
    const reference = 'BOW-APP-' + String(await sequence('PUBLIC-APP')).padStart(4, '0');
    const application = { sourceKey: 'public-' + reference, 'S/N': '', Timestamp: now, Title: String(body.title ?? ''), 'Full Name': name, Gender: String(body.gender ?? ''), 'Marital Status': String(body.maritalStatus ?? ''), 'Date of Birth / Age': String(body.age ?? ''), 'Phone Number': phone, 'Email Address': String(body.email ?? ''), 'Home Address': String(body.address ?? ''), Area: location, 'Reason for Application': String(body.reason ?? ''), 'Priority Status': String(body.priority ?? 'Pending'), Decision: 'Pending', 'Reviewer Notes': '', source: 'Public BOW application', referenceId: reference, createdAt: now, updatedAt: now };
    const [id] = await db.add(T.applications, [application]);
    const [inboxId] = await db.add(T.inbox, [{ type: 'Applicant', status: 'New', name, email: String(body.email ?? ''), phone, location, referenceId: reference, linkedId: id ?? '', message: String(body.reason ?? ''), response: '', source: 'Public BOW application', createdAt: now, updatedAt: now }]);
    return json({ id, inboxId, referenceId: reference, status: 'Pending' }, 201);
  }],
  'POST /api/public/partner-apply': [async (ctx) => {
    const body = ctx.body as RecordMap;
    const name = String(body.name ?? '').trim();
    const contact = String(body.contact ?? '').trim();
    if (!name || !contact) return error('Partner name and contact are required', 400);
    const now = new Date().toISOString();
    const reference = 'BOW-PARTNER-' + String(await sequence('PUBLIC-PARTNER')).padStart(4, '0');
    const record = { name, category: String(body.category ?? 'Associate Partner'), contributionType: String(body.contributionType ?? 'Services / Expertise'), frequency: String(body.frequency ?? 'One-time'), status: 'Pending', contact, notes: String(body.notes ?? ''), referenceId: reference, source: 'Public partner application', createdAt: now, updatedAt: now };
    const [id] = await db.add(T.partners, [record]);
    const [inboxId] = await db.add(T.inbox, [{ type: 'Partner', status: 'New', name, contact, contributionType: record.contributionType, frequency: record.frequency, referenceId: reference, linkedId: id ?? '', message: record.notes, response: '', source: 'Public partner application', createdAt: now, updatedAt: now }]);
    return json({ id, inboxId, referenceId: reference, status: 'Pending' }, 201);
  }],
  'GET /api/me': auth.concat([async (ctx) => {
    const beneficiary = await find(T.beneficiaries, 'userId', ctx.user!.userId);
    return json({ user: { userId: ctx.user!.userId, name: ctx.user!.name ?? '', email: ctx.user!.email ?? '' }, beneficiary });
  }]),
  'POST /api/beneficiary/register': auth.concat([async (ctx) => {
    const body = ctx.body as RecordMap;
    const existing = await find(T.beneficiaries, 'userId', ctx.user!.userId);
    if (existing) return json(existing);
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const location = String(body.location ?? '');
    if (!name || !phone || !['NCC', 'Kagini'].includes(location)) return error('Name, phone and a valid Help Desk location are required', 400);
    const prefix = location === 'NCC' ? 'NCC' : 'KAG';
    const n = await sequence(prefix);
    const age = String(body.age ?? '');
    const tier = age && Number(age) >= 18 && Number(age) <= 30 ? 'Seedling Account' : 'Anchor Account';
    const now = new Date().toISOString();
    const record = {
      userId: ctx.user!.userId, name, email: ctx.user!.email ?? '', phone, age,
      address: String(body.address ?? ''), location, tier, bowId: 'BOW-' + prefix + '-' + String(n).padStart(6, '0'),
      status: 'Active', points: 0, coins: 0, createdAt: now, updatedAt: now
    };
    const [id] = await db.add(T.beneficiaries, [record]);
    if (!id) return error('Registration failed', 500);
    await db.add(T.ledger, [{ beneficiaryUserId: record.userId, bowId: record.bowId, location, currency: 'Welfare Points', amount: 0, reason: 'Account opened', category: 'Registration', actor: ctx.user!.email ?? 'beneficiary', timestamp: now, referenceId: record.bowId, beforeBalance: 0, afterBalance: 0, type: 'opening' }]);
    await notify(record.userId, 'BOW account created', 'Your BOW ID is ' + record.bowId + '.');
    return json({ id, ...record }, 201);
  }]),
  'GET /api/beneficiary/dashboard': auth.concat([async (ctx) => {
    const beneficiary = await find(T.beneficiaries, 'userId', ctx.user!.userId);
    if (!beneficiary) return json({ registered: false, beneficiary: null, requests: [], ledger: [], notifications: [] });
    const [rs, ls, ns] = await Promise.all([list(T.requests), list(T.ledger), list(T.notifications)]);
    return json({
      registered: true, beneficiary,
      requests: rs.filter((x) => x.beneficiaryUserId === ctx.user!.userId),
      ledger: ls.filter((x) => x.beneficiaryUserId === ctx.user!.userId),
      notifications: ns.filter((x) => x.userId === ctx.user!.userId)
    });
  }]),
  'POST /api/beneficiary/requests': auth.concat([async (ctx) => {
    const beneficiary = await find(T.beneficiaries, 'userId', ctx.user!.userId);
    if (!beneficiary) return error('Complete beneficiary registration first', 400);
    const body = ctx.body as RecordMap;
    const category = String(body.category ?? '').trim();
    const description = String(body.description ?? '').trim();
    if (!category || !description) return error('Category and request description are required', 400);
    const count = (await list(T.requests)).length + 1;
    const referenceId = 'BOW-REQ-' + String(count).padStart(4, '0');
    const now = new Date().toISOString();
    const record = {
      beneficiaryUserId: beneficiary.userId, bowId: beneficiary.bowId, beneficiaryName: beneficiary.name,
      location: beneficiary.location, category, urgency: String(body.urgency ?? 'Normal'),
      nature: String(body.nature ?? 'Welfare'), description, referenceId, status: 'Submitted',
      createdAt: now, updatedAt: now
    };
    const [id] = await db.add(T.requests, [record]);
    if (!id) return error('Request could not be submitted', 500);
    await notify(beneficiary.userId, 'Support request submitted', referenceId + ' is now under review.');
    return json({ id, ...record }, 201);
  }]),
  'POST /api/partner/register': auth.concat([async (ctx) => {
    const body = ctx.body as RecordMap;
    const name = String(body.name ?? '').trim();
    const category = String(body.category ?? '').trim();
    const contact = String(body.contact ?? '').trim();
    if (!name || !category || !contact) return error('Partner name, type and contact are required', 400);
    const existing = await find(T.partners, 'ownerUserId', ctx.user!.userId);
    if (existing) return json(existing);
    const record = { ownerUserId: ctx.user!.userId, name, category, contributionType: String(body.contributionType ?? 'Services / Expertise'), frequency: String(body.frequency ?? 'One-time'), contact, notes: String(body.notes ?? ''), status: 'Pending', createdAt: new Date().toISOString() };
    const [id] = await db.add(T.partners, [record]);
    if (!id) return error('Partner registration failed', 500);
    return json({ id, ...record }, 201);
  }]),
  'GET /api/admin/overview': admin.concat([async () => {
    await seed();
    const [s, st, b, r, p, a, m, apps, ver, inbox] = await Promise.all([
      getSettings(), list(T.staff), list(T.beneficiaries), list(T.requests), list(T.partners),
      list(T.activity), list(T.media), list(T.applications), list(T.verification), list(T.inbox)
    ]);
    return json({ settings: s ?? defaults, staff: st, beneficiaries: b, requests: r, partners: p, activity: a, media: m, tracker: { applications: apps, verification: ver }, intake: { inbox } });
  }]),
  'PUT /api/admin/intake/:id': admin.concat([async (ctx) => {
    const [current] = await db.get<RecordMap>(T.inbox, [ctx.params.id]);
    if (!current) return error('Inbox item not found', 404);
    const body = ctx.body as RecordMap;
    const next = { ...current, status: String(body.status ?? current.status), response: String(body.response ?? current.response ?? ''), updatedAt: new Date().toISOString() };
    await db.update(T.inbox, [{ id: ctx.params.id, record: next }]);
    await logActivity(ctx, 'Updated intake inbox response', String(current.referenceId ?? current.name ?? current.id));
    return json({ id: ctx.params.id, ...next });
  }]),
  'PUT /api/admin/settings': admin.concat([async (ctx) => {
    const current = await getSettings();
    if (!current) return error('Settings unavailable', 404);
    const body = ctx.body as RecordMap;
    const next: RecordMap = { ...current };
    for (const key of Object.keys(defaults)) if (typeof body[key] === 'string' && String(body[key]).trim()) next[key] = body[key];
    const ok = await db.update(T.settings, [{ id: current.id, record: next }]);
    if (!ok[0]) return error('Settings update failed', 500);
    await logActivity(ctx, 'Updated frontend settings', 'public website');
    return json({ ...next, id: current.id });
  }]),
  'POST /api/admin/staff': admin.concat([async (ctx) => {
    const body = ctx.body as RecordMap;
    const name = String(body.name ?? '').trim(), email = String(body.email ?? '').trim(), role = String(body.role ?? '').trim(), location = String(body.location ?? '').trim();
    if (!name || !email || !role || !location) return error('Name, email, role and location are required', 400);
    const record = { name, email, role, location, status: 'Active', assignedCases: 0, lastActivity: 'Created now', notes: String(body.notes ?? '') };
    const [id] = await db.add(T.staff, [record]);
    if (!id) return error('Staff creation failed', 500);
    await logActivity(ctx, 'Created staff record', id);
    return json({ id, ...record }, 201);
  }]),
  'PUT /api/admin/beneficiaries/:id': admin.concat([async (ctx) => {
    const [b] = await db.get<RecordMap>(T.beneficiaries, [ctx.params.id]);
    if (!b) return error('Beneficiary not found', 404);
    const body = ctx.body as RecordMap;
    const next = { ...b, status: String(body.status ?? b.status), updatedAt: new Date().toISOString() };
    const ok = await db.update(T.beneficiaries, [{ id: ctx.params.id, record: next }]);
    if (!ok[0]) return error('Beneficiary update failed', 500);
    await logActivity(ctx, 'Updated beneficiary record', String(b.bowId));
    return json({ id: ctx.params.id, ...next });
  }]),
  'PUT /api/admin/requests/:id': admin.concat([async (ctx) => {
    const [r] = await db.get<RecordMap>(T.requests, [ctx.params.id]);
    if (!r) return error('Request not found', 404);
    const nextStatus = String((ctx.body as RecordMap).status ?? '');
    if (!['Submitted', 'Under Review', 'Approved', 'Declined', 'Allocated', 'Disbursed', 'Completed'].includes(nextStatus)) return error('Invalid request status', 400);
    const next = { ...r, status: nextStatus, updatedAt: new Date().toISOString() };
    const ok = await db.update(T.requests, [{ id: ctx.params.id, record: next }]);
    if (!ok[0]) return error('Request update failed', 500);
    await notify(String(r.beneficiaryUserId), 'Request status updated', String(r.referenceId) + ': ' + nextStatus);
    await logActivity(ctx, 'Updated welfare request status', String(r.referenceId));
    return json({ id: ctx.params.id, ...next });
  }]),
  'POST /api/admin/allocations': admin.concat([async (ctx) => {
    const body = ctx.body as RecordMap;
    const [r] = await db.get<RecordMap>(T.requests, [String(body.requestId)]);
    if (!r) return error('Request not found', 404);
    const beneficiary = await find(T.beneficiaries, 'userId', String(r.beneficiaryUserId));
    if (!beneficiary) return error('Beneficiary not found', 404);
    const points = Math.max(0, Number(body.points ?? 0)), coins = Math.max(0, Number(body.coins ?? 0));
    if (!points && !coins) return error('Enter points or coins', 400);
    const now = new Date().toISOString(), entries: RecordMap[] = [];
    if (points) entries.push({ beneficiaryUserId: beneficiary.userId, bowId: beneficiary.bowId, location: beneficiary.location, currency: 'Welfare Points', amount: points, reason: String(body.reason ?? 'Approved welfare allocation'), category: r.category, actor: ctx.user?.email ?? 'admin', timestamp: now, referenceId: r.referenceId, beforeBalance: Number(beneficiary.points ?? 0), afterBalance: Number(beneficiary.points ?? 0) + points, type: 'allocation' });
    if (coins) entries.push({ beneficiaryUserId: beneficiary.userId, bowId: beneficiary.bowId, location: beneficiary.location, currency: 'Kingdom Coins', amount: coins, reason: String(body.reason ?? 'Approved welfare allocation'), category: r.category, actor: ctx.user?.email ?? 'admin', timestamp: now, referenceId: r.referenceId, beforeBalance: Number(beneficiary.coins ?? 0), afterBalance: Number(beneficiary.coins ?? 0) + coins, type: 'allocation' });
    await db.add(T.ledger, entries);
    const nextB = { ...beneficiary, points: Number(beneficiary.points ?? 0) + points, coins: Number(beneficiary.coins ?? 0) + coins, updatedAt: now };
    await db.update(T.beneficiaries, [{ id: String(beneficiary.id), record: nextB }]);
    const nextR = { ...r, status: 'Allocated', allocatedPoints: points, allocatedCoins: coins, updatedAt: now };
    await db.update(T.requests, [{ id: String(r.id), record: nextR }]);
    await notify(String(beneficiary.userId), 'Welfare allocation recorded', String(points) + ' points and ' + String(coins) + ' coins were allocated to ' + String(r.referenceId) + '.');
    await logActivity(ctx, 'Allocated welfare points / coins', String(r.referenceId));
    return json({ beneficiary: { id: beneficiary.id, ...nextB }, request: { id: r.id, ...nextR } });
  }]),
  'PUT /api/admin/partners/:id': admin.concat([async (ctx) => {
    const [p] = await db.get<RecordMap>(T.partners, [ctx.params.id]);
    if (!p) return error('Partner not found', 404);
    const next = { ...p, status: String((ctx.body as RecordMap).status ?? p.status), updatedAt: new Date().toISOString() };
    await db.update(T.partners, [{ id: ctx.params.id, record: next }]);
    await logActivity(ctx, 'Updated partner status', String(p.name));
    return json({ id: ctx.params.id, ...next });
  }]),
  'POST /api/admin/tracker/import': admin.concat([async (ctx) => {
    const body = ctx.body as RecordMap;
    const applications = Array.isArray(body.applications) ? body.applications as RecordMap[] : [];
    const verification = Array.isArray(body.verification) ? body.verification as RecordMap[] : [];
    if (!applications.length || !verification.length) return error('Both Applications and Verification sheets are required', 400);
    const existingApps = await list(T.applications), existingVer = await list(T.verification);
    const appByKey = new Map(existingApps.map((item) => [String(item.sourceKey ?? ''), item]));
    const verByKey = new Map(existingVer.map((item) => [String(item.sourceKey ?? ''), item]));
    const appWrites = applications.map((record, index) => ({ sourceKey: 'app-' + String(record['S/N'] ?? index + 1), ...record }));
    const verWrites = verification.map((record, index) => ({ sourceKey: 'ver-' + String(record['S/N'] ?? index + 1), ...record }));
    const appAdds = appWrites.filter((r) => !appByKey.has(String(r.sourceKey)));
    const appUpdates = appWrites.filter((r) => appByKey.has(String(r.sourceKey))).map((r) => ({ id: appByKey.get(String(r.sourceKey))!.id, record: r }));
    const verAdds = verWrites.filter((r) => !verByKey.has(String(r.sourceKey)));
    const verUpdates = verWrites.filter((r) => verByKey.has(String(r.sourceKey))).map((r) => ({ id: verByKey.get(String(r.sourceKey))!.id, record: r }));
    if (appAdds.length) await db.add(T.applications, appAdds);
    if (appUpdates.length) await db.update(T.applications, appUpdates);
    if (verAdds.length) await db.add(T.verification, verAdds);
    if (verUpdates.length) await db.update(T.verification, verUpdates);
    const allApplications = await list(T.applications);
    const allVerification = await list(T.verification);
    const existingBeneficiaries = await list(T.beneficiaries);
    let activeAccounts = 0;
    for (const v of allVerification) {
      const decision = String(v['Accepted / Declined'] ?? '');
      const accountType = String(v['Account Type'] ?? '').trim();
      const accountId = String(v['Account/ID No.'] ?? '').trim();
      if (decision !== 'Accepted' || !accountType || !accountId) continue;
      const name = String(v['Full Name'] ?? '').trim();
      const app = allApplications.find((a) => String(a['Full Name'] ?? '').trim() === name) ?? {};
      const found = existingBeneficiaries.find((b) => String(b.sourceVerificationId ?? '') === String(v['Verification ID']));
      const now = new Date().toISOString();
      const record = {
        userId: 'tracker:' + String(v['Verification ID']),
        name,
        email: String(app['Email Address'] ?? ''),
        phone: String(app['Phone Number'] ?? ''),
        dateOfBirth: String(app['Date of Birth / Age'] ?? ''),
        address: String(app['Home Address'] ?? ''),
        location: String(app['Area'] ?? 'NCC'),
        tier: accountType + ' Account',
        bowId: accountId,
        status: 'Active',
        points: Number(found?.points ?? 0),
        coins: Number(found?.coins ?? 0),
        verificationId: String(v['Verification ID']),
        needsClassification: String(v['Needs Classification'] ?? ''),
        priority: String(v['Priority Status'] ?? ''),
        decision,
        verifiedBy: String(v['Verified By'] ?? ''),
        verificationDate: String(v['Verification Date'] ?? ''),
        verificationMethod: String(v['Verification Method'] ?? ''),
        sourceVerificationId: String(v['Verification ID']),
        source: 'General Registration Verification Tracker',
        createdAt: found?.createdAt ?? now,
        updatedAt: now
      };
      if (found) await db.update(T.beneficiaries, [{ id: found.id, record: { ...found, ...record } }]);
      else await db.add(T.beneficiaries, [record]);
      activeAccounts++;
    }
    await logActivity(ctx, 'Imported General Registration & Verification Tracker', String(applications.length) + ' applications / ' + String(verification.length) + ' verification records / ' + String(activeAccounts) + ' active accounts');
    return json({ applications: await list(T.applications), verification: await list(T.verification) });
  }]),
  'PUT /api/admin/tracker/applications/:id': admin.concat([async (ctx) => {
    const [current] = await db.get<RecordMap>(T.applications, [ctx.params.id]);
    if (!current) return error('Application not found', 404);
    const patch = ctx.body as RecordMap;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    const ok = await db.update(T.applications, [{ id: ctx.params.id, record: next }]);
    if (!ok[0]) return error('Application update failed', 500);
    await logActivity(ctx, 'Updated tracker application', String(current['Full Name'] ?? current.id));
    return json({ id: ctx.params.id, ...next });
  }]),
  'PUT /api/admin/tracker/verification/:id': admin.concat([async (ctx) => {
    const [current] = await db.get<RecordMap>(T.verification, [ctx.params.id]);
    if (!current) return error('Verification record not found', 404);
    const patch = ctx.body as RecordMap;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    const ok = await db.update(T.verification, [{ id: ctx.params.id, record: next }]);
    if (!ok[0]) return error('Verification update failed', 500);
    const allApplications = await list(T.applications);
    const allBeneficiaries = await list(T.beneficiaries);
    const decision = String(next['Accepted / Declined'] ?? '');
    const accountType = String(next['Account Type'] ?? '').trim();
    const accountId = String(next['Account/ID No.'] ?? '').trim();
    if (decision === 'Accepted' && accountType && accountId) {
      const name = String(next['Full Name'] ?? '').trim();
      const app = allApplications.find((a) => String(a['Full Name'] ?? '').trim() === name) ?? {};
      const found = allBeneficiaries.find((b) => String(b.sourceVerificationId ?? '') === String(next['Verification ID']));
      const now = new Date().toISOString();
      const record = {
        userId: 'tracker:' + String(next['Verification ID']),
        name,
        email: String(app['Email Address'] ?? ''),
        phone: String(app['Phone Number'] ?? ''),
        dateOfBirth: String(app['Date of Birth / Age'] ?? ''),
        address: String(app['Home Address'] ?? ''),
        location: String(app['Area'] ?? 'NCC'),
        tier: accountType + ' Account',
        bowId: accountId,
        status: 'Active',
        points: Number(found?.points ?? 0),
        coins: Number(found?.coins ?? 0),
        verificationId: String(next['Verification ID']),
        needsClassification: String(next['Needs Classification'] ?? ''),
        priority: String(next['Priority Status'] ?? ''),
        decision,
        verifiedBy: String(next['Verified By'] ?? ''),
        verificationDate: String(next['Verification Date'] ?? ''),
        verificationMethod: String(next['Verification Method'] ?? ''),
        sourceVerificationId: String(next['Verification ID']),
        source: 'General Registration Verification Tracker',
        createdAt: found?.createdAt ?? now,
        updatedAt: now
      };
      if (found) await db.update(T.beneficiaries, [{ id: found.id, record: { ...found, ...record } }]);
      else await db.add(T.beneficiaries, [record]);
    }
    await logActivity(ctx, 'Updated tracker verification', String(current['Verification ID'] ?? current.id));
    return json({ id: ctx.params.id, ...next });
  }]),
  'POST /api/admin/media/upload': admin.concat([async (ctx) => {
    const body = ctx.body as RecordMap;
    const fileName = String(body.fileName ?? '').replace(/[^a-zA-Z0-9._-]/g, '-');
    const contentType = String(body.contentType ?? 'application/octet-stream');
    const base64 = String(body.base64 ?? '');
    if (!fileName || !base64) return error('A file is required', 400);
    if (base64.length > 9000000) return error('File is too large. Keep uploads under 6 MB.', 400);
    const path = 'bow-media/' + Date.now() + '-' + fileName;
    const [ok] = await storage.write([{ path, content: base64, contentType }]);
    if (!ok) return error('File upload failed', 500);
    await logActivity(ctx, 'Uploaded media asset', path);
    return json({ path });
  }]),
  'POST /api/admin/media': admin.concat([async (ctx) => {
    const body = ctx.body as RecordMap;
    const type = String(body.type ?? 'Update');
    if (!['Picture', 'Slideshow', 'Newsletter', 'Update'].includes(type)) return error('Invalid content type', 400);
    const title = String(body.title ?? '').trim();
    if (!title) return error('Title is required', 400);
    const now = new Date().toISOString();
    const record = { type, title, caption: String(body.caption ?? ''), body: String(body.body ?? ''), storagePath: String(body.storagePath ?? ''), status: 'Draft', createdAt: now, updatedAt: now };
    const [id] = await db.add(T.media, [record]);
    if (!id) return error('Content creation failed', 500);
    await logActivity(ctx, 'Created content item', title);
    return json({ id, ...record }, 201);
  }]),
  'PUT /api/admin/media/:id': admin.concat([async (ctx) => {
    const [current] = await db.get<RecordMap>(T.media, [ctx.params.id]);
    if (!current) return error('Content item not found', 404);
    const body = ctx.body as RecordMap;
    const status = String(body.status ?? current.status);
    if (!['Draft', 'Published'].includes(status)) return error('Invalid publication status', 400);
    const next = { ...current, status, updatedAt: new Date().toISOString() };
    await db.update(T.media, [{ id: ctx.params.id, record: next }]);
    await logActivity(ctx, status === 'Published' ? 'Published content item' : 'Unpublished content item', String(current.title));
    return json({ id: ctx.params.id, ...next });
  }]),
  'DELETE /api/admin/media/:id': admin.concat([async (ctx) => {
    const [current] = await db.get<RecordMap>(T.media, [ctx.params.id]);
    if (!current) return error('Content item not found', 404);
    if (current.storagePath) await storage.delete([String(current.storagePath)]);
    await db.delete(T.media, [ctx.params.id]);
    await logActivity(ctx, 'Deleted content item', String(current.title));
    return json({ deleted: true });
  }]),
  'GET /api/admin/reports': admin.concat([async () => {
    const [b, r, l, p, apps, ver] = await Promise.all([list(T.beneficiaries), list(T.requests), list(T.ledger), list(T.partners), list(T.applications), list(T.verification)]);
    return json({
      summary: {
        beneficiaries: b.length, pendingRequests: r.filter((x) => ['Submitted', 'Under Review'].includes(String(x.status))).length,
        activeCases: b.filter((x) => x.status === 'Active').length, crisisCases: r.filter((x) => x.urgency === 'Crisis').length,
        pointsDistributed: l.filter((x) => x.currency === 'Welfare Points').reduce((n, x) => n + Number(x.amount ?? 0), 0),
        coinsDistributed: l.filter((x) => x.currency === 'Kingdom Coins').reduce((n, x) => n + Number(x.amount ?? 0), 0),
        nccBeneficiaries: b.filter((x) => x.location === 'NCC').length, kaginiBeneficiaries: b.filter((x) => x.location === 'Kagini').length,
        partners: p.length, trackerApplications: apps.length, accepted: ver.filter((x) => x['Accepted / Declined'] === 'Accepted').length
      },
      beneficiaries: b, requests: r, ledger: l, partners: p
    });
  }]),
  'GET /api/admin/activity': admin.concat([async () => json(await list(T.activity))])
});