import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { GroupModel } from "../store/models/group.model";
import { UserModel } from "../store/models/user.model";

@Injectable()
export class GroupService {
    constructor(private http: HttpClient) {}

    create(group: {name: string, structureId: string}) {
        return this.http.post(`/directory/group`, {name: group.name, structureId: group.structureId})
    }

    syncUsers(group: GroupModel) {
        return this.http.get(`/directory/user/admin/list?groupId=${group.id}`).
            subscribe((res: Array<UserModel>) => group.users = res);
    }

    addUsers(group: GroupModel, users: UserModel[]) {
        return this.http.put(`/directory/group/${group.id}/users/add`, {userIds: users.map(u => u.id)});
    }

    removeUsers(group: GroupModel, users: UserModel[]) {
        return this.http.put(`/directory/group/${group.id}/users/delete`, {userIds: users.map(u => u.id)});
    }
}