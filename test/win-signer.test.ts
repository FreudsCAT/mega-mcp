import { describe, it, expect } from 'vitest';
import { isMegaWinSigner, WIN_SIGNER_IDENTITIES } from '../src/download/megacmd.js';

// Subjects as X500DistinguishedName.Format($true) renders them on Windows,
// one RDN per line, already trimmed (the form verifyAuthenticodeWin parses).

/** The MEGAcmd 2.7.0 signer (EV certificate, GlobalSign GCC R45 EV CodeSigning CA 2020). */
const MEGA_PRIVACY_LLC = [
  'CN=MEGA Privacy LLC',
  'OU=IT',
  'O=MEGA Privacy LLC',
  'STREET=Templom utca 17',
  'L=Csomád',
  'S=Pest',
  'C=HU',
  'OID.1.3.6.1.4.1.311.60.2.1.3=HU',
  'SERIALNUMBER=13-09-239012',
  'OID.2.5.4.15=Private Organization',
];

/** The historical signer. */
const MEGA_LIMITED = [
  'CN=Mega Limited',
  'O=Mega Limited',
  'STREET="Level 21, Huawei Centre 120 Albert Street"',
  'L=Auckland',
  'C=NZ',
];

describe('isMegaWinSigner', () => {
  it('accepts the historical "Mega Limited" signer', () => {
    expect(isMegaWinSigner(MEGA_LIMITED)).toBe(true);
  });

  it('accepts the "MEGA Privacy LLC" EV signer used from MEGAcmd 2.7.0', () => {
    expect(isMegaWinSigner(MEGA_PRIVACY_LLC)).toBe(true);
  });

  it('REJECTS "MEGA Privacy LLC" registered under another company number', () => {
    const other = MEGA_PRIVACY_LLC.map((r) => (r.startsWith('SERIALNUMBER=') ? 'SERIALNUMBER=99-99-999999' : r));
    expect(isMegaWinSigner(other)).toBe(false);
  });

  it('REJECTS "MEGA Privacy LLC" in another jurisdiction', () => {
    const other = MEGA_PRIVACY_LLC.map((r) => (r.startsWith('OID.1.3.6.1.4.1.311.60.2.1.3=') ? 'OID.1.3.6.1.4.1.311.60.2.1.3=US' : r));
    expect(isMegaWinSigner(other)).toBe(false);
  });

  it('REJECTS a non-EV "MEGA Privacy LLC" certificate with no registration RDNs', () => {
    expect(isMegaWinSigner(['CN=MEGA Privacy LLC', 'O=MEGA Privacy LLC', 'C=HU'])).toBe(false);
  });

  it('REJECTS an Organization claimed only inside another (quoted) RDN value', () => {
    expect(isMegaWinSigner(['CN="Evil Corp, O=Mega Limited, X"', 'O=Evil Corp', 'C=US'])).toBe(false);
    expect(isMegaWinSigner(['CN="Evil, O=MEGA Privacy LLC, SERIALNUMBER=13-09-239012"', 'O=Evil Corp'])).toBe(false);
  });

  it('compares exactly: case, surrounding text and partial values do not match', () => {
    expect(isMegaWinSigner(['O=mega limited'])).toBe(false);
    expect(isMegaWinSigner(['O=Mega Limited Evil'])).toBe(false);
    expect(isMegaWinSigner(['O=Mega Limited"'])).toBe(false);
    expect(isMegaWinSigner(['O=MEGA PRIVACY LLC', 'SERIALNUMBER=13-09-239012', 'OID.1.3.6.1.4.1.311.60.2.1.3=HU'])).toBe(false);
  });

  it('REJECTS an empty subject (e.g. PowerShell failed and printed nothing)', () => {
    expect(isMegaWinSigner([])).toBe(false);
  });

  it('every accepted identity pins an Organization', () => {
    for (const identity of WIN_SIGNER_IDENTITIES) {
      expect(identity.some((rdn) => rdn.startsWith('O='))).toBe(true);
    }
  });
});
