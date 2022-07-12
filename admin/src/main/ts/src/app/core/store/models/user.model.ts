import {UserDetailsModel} from './userdetails.model';

export interface Classe {
    id: string;
    name: string;
    externalId: string;
}

export class UserModel {

    constructor() {
        // super({
        //     create: '/directory/api/user',
        //     delete: '/directory/user'
        // });
        this.userDetails = new UserDetailsModel();
    }

    private _id: string;
    get id() {
        return this._id;
    }

    set id(id) {
        this._id = id;
        this.userDetails.id = id;
    }

    type: string;
    code: string;
    login: string;
    firstName: string;
    lastName: string;
    displayName: string;
    source: string;
    blocked: boolean;
    aafFunctions: Array<Array<string>> = [];
    functionalGroups: string[] = [];
    manualGroups: string[] = [];
    functions?: Array<[string, Array<string>]> = [];
    structures: { id: string, name: string, externalId: string }[] = [];
    classes: Classe[] = [];
    duplicates: { id: string, firstName: string, lastName: string, code: string, score: number, structures: { id: string, name: string }[] }[] = [];
    deleteDate?: number;
    disappearanceDate?: number;

    userDetails: UserDetailsModel;
}
