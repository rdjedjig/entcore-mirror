import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList
} from '@angular/core';

@Component({
    selector : 'ode-step',
    template: `<ng-content></ng-content>`,
    styles: [`
        :host {
            display: none;
            overflow: auto;
            padding : 1em;
        }
        :host.active {
            display: block;
        }
    `]
})
export class StepComponent {
    @Input() name: string;
    @Input() isActived: boolean;
    hasError = false;
    isFinished = false;
}

@Component({
    selector: 'wizard',
    template: `
        <div class="wizard">
            <nav class="wizard-menu">
                <h2 class="wizard-menu__title"><s5l>wizard.steps</s5l></h2>
                <ul>
                    <li *ngFor="let step of steps"
                        [class.active]="step.isActived"
                        [class.finish]="step.isFinished">
                        {{step.name}}
                    </li>
                </ul>
            </nav>
            <section class="wizard-content">
                <ng-content select="step"></ng-content>
                <nav class="wizard-content-nav" *ngIf="activeStep < steps.length - 1">
                    <button class="wizard-content-nav__button cancel"
                        (click)="cancel.emit()"
                        [title]="'cancel' | translate">
                        {{ 'cancel' | translate }}
                    </button>
                    <button class="wizard-content-nav__button previous"
                        (click)="onPreviousStep()"
                        *ngIf="activeStep > 0"
                        [title]="'previous' | translate">
                        {{ 'wizard.previous' | translate }}
                    </button>
                    <button class="wizard-content-nav__button wizard-content-nav__button--next"
                        (click)="onNextStep()"
                        [disabled]="!canDoNext"
                        [title]="'next' | translate">
                        {{ 'wizard.next' | translate }}
                    </button>
                </nav>
            </section>
        </div>
    `,
    styles: [`
        .wizard {
            display: flex;
        }
        .wizard-menu {
            background: #5b6472;
            flex: 0 0 240px;
        }
        .wizard-menu ul {
            padding: 10px 30px;
        }
        .wizard-menu ul li {
            color: #eaedf2;
            list-style-type: none;
            padding: 5px 0;
        }
        .wizard-menu ul li.active,
        .wizard-menu ul li.finish {
            font-weight: bold;
            color: white;
        }
        .wizard-menu ul li.finish {
            color: green;
        }
        .wizard-menu__title {
            font-weight: bold;
            font-size: 1.2em;
            color: white;
            padding: 25px 0 0 10px;
        }
        .wizard-content {
            background: #fff;
            flex: auto;
        }
        .wizard-content-nav {
            text-align : right;
        }
        .wizard-content-nav__button {
            margin: 10px 0;
        }
        .wizard-content-nav__button--next {
            margin-right: 16px;
        }
    `]
})
export class WizardComponent implements AfterContentInit, OnDestroy {
    @Output('cancel') cancel: EventEmitter<{}> = new EventEmitter();
    @Output('previousStep') previousStep: EventEmitter<Number> = new EventEmitter();
    @Output('nextStep') nextStep: EventEmitter<Number> = new EventEmitter();

    public canDoNext = true;

    @ContentChildren(StepComponent) steps: QueryList<StepComponent>;
    activeStep = 0;

    doCancel() {
        this.activeStep = 0;
        this.steps.forEach((step, index) => {
            index == 0 ? step.isActived = true : step.isActived = false;
        });
        this.canDoNext = true;
    }

    onPreviousStep() {
        this.previousStep.emit(this.activeStep);
    }

    doPreviousStep() {
        if (this.activeStep > 0) {
            this.steps.toArray()[this.activeStep].isActived = false;
            this.steps.toArray()[this.activeStep - 1].isActived = true;
            this.activeStep--;
            this.canDoNext = true;
        }
    }

    onNextStep() {
        this.nextStep.emit(this.activeStep);
    }
    doNextStep(error?: boolean) {
        if (this.activeStep < this.steps.length - 1) {
            this.canDoNext = !error;
            this.steps.toArray()[this.activeStep].isActived = false;
            this.steps.toArray()[this.activeStep + 1].isActived = true;
            this.activeStep++;
        }
    }

    ngAfterContentInit() {
        if (this.steps.length == 0) {
            throw new Error('<wizard> component musts nest at least 1 <step> compoent');
        }
    }

    ngOnDestroy(): void {
    }
}
