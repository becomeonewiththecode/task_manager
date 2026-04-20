export interface IcsEvent {
  title: string;
  dueDate: string; // ISO string
  description?: string;
  location?: string;
}

function unfold(raw: string): string {
  // ICS line folding: CRLF followed by a space or tab is a continuation
  return raw.replace(/\r?\n[ \t]/g, '');
}

function unescape(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseDtstart(value: string): string | null {
  // Strip any TZID or VALUE params from property name — value is already split
  // Formats: 20260409T105000, 20260409T105000Z, 20260409
  const clean = value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/;
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/;

  const dtm = clean.match(dateTime);
  if (dtm) {
    const [, yr, mo, dy, hr, mn, sc, z] = dtm;
    const iso = `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}${z === 'Z' ? 'Z' : ''}`;
    return new Date(iso).toISOString();
  }

  const dm = clean.match(dateOnly);
  if (dm) {
    const [, yr, mo, dy] = dm;
    return new Date(`${yr}-${mo}-${dy}T00:00:00`).toISOString();
  }

  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

export function parseIcs(text: string): IcsEvent[] {
  const unfolded = unfold(text);
  const lines = unfolded.split(/\r?\n/);

  const events: IcsEvent[] = [];
  let inEvent = false;
  let current: Partial<IcsEvent> & { dtstart?: string } = {};

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;
      if (current.title && current.dtstart) {
        events.push({
          title: current.title,
          dueDate: current.dtstart,
          description: current.description,
          location: current.location,
        });
      }
      continue;
    }
    if (!inEvent) continue;

    // Split on first colon, but property name may have params (semicolon-separated)
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const propFull = line.slice(0, colonIdx).toUpperCase();
    const value = unescape(line.slice(colonIdx + 1));

    // Property name is the part before the first semicolon
    const propName = propFull.split(';')[0];

    // Skip alt HTML description
    if (propFull.includes('FMTTYPE=TEXT/HTML') || propFull === 'X-ALT-DESC') continue;

    switch (propName) {
      case 'SUMMARY':
        current.title = value;
        break;
      case 'DTSTART':
        current.dtstart = parseDtstart(value) ?? undefined;
        break;
      case 'DESCRIPTION':
        // Some clients put HTML in DESCRIPTION too — strip it
        current.description = value.includes('<') ? stripHtml(value) : value;
        break;
      case 'LOCATION':
        current.location = value;
        break;
    }
  }

  return events;
}
