import json

with open('/tmp/clean_jis.json') as f:
    data = json.load(f)

stairs_paths = data['stairs']
escalator_up_paths = data['escalator_up']
escalator_down_paths = data['escalator_down']
elevator_paths = data['elevator']
tickets_paths = data['tickets']
toilets_paths = data['toilets']
accessible_paths = data['accessible']
baggage_paths = data['baggage']
railway_paths = data['railway']
bus_paths = data['bus']
airplane_paths = data['airplane']
staff_paths = data['station_staff']

def render_paths(paths):
    body_paths = paths[1:]
    lines = []
    for p in body_paths:
        d = p['d']
        tr = f' transform="{p["transform"]}"' if p["transform"] else ''
        if p['is_white']:
            lines.append(f'      <path d="{d}" fill="#ffffff"{tr} />')
        else:
            lines.append(f'      <path d="{d}" fill={{color}}{tr} fillRule="nonzero" />')
    return '\n'.join(lines)

# 1. JisStairs.tsx
with open('src/components/icons/JisStairs.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5131: 階段）公式ベクターデータ準拠
 */
export const JisStairs: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="階段（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{stairs_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(stairs_paths)}
    </svg>
  );
}};
''')

# 2. JisEscalator.tsx
with open('src/components/icons/JisEscalator.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5129: 上りエスカレーター / 5130: 下りエスカレーター）公式ベクターデータ準拠
 */
export const JisEscalator: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  direction = 'up',
  showFrame = false,
  ...props
}}) => {{
  const isDown = direction === 'down';

  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label={{isDown ? '下りエスカレーター（JIS Z 8210）' : '上りエスカレーター（JIS Z 8210）'}}
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{escalator_up_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
      {{isDown ? (
        <g>
{render_paths(escalator_down_paths)}
        </g>
      ) : (
        <g>
{render_paths(escalator_up_paths)}
        </g>
      )}}
    </svg>
  );
}};
''')

# 3. JisElevator.tsx
with open('src/components/icons/JisElevator.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5127: エレベーター）公式ベクターデータ準拠
 */
export const JisElevator: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="エレベーター（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{elevator_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(elevator_paths)}
    </svg>
  );
}};
''')

# 4. JisTicketGate.tsx (改札口: JIS Z 8210 5218 駅事務室・有人改札口 / 5116 改札精算公式準拠)
with open('src/components/icons/JisTicketGate.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5218: 改札口・駅事務室・駅係員）公式ベクターデータ準拠
 */
export const JisTicketGate: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601 60.601"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="改札口（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{staff_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(staff_paths)}
    </svg>
  );
}};
''')

# 5. JisTicketVending.tsx (きっぷうりば／精算所: JIS 5116)
with open('src/components/icons/JisTicketVending.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5116: きっぷうりば／精算所）公式ベクターデータ準拠
 */
export const JisTicketVending: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="きっぷうりば・精算所（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{tickets_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(tickets_paths)}
    </svg>
  );
}};
''')

# 6. JisRestroom.tsx (一般トイレ JIS 5106 / バリアフリー JIS 5109)
with open('src/components/icons/JisRestroom.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5106: お手洗 / 5109: バリアフリー設備）公式ベクターデータ準拠
 */
export const JisRestroom: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  variant = 'general',
  showFrame = false,
  ...props
}}) => {{
  const isAccessible = variant === 'accessible';

  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label={{isAccessible ? '多機能トイレ（JIS Z 8210）' : 'お手洗（JIS Z 8210）'}}
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{toilets_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
      {{isAccessible ? (
        <g>
{render_paths(accessible_paths)}
        </g>
      ) : (
        <g>
{render_paths(toilets_paths)}
        </g>
      )}}
    </svg>
  );
}};
''')

# 7. JisBaggage.tsx (手荷物一時預かり所・荷物置場 JIS 5117)
with open('src/components/icons/JisBaggage.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5117: 手荷物一時預かり所・荷物置場）公式ベクターデータ準拠
 */
export const JisBaggage: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="手荷物・荷物置場（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{baggage_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(baggage_paths)}
    </svg>
  );
}};
''')

# 8. JisTrain.tsx (鉄道・鉄道駅 JIS 5202)
with open('src/components/icons/JisTrain.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5202: 鉄道・鉄道駅）公式ベクターデータ準拠
 */
export const JisTrain: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="鉄道・電車（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{railway_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(railway_paths)}
    </svg>
  );
}};
''')

# 9. JisSubway.tsx (地下鉄: JIS 5202 鉄道駅準拠)
with open('src/components/icons/JisSubway.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5202: 鉄道／地下鉄）公式ベクターデータ準拠
 */
export const JisSubway: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="地下鉄（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{railway_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(railway_paths)}
    </svg>
  );
}};
''')

# 10. JisBus.tsx (バス・バスのりば JIS 5205)
with open('src/components/icons/JisBus.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5205: バス・バスのりば）公式ベクターデータ準拠
 */
export const JisBus: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="バス（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{bus_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(bus_paths)}
    </svg>
  );
}};
''')

# 11. JisAirplane.tsx (航空機・空港 JIS 5201)
with open('src/components/icons/JisAirplane.tsx', 'w') as f:
    f.write(f'''import React from 'react';
import {{ JisIconProps }} from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5201: 航空機・空港）公式ベクターデータ準拠
 */
export const JisAirplane: React.FC<JisIconProps> = ({{
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}}) => {{
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={{size}}
      height={{size}}
      className={{`shrink-0 select-none ${{className}}`}}
      aria-label="航空機・空港（JIS Z 8210）"
      {{...props}}
    >
      {{showFrame && (
        <path
          d="{airplane_paths[0]['d']}"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}}
{render_paths(airplane_paths)}
    </svg>
  );
}};
''')

print('All 11 JIS Z 8210 React components successfully generated!')
