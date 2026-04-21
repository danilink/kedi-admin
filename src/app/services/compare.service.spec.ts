import { TestBed } from '@angular/core/testing';
import { CompareService } from './compare.service';
import { FakeBackendService } from './fake-backend.service';

describe('CompareService', () => {
  let service: CompareService;
  let backend: FakeBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CompareService, FakeBackendService],
    });
    service = TestBed.inject(CompareService);
    backend = TestBed.inject(FakeBackendService);
  });

  it('should return compare results', (done) => {
    backend.listInvoices({ status: 'all' }, 0, 2, { active: 'issueDate', direction: 'desc' }).subscribe((res) => {
      const ids = res.items.map((i) => i.id);
      service.getResult(ids[0], ids).subscribe((result) => {
        expect(result.totals.length).toBe(ids.length);
        done();
      });
    });
  });
});
