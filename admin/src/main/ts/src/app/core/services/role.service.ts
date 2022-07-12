import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { GroupModel } from "../store/models/group.model";
import { RoleModel } from "../store/models/role.model";

@Injectable()
export class RoleService {

    constructor(private http: HttpClient) {}

    removeGroup(role: RoleModel, group: GroupModel) {
        return this.http.
            delete(`/appregistry/authorize/group/${group.id}/role/${role.id}`).
            subscribe(
                (res) => {
                    const groupIndex = role.groups.findIndex(g => g.id == group.id);
                    role.groups.splice(groupIndex, 1);
                }, 
                (err) => console.error(err)
            );
    }

    addGroup(role: RoleModel, group: GroupModel) {
        return this.http.put(`/appregistry/authorize/group/${group.id}/role/${role.id}`, {}).
            subscribe(res => role.groups.push(group));
    }
}