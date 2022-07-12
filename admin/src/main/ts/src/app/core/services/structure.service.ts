import { HttpClient } from '@angular/common/http';
import { ClassModel, StructureModel } from '../store/models/structure.model';

export class StructureService {
    constructor(private http: HttpClient) {}

    quickSearchUsers(structure: StructureModel, input: string) {
        return this.http.get(`/directory/structure/${structure.id}/quicksearch/users`, {
            params: {input}
        });
    }

    syncClasses(structure: StructureModel, force?: boolean) {
        if (structure.classes.length < 1 || force === true) {
            return this.http.get('/directory/class/admin/list', {params: {structureId: structure.id}})
                .subscribe((res: Array<ClassModel>) => structure.classes = res);
        }
        return Promise.resolve();
    }

    syncGroups(structure: StructureModel, force?: boolean) {
        if (structure.groups.data.length < 1 || force === true) {
            return structure.groups.sync().then(() => Promise.resolve(structure.groups));
        }
        return Promise.resolve();
    }

    syncSubjects(structure: StructureModel, force?: boolean) {
        if (structure.subjects.data.length < 1 || force === true) {
            return structure.subjects.sync().then(() => Promise.resolve(structure.subjects));
        }
        return Promise.resolve();
    }

    syncSources(structure: StructureModel, force?: boolean) {
        if (structure.userSources.length < 1 || force === true) {
            return this.http.get(`/directory/structure/${structure.id}/sources`)
                .subscribe((res: Array<{'sources': Array<string>}>) => structure.userSources = res[0].sources);
        }
        return Promise.resolve();
    }

    syncAafFunctions(structure: StructureModel, force?: boolean) {
        if (structure.aafFunctions.length < 1 || force === true) {
            return this.http.get(`/directory/structure/${structure.id}/aaffunctions`)
                .subscribe((res: Array<{'aafFunctions': Array<Array<Array<string>>>}>) => structure.aafFunctions = res[0].aafFunctions);
        }
        return Promise.resolve();
    }

    is1D(structure: StructureModel): boolean {
        return structure.levelsOfEducation.indexOf(1) != -1;
    }

    is2D(structure: StructureModel): boolean {
        return structure.levelsOfEducation.indexOf(2) != -1;
    }
}