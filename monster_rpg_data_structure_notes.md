# モンスター育成RPG データ構造 v1

## 目的

モンスター収集・育成・配合・ダンジョン探索RPGを、後から拡張しやすい **データ駆動型** にするための土台です。

今回の実装では、次のデータを分離しています。

- `monsterSpecies`
- `ownedMonsters`
- `skills`
- `fusionRules`
- `dungeons`
- `enemies`
- `items`
- `playerState`

## ファイル

- `monster_rpg_data_layer.js`

ブラウザでそのまま読み込めるように、`window.MonsterRpgData` として公開しています。  
Node/CommonJS環境でも `module.exports` で読み込めます。

## データの役割

### monsterSpecies

種族マスタです。

ここには「プルモという種族は何系で、基礎ステータスはいくつで、どんなスキルを覚えるか」を定義します。

所持個体の現在HPや経験値はここには入れません。  
種族データと個体データを混ぜると、後から配合・図鑑・敵出現を作るときに破綻しやすいためです。

### ownedMonsters

プレイヤーが持っている個体データです。

`createInitialPlayerState()` の中で、`playerState.ownedMonsters` として生成されます。

個体ごとに持つもの：

- `instanceId`
- `speciesId`
- `nickname`
- `level`
- `exp`
- `bonusStats`
- `currentHp`
- `currentMp`
- `skillIds`
- `parentInstanceIds`
- `origin`

### skills

スキルマスタです。

攻撃、魔法、回復、バフを同じ構造で扱えるようにしています。

### fusionRules

配合ルールです。

`priority` が高い順に判定します。

例：

- 獣系 + 鳥系 → ルナキャット
- 火属性 + 獣系 → ドラキッド
- 精霊系 + 鳥系 → ボルトウィング
- 特殊条件に当てはまらない場合 → 通常配合

### dungeons

ダンジョンマスタです。

各ダンジョンに以下を持たせています。

- 推奨レベル
- 階層数
- 解放条件
- 出現敵テーブル
- ランダムイベント
- クリア報酬

### enemies

敵テンプレートです。

同じ種族でも、敵として出るときのレベル範囲、AI、報酬倍率、勧誘補正を分離しています。

これにより、同じ `voltwing` でも通常敵とボスを別データにできます。

### items

アイテムマスタです。

消費アイテム、素材、重要アイテムを同じ構造で管理します。

### playerState

セーブ対象のプレイヤーデータです。

主な中身：

- `gold`
- `ownedMonsters`
- `partyMonsterIds`
- `codexSpeciesIds`
- `inventory`
- `dungeonProgress`
- `settings`
- `flags`

## 既存MVPへの組み込み方

既存HTMLの `<script>` 内に直接書いていた `species`, `skills`, `dungeons` などを、以下のように差し替えます。

```html
<script src="./monster_rpg_data_layer.js"></script>
<script>
  const {
    GAME_DATA,
    createInitialPlayerState,
    calculateStats,
    previewFusion,
    generateEncounter,
    validateGameData
  } = window.MonsterRpgData;

  const result = validateGameData();
  if (!result.ok) {
    console.error(result.errors);
  }

  let playerState = createInitialPlayerState();

  console.log(GAME_DATA.monsterSpecies);
  console.log(playerState.ownedMonsters);
</script>
```

## モンスターを追加する例

`GAME_DATA.monsterSpecies` に次のようなデータを追加します。

```js
mimicSeed: {
  id: "mimicSeed",
  name: "ミミックシード",
  family: "plant",
  familyName: "植物系",
  element: "dark",
  elementName: "闇",
  rank: "D",
  rarity: 3,
  baseStats: { hp: 40, mp: 18, atk: 16, def: 14, spd: 12, wis: 15 },
  growthStats: { hp: 7, mp: 4, atk: 3, def: 3, spd: 3, wis: 4 },
  skillIds: ["bite"],
  learnset: [{ level: 5, skillId: "wisdomRay" }],
  fusionTags: ["plant", "trap", "dark"],
  recruit: { baseRate: 0.25, rankPenalty: 0.05 },
  drops: [{ itemId: "smallJelly", chance: 0.2, min: 1, max: 1 }],
  description: "宝箱に似た種を持ついたずら好きの植物モンスター。"
}
```

## スキルを追加する例

```js
iceShard: {
  id: "iceShard",
  name: "氷片",
  type: "magic",
  element: "ice",
  mpCost: 4,
  target: "enemySingle",
  power: 1.5,
  accuracy: 0.94,
  effect: { kind: "debuff", stat: "spd", value: -3, chance: 0.2, turns: 2 },
  description: "氷属性ダメージ。低確率で素早さを下げる。"
}
```

## 配合ルールを追加する例

```js
{
  id: "plant_dark_to_mimic_seed",
  name: "箱種配合",
  priority: 90,
  match: { families: ["plant"], elements: ["dark"] },
  result: { speciesId: "mimicSeed", inheritSkillCount: 3, statBonusRate: 0.13 },
  description: "植物系と闇属性の組み合わせでミミックシードが生まれる。"
}
```

## 実装済みヘルパー

`monster_rpg_data_layer.js` には以下のヘルパーを入れています。

- `createInitialPlayerState()`
- `createOwnedMonster(speciesId, options)`
- `calculateStats(speciesId, level, bonusStats)`
- `getLearnedSkillIds(speciesId, level)`
- `previewFusion(parentA, parentB, options)`
- `calculateScoutRate(enemyInstance, battleContext)`
- `createEnemyInstance(enemyId, floor)`
- `generateEncounter(dungeonId, floor)`
- `validateGameData()`
- `savePlayerState(playerState)`
- `loadPlayerState()`

## 次に実装するなら

次はこの順番が自然です。

1. 既存MVPの `species`, `skills`, `dungeons` を `GAME_DATA` 参照に置き換える
2. `playerState.ownedMonsters` を既存の `state.owned` の代わりに使う
3. 戦闘処理を `createEnemyInstance()` / `generateEncounter()` に接続する
4. 配合画面を `previewFusion()` に接続する
5. localStorage保存を `savePlayerState()` / `loadPlayerState()` に寄せる
