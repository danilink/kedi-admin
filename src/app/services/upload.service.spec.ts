import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UploadService } from './upload.service';

function buildFile(name: string, type = 'application/pdf') {
  return new File(['data'], name, { type });
}

describe('UploadService', () => {
  let service: UploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UploadService],
    });
    service = TestBed.inject(UploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should emit uploaded status', (done) => {
    const file = buildFile('test.pdf');
    service.createUpload(file).subscribe((item) => {
      if (item.status === 'uploaded') {
        expect(item.invoiceId).toBe('inv-1');
        done();
      }
    });
    const req = httpMock.expectOne('/api/invoices/upload');
    expect(req.request.method).toBe('POST');
    req.event({ type: 1, loaded: 50, total: 100 });
    req.flush({ invoiceId: 'inv-1' });
  });
});
