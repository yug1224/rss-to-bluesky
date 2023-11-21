import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import { parseFeed } from 'https://deno.land/x/rss@0.6.0/mod.ts';
import { deepMerge } from 'https://deno.land/std@0.207.0/collections/mod.ts';

const lastExecutionTime = await Deno.readTextFile('.timestamp');
console.log(lastExecutionTime.trim());

export default async () => {
  const RSS_URL = Deno.env.get('RSS_URL');
  if (!RSS_URL) {
    console.log('RSS_URL is not defined');
    return [];
  }

  const response = await fetch(RSS_URL);
  const xml = await response.text();
  const feed = await parseFeed(xml);

  // 前回残した記事リストを取得
  const lastItemList = await Deno.readTextFile('.itemList.json');

  // 最終実行時間以降かつdescriptionがある記事を抽出
  const fetchedItemList = feed.entries.reverse().filter((item: FeedEntry) => {
    return (
      item.published &&
      new Date(Number(lastExecutionTime.trim())) < new Date(item.published)
    );
  });

  // 前回残した記事リストと今回取得した記事リストをマージ
  const itemList = Object.values(deepMerge(
    lastItemList ? JSON.parse(lastItemList) : [],
    fetchedItemList,
    {
      arrays: 'replace',
    },
  ));

  await Deno.writeTextFile('.itemList.json', JSON.stringify(itemList));

  return itemList;
};
