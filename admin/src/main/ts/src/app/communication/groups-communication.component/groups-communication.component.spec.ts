import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {GroupModel} from '../../core/store/models/group.model';
import {StructureModel} from '../../core/store/models/structure.model';
import {UserDetailsModel} from '../../core/store/models/userdetails.model';
import {UserModel} from '../../core/store/models/user.model';
import {By} from '@angular/platform-browser';
import {BundlesService, SijilModule} from 'sijil';
import {Component, DebugElement, Input} from '@angular/core';
import {UxModule} from '../../shared/ux/ux.module';
import {Column, CommunicationRule} from '../communication-rules.component/communication-rules.component';
import {clickOn, generateGroup, getText} from '../../utils/testing';
import {GroupsCommunicationComponent,  groupsCommunicationLocators as locators} from './groups-communication.component';

describe('GroupsCommunicationComponent', () => {
    let component: GroupsCommunicationComponent;
    let fixture: ComponentFixture<GroupsCommunicationComponent>;
    let axellePotier: UserCommunicationTestingData;
    let harryPotter: UserCommunicationTestingData;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                GroupsCommunicationComponent,
                MockCommunicationRulesComponent
            ],
            providers: [],
            imports: [
                SijilModule.forRoot(),
                UxModule.forRoot(null)
            ]

        }).compileComponents();
        fixture = TestBed.createComponent(GroupsCommunicationComponent);
        component = fixture.debugElement.componentInstance;
        const bundlesService: any = TestBed.inject(BundlesService);
        bundlesService.addToBundle({
            'user.communication.back-to-user-details': 'Retour à la fiche',
            'user.communication.title': 'Communication de {{ lastName }} {{ firstName }}'
        });

        axellePotier = generateTestingData(
            'Axelle',
            'Potier',
            [generateGroup('c1')],
            [generateGroup('groupf1'), generateGroup('groupf2')],
            [generateGroup('groupm1')]);
        harryPotter = generateTestingData(
            'Harry',
            'Potter',
            [generateGroup('c1')],
            null,
            null);

        component.title = 'my title';
        component.sendingCommunicationRules = axellePotier.communicationRules;
        component.addCommunicationPickableGroups = [generateGroup('group1')];
        component.manageableStructuresId = ['activeStructure'];
        component.activeStructure = {id: 'activeStructure', name: 'activeStructure'} as StructureModel;
        component.structures = [
            {id: 'activeStructure', name: 'activeStructure'} as StructureModel,
            {id: 'structure2', name: 'structure2'} as StructureModel
        ];
        fixture.detectChanges();
    }));

    it('should create the GroupsCommunicationComponent component', waitForAsync(() => {
        expect(component).toBeTruthy();
    }));

    it('should have the title "my title" given the title "my title"', waitForAsync(() => {
        expect(getText(getTitle(fixture))).toBe('my title');
    }));

    it('should have the title "Communication de POTTER Harry" given the title "Communication de POTTER Harry"', waitForAsync(() => {
        component.title = 'Communication de POTTER Harry';
        component.sendingCommunicationRules = harryPotter.communicationRules;
        fixture.detectChanges();
        expect(getText(getTitle(fixture))).toBe('Communication de POTTER Harry');
    }));

    it('should emit a "close" event with clicking on the back button', waitForAsync(() => {
        let closed = false;
        component.groupClose.subscribe(() => closed = true);
        clickOn(getBackButton(fixture));
        expect(closed).toBeTruthy();
    }));
});

interface UserCommunicationTestingData {
    user: UserModel;
    communicationRules: CommunicationRule[];
}

function generateTestingData(firstName: string, lastName: string,
                             classes: GroupModel[],
                             functionalGroups: GroupModel[],
                             manualGroups: GroupModel[]): UserCommunicationTestingData {
    const userDetails: UserDetailsModel = {functionalGroups, manualGroups} as UserDetailsModel;
    const user: UserModel = {
        firstName,
        lastName,
        userDetails
    } as UserModel;
    const groups = [];
    groups.push(...classes);
    groups.push(...functionalGroups);
    groups.push(...manualGroups);
    const communicationRules: CommunicationRule[] = groups.map(mg => ({sender: mg, receivers: []}));
    return {user, communicationRules};
}

function getTitle(fixture: ComponentFixture<GroupsCommunicationComponent>): DebugElement {
    return fixture.debugElement.query(By.css(locators.title));
}

function getBackButton(fixture: ComponentFixture<GroupsCommunicationComponent>): DebugElement {
    return fixture.debugElement.query(By.css(locators.backButton));
}

@Component({
    selector: 'ode-communication-rules',
    template: ''
})
class MockCommunicationRulesComponent {
    @Input()
    public manageableStructuresId: string[];

    @Input()
    sendingHeaderLabel: string;

    @Input()
    receivingHeaderLabel: string;

    @Input()
    communicationRules: CommunicationRule[];

    @Input()
    public addCommunicationPickableGroups: GroupModel[];

    @Input()
    activeColumn: Column;

    @Input()
    public structures: StructureModel[];

    @Input()
    public activeStructure: StructureModel;
}
