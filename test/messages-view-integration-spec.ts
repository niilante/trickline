import { describeIntegration, expect } from './support';
import { NaiveStore, Store } from '../src/lib/store';
import { DexieStore } from '../src/lib/dexie-store';
import { MessagesViewModel } from '../src/messages-view';
import { fetchInitialChannelList } from '../src/lib/store-network';
import { whenArray } from '../src/lib/when';

const toTest = {
  'NaiveStore': NaiveStore,
  'DexieStore': DexieStore
};

const d = require('debug')('trickline-test:messages-view-integration');

Object.keys(toTest).forEach((k) => {
  let store: Store;
  let fixture: MessagesViewModel;

  describeIntegration(`The ${k} class`, function() {
    this.timeout(10 * 1000);

    beforeEach(async function() {
      const tokenSource = process.env.SLACK_API_TEST_TOKEN || process.env.SLACK_API_TOKEN;
      const tokens = tokenSource.indexOf(',') >= 0 ? tokenSource.split(',') : [tokenSource];

      d('Clearing IndexedDb');
      await new Promise((res) => {
        const wnd = require('electron').remote.getCurrentWindow();
        wnd.webContents.session.clearStorageData({ origin: window.location.origin, storages: ['indexdb']}, res);
      });

      const Klass = toTest[k];
      store = new Klass(tokens);

      d('Fetching initial channel list');
      await fetchInitialChannelList(store);
      let channel = await store.channels.get(store.joinedChannels.value[0], store.api[0]);

      d('Creating fixture');
      fixture = new MessagesViewModel(store, channel!);
    });

    it('should fetch a list of initial messages', async function() {
      fixture.scrollPreviousPage.execute().subscribe(p => d(`New page is ${p}`));
      await whenArray(fixture, x => x.messages).take(2).toPromise();

      expect(fixture.messages.length > 0).to.be.true;
    });

    it('should always sort the messages by timestamp', async function() {
      do {
        fixture.scrollPreviousPage.execute().subscribe(p => d(`New page is ${p}`));
        await whenArray(fixture, x => x.messages).take(2).toPromise();
      } while (fixture.messages.length < 5);

      for (let i=1; i < fixture.messages.length; i++) {
        expect(fixture.messages[i].timestamp < fixture.messages[i-1].timestamp).to.be.ok;
      }
    });
  });
});