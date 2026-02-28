import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchWcpfcVesselsByCompanyOrRegistration, parseWcpfcVesselHtml } from './wcpfcRegistry';

const vesselHtml = (params: {
  name: string;
  flag: string;
  vesselType: string;
  registration: string;
  ircs: string;
  win: string;
  imo: string;
  owner: string;
}) => `
  <html>
    <body>
      <h1 class="page-title">${params.name} (VID: 111)</h1>
      <div class="vessel-version__vsl-flag-cty-id"><div class="field__item">${params.flag}</div></div>
      <div class="vessel-version__vsl-vty-id"><div class="field__item">${params.vesselType}</div></div>
      <div class="vessel-version__vsl-registration-number"><div class="field__item">${params.registration}</div></div>
      <div class="vessel-version__vsl-ircs"><div class="field__item">${params.ircs}</div></div>
      <div class="vessel-version__vsl-win"><div class="field__item">${params.win}</div></div>
      <div class="vessel-origin__vslo-imo-number"><div class="field__item">${params.imo}</div></div>
      <div class="vessel-version__vsl-owner-name"><div class="field__item">${params.owner}</div></div>
    </body>
  </html>
`;

describe('wcpfcRegistry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses vessel html details', () => {
    const parsed = parseWcpfcVesselHtml(vesselHtml({
      name: 'ALPHA ONE',
      flag: 'China',
      vesselType: 'Longliner',
      registration: 'REG-123',
      ircs: 'IRCS1',
      win: 'WIN1',
      imo: 'IMO1',
      owner: 'ACME FISHERY CO.,LTD.',
    }), '111');

    expect(parsed.name).toBe('ALPHA ONE');
    expect(parsed.flag).toBe('China');
    expect(parsed.vesselType).toBe('Longliner');
    expect(parsed.registrationNumber).toBe('REG-123');
    expect(parsed.ownerName).toBe('ACME FISHERY CO.,LTD.');
    expect(parsed.sourceUrl).toContain('/vessel/111');
  });

  it('filters by owner for company lookups', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/vessel/results?q=ACME')) {
        return Promise.resolve(new Response(JSON.stringify([
          { value: 'ALPHA ONE (VID: 111) (111)', label: 'ALPHA ONE <br><b>Registration:</b> REG-111' },
          { value: 'BETA TWO (VID: 222) (222)', label: 'BETA TWO <br><b>Registration:</b> REG-222' },
        ]), { status: 200 }));
      }

      if (url.endsWith('/vessel/111')) {
        return Promise.resolve(new Response(vesselHtml({
          name: 'ALPHA ONE',
          flag: 'China',
          vesselType: 'Longliner',
          registration: 'REG-111',
          ircs: 'IRCS1',
          win: 'WIN1',
          imo: 'IMO1',
          owner: 'ACME FISHERY CO.,LTD.',
        }), { status: 200 }));
      }

      if (url.endsWith('/vessel/222')) {
        return Promise.resolve(new Response(vesselHtml({
          name: 'BETA TWO',
          flag: 'China',
          vesselType: 'Longliner',
          registration: 'REG-222',
          ircs: 'IRCS2',
          win: 'WIN2',
          imo: 'IMO2',
          owner: 'DIFFERENT OWNER LTD.',
        }), { status: 200 }));
      }

      return Promise.resolve(new Response('not found', { status: 404 }));
    });

    const rows = await fetchWcpfcVesselsByCompanyOrRegistration('ACME');

    expect(fetchMock).toHaveBeenCalled();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('ALPHA ONE');
    expect(rows[0].ownerName).toBe('ACME FISHERY CO.,LTD.');
  });
});
