import {GroupModel} from './group.model';

export type RoleActionModel = {
    name: string;
    displayName: string;
    type: string;
}

export class RoleModel {
    id: string;
    name: string;
    groups: GroupModel[];
    transverse: boolean;
    subStructures: string[];
    distributions: string[];
}
