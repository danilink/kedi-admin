import { TestBed } from '@angular/core/testing';
import { InvoicesService } from './invoices.service';
import { FakeBackendService } from './fake-backend.service';

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InvoicesService, FakeBackendService],
    });
    service = TestBed.inject(InvoicesService);
  });

  it('should list invoices', (done) => {
    service.list({ status: 'all' }, 0, 10, { active: 'issueDate', direction: 'desc' }).subscribe((res) => {
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.total).toBeGreaterThan(0);
      done();
    });
  });
});
