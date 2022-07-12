import {UserModel} from './user.model';

export type InternalCommunicationRule = 'BOTH' | 'INCOMING' | 'OUTGOING' | 'NONE';

export type GroupType = 'ProfileGroup' | 'FunctionalGroup' | 'ManualGroup' | 'CommunityGroup' | 'FunctionGroup' | 'HTGroup' | 'DirectionGroup' | 'BroadcastGroup';

export class GroupModel {
    id?: string;
    name?: string;
    autolinkTargetAllStructs: boolean;
    autolinkTargetStructs: string[];
    autolinkUsersFromGroups: string[];
    readonly nbUsers?: number;  // A server-side job computes this value periodically.
    displayName?: string;
    type?: GroupType;
    subType?: string;
    labels?: Array<string>;
    classes?: { id: string, name: string }[];
    structures?: { id: string, name: string }[];
    filter?: string;
    structureId?: string;
    lockDelete?:boolean;
    users: UserModel[];
    internalCommunicationRule?: InternalCommunicationRule;
    roles?: string[];
    mandatory?: boolean; // épinglage de widget

    constructor() {
        this.users = new Array<UserModel>();
    }
}
