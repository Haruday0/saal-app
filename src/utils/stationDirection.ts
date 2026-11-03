/**
 * 仙台空港アクセス線・東北本線各駅における公式方面案内ユーティリティ
 *
 * 規約:
 * 1. 方面案内には「仙台空港」「名取」「仙台」の3駅のみを使用する（白石・原ノ町・福島等の区間外駅名は排除）。
 * 2. 名取駅では当駅のため「名取方面」は使用しない（上り: 仙台空港方面、下り: 仙台方面）。
 * 3. 仙台〜南仙台間: 上り「名取・仙台空港方面」、下り「仙台方面」
 * 4. 杜せきのした・美田園・仙台空港: 上り「仙台空港方面」、下り「名取・仙台方面」
 */

export function getStationDirectionName(stationId: string, direction: 'up' | 'down'): string {
  if (direction === 'up') {
    if (stationId === 'sendai-airport') return '当駅終着';
    if (['natori', 'morisekinoshita', 'mitazono'].includes(stationId)) {
      return '仙台空港方面';
    }
    // 仙台、長町、太子堂、南仙台
    return '名取・仙台空港方面';
  } else {
    if (stationId === 'sendai') return '当駅終着';
    if (['morisekinoshita', 'mitazono', 'sendai-airport'].includes(stationId)) {
      return '名取・仙台方面';
    }
    // 長町、太子堂、南仙台、名取
    return '仙台方面';
  }
}

/** 時刻表モーダル等の SegmentedControl 用ラベル生成 */
export function getTimetableDirectionLabels(stationId: string): { up: string; down: string } {
  return {
    up: `上り（${getStationDirectionName(stationId, 'up')}）`,
    down: `下り（${getStationDirectionName(stationId, 'down')}）`,
  };
}
