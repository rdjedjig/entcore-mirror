import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { UserDetailsModel } from "../store/models/userdetails.model";
import { StructureModel } from "../store/models/structure.model";
import { globalStore } from "../store/global.store";
import { Observable } from "rxjs";
import { StructureService } from "./structure.service";

export enum UserProfiles
{
    Student = "Student",
    Relative = "Relative",
    Teacher = "Teacher",
    Personnel = "Personnel",
    Guest = "Guest"
}

@Injectable()
export class UserDetailsService {
  
    constructor(private http: HttpClient,
        private structureService: StructureService) {}

    fetch(userId: string): Observable<UserDetailsModel> {
        return this.http.get<UserDetailsModel>(`/directory/user/${userId}?manual-groups=true`);
    }

    toggleBlock(userDetails: UserDetailsModel) {
        return this.http.put(`/auth/block/${userDetails.id}`, { block: !userDetails.blocked }).
            subscribe(() => {
                userDetails.blocked = !userDetails.blocked;
            });
    }

    sendResetPassword(userDetails: UserDetailsModel, dest: {type: string, value: string}) {
        const payload = new window.URLSearchParams();
        payload.append('login', userDetails.login);
        if (dest.type === 'email') {
            payload.append('email', dest.value);
        } else if (dest.type === 'mobile') {
            payload.append('mobile', dest.value);
        }

        return this.http.post('/auth/sendResetPassword', payload);
    }

    sendIndividualMassMail(userDetails: UserDetailsModel, type: string) {
        return this.http.get(`/directory/structure/massMail/${userDetails.id}/${type}`, {responseType: 'blob'});
    }

    addRelative(userDetails: UserDetailsModel, parent) {
        return this.http.put(`/directory/user/${userDetails.id}/related/${parent.id}`, {}).subscribe(() => {
            userDetails.parents.push(parent);
        });
    }

    removeRelative(userDetails: UserDetailsModel, parent) {
        return this.http.delete(`/directory/user/${userDetails.id}/related/${parent.id}`).subscribe(() => {
            userDetails.parents = userDetails.parents.filter(p => p.id !== parent.id);
        });
    }

    addChild(userDetails: UserDetailsModel, child) {
        return this.http.put(`/directory/user/${child.id}/related/${userDetails.id}`, {}).subscribe(() => {
            userDetails.children.push(child);
        });
    }

    removeChild(userDetails: UserDetailsModel, child) {
        return this.http.delete(`/directory/user/${child.id}/related/${userDetails.id}`).subscribe(() => {
            userDetails.children = userDetails.children.filter(c => c.id !== child.id);
        });
    }

    deletePhoto(userDetails: UserDetailsModel) {
        return this.http.put(`/directory/userbook/${userDetails.id}`, {picture: ''});
    }

    userMotto(userDetails: UserDetailsModel) {
        return this.http.get(`/directory/userbook/${userDetails.id}`);
    }

    deleteUserMotto(userDetails: UserDetailsModel) {
        return this.http.put(`/directory/userbook/${userDetails.id}`, {motto: ''});
    }

    addHeadTeacherManual(userDetails: UserDetailsModel, structureId: string, structureExternalId: string, classe: any) {
        const relationToAdd = classe.externalId;
        return this.http.post(`/directory/${structureId}/user/${userDetails.id}/headteacher`, {
            classExternalId: relationToAdd,
            structureExternalId
        }).subscribe(async (res) => {
            if (userDetails.headTeacherManual === undefined) {
                userDetails.headTeacherManual = [];
            }
            userDetails.headTeacherManual.push(relationToAdd);
        });
    }

    updateHeadTeacherManual(userDetails: UserDetailsModel, structureId: string, structureExternalId: string, classe: any) {
        const relationToRemove = classe.externalId;
        return this.http.put(`/directory/${structureId}/user/${userDetails.id}/headteacher`, {
            classExternalId: relationToRemove,
            structureExternalId
        }).subscribe(() => {
            userDetails.headTeacherManual.splice(userDetails.headTeacherManual.findIndex((f) => f === relationToRemove), 1);
        });
    }

    addDirectionManual(userDetails: UserDetailsModel, structureId: string, structureExternalId: string) {
        return this.http.post(`/directory/${structureId}/user/${userDetails.id}/direction`, {
            structureExternalId
        }).subscribe(async (res) => {
            if (userDetails.directionManual === undefined) {
                userDetails.directionManual = [];
            }
            userDetails.directionManual.push(structureExternalId);
        });
    }

    removeDirectionManual(userDetails: UserDetailsModel, structureId: string, structureExternalId: string) {
        return this.http.put(`/directory/${structureId}/user/${userDetails.id}/direction`, {
            structureExternalId
        }).subscribe(() => {
            userDetails.directionManual.splice(userDetails.directionManual.findIndex((f) => f === structureExternalId), 1);
        });
    }

    addAdml(userDetails: UserDetailsModel, structureId) {
        return this.http.post(`/directory/user/function/${userDetails.id}`, {
            functionCode: 'ADMIN_LOCAL',
            inherit: 's',
            scope:  userDetails.functions.find((f) => f[0] === 'ADMIN_LOCAL') == null ? [structureId] : userDetails.functions.find((f) => f[0] === 'ADMIN_LOCAL')[1].concat(structureId)
        }).subscribe(() => {
            this.http.get(`/directory/user/${userDetails.id}/functions`).subscribe((rRes: {'functions': Array<[string, Array<string>]>}) => {
                userDetails.functions = rRes.functions;
            });
        });
    }


    removeAdml(subscribe: UserDetailsModel) {
        return this.http.delete(`/directory/user/function/${subscribe.id}/ADMIN_LOCAL`).subscribe(() => {
            subscribe.functions.splice(subscribe.functions.findIndex((f) => f[0] === 'ADMIN_LOCAL'), 1);
        });
    }

    isAdml(userDetails: UserDetailsModel, structureId?: string) {
        if (userDetails.functions && userDetails.functions.length > 0) {
            const admlIndex = userDetails.functions.findIndex((f) => f[0] === 'ADMIN_LOCAL');
            if (admlIndex >= 0) {
                return userDetails.functions[admlIndex][1].includes(structureId);
            }
        }
    }

    isAdmc(userDetails: UserDetailsModel) {
        return userDetails.functions && userDetails.functions.find((f) => f[0] === 'SUPER_ADMIN');
    }

    hasStudentProfile(userDetails: UserDetailsModel): boolean {
        return userDetails.profiles.indexOf(UserProfiles.Student) != -1;
    }

    hasRelativeProfile(userDetails: UserDetailsModel): boolean {
        return userDetails.profiles.indexOf(UserProfiles.Relative) != -1;
    }

    hasTeacherProfile(userDetails: UserDetailsModel): boolean {
        return userDetails.profiles.indexOf(UserProfiles.Teacher) != -1;
    }

    hasPersonnelProfile(userDetails: UserDetailsModel): boolean {
        return userDetails.profiles.indexOf(UserProfiles.Personnel) != -1;
    }

    hasGuestProfile(userDetails: UserDetailsModel): boolean {
        return userDetails.profiles.indexOf(UserProfiles.Guest) != -1;
    }

    /**
     * Détermine si l'utilisateur n'est pas un ensseignant ou professeur principal venant de l'AAF
     * @param {string} structureExternalId
     * @param {String} classeName
     * @returns {boolean}
     */
    isNotTeacherOrHeadTeacher(userDetails: UserDetailsModel, structureExternalId: string, classe: any) {

        if (!this.hasTeacherProfile(userDetails)) {
            return true;
        }

        if (userDetails.headTeacher && userDetails.headTeacher.length > 0) {
            const headTeacherIndex = userDetails.headTeacher.findIndex((f) => f === classe.externalId);
            return (headTeacherIndex >= 0);
        } else {
            return false;
        }
    }

    /**
     * Détermine si l'utilisateur est ensseignant et professeur principal venant de l'AAF
     * @param {string} structureExternalId
     * @param {String} classeName
     * @returns {boolean}
     */
    isTeacherAndHeadTeacherFromAAF(userDetails: UserDetailsModel, structureExternalId: string, classe: any) {
        if (userDetails.teaches === undefined) {
            return false;
        }

        if (userDetails.headTeacher && userDetails.headTeacher.length > 0) {
            const headTeacherIndex = userDetails.headTeacher.findIndex((f) => f === classe.externalId);
            return (headTeacherIndex >= 0);
        } else {
            return false;
        }
    }

    isHeadTeacherManual(userDetails: UserDetailsModel,  classe: any) {
        if (userDetails.headTeacherManual && userDetails.headTeacherManual.length > 0) {
            const headTeacherManuelIndex = userDetails.headTeacherManual.findIndex((f) => f === classe.externalId);
            return (headTeacherManuelIndex >= 0);
        } else {
            return false;
        }
    }

    /**
     * Détermine si l'utilisateur est directeur venant de l'AAF
     * @param {string} structureExternalId
     * @returns {boolean}
     */
    isDirectionFromAAF(userDetails: UserDetailsModel, structureExternalId: string) {
        if (userDetails.direction && userDetails.direction.length > 0) {
            const directionIndex = userDetails.direction.findIndex((f) => f === structureExternalId);
            return (directionIndex >= 0);
        } else {
            return false;
        }
    }

    isEligibleForDirection(userDetails: UserDetailsModel, structure: StructureModel)
    {
        return (this.hasTeacherProfile(userDetails) || this.hasPersonnelProfile(userDetails)) && 
            this.structureService.is1D(globalStore.structures.get(structure.id));
    }

    isDirectionManual(userDetails: UserDetailsModel, structureExternalId: string) {
        if (userDetails.directionManual && userDetails.directionManual.length > 0) {
            const directionIndex = userDetails.directionManual.findIndex((f) => f === structureExternalId);
            return (directionIndex >= 0);
        } else {
            return false;
        }
    }

    generateMergeKey(userDetails: UserDetailsModel) {
        return this.http.post(`/directory/duplicate/generate/mergeKey/${userDetails.id}`, {}).subscribe((res: {'mergeKey': string}) => {
            userDetails.mergeKey = res.mergeKey;
        });
    }

    updateLoginAlias(userDetails: UserDetailsModel) {
        return this.http.put(`/directory/user/${userDetails.id}`, {loginAlias: userDetails.loginAlias});
    }

    removeFromStructure(userDetails: UserDetailsModel, struct: StructureModel) {
        if(userDetails.removedFromStructures == null) {
            userDetails.removedFromStructures = [];
        }
        userDetails.removedFromStructures.push(struct.externalId);
    }

    unremoveFromStructure(userDetails: UserDetailsModel, struct: StructureModel) {
        if(userDetails.removedFromStructures == null) {
            userDetails.removedFromStructures = [];
        }
        userDetails.removedFromStructures = userDetails.removedFromStructures.filter(s => s != struct.externalId);
    }
}