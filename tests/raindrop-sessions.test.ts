import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  fetchRaindropSessionDetails,
  fetchRaindropSessions,
} from '../src/lib/raindrop-api';

function createJsonResponse(data: unknown, init?: Partial<Response>) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: async () => data,
  } as Response;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchRaindropSessions', () => {
  it('returns direct child collections under the sessions parent in recent order', async () => {
    const authorizationHeaders: string[] = [];

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      authorizationHeaders.push(headers.get('authorization') ?? '');

      if (url === 'https://api.raindrop.io/rest/v1/collections') {
        return createJsonResponse({
          items: [
            { _id: 10, title: 'nenya / sessions' },
            { _id: 20, title: 'nenya / backup' },
          ],
        });
      }

      if (url === 'https://api.raindrop.io/rest/v1/collections/childrens') {
        return createJsonResponse({
          items: [
            {
              _id: 101,
              title: 'Laptop',
              count: 12,
              cover: ['https://example.com/laptop.png'],
              lastAction: '2026-05-03T10:00:00.000Z',
              parent: { $id: 10 },
            },
            {
              _id: 102,
              title: 'Desktop',
              count: 4,
              lastUpdate: '2026-05-04T08:00:00.000Z',
              parent: { $id: 10 },
            },
            {
              _id: 201,
              title: 'Options',
              count: 3,
              parent: { $id: 20 },
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    const sessions = await fetchRaindropSessions('token');

    assert.deepEqual(sessions, [
      {
        id: 102,
        title: 'Desktop',
        href: 'https://app.raindrop.io/my/102',
        count: 4,
        cover: undefined,
        lastUpdate: '2026-05-04T08:00:00.000Z',
        lastAction: undefined,
      },
      {
        id: 101,
        title: 'Laptop',
        href: 'https://app.raindrop.io/my/101',
        count: 12,
        cover: 'https://example.com/laptop.png',
        lastUpdate: undefined,
        lastAction: '2026-05-03T10:00:00.000Z',
      },
    ]);
    assert.deepEqual(authorizationHeaders, ['Bearer token', 'Bearer token']);
  });

  it('returns an empty list when the sessions parent is missing', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url === 'https://api.raindrop.io/rest/v1/collections') {
        return createJsonResponse({
          items: [{ _id: 20, title: 'nenya / backup' }],
        });
      }

      if (url === 'https://api.raindrop.io/rest/v1/collections/childrens') {
        return createJsonResponse({
          items: [{ _id: 101, title: 'Laptop', parent: { $id: 10 } }],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    const sessions = await fetchRaindropSessions('token');
    assert.deepEqual(sessions, []);
  });
});

describe('fetchRaindropSessionDetails', () => {
  it('builds windows, tab groups, and tabs from Raindrop item metadata', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url === 'https://api.raindrop.io/rest/v1/raindrops/101?perpage=50&page=0') {
        return createJsonResponse({
          count: 4,
          items: [
            {
              _id: 1,
              title: 'Ungrouped',
              link: 'https://example.com/one',
              excerpt: JSON.stringify({
                windowId: 7,
                index: 2,
                tabGroupId: -1,
                pinned: true,
              }),
            },
            {
              _id: 2,
              title: 'Grouped first',
              link: 'https://nenya.local/tab?url=https%3A%2F%2Fexample.com%2Ftwo',
              excerpt: JSON.stringify({
                windowId: 7,
                index: 0,
                tabGroupId: 12,
                groupTitle: 'Work',
                groupColor: 'blue',
                groupCollapsed: true,
              }),
            },
            {
              _id: 3,
              title: 'Grouped second',
              link: 'https://example.com/three',
              excerpt: JSON.stringify({
                windowId: 7,
                index: 1,
                tabGroupId: 12,
                groupTitle: 'Work',
                groupColor: 'blue',
                groupCollapsed: true,
              }),
            },
            {
              _id: 4,
              title: 'Other window',
              link: 'https://example.com/four',
              excerpt: JSON.stringify({
                windowId: 8,
                index: 0,
                tabGroupId: -1,
              }),
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    const details = await fetchRaindropSessionDetails('token', 101);

    assert.deepEqual(details, {
      windows: [
        {
          id: 7,
          tree: [
            {
              type: 'group',
              id: 12,
              title: 'Work',
              color: 'blue',
              collapsed: true,
              tabs: [
                {
                  id: 2,
                  url: 'https://example.com/two',
                  title: 'Grouped first',
                  pinned: false,
                  index: 0,
                  groupId: 12,
                  groupTitle: 'Work',
                  groupColor: 'blue',
                  groupCollapsed: true,
                },
                {
                  id: 3,
                  url: 'https://example.com/three',
                  title: 'Grouped second',
                  pinned: false,
                  index: 1,
                  groupId: 12,
                  groupTitle: 'Work',
                  groupColor: 'blue',
                  groupCollapsed: true,
                },
              ],
            },
            {
              type: 'tab',
              id: 1,
              url: 'https://example.com/one',
              title: 'Ungrouped',
              pinned: true,
              index: 2,
              groupId: -1,
              groupTitle: 'Group',
              groupColor: 'grey',
              groupCollapsed: false,
            },
          ],
        },
        {
          id: 8,
          tree: [
            {
              type: 'tab',
              id: 4,
              url: 'https://example.com/four',
              title: 'Other window',
              pinned: false,
              index: 0,
              groupId: -1,
              groupTitle: 'Group',
              groupColor: 'grey',
              groupCollapsed: false,
            },
          ],
        },
      ],
    });
  });

  it('ignores session metadata items', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url === 'https://api.raindrop.io/rest/v1/raindrops/101?perpage=50&page=0') {
        return createJsonResponse({
          count: 1,
          items: [
            {
              _id: 1,
              title: 'Metadata',
              link: 'https://nenya.local/meta',
              excerpt: '{}',
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    const details = await fetchRaindropSessionDetails('token', 101);
    assert.deepEqual(details, { windows: [] });
  });
});
