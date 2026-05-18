/**
 * Monster Breeding RPG - Data Layer v1
 * ------------------------------------------------------------
 * 目的:
 * - モンスター、スキル、配合、ダンジョン、敵、アイテム、プレイヤー状態を
 *   すべてデータ駆動で管理する。
 * - 新しいモンスターやスキルを追加するとき、ロジック本体ではなく
 *   GAME_DATA を拡張すれば済む構造にする。
 *
 * 使い方:
 * - 既存のHTML/JSにこのファイルを読み込む
 * - window.MonsterRpgData.GAME_DATA から各データへアクセス
 * - window.MonsterRpgData.createInitialPlayerState() で初期セーブデータ作成
 */

(function () {
  "use strict";

  const DATA_VERSION = "1.0.0";

  /**
   * ステータスキーは全体で統一する。
   * hp, mp, atk, def, spd, wis
   */
  const STAT_KEYS = ["hp", "mp", "atk", "def", "spd", "wis"];

  /**
   * スキル定義
   *
   * 追加するときは:
   * skillId: {
   *   id, name, type, element, mpCost, target, power, accuracy, effect, description
   * }
   */
  const skills = {
    bite: {
      id: "bite",
      name: "かみつき",
      type: "attack",
      element: "neutral",
      mpCost: 0,
      target: "enemySingle",
      power: 1.0,
      accuracy: 0.96,
      effect: null,
      description: "敵1体に物理ダメージを与える。"
    },
    fangRush: {
      id: "fangRush",
      name: "連牙",
      type: "attack",
      element: "neutral",
      mpCost: 4,
      target: "enemySingle",
      power: 1.65,
      accuracy: 0.90,
      effect: null,
      description: "敵1体に強めの物理ダメージを与える。"
    },
    emberSeed: {
      id: "emberSeed",
      name: "ほのおだね",
      type: "magic",
      element: "fire",
      mpCost: 3,
      target: "enemySingle",
      power: 1.35,
      accuracy: 0.95,
      effect: null,
      description: "火属性の小さな魔法ダメージを与える。"
    },
    aquaSplash: {
      id: "aquaSplash",
      name: "水しぶき",
      type: "magic",
      element: "water",
      mpCost: 3,
      target: "enemySingle",
      power: 1.25,
      accuracy: 0.97,
      effect: null,
      description: "水属性の魔法ダメージを与える。"
    },
    sparkNeedle: {
      id: "sparkNeedle",
      name: "雷針",
      type: "magic",
      element: "storm",
      mpCost: 4,
      target: "enemySingle",
      power: 1.45,
      accuracy: 0.93,
      effect: { kind: "debuff", stat: "spd", value: -2, chance: 0.25, turns: 3 },
      description: "雷属性ダメージ。低確率で素早さを下げる。"
    },
    leafHeal: {
      id: "leafHeal",
      name: "若葉の癒し",
      type: "heal",
      element: "wood",
      mpCost: 5,
      target: "allySingle",
      power: 1.2,
      accuracy: 1.0,
      effect: { kind: "healHp", scaleStat: "wis" },
      description: "味方1体のHPを回復する。"
    },
    shellGuard: {
      id: "shellGuard",
      name: "まもりの構え",
      type: "buff",
      element: "steel",
      mpCost: 3,
      target: "self",
      power: 0,
      accuracy: 1.0,
      effect: { kind: "buff", stat: "def", value: 4, turns: 3 },
      description: "自分の防御を3ターン上げる。"
    },
    wisdomRay: {
      id: "wisdomRay",
      name: "知恵の光",
      type: "magic",
      element: "lunar",
      mpCost: 6,
      target: "enemySingle",
      power: 1.85,
      accuracy: 0.90,
      effect: null,
      description: "賢さ依存の高威力魔法。"
    }
  };

  /**
   * モンスター種族定義
   *
   * 追加するときは:
   * speciesId: {
   *   id, name, family, element, rank, rarity, baseStats, growthStats,
   *   skillIds, learnset, fusionTags, recruit, drops, description
   * }
   *
   * fusionTags は配合判定用。
   * family/element/rankだけで足りない特殊配合に使える。
   */
  const monsterSpecies = {
    plumo: {
      id: "plumo",
      name: "プルモ",
      family: "gel",
      familyName: "ゼリー系",
      element: "water",
      elementName: "水",
      rank: "F",
      rarity: 1,
      baseStats: { hp: 32, mp: 14, atk: 11, def: 10, spd: 12, wis: 9 },
      growthStats: { hp: 7, mp: 3, atk: 3, def: 3, spd: 3, wis: 2 },
      skillIds: ["bite", "aquaSplash"],
      learnset: [
        { level: 1, skillId: "bite" },
        { level: 3, skillId: "aquaSplash" }
      ],
      fusionTags: ["softBody", "starter", "water"],
      recruit: { baseRate: 0.55, rankPenalty: 0.03 },
      drops: [{ itemId: "smallJelly", chance: 0.35, min: 1, max: 2 }],
      description: "水辺に多いぷにぷにした小型モンスター。育てやすい。"
    },

    kobud: {
      id: "kobud",
      name: "コブッド",
      family: "beast",
      familyName: "獣系",
      element: "earth",
      elementName: "地",
      rank: "F",
      rarity: 1,
      baseStats: { hp: 38, mp: 8, atk: 15, def: 12, spd: 10, wis: 6 },
      growthStats: { hp: 8, mp: 2, atk: 4, def: 3, spd: 2, wis: 1 },
      skillIds: ["bite", "fangRush"],
      learnset: [
        { level: 1, skillId: "bite" },
        { level: 5, skillId: "fangRush" }
      ],
      fusionTags: ["horn", "starter", "physical"],
      recruit: { baseRate: 0.45, rankPenalty: 0.03 },
      drops: [{ itemId: "roughHorn", chance: 0.22, min: 1, max: 1 }],
      description: "石の角を持つ突進好き。序盤の物理アタッカー。"
    },

    florin: {
      id: "florin",
      name: "フロリン",
      family: "plant",
      familyName: "植物系",
      element: "wood",
      elementName: "木",
      rank: "E",
      rarity: 2,
      baseStats: { hp: 34, mp: 22, atk: 8, def: 11, spd: 9, wis: 15 },
      growthStats: { hp: 7, mp: 5, atk: 2, def: 3, spd: 2, wis: 4 },
      skillIds: ["leafHeal", "shellGuard"],
      learnset: [
        { level: 1, skillId: "leafHeal" },
        { level: 4, skillId: "shellGuard" }
      ],
      fusionTags: ["healer", "wood", "support"],
      recruit: { baseRate: 0.42, rankPenalty: 0.04 },
      drops: [{ itemId: "healingLeaf", chance: 0.28, min: 1, max: 1 }],
      description: "小さな花冠をかぶった癒し手。長期戦を支える。"
    },

    pyrop: {
      id: "pyrop",
      name: "ピロップ",
      family: "spirit",
      familyName: "精霊系",
      element: "fire",
      elementName: "火",
      rank: "E",
      rarity: 2,
      baseStats: { hp: 30, mp: 20, atk: 8, def: 8, spd: 14, wis: 16 },
      growthStats: { hp: 6, mp: 4, atk: 2, def: 2, spd: 3, wis: 4 },
      skillIds: ["emberSeed", "wisdomRay"],
      learnset: [
        { level: 1, skillId: "emberSeed" },
        { level: 7, skillId: "wisdomRay" }
      ],
      fusionTags: ["fire", "magic", "spirit"],
      recruit: { baseRate: 0.35, rankPenalty: 0.04 },
      drops: [{ itemId: "sparkDust", chance: 0.25, min: 1, max: 2 }],
      description: "火花のように跳ねる精霊。魔法攻撃が得意。"
    },

    voltwing: {
      id: "voltwing",
      name: "ボルトウィング",
      family: "bird",
      familyName: "鳥系",
      element: "storm",
      elementName: "雷",
      rank: "D",
      rarity: 3,
      baseStats: { hp: 36, mp: 18, atk: 13, def: 9, spd: 20, wis: 12 },
      growthStats: { hp: 6, mp: 3, atk: 3, def: 2, spd: 5, wis: 3 },
      skillIds: ["sparkNeedle", "bite"],
      learnset: [
        { level: 1, skillId: "bite" },
        { level: 3, skillId: "sparkNeedle" }
      ],
      fusionTags: ["wing", "storm", "speed"],
      recruit: { baseRate: 0.28, rankPenalty: 0.05 },
      drops: [{ itemId: "chargedFeather", chance: 0.20, min: 1, max: 1 }],
      description: "帯電した羽を持つ鳥型モンスター。行動が速い。"
    },

    armordo: {
      id: "armordo",
      name: "アーマード",
      family: "shell",
      familyName: "甲殻系",
      element: "steel",
      elementName: "鋼",
      rank: "D",
      rarity: 3,
      baseStats: { hp: 48, mp: 10, atk: 16, def: 22, spd: 6, wis: 7 },
      growthStats: { hp: 9, mp: 2, atk: 4, def: 5, spd: 1, wis: 1 },
      skillIds: ["shellGuard", "fangRush"],
      learnset: [
        { level: 1, skillId: "shellGuard" },
        { level: 6, skillId: "fangRush" }
      ],
      fusionTags: ["armor", "steel", "tank"],
      recruit: { baseRate: 0.24, rankPenalty: 0.05 },
      drops: [{ itemId: "shellFragment", chance: 0.24, min: 1, max: 1 }],
      description: "硬い外殻を持つ防御役。遅いが崩れにくい。"
    },

    lunacat: {
      id: "lunacat",
      name: "ルナキャット",
      family: "beast",
      familyName: "獣系",
      element: "lunar",
      elementName: "月",
      rank: "C",
      rarity: 4,
      baseStats: { hp: 44, mp: 26, atk: 18, def: 13, spd: 23, wis: 18 },
      growthStats: { hp: 7, mp: 5, atk: 4, def: 3, spd: 5, wis: 4 },
      skillIds: ["sparkNeedle", "wisdomRay", "fangRush"],
      learnset: [
        { level: 1, skillId: "bite" },
        { level: 4, skillId: "sparkNeedle" },
        { level: 8, skillId: "wisdomRay" }
      ],
      fusionTags: ["moon", "speed", "rareFusion"],
      recruit: { baseRate: 0.14, rankPenalty: 0.06 },
      drops: [{ itemId: "moonWhisker", chance: 0.14, min: 1, max: 1 }],
      description: "月光をまとう俊敏な獣。配合で狙いやすい中盤エース。"
    },

    drakid: {
      id: "drakid",
      name: "ドラキッド",
      family: "dragon",
      familyName: "竜系",
      element: "fire",
      elementName: "火",
      rank: "C",
      rarity: 4,
      baseStats: { hp: 52, mp: 18, atk: 22, def: 17, spd: 14, wis: 12 },
      growthStats: { hp: 9, mp: 3, atk: 5, def: 4, spd: 3, wis: 2 },
      skillIds: ["emberSeed", "fangRush", "shellGuard"],
      learnset: [
        { level: 1, skillId: "bite" },
        { level: 3, skillId: "emberSeed" },
        { level: 7, skillId: "fangRush" }
      ],
      fusionTags: ["dragon", "fire", "rareFusion"],
      recruit: { baseRate: 0.12, rankPenalty: 0.06 },
      drops: [{ itemId: "warmScale", chance: 0.13, min: 1, max: 1 }],
      description: "小型の幻竜。火力と耐久のバランスがよい。"
    }
  };

  /**
   * アイテム定義
   *
   * category:
   * - consumable: 消費アイテム
   * - material: 素材
   * - key: 重要アイテム
   */
  const items = {
    scoutBiscuit: {
      id: "scoutBiscuit",
      name: "スカウトビスケット",
      category: "consumable",
      price: 40,
      sellPrice: 10,
      effect: { kind: "scoutRateBonus", value: 0.20 },
      description: "勧誘成功率を一度だけ上げる。"
    },
    healingLeaf: {
      id: "healingLeaf",
      name: "癒しの葉",
      category: "consumable",
      price: 30,
      sellPrice: 8,
      effect: { kind: "healHp", value: 40, target: "allySingle" },
      description: "味方1体のHPを40回復する。"
    },
    fusionStone: {
      id: "fusionStone",
      name: "融合石",
      category: "material",
      price: 120,
      sellPrice: 30,
      effect: { kind: "fusionBonus", value: 0.08 },
      description: "配合時の能力補正を少し高める素材。"
    },
    smallJelly: {
      id: "smallJelly",
      name: "ぷるゼリー",
      category: "material",
      price: 0,
      sellPrice: 4,
      effect: null,
      description: "ゼリー系から取れる素材。"
    },
    roughHorn: {
      id: "roughHorn",
      name: "荒角",
      category: "material",
      price: 0,
      sellPrice: 7,
      effect: null,
      description: "獣系から取れる硬い角。"
    },
    sparkDust: {
      id: "sparkDust",
      name: "火花の粉",
      category: "material",
      price: 0,
      sellPrice: 9,
      effect: null,
      description: "火や雷の力を帯びた粉。"
    },
    chargedFeather: {
      id: "chargedFeather",
      name: "帯電羽",
      category: "material",
      price: 0,
      sellPrice: 11,
      effect: null,
      description: "微弱に光る鳥系素材。"
    },
    shellFragment: {
      id: "shellFragment",
      name: "甲殻片",
      category: "material",
      price: 0,
      sellPrice: 10,
      effect: null,
      description: "防具の材料にもなる硬い殻。"
    },
    moonWhisker: {
      id: "moonWhisker",
      name: "月ひげ",
      category: "material",
      price: 0,
      sellPrice: 20,
      effect: null,
      description: "月属性モンスターが落とす希少素材。"
    },
    warmScale: {
      id: "warmScale",
      name: "ぬくい鱗",
      category: "material",
      price: 0,
      sellPrice: 18,
      effect: null,
      description: "熱を帯びた小さな鱗。"
    }
  };

  /**
   * 敵テンプレート定義
   *
   * speciesとは別に、敵として出るときのレベル範囲、AI、報酬補正を持たせる。
   * 同じspeciesでも「通常敵」「強敵」「ボス」で別IDにできる。
   */
  const enemies = {
    wildPlumo: {
      id: "wildPlumo",
      speciesId: "plumo",
      namePrefix: "野生の",
      levelRange: [1, 3],
      ai: "basic",
      expMultiplier: 1.0,
      goldMultiplier: 1.0,
      scoutModifier: 0.00
    },
    wildKobud: {
      id: "wildKobud",
      speciesId: "kobud",
      namePrefix: "野生の",
      levelRange: [1, 4],
      ai: "aggressive",
      expMultiplier: 1.08,
      goldMultiplier: 1.0,
      scoutModifier: -0.02
    },
    wildFlorin: {
      id: "wildFlorin",
      speciesId: "florin",
      namePrefix: "野生の",
      levelRange: [2, 5],
      ai: "support",
      expMultiplier: 1.12,
      goldMultiplier: 1.1,
      scoutModifier: -0.02
    },
    wildPyrop: {
      id: "wildPyrop",
      speciesId: "pyrop",
      namePrefix: "野生の",
      levelRange: [3, 7],
      ai: "magic",
      expMultiplier: 1.25,
      goldMultiplier: 1.15,
      scoutModifier: -0.03
    },
    wildVoltwing: {
      id: "wildVoltwing",
      speciesId: "voltwing",
      namePrefix: "野生の",
      levelRange: [5, 9],
      ai: "speed",
      expMultiplier: 1.45,
      goldMultiplier: 1.25,
      scoutModifier: -0.05
    },
    wildArmordo: {
      id: "wildArmordo",
      speciesId: "armordo",
      namePrefix: "野生の",
      levelRange: [5, 10],
      ai: "defensive",
      expMultiplier: 1.50,
      goldMultiplier: 1.35,
      scoutModifier: -0.05
    },
    bossVoltwing: {
      id: "bossVoltwing",
      speciesId: "voltwing",
      namePrefix: "雷鳴の主",
      levelRange: [10, 12],
      ai: "bossSpeed",
      expMultiplier: 3.0,
      goldMultiplier: 2.5,
      scoutModifier: -0.30,
      boss: true
    }
  };

  /**
   * 配合ルール
   *
   * priority が高い順に判定する。
   * match:
   * - speciesIds: 特定の親種族
   * - families: 親の系統
   * - elements: 親の属性
   * - tags: 親が持つfusionTags
   *
   * result:
   * - speciesId: 生まれる種族
   * - inheritSkillCount: 継承スキル数
   * - statBonusRate: 親平均ステータスから子へ乗る補正率
   */
  const fusionRules = [
    {
      id: "beast_bird_to_lunacat",
      name: "月獣配合",
      priority: 100,
      match: { families: ["beast", "bird"] },
      result: { speciesId: "lunacat", inheritSkillCount: 3, statBonusRate: 0.14 },
      description: "獣系と鳥系から俊敏な月属性モンスターが生まれる。"
    },
    {
      id: "fire_beast_to_drakid",
      name: "小竜配合",
      priority: 95,
      match: { elements: ["fire"], families: ["beast"] },
      result: { speciesId: "drakid", inheritSkillCount: 3, statBonusRate: 0.15 },
      description: "火属性と獣系の力が混ざると竜系へ変化しやすい。"
    },
    {
      id: "spirit_bird_to_voltwing",
      name: "雷羽配合",
      priority: 80,
      match: { families: ["spirit", "bird"] },
      result: { speciesId: "voltwing", inheritSkillCount: 2, statBonusRate: 0.12 },
      description: "精霊系と鳥系から雷を帯びた翼持ちが生まれる。"
    },
    {
      id: "spirit_gel_to_pyrop",
      name: "火精配合",
      priority: 70,
      match: { families: ["spirit", "gel"] },
      result: { speciesId: "pyrop", inheritSkillCount: 2, statBonusRate: 0.11 },
      description: "やわらかな体に精霊の力が宿る。"
    },
    {
      id: "plant_spirit_to_florin",
      name: "若葉配合",
      priority: 70,
      match: { families: ["plant", "spirit"] },
      result: { speciesId: "florin", inheritSkillCount: 2, statBonusRate: 0.11 },
      description: "植物系と精霊系から回復役が生まれやすい。"
    },
    {
      id: "shell_beast_to_armordo",
      name: "甲獣配合",
      priority: 65,
      match: { families: ["shell", "beast"] },
      result: { speciesId: "armordo", inheritSkillCount: 2, statBonusRate: 0.12 },
      description: "硬い殻と獣の力を併せ持つ。"
    },
    {
      id: "fallback_by_rank",
      name: "通常配合",
      priority: 0,
      match: { any: true },
      result: { speciesId: null, inheritSkillCount: 2, statBonusRate: 0.10, useFallbackByRank: true },
      description: "特別な組み合わせでない場合、親のランクと属性に近い種族から決定する。"
    }
  ].sort((a, b) => b.priority - a.priority);

  /**
   * ダンジョン定義
   *
   * encounterTables は重み付き。
   * enemyId と weight を増やすだけで出現敵を追加できる。
   */
  const dungeons = {
    meadow: {
      id: "meadow",
      name: "はじまりの草原",
      recommendedLevel: 1,
      floors: 3,
      unlockCondition: null,
      encounterTables: [
        {
          floorRange: [1, 2],
          enemies: [
            { enemyId: "wildPlumo", weight: 45 },
            { enemyId: "wildKobud", weight: 35 },
            { enemyId: "wildFlorin", weight: 20 }
          ]
        },
        {
          floorRange: [3, 3],
          enemies: [
            { enemyId: "wildKobud", weight: 60 },
            { enemyId: "wildFlorin", weight: 40 }
          ],
          bossEnemyId: "wildKobud"
        }
      ],
      eventTable: [
        { type: "battle", weight: 65 },
        { type: "treasure", weight: 15 },
        { type: "healSpring", weight: 10 },
        { type: "nothing", weight: 10 }
      ],
      rewards: {
        clearGold: 60,
        itemDrops: [{ itemId: "scoutBiscuit", quantity: 1 }]
      },
      description: "勧誘と基本戦闘を覚える浅い草原。"
    },

    emberCave: {
      id: "emberCave",
      name: "火花の洞穴",
      recommendedLevel: 4,
      floors: 4,
      unlockCondition: { kind: "clearDungeon", dungeonId: "meadow" },
      encounterTables: [
        {
          floorRange: [1, 3],
          enemies: [
            { enemyId: "wildPyrop", weight: 45 },
            { enemyId: "wildKobud", weight: 30 },
            { enemyId: "wildArmordo", weight: 25 }
          ]
        },
        {
          floorRange: [4, 4],
          enemies: [{ enemyId: "wildPyrop", weight: 100 }],
          bossEnemyId: "wildPyrop"
        }
      ],
      eventTable: [
        { type: "battle", weight: 70 },
        { type: "treasure", weight: 12 },
        { type: "healSpring", weight: 8 },
        { type: "nothing", weight: 10 }
      ],
      rewards: {
        clearGold: 120,
        itemDrops: [{ itemId: "healingLeaf", quantity: 2 }, { itemId: "fusionStone", quantity: 1 }]
      },
      description: "魔法系の敵が多い洞穴。防御と回復が鍵。"
    },

    stormTower: {
      id: "stormTower",
      name: "雷鳴の塔",
      recommendedLevel: 7,
      floors: 5,
      unlockCondition: { kind: "clearDungeon", dungeonId: "emberCave" },
      encounterTables: [
        {
          floorRange: [1, 4],
          enemies: [
            { enemyId: "wildVoltwing", weight: 42 },
            { enemyId: "wildPyrop", weight: 28 },
            { enemyId: "wildArmordo", weight: 30 }
          ]
        },
        {
          floorRange: [5, 5],
          enemies: [{ enemyId: "bossVoltwing", weight: 100 }],
          bossEnemyId: "bossVoltwing"
        }
      ],
      eventTable: [
        { type: "battle", weight: 75 },
        { type: "treasure", weight: 10 },
        { type: "healSpring", weight: 5 },
        { type: "nothing", weight: 10 }
      ],
      rewards: {
        clearGold: 220,
        itemDrops: [{ itemId: "fusionStone", quantity: 2 }]
      },
      description: "素早い敵が連続で出る中盤ダンジョン。"
    }
  };

  /**
   * ownedMonsters は「種族定義」と分離した、プレイヤーが所持する個体データ。
   * ここではスターターの初期所持個体を生成するためのseedだけ持つ。
   */
  const starterOwnedMonsterSeeds = [
    { speciesId: "plumo", level: 1, nickname: "プルモ" },
    { speciesId: "kobud", level: 1, nickname: "コブッド" },
    { speciesId: "florin", level: 1, nickname: "フロリン" }
  ];

  /**
   * playerState 初期値
   *
   * セーブ対象:
   * - ownedMonsters
   * - partyMonsterIds
   * - codexSpeciesIds
   * - inventory
   * - dungeonProgress
   * - flags/settings
   */
  function createInitialPlayerState() {
    const ownedMonsters = starterOwnedMonsterSeeds.map(seed => createOwnedMonster(seed.speciesId, {
      level: seed.level,
      nickname: seed.nickname
    }));

    return {
      dataVersion: DATA_VERSION,
      playerId: createId("player"),
      gold: 120,

      ownedMonsters,
      partyMonsterIds: ownedMonsters.slice(0, 3).map(mon => mon.instanceId),

      codexSpeciesIds: unique(ownedMonsters.map(mon => mon.speciesId)),

      inventory: {
        scoutBiscuit: 3,
        healingLeaf: 2,
        fusionStone: 1
      },

      dungeonProgress: {
        clearedDungeonIds: [],
        currentRun: null
      },

      settings: {
        consumeParentsOnFusion: true,
        autoSave: true,
        battleSpeed: "normal"
      },

      flags: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 所持モンスター個体を作る。
   * speciesIdはmonsterSpeciesに存在する必要がある。
   */
  function createOwnedMonster(speciesId, options = {}) {
    const species = requireSpecies(speciesId);
    const level = options.level ?? 1;
    const bonusStats = normalizeStats(options.bonusStats || {});
    const maxStats = calculateStats(speciesId, level, bonusStats);
    const learnedSkillIds = getLearnedSkillIds(speciesId, level);
    const inheritedSkillIds = options.inheritedSkillIds || [];

    return {
      instanceId: options.instanceId || createId("mon"),
      speciesId,
      nickname: options.nickname || species.name,
      level,
      exp: options.exp || 0,

      bonusStats,
      currentHp: options.currentHp ?? maxStats.hp,
      currentMp: options.currentMp ?? maxStats.mp,

      skillIds: unique([...learnedSkillIds, ...inheritedSkillIds]).slice(0, 4),

      traitIds: options.traitIds || [],
      parentInstanceIds: options.parentInstanceIds || [],
      origin: options.origin || "generated",
      locked: Boolean(options.locked),

      createdAt: options.createdAt || new Date().toISOString()
    };
  }

  /**
   * 種族の基礎値 + 成長値 * (level - 1) + 個体ボーナス
   */
  function calculateStats(speciesId, level = 1, bonusStats = {}) {
    const species = requireSpecies(speciesId);
    const normalizedBonus = normalizeStats(bonusStats);
    const stats = {};

    for (const key of STAT_KEYS) {
      stats[key] =
        species.baseStats[key] +
        species.growthStats[key] * Math.max(0, level - 1) +
        normalizedBonus[key];
    }

    return stats;
  }

  function getLearnedSkillIds(speciesId, level = 1) {
    const species = requireSpecies(speciesId);
    const fromLearnset = (species.learnset || [])
      .filter(row => row.level <= level)
      .map(row => row.skillId);

    return unique([...(species.skillIds || []), ...fromLearnset]);
  }

  /**
   * 配合プレビュー。
   * 実行前にUIで結果を見せるため、親は消費しない。
   */
  function previewFusion(parentA, parentB, options = {}) {
    if (!parentA || !parentB) throw new Error("previewFusion requires two parents.");
    if (parentA.instanceId === parentB.instanceId) throw new Error("Cannot fuse the same monster instance.");

    const speciesA = requireSpecies(parentA.speciesId);
    const speciesB = requireSpecies(parentB.speciesId);
    const rule = findFusionRule(speciesA, speciesB);

    const resultSpeciesId = resolveFusionSpeciesId(rule, speciesA, speciesB);
    const resultSpecies = requireSpecies(resultSpeciesId);

    const parentStatsA = calculateStats(parentA.speciesId, parentA.level, parentA.bonusStats);
    const parentStatsB = calculateStats(parentB.speciesId, parentB.level, parentB.bonusStats);

    const baseBonusRate = rule.result.statBonusRate ?? 0.10;
    const materialBonus = options.useFusionStone ? 0.08 : 0;
    const statBonusRate = baseBonusRate + materialBonus;

    const bonusStats = {};
    for (const key of STAT_KEYS) {
      const avg = (parentStatsA[key] + parentStatsB[key]) / 2;
      bonusStats[key] = Math.floor(avg * statBonusRate);
    }

    const childLevel = Math.max(1, Math.floor((parentA.level + parentB.level) / 2) - 2);
    const inheritSkillCount = rule.result.inheritSkillCount ?? 2;
    const inheritedSkillIds = chooseInheritedSkills(parentA, parentB, resultSpeciesId, inheritSkillCount);

    const childPreview = createOwnedMonster(resultSpeciesId, {
      level: childLevel,
      nickname: resultSpecies.name,
      bonusStats,
      inheritedSkillIds,
      parentInstanceIds: [parentA.instanceId, parentB.instanceId],
      origin: "fusionPreview"
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      resultSpeciesId,
      childPreview,
      inheritedSkillIds,
      bonusStats,
      consumeParents: Boolean(options.consumeParentsOnFusion)
    };
  }

  function findFusionRule(speciesA, speciesB) {
    for (const rule of fusionRules) {
      if (matchesFusionRule(rule, speciesA, speciesB)) return rule;
    }
    return fusionRules.find(rule => rule.id === "fallback_by_rank");
  }

  function matchesFusionRule(rule, speciesA, speciesB) {
    if (rule.match.any) return true;

    const parents = [speciesA, speciesB];

    if (rule.match.speciesIds) {
      const needed = [...rule.match.speciesIds].sort().join("|");
      const actual = parents.map(sp => sp.id).sort().join("|");
      if (needed !== actual) return false;
    }

    if (rule.match.families) {
      for (const family of rule.match.families) {
        if (!parents.some(sp => sp.family === family)) return false;
      }
    }

    if (rule.match.elements) {
      for (const element of rule.match.elements) {
        if (!parents.some(sp => sp.element === element)) return false;
      }
    }

    if (rule.match.tags) {
      for (const tag of rule.match.tags) {
        if (!parents.some(sp => (sp.fusionTags || []).includes(tag))) return false;
      }
    }

    return true;
  }

  function resolveFusionSpeciesId(rule, speciesA, speciesB) {
    if (rule.result.speciesId) return rule.result.speciesId;

    const rankScore = (rankToNumber(speciesA.rank) + rankToNumber(speciesB.rank)) / 2;
    const parentElements = new Set([speciesA.element, speciesB.element]);
    const parentFamilies = new Set([speciesA.family, speciesB.family]);

    const candidates = Object.values(monsterSpecies)
      .filter(sp => rankToNumber(sp.rank) <= Math.ceil(rankScore) + 1)
      .map(sp => {
        let score = 0;
        score += Math.abs(rankToNumber(sp.rank) - rankScore) * 10;
        if (parentElements.has(sp.element)) score -= 5;
        if (parentFamilies.has(sp.family)) score -= 3;
        score += sp.rarity;
        return { speciesId: sp.id, score };
      })
      .sort((a, b) => a.score - b.score);

    return candidates[0]?.speciesId || "plumo";
  }

  function chooseInheritedSkills(parentA, parentB, childSpeciesId, count) {
    const childBaseSkills = getLearnedSkillIds(childSpeciesId, 1);
    const parentSkills = unique([...(parentA.skillIds || []), ...(parentB.skillIds || [])])
      .filter(skillId => !childBaseSkills.includes(skillId));

    return parentSkills.slice(0, count);
  }

  /**
   * 勧誘率計算。
   * UI/戦闘ロジック側から呼ぶ想定。
   */
  function calculateScoutRate(enemyInstance, battleContext = {}) {
    const species = requireSpecies(enemyInstance.speciesId);
    const maxStats = calculateStats(enemyInstance.speciesId, enemyInstance.level, enemyInstance.bonusStats);
    const hpRatio = clamp(enemyInstance.currentHp / maxStats.hp, 0, 1);

    const base = species.recruit.baseRate;
    const lowHpBonus = (1 - hpRatio) * 0.35;
    const itemBonus = battleContext.usedScoutBiscuit ? 0.20 : 0;
    const rankPenalty = rankToNumber(species.rank) * species.recruit.rankPenalty;
    const enemyModifier = battleContext.enemyTemplate?.scoutModifier || 0;

    return clamp(base + lowHpBonus + itemBonus + enemyModifier - rankPenalty, 0.05, 0.85);
  }

  function createEnemyInstance(enemyId, floor = 1) {
    const template = enemies[enemyId];
    if (!template) throw new Error(`Unknown enemyId: ${enemyId}`);

    const [minLevel, maxLevel] = template.levelRange;
    const level = randomInt(minLevel, maxLevel) + Math.max(0, floor - 1);
    const monster = createOwnedMonster(template.speciesId, {
      level,
      nickname: `${template.namePrefix}${monsterSpecies[template.speciesId].name}`,
      origin: "enemy"
    });

    return {
      ...monster,
      enemyTemplateId: enemyId,
      ai: template.ai,
      boss: Boolean(template.boss)
    };
  }

  function getDungeonEncounterTable(dungeonId, floor) {
    const dungeon = dungeons[dungeonId];
    if (!dungeon) throw new Error(`Unknown dungeonId: ${dungeonId}`);

    return dungeon.encounterTables.find(table => {
      const [minFloor, maxFloor] = table.floorRange;
      return floor >= minFloor && floor <= maxFloor;
    });
  }

  function pickWeighted(rows) {
    const total = rows.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;

    for (const row of rows) {
      roll -= row.weight;
      if (roll <= 0) return row;
    }

    return rows[rows.length - 1];
  }

  function generateEncounter(dungeonId, floor) {
    const table = getDungeonEncounterTable(dungeonId, floor);
    const dungeon = dungeons[dungeonId];
    const isBossFloor = floor >= dungeon.floors && table.bossEnemyId;

    if (isBossFloor) {
      return [createEnemyInstance(table.bossEnemyId, floor)];
    }

    const enemyCount = clamp(1 + Math.floor(Math.random() * Math.min(3, floor + 1)), 1, 3);
    const result = [];

    for (let i = 0; i < enemyCount; i++) {
      const selected = pickWeighted(table.enemies);
      result.push(createEnemyInstance(selected.enemyId, floor));
    }

    return result;
  }

  function validateGameData() {
    const errors = [];

    for (const [skillId, skill] of Object.entries(skills)) {
      if (skill.id !== skillId) errors.push(`skills.${skillId}: id mismatch.`);
      if (!skill.name) errors.push(`skills.${skillId}: name is required.`);
    }

    for (const [speciesId, species] of Object.entries(monsterSpecies)) {
      if (species.id !== speciesId) errors.push(`monsterSpecies.${speciesId}: id mismatch.`);
      for (const key of STAT_KEYS) {
        if (typeof species.baseStats[key] !== "number") errors.push(`${speciesId}.baseStats.${key} is required.`);
        if (typeof species.growthStats[key] !== "number") errors.push(`${speciesId}.growthStats.${key} is required.`);
      }
      for (const skillId of species.skillIds || []) {
        if (!skills[skillId]) errors.push(`${speciesId}: unknown skillId ${skillId}.`);
      }
      for (const row of species.learnset || []) {
        if (!skills[row.skillId]) errors.push(`${speciesId}.learnset: unknown skillId ${row.skillId}.`);
      }
    }

    for (const [enemyId, enemy] of Object.entries(enemies)) {
      if (enemy.id !== enemyId) errors.push(`enemies.${enemyId}: id mismatch.`);
      if (!monsterSpecies[enemy.speciesId]) errors.push(`enemies.${enemyId}: unknown speciesId ${enemy.speciesId}.`);
    }

    for (const [dungeonId, dungeon] of Object.entries(dungeons)) {
      if (dungeon.id !== dungeonId) errors.push(`dungeons.${dungeonId}: id mismatch.`);
      for (const table of dungeon.encounterTables || []) {
        for (const row of table.enemies || []) {
          if (!enemies[row.enemyId]) errors.push(`dungeons.${dungeonId}: unknown enemyId ${row.enemyId}.`);
        }
        if (table.bossEnemyId && !enemies[table.bossEnemyId]) {
          errors.push(`dungeons.${dungeonId}: unknown bossEnemyId ${table.bossEnemyId}.`);
        }
      }
    }

    for (const rule of fusionRules) {
      if (rule.result.speciesId && !monsterSpecies[rule.result.speciesId]) {
        errors.push(`fusionRules.${rule.id}: unknown result species ${rule.result.speciesId}.`);
      }
    }

    return { ok: errors.length === 0, errors };
  }

  function savePlayerState(playerState, storageKey = "monster_rpg_player_state_v1") {
    const copy = structuredCloneSafe(playerState);
    copy.updatedAt = new Date().toISOString();
    localStorage.setItem(storageKey, JSON.stringify(copy));
    return copy;
  }

  function loadPlayerState(storageKey = "monster_rpg_player_state_v1") {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createInitialPlayerState();
    return JSON.parse(raw);
  }

  function normalizeStats(stats) {
    const normalized = {};
    for (const key of STAT_KEYS) normalized[key] = Number(stats[key] || 0);
    return normalized;
  }

  function requireSpecies(speciesId) {
    const species = monsterSpecies[speciesId];
    if (!species) throw new Error(`Unknown speciesId: ${speciesId}`);
    return species;
  }

  function rankToNumber(rank) {
    return { F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 7 }[rank] || 1;
  }

  function createId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36).slice(-5)}`;
  }

  function unique(arr) {
    return [...new Set(arr)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  const GAME_DATA = Object.freeze({
    version: DATA_VERSION,
    statKeys: STAT_KEYS,
    monsterSpecies,
    skills,
    fusionRules,
    dungeons,
    enemies,
    items,
    starterOwnedMonsterSeeds
  });

  const api = {
    GAME_DATA,

    // playerState / ownedMonsters
    createInitialPlayerState,
    createOwnedMonster,
    savePlayerState,
    loadPlayerState,

    // calculation helpers
    calculateStats,
    getLearnedSkillIds,
    previewFusion,
    calculateScoutRate,

    // dungeon / enemy helpers
    createEnemyInstance,
    generateEncounter,
    getDungeonEncounterTable,

    // validation
    validateGameData
  };

  if (typeof window !== "undefined") {
    window.MonsterRpgData = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
