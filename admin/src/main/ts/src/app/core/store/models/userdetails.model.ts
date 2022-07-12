import {GroupModel} from '../../store/models/group.model';

export class UserDetailsModel {

    constructor() {
        // super({
        //     sync: '/directory/user/:id?manual-groups=true',
        //     update: '/directory/user/:id'
        // });
    }

    id?: string;
    activationCode?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    externalId?: string;
    created?: string;
    modified?: string;
    lastLogin?: string;
    source?: string;
    email?: string;
    birthDate?: string;
    oldemail?: string;
    login?: string;
    blocked?: boolean;
    zipCode: string;
    city: string;
    address: string;
    homePhone: string;
    mobile?: string;
    profiles: Array<String> = [];
    type?: Array<string>;
    functions?: Array<[string, Array<string>]>;
    teaches: boolean;
    headTeacher?: Array<string>;
    headTeacherManual?: Array<string>;
    direction?: Array<string>;
    directionManual?: Array<string>;
    children?: Array<{id: string, firstName: string, lastName: string, displayName: string, externalId: string}>;
    parents?: Array<{id: string, firstName: string, lastName: string, displayName: string, externalId: string}>;
    functionalGroups?: GroupModel[];
    manualGroups?: GroupModel[];
    administrativeStructures?: Array<string>;
    mergeKey?: string;
    mergedLogins?: Array<string>;
    mergedWith?: string;
    loginAlias?: string;
    quota?: number;
    storage?: number;
    maxQuota?: number;
    structureNodes?: Array<any>;
    removedFromStructures?: Array<String>;

    // toJSON() {
    //     return {
    //         firstName:      this.firstName,
    //         lastName:       this.lastName,
    //         displayName:    this.displayName,
    //         birthDate:      this.birthDate,
    //         address:        this.address,
    //         city:           this.city,
    //         zipCode:        this.zipCode,
    //         email:          this.email,
    //         homePhone:      this.homePhone,
    //         mobile:         this.mobile
    //     };
    // }
}
