import { Component, forwardRef, ViewChild, ElementRef, Input, OnDestroy, AfterViewInit, Renderer2, EventEmitter, Output } from '@angular/core'

import { NgModel } from '@angular/forms';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

import { LabelsService } from '../services'

// access ngmodel
const NOOP = () => {
};
export const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatepickerComponent),
    multi: true
};

import Flatpickr from 'flatpickr';
import French from 'flatpickr/dist/l10n/fr.js';

@Component({
    selector: 'date-picker',
    template: `
        <div class="flatpickr" #datePickerElement>
            <input type="date" [(ngModel)]="value" [ngClass]="{ 'cursor-default': disabled }" placeholder="{{ placeholder }}" #inputRef>
            <a *ngIf="!disabled" data-toggle [title]="labels('datepicker.open')"><i class="fa fa-calendar open" aria-hidden="true"></i></a>
            <a *ngIf="!disabled" data-clear [title]="labels('datepicker.delete')"><i class="fa fa-times delete" aria-hidden="true"></i></a>
        </div>
    `,
    providers: [ CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR ]
})
export class DatepickerComponent implements OnDestroy, AfterViewInit, ControlValueAccessor {

    private innerValue: any = ''

    @ViewChild("datePickerElement") 
    datePickerElement: ElementRef
    
    @ViewChild("inputRef")
    inputElement: ElementRef

    // instance flatpickr
    private datePickerInst: Flatpickr

    @ViewChild(NgModel) 
    model: NgModel
    
    @Input()
    disabled: boolean = false
    
    @Input()
    enableTime: boolean = false
    
    @Input()
    placeholder: string = ''
    
    @Input()
    minDate
    
    @Input()
    maxDate

    @Output()
    changeDate: EventEmitter<string> = new EventEmitter<string>();

    constructor(private renderer: Renderer2, 
        private labelsService: LabelsService) {}

    get value(): any {
        return this.innerValue
    }

    set value(v: any) {
        let init: boolean = false;
        if (this.innerValue === undefined) {
            init = true;
        }
        if (v !== this.innerValue) {
            this.innerValue = v
            this.onChangeCallback(v)
            if (!init) {
                this.changeDate.emit(v);
            }

        }
    }

    ngAfterViewInit(): void {
        // add attr data-input, mandatory for the picker to work in wrap mode
        this.renderer.setAttribute(this.inputElement.nativeElement, 'data-input', '');

        // disabled case
        if (this.disabled === true) {
            this.model.control.disable()
        }

        const navigatorLanguage = navigator.language.split('-')[0];
        let datePickerLocale = {};
        if (navigatorLanguage === 'fr') {
            datePickerLocale = French.fr;
        }

        // options for the flatpickr instance
        let options = {
            altInput: !this.disabled,
            altFormat: 'd/m/Y', // date format displayed to user
            dateFormat: 'Y-m-d', // date format sent to server
            allowInput: false,
            enableTime: this.enableTime,
            minDate: this.minDate,
            maxDate: this.maxDate,
            clickOpens: !this.disabled,
            wrap: true, // to add input decoration (calendar icon and delete icon)
            locale: datePickerLocale
        }

        this.datePickerInst = new Flatpickr(this.datePickerElement.nativeElement, options);
    }

    ngOnDestroy(): void {
        this.datePickerInst.destroy()
    }

    writeValue(value: any): void {
        if (value !== this.innerValue && this.datePickerInst) {
            this.innerValue = value
            this.datePickerInst.setDate(value)
            this.onChangeCallback(value)
        }
    }

    registerOnChange(fn: any): void {
        this.onChangeCallback = fn
    }

    registerOnTouched(fn: any): void {
        this.onTouchedCallback = fn;
    }

    private onChangeCallback: (_: any) => void = NOOP
    private onTouchedCallback: () => void = NOOP

    labels(label){
        return this.labelsService.getLabel(label)
    }
}