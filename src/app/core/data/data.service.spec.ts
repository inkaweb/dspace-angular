import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { compare, Operation } from 'fast-json-patch';
import { Observable, of as observableOf } from 'rxjs';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { createSuccessfulRemoteDataObject$ } from '../../shared/testing/utils';
import { FollowLinkConfig } from '../../shared/utils/follow-link-config.model';
import { RemoteDataBuildService } from '../cache/builders/remote-data-build.service';
import { SortDirection, SortOptions } from '../cache/models/sort-options.model';
import { ObjectCacheService } from '../cache/object-cache.service';
import { CoreState } from '../core.reducers';
import { Collection } from '../shared/collection.model';
import { DSpaceObject } from '../shared/dspace-object.model';
import { HALEndpointService } from '../shared/hal-endpoint.service';
import { Item } from '../shared/item.model';
import { ChangeAnalyzer } from './change-analyzer';
import { DataService } from './data.service';
import { FindListOptions, PatchRequest } from './request.models';
import { RequestService } from './request.service';
import { getMockRequestService } from '../../shared/mocks/mock-request.service';
import { HALEndpointServiceStub } from '../../shared/testing/hal-endpoint-service-stub';

const endpoint = 'https://rest.api/core';

/* tslint:disable:max-classes-per-file */
class TestService extends DataService<any> {

  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected store: Store<CoreState>,
    protected linkPath: string,
    protected halService: HALEndpointService,
    protected objectCache: ObjectCacheService,
    protected notificationsService: NotificationsService,
    protected http: HttpClient,
    protected comparator: ChangeAnalyzer<Item>
  ) {
    super();
  }

  public getBrowseEndpoint(options: FindListOptions = {}, linkPath: string = this.linkPath): Observable<string> {
    return observableOf(endpoint);
  }
}

class DummyChangeAnalyzer implements ChangeAnalyzer<Item> {
  diff(object1: Item, object2: Item): Operation[] {
    return compare((object1 as any).metadata, (object2 as any).metadata);
  }

}

describe('DataService', () => {
  let service: TestService;
  let options: FindListOptions;
  const requestService = getMockRequestService();
  const halService = new HALEndpointServiceStub('url') as any;
  const rdbService = {} as RemoteDataBuildService;
  const notificationsService = {} as NotificationsService;
  const http = {} as HttpClient;
  const comparator = new DummyChangeAnalyzer() as any;
  const objectCache = {
    addPatch: () => {
      /* empty */
    },
    getObjectBySelfLink: () => {
      /* empty */
    }
  } as any;
  const store = {} as Store<CoreState>;

  function initTestService(): TestService {
    return new TestService(
      requestService,
      rdbService,
      store,
      endpoint,
      halService,
      objectCache,
      notificationsService,
      http,
      comparator,
    );
  }

  service = initTestService();

  describe('getFindAllHref', () => {

    it('should return an observable with the endpoint', () => {
      options = {};

      (service as any).getFindAllHref(options).subscribe((value) => {
          expect(value).toBe(endpoint);
        }
      );
    });

    it('should include page in href if currentPage provided in options', () => {
      options = { currentPage: 2 };
      const expected = `${endpoint}?page=${options.currentPage - 1}`;

      (service as any).getFindAllHref(options).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should include size in href if elementsPerPage provided in options', () => {
      options = { elementsPerPage: 5 };
      const expected = `${endpoint}?size=${options.elementsPerPage}`;

      (service as any).getFindAllHref(options).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should include sort href if SortOptions provided in options', () => {
      const sortOptions = new SortOptions('field1', SortDirection.ASC);
      options = { sort: sortOptions };
      const expected = `${endpoint}?sort=${sortOptions.field},${sortOptions.direction}`;

      (service as any).getFindAllHref(options).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should include startsWith in href if startsWith provided in options', () => {
      options = { startsWith: 'ab' };
      const expected = `${endpoint}?startsWith=${options.startsWith}`;

      (service as any).getFindAllHref(options).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should include all provided options in href', () => {
      const sortOptions = new SortOptions('field1', SortDirection.DESC)
      options = {
        currentPage: 6,
        elementsPerPage: 10,
        sort: sortOptions,
        startsWith: 'ab'
      };
      const expected = `${endpoint}?page=${options.currentPage - 1}&size=${options.elementsPerPage}` +
        `&sort=${sortOptions.field},${sortOptions.direction}&startsWith=${options.startsWith}`;

      (service as any).getFindAllHref(options).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should include single linksToFollow as embed', () => {
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'bundles' as any,
      });
      const expected = `${endpoint}?embed=bundles`;

      (service as any).getFindAllHref({}, null, mockFollowLinkConfig).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should include multiple linksToFollow as embed', () => {
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'bundles' as any,
      });
      const mockFollowLinkConfig2: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'owningCollection' as any,
      });
      const mockFollowLinkConfig3: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'templateItemOf' as any,
      });
      const expected = `${endpoint}?embed=bundles&embed=owningCollection&embed=templateItemOf`;

      (service as any).getFindAllHref({}, null, mockFollowLinkConfig, mockFollowLinkConfig2, mockFollowLinkConfig3).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should not include linksToFollow with shouldEmbed = false', () => {
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'bundles' as any,
        shouldEmbed: false,
      });
      const mockFollowLinkConfig2: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'owningCollection' as any,
        shouldEmbed: false,
      });
      const mockFollowLinkConfig3: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'templateItemOf' as any,
      });
      const expected = `${endpoint}?embed=templateItemOf`;

      (service as any).getFindAllHref({}, null, mockFollowLinkConfig, mockFollowLinkConfig2, mockFollowLinkConfig3).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });

    it('should include nested linksToFollow 3lvl', () => {
      const mockFollowLinkConfig3: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'relationships' as any,
      });
      const mockFollowLinkConfig2: FollowLinkConfig<Collection> = Object.assign(new FollowLinkConfig(), {
        name: 'itemtemplate' as any,
        linksToFollow: mockFollowLinkConfig3,
      });
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'owningCollection' as any,
        linksToFollow: mockFollowLinkConfig2,
      });
      const expected = `${endpoint}?embed=owningCollection/itemtemplate/relationships`;

      (service as any).getFindAllHref({}, null, mockFollowLinkConfig).subscribe((value) => {
        expect(value).toBe(expected);
      });
    });
  });

  describe('getIDHref', () => {
    const endpointMock = 'https://dspace7-internal.atmire.com/server/api/core/items';
    const resourceIdMock = '003c99b4-d4fe-44b0-a945-e12182a7ca89';

    it('should return endpoint', () => {
      const result = (service as any).getIDHref(endpointMock, resourceIdMock);
      expect(result).toEqual(endpointMock + '/' + resourceIdMock);
    });

    it('should include single linksToFollow as embed', () => {
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'bundles' as any,
      });
      const expected = `${endpointMock}/${resourceIdMock}?embed=bundles`;
      const result = (service as any).getIDHref(endpointMock, resourceIdMock, mockFollowLinkConfig);
      expect(result).toEqual(expected);
    });

    it('should include multiple linksToFollow as embed', () => {
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'bundles' as any,
      });
      const mockFollowLinkConfig2: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'owningCollection' as any,
      });
      const mockFollowLinkConfig3: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'templateItemOf' as any,
      });
      const expected = `${endpointMock}/${resourceIdMock}?embed=bundles&embed=owningCollection&embed=templateItemOf`;
      const result = (service as any).getIDHref(endpointMock, resourceIdMock, mockFollowLinkConfig, mockFollowLinkConfig2, mockFollowLinkConfig3);
      expect(result).toEqual(expected);
    });

    it('should not include linksToFollow with shouldEmbed = false', () => {
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'bundles' as any,
        shouldEmbed: false,
      });
      const mockFollowLinkConfig2: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'owningCollection' as any,
        shouldEmbed: false,
      });
      const mockFollowLinkConfig3: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'templateItemOf' as any,
      });
      const expected = `${endpointMock}/${resourceIdMock}?embed=templateItemOf`;
      const result = (service as any).getIDHref(endpointMock, resourceIdMock, mockFollowLinkConfig, mockFollowLinkConfig2, mockFollowLinkConfig3);
      expect(result).toEqual(expected);
    });

    it('should include nested linksToFollow 3lvl', () => {
      const mockFollowLinkConfig3: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'relationships' as any,
      });
      const mockFollowLinkConfig2: FollowLinkConfig<Collection> = Object.assign(new FollowLinkConfig(), {
        name: 'itemtemplate' as any,
        linksToFollow: mockFollowLinkConfig3,
      });
      const mockFollowLinkConfig: FollowLinkConfig<Item> = Object.assign(new FollowLinkConfig(), {
        name: 'owningCollection' as any,
        linksToFollow: mockFollowLinkConfig2,
      });
      const expected = `${endpointMock}/${resourceIdMock}?embed=owningCollection/itemtemplate/relationships`;
      const result = (service as any).getIDHref(endpointMock, resourceIdMock, mockFollowLinkConfig);
      expect(result).toEqual(expected);
    });
  });

  describe('patch', () => {
    const dso = {
      uuid: 'dso-uuid'
    };
    const operations = [
      Object.assign({
        op: 'move',
        from: '/1',
        path: '/5'
      }) as Operation
    ];

    beforeEach(() => {
      service.patch(dso, operations);
    });

    it('should configure a PatchRequest', () => {
      expect(requestService.configure).toHaveBeenCalledWith(jasmine.any(PatchRequest));
    });
  });

  describe('update', () => {
    let operations;
    let selfLink;
    let dso;
    let dso2;
    const name1 = 'random string';
    const name2 = 'another random string';
    beforeEach(() => {
      operations = [{ op: 'replace', path: '/0/value', value: name2 } as Operation];
      selfLink = 'https://rest.api/endpoint/1698f1d3-be98-4c51-9fd8-6bfedcbd59b7';

      dso = Object.assign(new DSpaceObject(), {
        _links: { self: { href: selfLink } },
        metadata: [{ key: 'dc.title', value: name1 }]
      });

      dso2 = Object.assign(new DSpaceObject(), {
        _links: { self: { href: selfLink } },
        metadata: [{ key: 'dc.title', value: name2 }]
      });

      spyOn(service, 'findByHref').and.returnValue(createSuccessfulRemoteDataObject$(dso));
      spyOn(objectCache, 'addPatch');
    });

    it('should call addPatch on the object cache with the right parameters when there are differences', () => {
      service.update(dso2).subscribe();
      expect(objectCache.addPatch).toHaveBeenCalledWith(selfLink, operations);
    });

    it('should not call addPatch on the object cache with the right parameters when there are no differences', () => {
      service.update(dso).subscribe();
      expect(objectCache.addPatch).not.toHaveBeenCalled();
    });
  });
});
/* tslint:enable:max-classes-per-file */
