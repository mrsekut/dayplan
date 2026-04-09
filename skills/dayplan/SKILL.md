---
name: dayplan
description: >
  1日のスケジュール管理CLI。固定ブロック(MTG等)と作業枠(タスクキュー)で1日を構造化する。
  「スケジュール」「今日の予定」「次のタスク」「タスク完了」「差し込み」と言われたら使う。
  dayplanコマンド、bun run src/cli.ts で実行する。
---

# dayplan v2

1日を「固定ブロック（MTG等）」と「作業枠（タスクキュー）」に分けて管理するCLI。
AIが操作することを前提に設計されている。全コマンドで `--json` 対応。

## セットアップ

```bash
cd /path/to/dayplan && bun install
```

実行: `bun run src/cli.ts <command> [options]`

## コマンドリファレンス

| コマンド      | 説明                   | 入力       |
| ------------- | ---------------------- | ---------- |
| `set`         | スケジュール設定       | stdin JSON |
| `show [date]` | スケジュール表示       | -          |
| `status`      | 現在のタスク+残り時間  | -          |
| `complete`    | 現在のタスクを完了     | -          |
| `skip`        | 現在のタスクをスキップ | -          |
| `add-task`    | タスクをキューに追加   | stdin JSON |
| `prime`       | AI向けフルコンテキスト | -          |
| `help`        | ヘルプ表示             | -          |

全コマンドに `--json` を付けると構造化JSON出力になる。

## データモデル

- **FixedBlock**: 動かせない予定（MTG等）。start/end/title/kind
- **WorkSlot**: 固定ブロック間の作業時間。タスクのキュー(queue)を持つ
- **Task**: title/estimatedMinutes/kind/status/beadId?
- **kind**: `focus` | `batch` | `mtg` | `other`
- **status**: `pending` | `active` | `completed` | `skipped`

## 入力フォーマット

### set

```json
{
  "date": "2026-04-10",
  "fixedBlocks": [
    { "start": "11:30", "end": "12:00", "title": "1on1", "kind": "mtg" }
  ],
  "tasks": [
    {
      "title": "設計",
      "estimatedMinutes": 60,
      "kind": "focus",
      "beadId": "dayplan-xxx"
    }
  ]
}
```

- `date` 省略時は今日
- `fixedBlocks` の間が自動で作業枠(WorkSlot)になる（09:00-18:00）
- `tasks` は作業枠に容量ベースで自動振り分けされる
- `beadId` を含めると `complete` 時に `bd close` が自動実行される

### add-task

```json
{
  "title": "急ぎ対応",
  "estimatedMinutes": 20,
  "kind": "batch",
  "beadId": "dayplan-yyy"
}
```

## 典型ワークフロー

### 朝のプランニング

```bash
# 1. Googleカレンダーから固定予定を取得（MCP経由）
# 2. beadsからタスク候補を取得
bd list --status=open --json
# 3. 上記を組み合わせてsetに投入
echo '{"fixedBlocks":[...],"tasks":[...]}' | bun run src/cli.ts set --json
```

### 日中の操作

```bash
# 今のタスク確認
bun run src/cli.ts status --json

# タスク完了 → 次タスク自動提示 (beadIdあればbd close自動実行)
bun run src/cli.ts complete --json

# タスクスキップ
bun run src/cli.ts skip --json

# 差し込みタスク追加
echo '{"title":"Slack対応","estimatedMinutes":15,"kind":"batch"}' | bun run src/cli.ts add-task --json
```

### 状態確認

```bash
# スケジュール全体を見る
bun run src/cli.ts show --json

# AI向けフルコンテキスト（セッション開始時に実行推奨）
bun run src/cli.ts prime
```

## Beads連携

- タスクの `beadId` フィールドでbeads issueと紐付け
- `complete` 時に `beadId` があれば `bd close <beadId>` を自動実行
- `bd close` が失敗しても `complete` 自体は正常終了する
- 差し込み時: `bd create` → beadId取得 → `add-task` に含める

## 注意点

- 作業日は09:00-18:00固定
- 過去の作業枠に残った未完了タスクは `show`/`status`/`complete`/`skip` 実行時に自動繰越される
- ストレージ: `~/.config/dayplan2/YYYY-MM-DD.json`
