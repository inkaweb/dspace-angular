import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Item } from '../../../../core/shared/item.model';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TabbedRelatedEntitiesSearchComponent } from './tabbed-related-entities-search.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MockRouter } from '../../../../shared/mocks/mock-router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { VarDirective } from '../../../../shared/utils/var.directive';
import { of as observableOf } from 'rxjs';

describe('TabbedRelatedEntitiesSearchComponent', () => {
  let comp: TabbedRelatedEntitiesSearchComponent;
  let fixture: ComponentFixture<TabbedRelatedEntitiesSearchComponent>;

  const mockItem = Object.assign(new Item(), {
    id: 'id1'
  });
  const mockRelationType = 'publications';
  const relationTypes = [
    {
      label: mockRelationType,
      filter: mockRelationType
    }
  ];

  const router = new MockRouter();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), NoopAnimationsModule, NgbModule],
      declarations: [TabbedRelatedEntitiesSearchComponent, VarDirective],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: observableOf({ tab: mockRelationType })
          },
        },
        { provide: Router, useValue: router }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TabbedRelatedEntitiesSearchComponent);
    comp = fixture.componentInstance;
    comp.item = mockItem;
    comp.relationTypes = relationTypes;
    fixture.detectChanges();
  });

  it('should initialize the activeTab depending on the current query parameters', () => {
    comp.activeTab$.subscribe((activeTab) => {
      expect(activeTab).toEqual(mockRelationType);
    });
  });

  describe('onTabChange', () => {
    const event = {
      currentId: mockRelationType,
      nextId: 'nextTab'
    };

    beforeEach(() => {
      comp.onTabChange(event);
    });

    it('should call router natigate with the correct arguments', () => {
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: (comp as any).route,
        queryParams: {
          tab: event.nextId
        },
        queryParamsHandling: 'merge'
      });
    });
  });

});
