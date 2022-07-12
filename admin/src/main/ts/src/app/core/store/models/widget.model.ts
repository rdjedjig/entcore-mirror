import { RoleModel } from "./role.model";

export class WidgetModel {
    id: string;
    name: string;
    displayName: string;
    application: {
        address: string, 
        name: string,
        id: string, 
        strongLink: boolean
    };
    i18n: string;
    js: string;
    locked: boolean;
    path: string;

    roles: Array<RoleModel>;
    levelsOfEducation: Array<number>;
}