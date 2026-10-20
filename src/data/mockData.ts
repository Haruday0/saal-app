import { Station, DepartureTrain, MovingTrain } from '../types';

export const STATIONS: Station[] = [
  {
    id: 'sendai',
    name: '仙台',
    nameKana: 'せんだい',
    nameEn: 'Sendai',
    stationNumber: '01',
    hasTohokuJoban: true,
    transferLines: ['東北・秋田・北海道新幹線', '東北本線', '仙山線', '仙石線', '地下鉄南北線', '地下鉄東西線', '市営バス'],
    transfers: [
      { id: 't-sd-1', type: 'subway_n', symbol: 'N', name: '南北線', nameEn: 'Namboku Line' },
      { id: 't-sd-2', type: 'subway_t', symbol: 'T', name: '東西線', nameEn: 'Tozai Line' },
      { id: 't-sd-3', type: 'shinkansen', name: '新幹線', nameEn: 'Shinkansen' },
      { id: 't-sd-4', type: 'jr', name: 'JR線各線', nameEn: 'JR Lines' }
    ],
    platforms: {
      up: {

        trackNumber: '3・4',
        directionName: '仙台空港・白石・原ノ町方面',
        gates: [
          { id: 'g-sd-1', name: '西 改札', nameEn: 'West Gates', type: 'gate', carPosition: 1.4 },
          { id: 'g-sd-2', name: '南北線のりかえ', nameEn: 'Transfer to Namboku Line', type: 'transfer', carPosition: 2.3 },
          { id: 'g-sd-3', name: '東 改札', nameEn: 'East Gates', type: 'gate', carPosition: 3.5 }
        ],
        facilities: [
          { id: 'f-sd-d1', type: 'escalator', name: '西改札エスカレーター', carNumber: 1, doorNumber: 2, direction: 'up' },
          { id: 'f-sd-d2', type: 'elevator', name: 'エレベーター（中央口・新幹線）', carNumber: 2, doorNumber: 1, direction: 'both' },
          { id: 'f-sd-d3', type: 'escalator', name: '中央改札エスカレーター', carNumber: 3, doorNumber: 1, direction: 'up' },
          { id: 'f-sd-d4', type: 'stairs', name: '中央口・東口改札階段', carNumber: 3, doorNumber: 3 },
          { id: 'f-sd-d5', type: 'elevator', name: '地下南口エレベーター', carNumber: 4, doorNumber: 2, direction: 'both' }
        ]
      },
      down: {

        trackNumber: '3・4',
        directionName: '当駅終着 / 東北本線・仙山線方面',
        gates: [
          { id: 'g-sd-1', name: '西 改札', nameEn: 'West Gates', type: 'gate', carPosition: 1.4 },
          { id: 'g-sd-2', name: '南北線のりかえ', nameEn: 'Transfer to Namboku Line', type: 'transfer', carPosition: 2.3 },
          { id: 'g-sd-3', name: '東 改札', nameEn: 'East Gates', type: 'gate', carPosition: 3.5 }
        ],
        facilities: [
          { id: 'f-sd-u1', type: 'escalator', name: '西改札エスカレーター', carNumber: 1, doorNumber: 2, direction: 'up' },
          { id: 'f-sd-u2', type: 'elevator', name: 'エレベーター（中央口・新幹線）', carNumber: 2, doorNumber: 1, direction: 'both' },
          { id: 'f-sd-u3', type: 'escalator', name: '中央改札エスカレーター', carNumber: 3, doorNumber: 1, direction: 'up' },
          { id: 'f-sd-u4', type: 'stairs', name: '中央口・東口改札階段', carNumber: 3, doorNumber: 3 },
          { id: 'f-sd-u5', type: 'elevator', name: '地下南口エレベーター', carNumber: 4, doorNumber: 2, direction: 'both' }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 0, ic: 0 },
      'nagamachi': { ticket: 200, ic: 198 },
      'taishido': { ticket: 200, ic: 198 },
      'minami-sendai': { ticket: 220, ic: 218 },
      'natori': { ticket: 260, ic: 254 },
      'morisekinoshita': { ticket: 440, ic: 434 },
      'mitazono': { ticket: 540, ic: 534 },
      'sendai-airport': { ticket: 680, ic: 672 }
    }
  },
  {
    id: 'nagamachi',
    name: '長町',
    nameKana: 'ながまち',
    nameEn: 'Nagamachi',
    stationNumber: '02',
    hasTohokuJoban: true,
    transferLines: ['地下鉄南北線', '市営バス', '宮城交通バス'],
    transfers: [
      { id: 't-ng-1', type: 'subway_n', symbol: 'N', name: '南北線', nameEn: 'Namboku Line' },
      { id: 't-ng-2', type: 'bus', name: '市営バス・宮交バス', nameEn: 'City Bus' }
    ],
    platforms: {
      up: {

        trackNumber: '2',
        directionName: '仙台空港・白石方面',
        gates: [
          { id: 'g-ng-1', name: '西口・地下鉄連絡口', nameEn: 'West Exit & Subway', type: 'gate', carPosition: 1.5 },
          { id: 'g-ng-2', name: '東 口', nameEn: 'East Exit', type: 'gate', carPosition: 3.2 }
        ],
        facilities: [
          { id: 'f-ng-d1', type: 'elevator', name: '改札階行エレベーター', carNumber: 1, doorNumber: 3, direction: 'both' },
          { id: 'f-ng-d2', type: 'escalator', name: '改札階行エスカレーター', carNumber: 2, doorNumber: 2, direction: 'down' },
          { id: 'f-ng-d3', type: 'stairs', name: '改札口連絡階段', carNumber: 3, doorNumber: 2 }
        ]
      },
      down: {

        trackNumber: '1',
        directionName: '仙台方面',
        gates: [
          { id: 'g-ng-1', name: '西口・地下鉄連絡口', nameEn: 'West Exit & Subway', type: 'gate', carPosition: 1.5 },
          { id: 'g-ng-2', name: '東 口', nameEn: 'East Exit', type: 'gate', carPosition: 3.2 }
        ],
        facilities: [
          { id: 'f-ng-u1', type: 'elevator', name: '改札階行エレベーター', carNumber: 1, doorNumber: 3, direction: 'both' },
          { id: 'f-ng-u2', type: 'escalator', name: '改札階行エスカレーター', carNumber: 2, doorNumber: 2, direction: 'down' },
          { id: 'f-ng-u3', type: 'stairs', name: '改札口連絡階段', carNumber: 3, doorNumber: 2 }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 200, ic: 198 },
      'nagamachi': { ticket: 0, ic: 0 },
      'taishido': { ticket: 160, ic: 157 },
      'minami-sendai': { ticket: 200, ic: 198 },
      'natori': { ticket: 210, ic: 209 },
      'morisekinoshita': { ticket: 420, ic: 414 },
      'mitazono': { ticket: 490, ic: 484 },
      'sendai-airport': { ticket: 630, ic: 622 }
    }
  },
  {
    id: 'taishido',
    name: '太子堂',
    nameKana: 'たいしどう',
    nameEn: 'Taishido',
    stationNumber: '03',
    hasTohokuJoban: true,
    transferLines: ['市営バス'],
    transfers: [
      { id: 't-ts-1', type: 'bus', name: '市営バス', nameEn: 'City Bus' }
    ],
    platforms: {
      up: {

        trackNumber: '2',
        directionName: '仙台空港・白石方面',
        gates: [
          { id: 'g-ts-1', name: '改札口', nameEn: 'Ticket Gate', type: 'gate', carPosition: 2.0 }
        ],
        facilities: [
          { id: 'f-ts-d1', type: 'elevator', name: '改札口行エレベーター', carNumber: 2, doorNumber: 1, direction: 'both' },
          { id: 'f-ts-d2', type: 'stairs', name: '改札口連絡階段', carNumber: 2, doorNumber: 3 }
        ]
      },
      down: {

        trackNumber: '1',
        directionName: '仙台方面',
        gates: [
          { id: 'g-ts-1', name: '改札口', nameEn: 'Ticket Gate', type: 'gate', carPosition: 2.0 }
        ],
        facilities: [
          { id: 'f-ts-u1', type: 'elevator', name: '改札口行エレベーター', carNumber: 2, doorNumber: 1, direction: 'both' },
          { id: 'f-ts-u2', type: 'stairs', name: '改札口連絡階段', carNumber: 2, doorNumber: 3 }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 200, ic: 198 },
      'nagamachi': { ticket: 160, ic: 157 },
      'taishido': { ticket: 0, ic: 0 },
      'minami-sendai': { ticket: 160, ic: 157 },
      'natori': { ticket: 200, ic: 198 },
      'morisekinoshita': { ticket: 390, ic: 384 },
      'mitazono': { ticket: 460, ic: 454 },
      'sendai-airport': { ticket: 600, ic: 592 }
    }
  },
  {
    id: 'minami-sendai',
    name: '南仙台',
    nameKana: 'みなみせんだい',
    nameEn: 'Minami-Sendai',
    stationNumber: '04',
    hasTohokuJoban: true,
    transferLines: ['市営バス', '宮城交通バス', 'なとりん号'],
    transfers: [
      { id: 't-ms-1', type: 'bus', name: '市営・宮交バス', nameEn: 'City Bus' },
      { id: 't-ms-2', type: 'bus', name: 'なとりん号（西口）', nameEn: 'Natoringo Bus' }
    ],
    platforms: {
      up: {

        trackNumber: '1',
        directionName: '仙台空港・白石方面',
        gates: [
          { id: 'g-ms-1', name: '東 口', nameEn: 'East Exit', type: 'gate', carPosition: 1.5 },
          { id: 'g-ms-2', name: '西 口', nameEn: 'West Exit', type: 'gate', carPosition: 3.5 }
        ],
        facilities: [
          { id: 'f-ms-d1', type: 'stairs', name: '跨線橋・東口改札階段', carNumber: 1, doorNumber: 3 },
          { id: 'f-ms-d2', type: 'elevator', name: '跨線橋行エレベーター', carNumber: 2, doorNumber: 2, direction: 'both' },
          { id: 'f-ms-d3', type: 'stairs', name: '跨線橋・西口改札階段', carNumber: 4, doorNumber: 1 }
        ]
      },
      down: {

        trackNumber: '2',
        directionName: '仙台方面',
        gates: [
          { id: 'g-ms-1', name: '東 口', nameEn: 'East Exit', type: 'gate', carPosition: 1.5 },
          { id: 'g-ms-2', name: '西 口', nameEn: 'West Exit', type: 'gate', carPosition: 3.5 }
        ],
        facilities: [
          { id: 'f-ms-u1', type: 'stairs', name: '跨線橋・改札口階段', carNumber: 1, doorNumber: 2 },
          { id: 'f-ms-u2', type: 'elevator', name: '跨線橋行エレベーター', carNumber: 2, doorNumber: 1, direction: 'both' },
          { id: 'f-ms-u3', type: 'stairs', name: '跨線橋・西口改札階段', carNumber: 3, doorNumber: 2 }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 220, ic: 218 },
      'nagamachi': { ticket: 200, ic: 198 },
      'taishido': { ticket: 160, ic: 157 },
      'minami-sendai': { ticket: 0, ic: 0 },
      'natori': { ticket: 160, ic: 157 },
      'morisekinoshita': { ticket: 350, ic: 344 },
      'mitazono': { ticket: 420, ic: 414 },
      'sendai-airport': { ticket: 560, ic: 552 }
    }
  },
  {
    id: 'natori',
    name: '名取',
    nameKana: 'なとり',
    nameEn: 'Natori',
    stationNumber: '05',
    hasTohokuJoban: true,
    transferLines: ['なとりん号（東口・西口）', 'JR東北本線', 'JR常磐線'],
    transfers: [
      { id: 't-nt-1', type: 'jr', name: 'JR東北本線・常磐線', nameEn: 'Tohoku / Joban Line' },
      { id: 't-nt-2', type: 'bus', name: 'なとりん号', nameEn: 'Natoringo Bus' }
    ],
    platforms: {
      up: {

        trackNumber: '2・3',
        directionName: '仙台空港・岩沼・福島方面',
        gates: [
          { id: 'g-nt-1', name: '東 口', nameEn: 'East Exit', type: 'gate', carPosition: 1.5 },
          { id: 'g-nt-2', name: '西 口', nameEn: 'West Exit', type: 'gate', carPosition: 3.5 }
        ],
        facilities: [
          { id: 'f-nt-d1', type: 'stairs', name: '東西連絡橋・改札階段', carNumber: 1, doorNumber: 3 },
          { id: 'f-nt-d2', type: 'elevator', name: '改札階行エレベーター', carNumber: 2, doorNumber: 2, direction: 'both' },
          { id: 'f-nt-d3', type: 'escalator', name: '改札階行エスカレーター', carNumber: 3, doorNumber: 1, direction: 'up' }
        ]
      },
      down: {

        trackNumber: '1・2',
        directionName: '仙台方面',
        gates: [
          { id: 'g-nt-1', name: '東 口', nameEn: 'East Exit', type: 'gate', carPosition: 1.5 },
          { id: 'g-nt-2', name: '西 口', nameEn: 'West Exit', type: 'gate', carPosition: 3.5 }
        ],
        facilities: [
          { id: 'f-nt-u1', type: 'stairs', name: '東西連絡橋・改札階段', carNumber: 1, doorNumber: 3 },
          { id: 'f-nt-u2', type: 'elevator', name: '改札階行エレベーター', carNumber: 2, doorNumber: 2, direction: 'both' },
          { id: 'f-nt-u3', type: 'escalator', name: '改札階行エスカレーター', carNumber: 3, doorNumber: 1, direction: 'up' }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 260, ic: 254 },
      'nagamachi': { ticket: 210, ic: 209 },
      'taishido': { ticket: 200, ic: 198 },
      'minami-sendai': { ticket: 160, ic: 157 },
      'natori': { ticket: 0, ic: 0 },
      'morisekinoshita': { ticket: 230, ic: 226 },
      'mitazono': { ticket: 310, ic: 304 },
      'sendai-airport': { ticket: 420, ic: 418 }
    }
  },
  {
    id: 'morisekinoshita',
    name: '杜せきのした',
    nameKana: 'もりせきのした',
    nameEn: 'Morisekinoshita',
    stationNumber: '06',
    hasTohokuJoban: false,
    transferLines: ['イオンモール名取直結', 'なとりん号'],
    transfers: [
      { id: 't-msn-1', type: 'bus', name: 'なとりん号', nameEn: 'Natoringo Bus' }
    ],
    platforms: {
      up: {

        trackNumber: '2',
        directionName: '仙台空港方面',
        gates: [
          { id: 'g-msn-1', name: 'イオンモール名取 連絡口', nameEn: 'Aeon Mall Natori', type: 'gate', carPosition: 1.4 },
          { id: 'g-msn-2', name: '改札口', nameEn: 'Ticket Gates', type: 'gate', carPosition: 2.2 }
        ],
        facilities: [
          { id: 'f-msn-d1', type: 'stairs', name: '改札口・イオン連絡通路階段', carNumber: 1, doorNumber: 2 },
          { id: 'f-msn-d2', type: 'elevator', name: '改札口行エレベーター', carNumber: 2, doorNumber: 1, direction: 'both' }
        ]
      },
      down: {

        trackNumber: '1',
        directionName: '仙台方面',
        gates: [
          { id: 'g-msn-1', name: 'イオンモール名取 連絡口', nameEn: 'Aeon Mall Natori', type: 'gate', carPosition: 1.4 },
          { id: 'g-msn-2', name: '改札口', nameEn: 'Ticket Gates', type: 'gate', carPosition: 2.2 }
        ],
        facilities: [
          { id: 'f-msn-u1', type: 'stairs', name: '改札口・イオン連絡通路階段', carNumber: 1, doorNumber: 2 },
          { id: 'f-msn-u2', type: 'elevator', name: '改札口行エレベーター', carNumber: 2, doorNumber: 1, direction: 'both' }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 440, ic: 434 },
      'nagamachi': { ticket: 420, ic: 414 },
      'taishido': { ticket: 390, ic: 384 },
      'minami-sendai': { ticket: 350, ic: 344 },
      'natori': { ticket: 230, ic: 226 },
      'morisekinoshita': { ticket: 0, ic: 0 },
      'mitazono': { ticket: 230, ic: 226 },
      'sendai-airport': { ticket: 310, ic: 304 }
    }
  },
  {
    id: 'mitazono',
    name: '美田園',
    nameKana: 'みたぞの',
    nameEn: 'Mitazono',
    stationNumber: '07',
    hasTohokuJoban: false,
    transferLines: [],
    transfers: [],
    platforms: {
      up: {

        trackNumber: '2',
        directionName: '仙台空港方面',
        gates: [
          { id: 'g-mt-1', name: '改札口', nameEn: 'Ticket Gates', type: 'gate', carPosition: 1.8 }
        ],
        facilities: [
          { id: 'f-mt-d1', type: 'elevator', name: '改札口行エレベーター', carNumber: 1, doorNumber: 3, direction: 'both' },
          { id: 'f-mt-d2', type: 'stairs', name: '改札口階段', carNumber: 2, doorNumber: 2 }
        ]
      },
      down: {

        trackNumber: '1',
        directionName: '仙台方面',
        gates: [
          { id: 'g-mt-1', name: '改札口', nameEn: 'Ticket Gates', type: 'gate', carPosition: 1.8 }
        ],
        facilities: [
          { id: 'f-mt-u1', type: 'elevator', name: '改札口行エレベーター', carNumber: 1, doorNumber: 3, direction: 'both' },
          { id: 'f-mt-u2', type: 'stairs', name: '改札口階段', carNumber: 2, doorNumber: 2 }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 540, ic: 534 },
      'nagamachi': { ticket: 490, ic: 484 },
      'taishido': { ticket: 460, ic: 454 },
      'minami-sendai': { ticket: 420, ic: 414 },
      'natori': { ticket: 310, ic: 304 },
      'morisekinoshita': { ticket: 230, ic: 226 },
      'mitazono': { ticket: 0, ic: 0 },
      'sendai-airport': { ticket: 230, ic: 226 }
    }
  },
  {
    id: 'sendai-airport',
    name: '仙台空港',
    nameKana: 'せんだいくうこう',
    nameEn: 'Sendai Airport',
    stationNumber: '08',
    hasTohokuJoban: false,
    transferLines: ['仙台空港ターミナルビル直結', 'なとりん号'],
    transfers: [
      { id: 't-ap-1', type: 'plane', name: '仙台空港旅客ターミナル（国内線・国際線）', nameEn: 'Flight Departures' },
      { id: 't-ap-2', type: 'bus', name: 'なとりん号', nameEn: 'Natoringo Bus' }
    ],
    platforms: {
      up: {

        trackNumber: '1・2',
        directionName: '当駅終着',
        gates: [
          { id: 'g-ap-1', name: '旅客ターミナル直結 改札口', nameEn: 'Airport Terminal Gates', type: 'gate', carPosition: 1.0 }
        ],
        facilities: [
          { id: 'f-ap-d1', type: 'gate', name: '改札口・旅客ターミナル連絡通路', carNumber: 1, doorNumber: 1, description: '1号車前方がそのまま改札口・出発フロアへ直結' },
          { id: 'f-ap-d2', type: 'elevator', name: '1F到着ロビー直通エレベーター', carNumber: 1, doorNumber: 2, direction: 'both' }
        ]
      },
      down: {

        trackNumber: '1・2',
        directionName: '名取・仙台方面',
        gates: [
          { id: 'g-ap-1', name: '旅客ターミナル直結 改札口', nameEn: 'Airport Terminal Gates', type: 'gate', carPosition: 1.0 }
        ],
        facilities: [
          { id: 'f-ap-u1', type: 'gate', name: '改札口・旅客ターミナル連絡通路', carNumber: 1, doorNumber: 1, description: 'ホーム先端が改札口直結（頭端式ホーム）' },
          { id: 'f-ap-u2', type: 'elevator', name: '1F到着ロビー直通エレベーター', carNumber: 1, doorNumber: 2, direction: 'both' },
          { id: 'f-ap-u3', type: 'restroom', name: '改札内多目的トイレ', carNumber: 1, doorNumber: 1 }
        ]
      }
    },
    fares: {
      'sendai': { ticket: 680, ic: 672 },
      'nagamachi': { ticket: 630, ic: 622 },
      'taishido': { ticket: 600, ic: 592 },
      'minami-sendai': { ticket: 560, ic: 552 },
      'natori': { ticket: 420, ic: 418 },
      'morisekinoshita': { ticket: 310, ic: 304 },
      'mitazono': { ticket: 230, ic: 226 },
      'sendai-airport': { ticket: 0, ic: 0 }
    }
  }
];

// 各駅の発車標モックデータ
export const MOCK_DEPARTURES: Record<string, { up: DepartureTrain[]; down: DepartureTrain[] }> = {
  'sendai': {
    up: [
      { id: 'tr-05', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '15:42', destination: '仙台空港', track: '3', cars: 4, status: 'normal', remarks: '始発' },
      { id: 'tr-06', trainNumber: '445M', line: 'tohoku', lineName: '東北本線', direction: 'up', trainType: '普通', departureTime: '15:49', destination: '白石', track: '4', cars: 4, status: 'normal' },
      { id: 'tr-07', trainNumber: '1337M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:08', destination: '仙台空港', track: '3', cars: 2, status: 'normal', remarks: '始発' },
      { id: 'tr-08', trainNumber: '253M', line: 'joban', lineName: '常磐線', direction: 'up', trainType: '普通', departureTime: '16:18', destination: '原ノ町', track: '4', cars: 6, status: 'normal' },
      { id: 'tr-09', trainNumber: '1339M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:35', destination: '仙台空港', track: '3', cars: 4, status: 'normal', remarks: '始発' }
    ],
    down: [
      { id: 'tr-01', trainNumber: '1336M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:38', destination: '当駅止り', track: '3', cars: 4, status: 'normal' },
      { id: 'tr-02', trainNumber: '446M', line: 'tohoku', lineName: '東北本線', direction: 'down', trainType: '普通', departureTime: '15:44', destination: '利府', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-03', trainNumber: '1338M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '16:04', destination: '当駅止り', track: '4', cars: 2, status: 'normal' },
      { id: 'tr-04', trainNumber: '254M', line: 'joban', lineName: '常磐線', direction: 'down', trainType: '普通', departureTime: '16:15', destination: '小牛田', track: '1', cars: 6, status: 'normal' },
    ]
  },
  'nagamachi': {
    up: [
      { id: 'tr-13', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '15:47', destination: '仙台空港', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-14', trainNumber: '445M', line: 'tohoku', lineName: '東北本線', direction: 'up', trainType: '普通', departureTime: '15:54', destination: '白石', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-15', trainNumber: '1337M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:13', destination: '仙台空港', track: '2', cars: 2, status: 'normal' }
    ],
    down: [
      { id: 'tr-10', trainNumber: '1336M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:32', destination: '仙台', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-11', trainNumber: '446M', line: 'tohoku', lineName: '東北本線', direction: 'down', trainType: '普通', departureTime: '15:39', destination: '利府', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-12', trainNumber: '1338M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:58', destination: '仙台', track: '1', cars: 2, status: 'normal' }
    ]
  },
  'taishido': {
    up: [
      { id: 'tr-22', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '15:49', destination: '仙台空港', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-23', trainNumber: '445M', line: 'tohoku', lineName: '東北本線', direction: 'up', trainType: '普通', departureTime: '15:56', destination: '白石', track: '2', cars: 4, status: 'normal' }
    ],
    down: [
      { id: 'tr-20', trainNumber: '1336M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:30', destination: '仙台', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-21', trainNumber: '446M', line: 'tohoku', lineName: '東北本線', direction: 'down', trainType: '普通', departureTime: '15:37', destination: '利府', track: '1', cars: 4, status: 'normal' }
    ]
  },
  'minami-sendai': {
    up: [
      { id: 'tr-32', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '15:52', destination: '仙台空港', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-33', trainNumber: '445M', line: 'tohoku', lineName: '東北本線', direction: 'up', trainType: '普通', departureTime: '15:59', destination: '白石', track: '1', cars: 4, status: 'normal' }
    ],
    down: [
      { id: 'tr-30', trainNumber: '1336M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:27', destination: '仙台', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-31', trainNumber: '446M', line: 'tohoku', lineName: '東北本線', direction: 'down', trainType: '普通', departureTime: '15:34', destination: '利府', track: '2', cars: 4, status: 'normal' }
    ]
  },
  'natori': {
    up: [
      { id: 'tr-43', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '15:56', destination: '仙台空港', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-44', trainNumber: '445M', line: 'tohoku', lineName: '東北本線', direction: 'up', trainType: '普通', departureTime: '16:03', destination: '白石', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-46', trainNumber: '253M', line: 'joban', lineName: '常磐線', direction: 'up', trainType: '普通', departureTime: '16:18', destination: '原ノ町', track: '1', cars: 6, status: 'normal' },
      { id: 'tr-45', trainNumber: '1337M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:22', destination: '仙台空港', track: '1', cars: 2, status: 'normal' }
    ],
    down: [
      { id: 'tr-40', trainNumber: '1336M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:23', destination: '仙台', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-41', trainNumber: '446M', line: 'tohoku', lineName: '東北本線', direction: 'down', trainType: '普通', departureTime: '15:30', destination: '利府', track: '3', cars: 4, status: 'normal' },
      { id: 'tr-42', trainNumber: '1338M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:49', destination: '仙台', track: '2', cars: 2, status: 'normal' }
    ]
  },
  'morisekinoshita': {
    up: [
      { id: 'tr-52', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:00', destination: '仙台空港', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-53', trainNumber: '1337M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:26', destination: '仙台空港', track: '2', cars: 2, status: 'normal' }
    ],
    down: [
      { id: 'tr-50', trainNumber: '1336M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:19', destination: '仙台', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-51', trainNumber: '1338M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:45', destination: '仙台', track: '1', cars: 2, status: 'normal' }
    ]
  },
  'mitazono': {
    up: [
      { id: 'tr-62', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:03', destination: '仙台空港', track: '2', cars: 4, status: 'normal' },
      { id: 'tr-63', trainNumber: '1337M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:29', destination: '仙台空港', track: '2', cars: 2, status: 'normal' }
    ],
    down: [
      { id: 'tr-60', trainNumber: '1336M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:16', destination: '仙台', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-61', trainNumber: '1338M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:42', destination: '仙台', track: '1', cars: 2, status: 'normal' }
    ]
  },
  'sendai-airport': {
    up: [
      { id: 'tr-73', trainNumber: '1335M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:07', destination: '当駅止り', track: '1', cars: 4, status: 'normal' },
      { id: 'tr-74', trainNumber: '1337M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'up', trainType: '普通', departureTime: '16:33', destination: '当駅止り', track: '2', cars: 2, status: 'normal' }
    ],
    down: [
      { id: 'tr-70', trainNumber: '1338M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '15:38', destination: '仙台', track: '1', cars: 2, status: 'normal', remarks: '当駅始発' },
      { id: 'tr-71', trainNumber: '1340M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '16:06', destination: '仙台', track: '2', cars: 4, status: 'normal', remarks: '当駅始発' },
      { id: 'tr-72', trainNumber: '1342M', line: 'saal', lineName: '仙台空港アクセス線', direction: 'down', trainType: '普通', departureTime: '16:32', destination: '仙台', track: '1', cars: 2, status: 'normal', remarks: '当駅始発' }
    ]
  }
};

// 路線図上の走行中列車モックデータ
export const INITIAL_MOVING_TRAINS: MovingTrain[] = [
  {
    id: 'mv-down-1',
    trainNumber: '1335M',
    line: 'saal',
    direction: 'down',
    currentStationId: 'sendai',
    nextStationId: 'nagamachi',
    progress: 0.6,
    destination: '仙台空港',
    cars: 4,
    isAtStation: false,
  },
  {
    id: 'mv-up-1',
    trainNumber: '1336M',
    line: 'saal',
    direction: 'up',
    currentStationId: 'natori',
    nextStationId: 'minami-sendai',
    progress: 0.4,
    destination: '仙台',
    cars: 4,
    isAtStation: false,
  },
  {
    id: 'mv-down-tohoku',
    trainNumber: '445M',
    line: 'tohoku',
    direction: 'down',
    currentStationId: 'taishido',
    nextStationId: 'minami-sendai',
    progress: 0.1,
    destination: '白石',
    cars: 4,
    isAtStation: true,
  },
  {
    id: 'mv-up-2',
    trainNumber: '1338M',
    line: 'saal',
    direction: 'up',
    currentStationId: 'sendai-airport',
    nextStationId: 'mitazono',
    progress: 0.05,
    destination: '仙台',
    cars: 2,
    isAtStation: true,
  }
];
