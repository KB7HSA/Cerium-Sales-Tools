import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ERateService, Form470Record, RefreshResult } from './erate.service';
import { environment } from '../../../environments/environment';

describe('ERateService', () => {
  let service: ERateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ERateService]
    });
    service = TestBed.inject(ERateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadRecords', () => {
    it('should load Form 470 records successfully', () => {
      const mockRecords: Form470Record[] = [
        { PrimaryKey: '123|SR1|1', ApplicationNumber: '123', BilledEntityName: 'Test School' }
      ];

      service.loadRecords().subscribe(records => {
        expect(records.length).toBe(1);
        expect(records[0].ApplicationNumber).toBe('123');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/erate/form470`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockRecords });
    });

    it('should mark new records based on newKeys', () => {
      const mockRecords: Form470Record[] = [
        { PrimaryKey: '123|SR1|1', ApplicationNumber: '123' },
        { PrimaryKey: '456|SR2|1', ApplicationNumber: '456' }
      ];

      // Set new keys first
      (service as any).newKeysSubject.next(new Set(['123|SR1|1']));

      service.loadRecords().subscribe(records => {
        expect(records[0].IsNew).toBe(true);
        expect(records[1].IsNew).toBe(false);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/erate/form470`);
      req.flush({ success: true, data: mockRecords });
    });

    it('should handle errors gracefully', () => {
      service.loadRecords().subscribe(records => {
        expect(records).toEqual([]);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/erate/form470`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('downloadUpdates', () => {
    it('should download updates and store new keys', () => {
      const mockResult: RefreshResult = {
        refreshId: 'refresh-123',
        totalFetched: 100,
        totalNew: 5,
        totalUpdated: 95,
        newKeys: ['111|A|1', '222|B|1']
      };

      service.downloadUpdates().subscribe(result => {
        expect(result?.totalNew).toBe(5);
        expect(result?.newKeys.length).toBe(2);
      });

      const downloadReq = httpMock.expectOne(`${environment.apiUrl}/erate/form470/download`);
      expect(downloadReq.request.method).toBe('POST');
      downloadReq.flush({ success: true, data: mockResult });

      // loadRecords is called after download
      const loadReq = httpMock.expectOne(req => req.url.includes('/erate/form470'));
      loadReq.flush({ success: true, data: [] });
    });

    it('should set downloading state during download', () => {
      const downloadingStates: boolean[] = [];
      service.downloading$.subscribe(d => downloadingStates.push(d));

      service.downloadUpdates().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/erate/form470/download`);
      req.flush({ success: true, data: { refreshId: '123', totalFetched: 0, totalNew: 0, totalUpdated: 0, newKeys: [] } });

      // Also flush the loadRecords call
      const loadReq = httpMock.expectOne(r => r.url.includes('/erate/form470'));
      loadReq.flush({ success: true, data: [] });

      // Should have been true then false
      expect(downloadingStates).toContain(true);
      expect(downloadingStates[downloadingStates.length - 1]).toBe(false);
    });
  });

  describe('parseFormPdfUrl', () => {
    it('should parse JSON form_pdf with url', () => {
      const record: Form470Record = {
        PrimaryKey: '123|A|1',
        FormPdf: '{"url":"https://example.com/form.pdf"}'
      };
      
      const url = service.getFormPdfUrl(record);
      expect(url).toBe('https://example.com/form.pdf');
    });

    it('should return string form_pdf as-is', () => {
      const record: Form470Record = {
        PrimaryKey: '123|A|1',
        FormPdf: 'https://example.com/form.pdf'
      };
      
      const url = service.getFormPdfUrl(record);
      expect(url).toBe('https://example.com/form.pdf');
    });

    it('should return null for undefined form_pdf', () => {
      const record: Form470Record = {
        PrimaryKey: '123|A|1'
      };
      
      const url = service.getFormPdfUrl(record);
      expect(url).toBeNull();
    });
  });

  describe('clearNewHighlights', () => {
    it('should clear new keys and update records', () => {
      // Set up initial state
      const records: Form470Record[] = [
        { PrimaryKey: '123|A|1', IsNew: true },
        { PrimaryKey: '456|B|1', IsNew: true }
      ];
      (service as any).recordsSubject.next(records);
      (service as any).newKeysSubject.next(new Set(['123|A|1', '456|B|1']));

      // Clear highlights
      service.clearNewHighlights();

      // Verify
      const updatedRecords = service.getRecords();
      expect(updatedRecords[0].IsNew).toBe(false);
      expect(updatedRecords[1].IsNew).toBe(false);
      expect(service.isNewRecord('123|A|1')).toBe(false);
    });
  });

  describe('isNewRecord', () => {
    it('should return true for new records', () => {
      (service as any).newKeysSubject.next(new Set(['123|A|1']));
      expect(service.isNewRecord('123|A|1')).toBe(true);
    });

    it('should return false for non-new records', () => {
      (service as any).newKeysSubject.next(new Set(['123|A|1']));
      expect(service.isNewRecord('999|Z|1')).toBe(false);
    });
  });
});
