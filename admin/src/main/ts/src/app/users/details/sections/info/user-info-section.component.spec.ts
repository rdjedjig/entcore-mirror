import {ChangeDetectorRef} from '@angular/core';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {FormsModule} from '@angular/forms';
import {NgxOdeSijilModule} from 'ngx-ode-sijil';
import {NgxOdeUiModule} from 'ngx-ode-ui';
import {UserInfoSectionComponent} from './user-info-section.component';
import {NotifyService} from 'src/app/core/services/notify.service';
import { SpinnerService } from 'ngx-ode-ui';
import {UserInfoService} from './user-info.service';

describe('UserInfoSectionComponent', () => {
    let component: UserInfoSectionComponent;
    let fixture: ComponentFixture<UserInfoSectionComponent>;

    let mockChangeDetectorRef: ChangeDetectorRef;
    let mockNotifyService: NotifyService;
    let mockSpinnerService: SpinnerService;
    let mockUserInfoService: UserInfoService;
    let httpController: HttpTestingController;

    beforeEach(() => {
        mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);
        mockNotifyService = jasmine.createSpyObj('NotifyService', ['success', 'error']);
        mockSpinnerService = jasmine.createSpyObj('SpinnerService', ['perform']);
        mockUserInfoService = jasmine.createSpyObj('UserInfoService', ['getState']);
    });

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [
              UserInfoSectionComponent
            ],
            providers: [
                {provide: NotifyService, useValue: mockNotifyService},
                {provide: SpinnerService, useValue: mockSpinnerService},
                {provide: ChangeDetectorRef, useValue: mockChangeDetectorRef},
                {provide: UserInfoService, useValue: mockUserInfoService}
            ],
            imports: [
                HttpClientTestingModule,
                NgxOdeSijilModule.forRoot(),
                NgxOdeUiModule.forRoot(null),
                FormsModule
            ]

        }).compileComponents();
        fixture = TestBed.createComponent(UserInfoSectionComponent);
        component = fixture.debugElement.componentInstance;
        httpController = TestBed.inject(HttpTestingController);
    }));

    it('should create the UserInfoSectionComponent component', async(() => {
        expect(component).toBeTruthy();
    }));

    describe('generateRenewalCode', () => {
        it('should call the backend /auth/generatePasswordRenewalCode with given user login', () => {
            component.generateRenewalCode('myUserLogin').subscribe();
            const requestController = httpController.expectOne('/auth/generatePasswordRenewalCode');
            expect(requestController.request.method).toBe('POST');
            expect(requestController.request.body).toEqual('login=myUserLogin');
        });
    });
});
