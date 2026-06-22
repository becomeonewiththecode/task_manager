import { describe, it, expect } from 'vitest';
import { parseIcs } from '../icsParser';

const wrap = (body: string) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;

describe('parseIcs', () => {
  describe('ISO format dates (the fix)', () => {
    it('parses ISO datetime DTSTART from the reported failing file', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
DTEND:2026-06-08T10:20:00
SUMMARY:LifeLabs Appointment for Clarence Mills
DESCRIPTION:This is a calendar placeholder
LOCATION:1670 Dufferin St, Suite 202, Toronto, ON
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('LifeLabs Appointment for Clarence Mills');
      expect(events[0].dueDate).toMatch(/^2026-06-08T\d{2}:10:00/);
      expect(events[0].location).toBe('1670 Dufferin St, Suite 202, Toronto, ON');
    });

    it('parses ISO date-only DTSTART', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08
SUMMARY:All-day event
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].dueDate).toContain('2026-06-08');
    });

    it('parses ISO datetime with Z suffix', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00Z
SUMMARY:UTC event
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].dueDate).toBe('2026-06-08T10:10:00.000Z');
    });
  });

  describe('compact ICS format (original support)', () => {
    it('parses compact datetime DTSTART', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:20260608T101000
SUMMARY:Compact event
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].dueDate).toMatch(/^2026-06-08T\d{2}:10:00/);
    });

    it('parses compact datetime with Z suffix', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:20260608T101000Z
SUMMARY:UTC compact event
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].dueDate).toBe('2026-06-08T10:10:00.000Z');
    });

    it('parses compact date-only DTSTART', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:20260608
SUMMARY:Date-only compact
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].dueDate).toContain('2026-06-08');
    });
  });

  describe('skips events with missing required fields', () => {
    it('skips event without SUMMARY', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
END:VEVENT`);

      expect(parseIcs(ics)).toHaveLength(0);
    });

    it('skips event without DTSTART', () => {
      const ics = wrap(`BEGIN:VEVENT
SUMMARY:No date event
END:VEVENT`);

      expect(parseIcs(ics)).toHaveLength(0);
    });
  });

  describe('line folding', () => {
    it('unfolds continuation lines (CRLF + space)', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Very long title tha\r\n t gets folded
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Very long title that gets folded');
    });

    it('unfolds continuation lines (CRLF + tab)', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Tab\r\n\tfolded line
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Tabfolded line');
    });
  });

  describe('escaping', () => {
    it('unescapes commas', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Item one\\, item two
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events[0].title).toBe('Item one, item two');
    });

    it('unescapes semicolons', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Task
DESCRIPTION:Note\\; important
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events[0].description).toBe('Note; important');
    });

    it('unescapes backslashes', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Task
DESCRIPTION:Path\\\\to\\\\file
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events[0].description).toBe('Path\\to\\file');
    });

    it('unescapes newlines (\\n)', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Task
DESCRIPTION:Line one\\nLine two
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events[0].description).toBe('Line one\nLine two');
    });
  });

  describe('HTML stripping in DESCRIPTION', () => {
    it('strips HTML tags from DESCRIPTION', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Task
DESCRIPTION:<p>Hello <b>world</b></p>
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events[0].description).toBe('Hello world');
    });

    it('decodes HTML entities when HTML is present', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Task
DESCRIPTION:<p>a &amp; b &lt; c &gt; d &nbsp; e</p>
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events[0].description).toBe('a & b < c > d   e');
    });
  });

  describe('X-ALT-DESC skipping', () => {
    it('skips X-ALT-DESC with FMTTYPE param', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Event with alt desc
X-ALT-DESC;FMTTYPE=text/html:<html><body>rich</body></html>
DESCRIPTION:Plain description
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].description).toBe('Plain description');
    });

    it('skips bare X-ALT-DESC', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Event with bare alt
X-ALT-DESC:<html>rich</html>
DESCRIPTION:Plain
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].description).toBe('Plain');
    });
  });

  describe('multiple events', () => {
    it('parses multiple events', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:First event
END:VEVENT
BEGIN:VEVENT
DTSTART:2026-06-09T14:00:00
SUMMARY:Second event
LOCATION:Room 101
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('First event');
      expect(events[1].title).toBe('Second event');
      expect(events[1].location).toBe('Room 101');
    });
  });

  describe('nested components (VALARM)', () => {
    it('ignores VALARM and other sub-components', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:Event with alarm
BEGIN:VALARM
TRIGGER:-PT15M
DESCRIPTION:Reminder
END:VALARM
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Event with alarm');
      expect(events[0].description).toBeUndefined();
    });

    it('does not let VALARM DESCRIPTION overwrite event DESCRIPTION', () => {
      const ics = wrap(`BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
SUMMARY:My event
DESCRIPTION:Real description
BEGIN:VALARM
DESCRIPTION:Alarm description
END:VALARM
END:VEVENT`);

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].description).toBe('Real description');
    });
  });

  describe('real-world ICS from user report', () => {
    it('parses the LifeLabs appointment ICS', () => {
      const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:2026-06-08T10:10:00
DTEND:2026-06-08T10:20:00
SUMMARY:LifeLabs Appointment for Clarence Mills
DESCRIPTION:This is a calendar placeholder for your General appointment at LifeLabs. Some tests require special preparation, please review these instructions to prepare for the appointment: https://www.lifelabs.com/patients/preparing-for-a-test/patient-test-instructions/
X-ALT-DESC;FMTTYPE=text/html:\\n            <html>\\n            <body>\\n                <p>This is a calendar placeholder</p>\\n            </body>\\n            </html>\\n        
LOCATION:1670 Dufferin St, Suite 202, Toronto, ON
BEGIN:VALARM
TRIGGER:-PT15M
REPEAT:1
DURATION:PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('LifeLabs Appointment for Clarence Mills');
      expect(events[0].dueDate).toMatch(/^2026-06-08T\d{2}:10:00/);
      expect(events[0].location).toBe('1670 Dufferin St, Suite 202, Toronto, ON');
      expect(events[0].description).toContain('LifeLabs');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(parseIcs('')).toHaveLength(0);
    });

    it('returns empty array for no events', () => {
      const ics = wrap('VERSION:2.0');
      expect(parseIcs(ics)).toHaveLength(0);
    });

    it('handles CRLF line endings', () => {
      const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:2026-06-08T10:10:00\r\nSUMMARY:CRLF event\r\nEND:VEVENT\r\nEND:VCALENDAR';
      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('CRLF event');
    });

    it('handles LF line endings', () => {
      const ics = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:2026-06-08T10:10:00\nSUMMARY:LF event\nEND:VEVENT\nEND:VCALENDAR';
      const events = parseIcs(ics);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('LF event');
    });
  });
});
