import { RoleModel } from './role.model';

export type AppType = 'END_USER' | 'SYSTEM' | 'WIDGET';

export class ApplicationModel {

    id: string;
    name: string;
    displayName: string;
    roles: RoleModel[];
    levelsOfEducation: number[];
    appType: AppType;
    icon: string;
    isExternal: boolean;

    constructor() {
        this.roles = [];
    }
}
