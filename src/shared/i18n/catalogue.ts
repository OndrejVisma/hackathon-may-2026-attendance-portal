// Translation catalogues per FE refinement §6.
// Flat key.namespaced.id → string. Plurals via {n, plural, one {…} other {…}} ICU.
// A translator can copy sk -> en and edit; no code change required.

export type Locale = 'sk' | 'en';

export type Catalogue = Readonly<Record<string, string>>;

export const SK: Catalogue = {
  // Common
  'common.save': 'Uložiť',
  'common.saveAnyway': 'Uložiť aj tak',
  'common.cancel': 'Zrušiť',
  'common.approve': 'Schváliť',
  'common.reject': 'Zamietnuť',
  'common.withdraw': 'Stiahnuť',
  'common.refresh': 'Obnoviť',
  'common.signOut': 'Odhlásiť',
  'common.signingIn': 'Prihlasujem…',
  'common.saving': 'Ukladám…',
  'common.loading': 'Načítavam…',
  'common.remaining': 'Zostáva',
  'common.from': 'Od',
  'common.to': 'Do',

  // Nav
  'nav.myDay': 'Môj deň',
  'nav.balances': 'Zostatky',
  'nav.notifications': 'Notifikácie',
  'nav.approvals': 'Schválenia',
  'nav.teamCalendar': 'Kalendár tímu',
  'nav.hr': 'HR',
  'nav.admin': 'Admin',

  // Login
  'login.heading': 'Prihlásenie',
  'login.subhead': 'Vyberte zaseedovaného používateľa.',

  // Absences
  'absence.new': 'Nová absencia',
  'absence.type': 'Typ',
  'absence.dates': 'Dátumy',
  'absence.halfDay': 'Pol dňa',
  'absence.halfDay.morning': 'Doobedu',
  'absence.halfDay.afternoon': 'Poobede',
  'absence.comment': 'Komentár (voliteľné)',
  'absence.document.title': 'Dokument',
  'absence.document.required': 'Tento typ vyžaduje dokument a schválenie HR (pravidlo H8).',
  'absence.submitted': 'Absencia odoslaná.',
  'absence.empty': 'Žiadne absencie',

  // Worktime
  'worktime.heading': 'Pracovný čas dnes',
  'worktime.crossMidnight': 'Záznam nesmie prejsť cez polnoc (pravidlo H1).',

  // Approvals
  'approvals.title': 'Schválenia',
  'approvals.routedToMe': 'Pridelené mne',
  'approvals.viaChain': 'Cez reťaz',
  'approvals.all': 'Všetko',
  'approvals.cannotSelfApprove': 'Vlastnú žiadosť nemôžete schváliť — eskalované vyššie.',

  // Document validation
  'doc.heading': 'Fronta dokumentov',
  'doc.validate': 'Validovať',
  'doc.empty': 'Všetky dokumenty validované',

  // Balances
  'balance.heading': 'Zostatky',
  'balance.bonusWithheld': 'Bonus zadržaný',
  'balance.carriedOver': 'prenesené',

  // HR / Admin
  'hr.tabs.documents': 'Dokumenty',
  'hr.tabs.audit': 'Audit',
  'hr.tabs.quotas': 'Kvóty',
  'hr.tabs.export': 'Export',
  'admin.tabs.users': 'Používatelia',
  'admin.tabs.teams': 'Tímy',
  'admin.tabs.holidays': 'Sviatky',
  'admin.tabs.rollover': 'Ročný prepočet',
};

export const EN: Catalogue = {
  'common.save': 'Save',
  'common.saveAnyway': 'Save anyway',
  'common.cancel': 'Cancel',
  'common.approve': 'Approve',
  'common.reject': 'Reject',
  'common.withdraw': 'Withdraw',
  'common.refresh': 'Refresh',
  'common.signOut': 'Sign out',
  'common.signingIn': 'Signing in…',
  'common.saving': 'Saving…',
  'common.loading': 'Loading…',
  'common.remaining': 'Remaining',
  'common.from': 'From',
  'common.to': 'To',

  'nav.myDay': 'My day',
  'nav.balances': 'Balances',
  'nav.notifications': 'Notifications',
  'nav.approvals': 'Approvals',
  'nav.teamCalendar': 'Team calendar',
  'nav.hr': 'HR',
  'nav.admin': 'Admin',

  'login.heading': 'Mock login',
  'login.subhead': 'Pick a seeded user.',

  'absence.new': 'New absence',
  'absence.type': 'Type',
  'absence.dates': 'Dates',
  'absence.halfDay': 'Half day',
  'absence.halfDay.morning': 'Morning',
  'absence.halfDay.afternoon': 'Afternoon',
  'absence.comment': 'Comment (optional)',
  'absence.document.title': 'Document',
  'absence.document.required': 'This type requires a document and HR approval (rule H8).',
  'absence.submitted': 'Absence submitted.',
  'absence.empty': 'No absences',

  'worktime.heading': 'Today\'s worktime',
  'worktime.crossMidnight': 'Worktime cannot cross midnight (rule H1).',

  'approvals.title': 'Approvals',
  'approvals.routedToMe': 'Routed to me',
  'approvals.viaChain': 'Via chain',
  'approvals.all': 'All',
  'approvals.cannotSelfApprove': 'You cannot approve your own request — escalated.',

  'doc.heading': 'Documents queue',
  'doc.validate': 'Validate',
  'doc.empty': 'All documents validated',

  'balance.heading': 'Balances',
  'balance.bonusWithheld': 'Bonus withheld',
  'balance.carriedOver': 'carried over',

  'hr.tabs.documents': 'Documents',
  'hr.tabs.audit': 'Audit',
  'hr.tabs.quotas': 'Quotas',
  'hr.tabs.export': 'Export',
  'admin.tabs.users': 'Users',
  'admin.tabs.teams': 'Teams',
  'admin.tabs.holidays': 'Holidays',
  'admin.tabs.rollover': 'Year rollover',
};

export const CATALOGUES: Record<Locale, Catalogue> = { sk: SK, en: EN };
