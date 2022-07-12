import { UserCollection } from '../collections/user.collection';
import { GroupCollection } from '../collections/group.collection';
import { SubjectCollection } from '../collections/subject.collection';
import { ApplicationCollection } from '../collections/application.collection';
import { ConnectorCollection } from '../collections/connector.collection';
import { WidgetCollection } from '../collections/widget.collection';

export type ClassModel = { id: string, name: string };

export class StructureModel {
    UAI?: string;
    externalId?: string;
    name?: string;
    parents?: Array<{ id: string, name: string }>;
    children?: StructureModel[];
    users: UserCollection;
    removedUsers: UserCollection;
    classes: Array<ClassModel> = [];
    groups: GroupCollection;
    subjects: SubjectCollection;
    applications: ApplicationCollection;
    connectors: ConnectorCollection;
    widgets: WidgetCollection;
    userSources: string[] = [];
    source?: string;
    profiles: { name: string, blocked: any }[] = [];
    aafFunctions: Array<Array<Array<string>>> = [];
    levelsOfEducation: number[] = [];
    distributions: string[];
    timetable: string;
    punctualTimetable?: string;
    hasApp?: boolean;
    manualName?: boolean;
    feederName?: string;

    constructor() {
        this.users = new UserCollection();
        this.removedUsers = new UserCollection("/directory/structure/:structureId/removedUsers");
        this.groups = new GroupCollection();
        this.subjects = new SubjectCollection();
        this.applications = new ApplicationCollection();
        this.connectors = new ConnectorCollection();
        this.widgets = new WidgetCollection();
    }

    _id?: string;
    set id(id: string) {
        this.users.structureId = id;
        this.removedUsers.structureId = id;
        this.groups.structureId = id;
        this.subjects.structureId = id;
        this.applications.structureId = id;
        this.connectors.structureId = id;
        this._id = id;
    }

    get id() {
        return this._id;
    }

    static AUTOMATIC_SOURCES_REGEX = /AAF/;
    get isSourceAutomatic() {
        return this.source && StructureModel.AUTOMATIC_SOURCES_REGEX.test(this.source);
    }
}
