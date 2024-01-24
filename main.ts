import 'https://deno.land/std@0.193.0/dotenv/load.ts';
import { delay } from 'https://deno.land/std@0.201.0/async/mod.ts';
import AtprotoAPI from 'npm:@atproto/api';
import createBlueskyProps from './src/createBlueskyProps.ts';
import createXProps from './src/createXProps.ts';
import getItemList from './src/getItemList.ts';
import getOgp from './src/getOgp.ts';
import postBluesky from './src/postBluesky.ts';
import postWebhook from './src/postWebhook.ts';
import resizeImage from './src/resizeImage.ts';

try {
  // rss feedから記事リストを取得
  const itemList = await getItemList();

  // 対象がなかったら終了
  console.log('itemList.length', itemList.length);
  console.log('itemList', JSON.stringify(itemList, null, 2));
  if (!itemList.length) {
    console.log('not found feed item');
    Deno.exit(0);
  }

  // UTC:15-22時の間は終了（JST:7-24時の間のみ実行）
  const nowHour = new Date().getUTCHours();
  if (nowHour >= 15 && nowHour < 22) {
    console.log('now hour is over 15');
    Deno.exit(0);
  }

  // Blueskyにログイン
  const { BskyAgent } = AtprotoAPI;
  const service = 'https://bsky.social';
  const agent = new BskyAgent({ service });
  const identifier = Deno.env.get('BLUESKY_IDENTIFIER') || '';
  const password = Deno.env.get('BLUESKY_PASSWORD') || '';
  await agent.login({ identifier, password });

  // 10分後に処理を終了させるためにフラグを立てる
  let isTimeout = false;
  setTimeout(
    () => {
      isTimeout = true;
    },
    1000 * 60 * 10,
  );

  let cnt = 0;
  // 取得した記事リストをループ処理
  for await (const item of itemList) {
    // isTimeoutがtrueだったら終了
    if (isTimeout) {
      console.log('timeout');
      break;
    }

    // 投稿回数をカウントし、3件以上投稿したら終了
    cnt++;
    if (cnt > 3) {
      console.log('post count over');
      break;
    }

    // 最終実行時間を更新
    const timestamp = item.published ? new Date(item.published).getTime() : new Date().getTime();
    await Deno.writeTextFile('.timestamp', timestamp.toString());
    // 記事リストを更新
    await Deno.writeTextFile(
      '.itemList.json',
      JSON.stringify(itemList.slice(cnt)),
    );

    // URLからOGPの取得
    const og = await getOgp(item.links[0].href || '');

    // 投稿記事のプロパティを作成
    const tmpItem = {
      ...item,
      title: { value: og.ogTitle || item.title?.value || '' },
      description: {
        value: og.ogDescription || item.description?.value || '',
      },
    };
    const { bskyText, title, link, description } = await createBlueskyProps(
      agent,
      tmpItem,
    );
    const { xText } = await createXProps(tmpItem);

    // 画像のリサイズ
    const { mimeType, resizedImage } = await (async () => {
      const ogImage = og.ogImage?.at(0);
      if (!ogImage) {
        console.log('ogp image not found');
        return {};
      }
      return await resizeImage(new URL(ogImage.url, link).href);
    })();

    // Blueskyに投稿
    await postBluesky({
      agent,
      rt: bskyText,
      title,
      link,
      description,
      mimeType,
      image: resizedImage,
    });

    // IFTTTを使ってXに投稿
    await postWebhook(xText);

    // 15秒待つ
    console.log('wait 15 seconds');
    await delay(1000 * 15);
  }

  // 終了
  Deno.exit(0);
} catch (e) {
  // エラーが発生したらログを出力して終了
  console.error(e.stack);
  console.error(JSON.stringify(e, null, 2));
  Deno.exit(1);
}
