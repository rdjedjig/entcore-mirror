import { Component, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter } from '@angular/core'

import { GroupsStore } from '../../../store'
import { UserListService } from '../../../../../services'
import { UserModel } from '../../../../../store/models'

@Component({
    selector: 'group-output-users',
    template: `
        <div>
            <div class="header">
                <s5l>group.manage.users.added</s5l>
            </div>

            <list-component
                [model]="model"
                [sort]="userLS.sorts"
                [inputFilter]="userLS.filterByInput"
                [display]="userLS.display"
                [ngClass]="setUserListStyles"
                (inputChange)="userLS.inputFilter = $event"
                (onSelect)="selectUser($event)">
                <div toolbar class="user-toolbar">
                    <i class="fa" aria-hidden="true"
                        [ngClass]="{
                            'fa-sort-alpha-asc': userLS.sortsMap.alphabetical.sort === '+',
                            'fa-sort-alpha-desc': userLS.sortsMap.alphabetical.sort === '-',
                            'selected': userLS.sortsMap.alphabetical.selected
                        }"
                        [tooltip]="'sort.alphabetical' | translate" position="top"
                        (click)="userLS.changeSorts('alphabetical')"></i>

                    <i class="fa" aria-hidden="true"
                        [ngClass]="{
                            'fa-sort-amount-asc': userLS.sortsMap.profile.sort === '+',
                            'fa-sort-amount-desc': userLS.sortsMap.profile.sort === '-',
                            'selected': userLS.sortsMap.profile.selected
                        }"
                        [tooltip]="'sort.profile' | translate" position="top"
                        (click)="userLS.changeSorts('profile')"></i>

                    <button class="select-all" (click)="selectAll()" *ngIf="!maxSelected"
                        [title]="'select.all' | translate">
                        <s5l>select.all</s5l>
                    </button>

                    <button class="deselect-all" (click)="deselectAll()"
                        [title]="'deselect.all' | translate">
                        <s5l>deselect.all</s5l>
                    </button>

                </div>
            </list-component>

            <div class="button-remove">
                <button (click)="removeUsers()"
                    [disabled]="selectedUsers.length === 0" >-</button>
            </div>
        </div>`,
     providers: [ UserListService ],
     changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroupOutputUsers {
    @Input() model: UserModel[] = []

    private selectedUsers: UserModel[] = []

    constructor(private groupsStore: GroupsStore,
        private cdRef: ChangeDetectorRef,
        private userLS: UserListService){}

    private selectUser(u): void {
        if (this.selectedUsers.indexOf(u) === -1) {
            this.selectedUsers.push(u)
        } else {
            this.selectedUsers = this.selectedUsers.filter(su => su.id !== u.id)
        }
    }

    private setUserListStyles = (user: UserModel) => {
        return { selected: this.selectedUsers.indexOf(user) > -1 }
    }

    private selectAll(): void {
        this.selectedUsers = this.groupsStore.group.users
    }

    private deselectAll(): void {
        this.selectedUsers = []
    }

    private removeUsers(): void {
        this.groupsStore.group.users = this.groupsStore.group.users.filter(
            gu => this.selectedUsers.indexOf(gu) === -1)
        this.selectedUsers = []
    }
}
