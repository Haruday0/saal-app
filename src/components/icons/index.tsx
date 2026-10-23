import React from 'react';
import { JisIconProps } from './types';
import { JisStairs } from './JisStairs';
import { JisEscalator } from './JisEscalator';
import { JisElevator } from './JisElevator';
import { JisTicketGate } from './JisTicketGate';
import { JisTicketVending } from './JisTicketVending';
import { JisRestroom } from './JisRestroom';
import { JisBaggage } from './JisBaggage';
import { JisTrain } from './JisTrain';
import { JisSubway } from './JisSubway';
import { JisBus } from './JisBus';
import { JisAirplane } from './JisAirplane';

export * from './types';
export {
  JisStairs,
  JisEscalator,
  JisElevator,
  JisTicketGate,
  JisTicketVending,
  JisRestroom,
  JisBaggage,
  JisTrain,
  JisSubway,
  JisBus,
  JisAirplane,
};

export type JisIconName =
  | 'stairs'
  | 'stairs_up'
  | 'stairs_down'
  | 'escalator'
  | 'escalator_up'
  | 'escalator_down'
  | 'elevator'
  | 'gate'
  | 'ticket_gate'
  | 'ticket_vending'
  | 'ticket'
  | 'restroom'
  | 'toilet'
  | 'accessible_toilet'
  | 'baggage'
  | 'luggage'
  | 'train'
  | 'subway'
  | 'bus'
  | 'airplane'
  | 'flight';

export interface DynamicJisIconProps extends JisIconProps {
  name: JisIconName | string;
}

/**
 * JIS Z 8210 案内用図記号（動的ディスパッチャーコンポーネント）
 */
export const JisIcon: React.FC<DynamicJisIconProps> = ({ name, direction, variant, ...props }) => {
  switch (name) {
    case 'stairs':
      return <JisStairs direction={direction || 'up'} {...props} />;
    case 'stairs_up':
      return <JisStairs direction="up" {...props} />;
    case 'stairs_down':
      return <JisStairs direction="down" {...props} />;

    case 'escalator':
      return <JisEscalator direction={direction || 'up'} {...props} />;
    case 'escalator_up':
      return <JisEscalator direction="up" {...props} />;
    case 'escalator_down':
      return <JisEscalator direction="down" {...props} />;

    case 'elevator':
      return <JisElevator {...props} />;

    case 'gate':
    case 'ticket_gate':
      return <JisTicketGate {...props} />;

    case 'ticket_vending':
    case 'ticket':
      return <JisTicketVending {...props} />;

    case 'restroom':
    case 'toilet':
      return <JisRestroom variant={variant || 'general'} {...props} />;
    case 'accessible_toilet':
      return <JisRestroom variant="accessible" {...props} />;

    case 'baggage':
    case 'luggage':
      return <JisBaggage {...props} />;

    case 'train':
      return <JisTrain {...props} />;

    case 'subway':
      return <JisSubway {...props} />;

    case 'bus':
      return <JisBus {...props} />;

    case 'airplane':
    case 'flight':
      return <JisAirplane {...props} />;

    default:
      return <JisTrain {...props} />;
  }
};
