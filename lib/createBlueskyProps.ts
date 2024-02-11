import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import defaultsGraphemer from 'npm:graphemer';
const Graphemer = defaultsGraphemer.default;
const splitter = new Graphemer();

import AtprotoAPI, { BskyAgent } from 'npm:@atproto/api';
const { RichText } = AtprotoAPI;

export default async (agent: BskyAgent, item: FeedEntry) => {
  const title: string = (item.title?.value || '').trim();
  const description: string = (item.description?.value || '').trim();
  const link: string = item.links[0].href || '';

  // Bluesky用のテキストを作成
  const bskyText = await (async () => {
    const max = 300;
    const { host, pathname } = new URL(link);
    const ellipsis = `...`;
    const key = splitter.splitGraphemes(`${host}${pathname}`).slice(0, 19).join('') + ellipsis;
    let text = `${key}\n${title}`;

    if (splitter.countGraphemes(text) > max) {
      const cnt = max - splitter.countGraphemes(`${key}\n${ellipsis}`);
      const shortenedTitle = splitter
        .splitGraphemes(title)
        .slice(0, cnt)
        .join('');
      text = `${key}\n${shortenedTitle}${ellipsis}`;
    }

    const rt = new RichText({ text });
    await rt.detectFacets(agent);
    rt.facets = [
      {
        index: {
          byteStart: 0,
          byteEnd: splitter.countGraphemes(key),
        },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: link,
          },
        ],
      },
      ...(rt.facets || []),
    ];
    return rt;
  })();

  console.log('success createBlueskyProps');
  return { bskyText, title, link, description };
};
