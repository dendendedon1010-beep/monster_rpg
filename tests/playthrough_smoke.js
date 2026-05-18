#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(REPO_ROOT, 'index.html');
const STORAGE_KEY = 'crystal_monsters_ui_overhaul_v1';

class ClassList {
  constructor(el) {
    this.el = el;
    this.set = new Set((el.className || '').split(/\s+/).filter(Boolean));
  }
  add(...items) { items.forEach(item => this.set.add(item)); this.sync(); }
  remove(...items) { items.forEach(item => this.set.delete(item)); this.sync(); }
  toggle(item, force) {
    if (force === undefined) this.set.has(item) ? this.set.delete(item) : this.set.add(item);
    else force ? this.set.add(item) : this.set.delete(item);
    this.sync();
    return this.set.has(item);
  }
  contains(item) { return this.set.has(item); }
  sync() { this.el.className = [...this.set].join(' '); }
}

class ElementStub {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this._html = '';
    this.children = [];
    this.childNodes = this.children;
    this.style = {};
    this.dataset = {};
    this.className = '';
    this.classList = new ClassList(this);
    this.textContent = '';
    this.value = '';
    this.onclick = null;
    this.parentNode = null;
    this.scrollHeight = 0;
    this.scrollTop = 0;
    this.clientWidth = 390;
    this.clientHeight = 700;
  }
  set innerHTML(value) { this._html = String(value); this.scrollHeight = this._html.length; }
  get innerHTML() { return this._html; }
  insertAdjacentHTML(_position, html) { this._html += String(html); }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  prepend(child) { child.parentNode = this; this.children.unshift(child); return child; }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    return child;
  }
  get lastChild() { return this.children[this.children.length - 1]; }
  remove() {}
  addEventListener() {}
  removeEventListener() {}
  setAttribute(key, value) { this[key] = value; }
  getAttribute(key) { return this[key]; }
  closest() { return null; }
  querySelector(selector) { return this.ownerDocument.querySelectorFrom(this, selector); }
  querySelectorAll(selector) { return this.ownerDocument.querySelectorAllFrom(this, selector); }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}

function createDocument() {
  const elements = {};
  const document = {
    body: null,
    head: null,
    getElementById(id) { return getElement(id); },
    createElement(tag) { return attachDocument(new ElementStub('', tag)); },
    createElementNS(_ns, tag) { return attachDocument(new ElementStub('', tag)); },
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) {
      if (selector === '.view.active') {
        return ['titleView', 'fieldView', 'battleView', 'eventView']
          .map(getElement)
          .find(el => el.classList.contains('active')) || null;
      }
      if (selector.startsWith('#')) return getElement(selector.slice(1).split(/[\s.]/)[0]);
      return attachDocument(new ElementStub());
    },
    querySelectorAll(selector) {
      if (selector === '.view') {
        return ['titleView', 'fieldView', 'battleView', 'eventView'].map(id => {
          const el = getElement(id);
          el.classList.add('view');
          return el;
        });
      }
      return [];
    },
    querySelectorFrom(_root, selector) {
      if (selector.startsWith('#')) return getElement(selector.slice(1).split(/[\s.]/)[0]);
      return attachDocument(new ElementStub());
    },
    querySelectorAllFrom() { return []; }
  };

  function attachDocument(el) { el.ownerDocument = document; return el; }
  function getElement(id) {
    if (!elements[id]) elements[id] = attachDocument(new ElementStub(id));
    return elements[id];
  }

  document.body = attachDocument(new ElementStub('body', 'body'));
  document.head = attachDocument(new ElementStub('head', 'head'));
  ['titleView', 'fieldView', 'battleView', 'eventView'].forEach(id => getElement(id).classList.add('view'));
  getElement('titleView').classList.add('active');
  getElement('toast');
  return { document, elements };
}

function createLocalStorage(store) {
  return {
    getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: key => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(key => delete store[key]); },
    key: index => Object.keys(store)[index] || null,
    get length() { return Object.keys(store).length; }
  };
}

function boot(store = {}) {
  const { document, elements } = createDocument();
  const localStorage = createLocalStorage(store);
  const context = {
    console,
    document,
    window: null,
    global: null,
    localStorage,
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    requestAnimationFrame: (fn) => { if (typeof fn === 'function') fn(); return 1; },
    MutationObserver: class { observe() {} disconnect() {} },
    alert: () => {},
    confirm: () => true,
    prompt: () => '',
    Math,
    JSON,
    Date,
    performance: { now: () => 0 },
    getComputedStyle: () => ({ overflowY: 'visible' }),
    Event: class {},
    addEventListener() {},
    removeEventListener() {}
  };
  context.window = context;
  context.global = context;

  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const scripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  scripts.forEach((script, index) => vm.runInNewContext(script, context, { filename: `index.html<script ${index}>` }));
  return { context, elements, store };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const sharedStore = {};
  let { context, elements, store } = boot(sharedStore);

  assert(elements.titleView.innerHTML.includes('冒険をはじめる'), 'タイトルの新規開始ボタンが表示されない');
  context.startAdventure();
  assert(context.ui.view === 'event', '新規開始でイベント画面へ遷移しない');
  context.skipEvent();
  assert(context.ui.view === 'field', 'イベントスキップ後にフィールドへ戻れない');

  context.setFieldPanel('settings');
  assert(elements.fieldView.innerHTML.includes('手動セーブ') || elements.fieldView.innerHTML.includes('セーブ'), 'メニュー/セーブUIが表示されない');
  context.setFieldPanel('party');
  assert(elements.fieldView.innerHTML.includes('パーティ'), 'パーティUIが表示されない');

  context.saveNow();
  assert(store[STORAGE_KEY], 'セーブデータがlocalStorageへ保存されない');
  const savedPartyIds = JSON.parse(store[STORAGE_KEY]).partyIds.join(',');

  ({ context, elements, store } = boot(sharedStore));
  assert(context.state.partyIds.join(',') === savedPartyIds, 'リロード後にパーティが復元されない');

  context.startDungeon(context.state.selectedDungeonId);
  assert(context.ui.view === 'battle' && context.state.battle?.status === 'battle', '探索開始で戦闘へ遷移しない');

  await context.playerAttack();
  assert(['battle', 'floorClear', 'dungeonClear', 'lose'].includes(context.state.battle?.status), '命令なし「戦う」後の戦闘状態が不正');

  if (!context.state.battle || context.state.battle.status !== 'battle') context.startDungeon(context.state.selectedDungeonId);
  context.openBattleMenu('orderAlly');
  for (const mon of context.aliveParty()) {
    context.selectOrderAlly(mon.uid);
    context.queueNormalAttackOrder();
  }
  assert(Object.keys(context.state.battle.commandQueue || {}).length === context.aliveParty().length, '全員分の命令が登録されない');
  await context.playerAttack();
  assert(['battle', 'floorClear', 'dungeonClear', 'lose'].includes(context.state.battle?.status), '命令あり「戦う」後の戦闘状態が不正');

  context.startDungeon(context.state.selectedDungeonId);
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    context.openBattleMenu('scoutTarget');
    context.selectScoutTarget(0);
  } finally {
    Math.random = originalRandom;
  }
  assert(context.ui.battleMenu === 'scoutName' && context.state.battle.pendingScout, 'スカウト成功後に名前入力へ進まない');

  context.document.getElementById('scoutNameInput').value = 'テスト仲間';
  const ownedBefore = context.state.owned.length;
  context.finalizeScout(true);
  assert(context.state.owned.length === ownedBefore + 1, 'スカウトした仲間が所持リストに追加されない');
  assert(['floorClear', 'dungeonClear'].includes(context.state.battle.status), '仲間追加後に勝利リザルト状態へ進まない');
  assert(store[STORAGE_KEY].includes('テスト仲間'), '仲間追加後のセーブに名前が含まれない');

  ({ context } = boot(sharedStore));
  assert(context.state.owned.some(mon => mon.nickname === 'テスト仲間'), '再リロード後にスカウトした仲間が復元されない');

  console.log('playthrough smoke test passed');
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
