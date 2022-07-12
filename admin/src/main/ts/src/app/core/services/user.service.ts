import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { globalStore } from "../store/global.store";
import { Classe, UserModel } from "../store/models/user.model";
import { GroupModel } from "../store/models/group.model";
import { UserDetailsService } from "./userDetails.service";

@Injectable()
export class UserService {

    constructor(private httpClient: HttpClient,
        private userDetailsService: UserDetailsService) {}

    visibleStructures(user: UserModel) {
        return user.structures.filter(structure => globalStore.structures.data
            .find(manageableStructure => manageableStructure.id === structure.id));
    }

    invisibleStructures(user: UserModel) {
        return user.structures.filter(structure => globalStore.structures.data
            .every(manageableStructure => manageableStructure.id !== structure.id));
    }

    addStructure(user: UserModel, structureId: string) {
        return this.httpClient.put(`/directory/structure/${structureId}/link/${user.id}`, {})
            .subscribe(() => {
                const targetStructure = globalStore.structures.data.find(s => s.id === structureId);
                if (targetStructure) {
                    user.structures.push({id: targetStructure.id, name: targetStructure.name, externalId: null});
                    if (targetStructure.users.data.length > 0)
                    {
                        targetStructure.users.data.push(user);
                        targetStructure.removedUsers.data = targetStructure.removedUsers.data
                            .filter(u => u.id !== user.id);
                    }

                    this.userDetailsService.unremoveFromStructure(user.userDetails, targetStructure);
                }
            });
    }

    removeStructure(user: UserModel, structureId: string) {
        return this.httpClient.delete(`/directory/structure/${structureId}/unlink/${user.id}`)
            .subscribe(() => {
                user.structures = user.structures.filter(s => s.id !== structureId);
                const targetStructure = globalStore.structures.data.find(s => s.id === structureId);
                if (targetStructure)
                {
                    if(targetStructure.users.data.length > 0)
                    {
                        targetStructure.users.data = targetStructure.users.data
                            .filter(u => u.id !== user.id);
                        targetStructure.removedUsers.data.push(user);
                    }
                    this.userDetailsService.removeFromStructure(user.userDetails, targetStructure);
                }
            });
    }

    addClass(user: UserModel, classe: Classe) {
        return this.httpClient.put(`/directory/class/${classe.id}/link/${user.id}`, {})
            .subscribe(() => {
                user.classes.push(classe);
            });
    }

    removeClass(user: UserModel, classId: string, externalId: string) {
        return this.httpClient.delete(`/directory/class/${classId}/unlink/${user.id}`)
            .subscribe(() => {
                user.classes = user.classes.filter(c => c.id !== classId);
                if (user.userDetails.headTeacherManual) {
                    user.userDetails.headTeacherManual
                        .splice(user.userDetails.headTeacherManual.findIndex((f) => f === externalId), 1);
                }
            });
    }

    addManualGroup(user: UserModel, group: GroupModel) {
        return this.httpClient.post(`/directory/user/group/${user.id}/${group.id}`, {})
            .subscribe(() => {
                user.manualGroups.push(group.name);
                user.userDetails.manualGroups.push(group);
            });
    }

    removeManualGroup(user: UserModel, group: GroupModel) {
        return this.httpClient.delete(`/directory/user/group/${user.id}/${group.id}`)
            .subscribe(() => {
                user.manualGroups = user.manualGroups.filter(mg => mg === group.name);
                user.userDetails.manualGroups = user.userDetails.manualGroups
                    .filter(mg => group.id !== mg.id);
            });
    }

    addFunctionalGroup(user: UserModel, group: GroupModel) {
        return this.httpClient.post(`/directory/user/group/${user.id}/${group.id}`, {})
            .subscribe(() => {
                user.functionalGroups.push(group.name);
                user.userDetails.functionalGroups.push(group);
            });
    }

    removeFunctionalGroup(user: UserModel, group: GroupModel) {
        return this.httpClient.delete(`/directory/user/group/${user.id}/${group.id}`)
            .subscribe(() => {
                user.functionalGroups = user.functionalGroups.filter(fg => fg === group.name);
                user.userDetails.functionalGroups = user.userDetails.functionalGroups
                    .filter(fg => group.id !== fg.id);
            });
    }

    mergeDuplicate(user: UserModel, duplicateId: string) {
        return this.httpClient.put(`/directory/duplicate/merge/${user.id}/${duplicateId}`, {})
            .subscribe(async () => {
                const duplicate = user.duplicates.find(d => d.id === duplicateId);
                user.duplicates = user.duplicates.filter(d => d.id !== duplicateId);
                try {
                    await user.userDetails.sync();
                    return {id: user.id};
                } catch (e) {
                    return {id: duplicate.id, structure: duplicate.structures[0]};
                }
            })
    }

    separateDuplicate(user: UserModel, duplicateId: string) {
        return this.httpClient.delete(`/directory/duplicate/ignore/${this.id}/${duplicateId}`).
            subscribe(() => {
                const duplicate = user.duplicates.find(d => d.id === duplicateId);
                duplicate.structures.forEach(duplicatedStructure => {
                    const structure = globalStore.structures.data.find(struct => struct.id === duplicatedStructure.id);
                    if (structure && structure.users.data.length > 0) {
                        const user = structure.users.data.find(rUser => rUser.id === duplicateId);
                        if (user) { user.duplicates = user.duplicates.filter(d => d.id !== user.id); }
                    }
                });
                user.duplicates = user.duplicates.filter(d => d.id !== duplicateId);
            });
    }

    createNewUser(user: UserModel, structureId: string) {
        const userPayload = new window.URLSearchParams();

        userPayload.append('firstName', user.firstName.trim());
        userPayload.append('lastName', user.lastName.trim());
        userPayload.append('type', user.type);
        if (user.classes && user.classes.length > 0) {
            userPayload.append('classId', user.classes[0].id);
        }
        userPayload.append('structureId', structureId);
        userPayload.append('birthDate', user.userDetails.birthDate);
        user.userDetails.children.forEach(child => userPayload.append('childrenIds', child.id));

        return this.httpClient.post('/directory/api/user'
            , userPayload
            , {headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'}});
    }

    restore(user: UserModel) {
        return this.httpClient.put('/directory/restore/user', null, {params: {userId: user.id}})
            .subscribe(() => {
                user.deleteDate = null;
                user.disappearanceDate = null;
            });
    }

    visibleRemovedStructures(user: UserModel) {
        let rmStructs = user.userDetails.removedFromStructures != null ? user.userDetails.removedFromStructures : [];
        return globalStore.structures.data.filter(struct => rmStructs.indexOf(struct.externalId) != -1);
    }
}