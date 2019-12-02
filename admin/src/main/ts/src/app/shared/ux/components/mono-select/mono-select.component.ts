import { OdeComponent } from './../../../../core/ode/OdeComponent';
import { Component, ElementRef, forwardRef, Input, Injector } from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {SelectOption} from '../multi-select/multi-select.component';

const css = {
    select: 'form-select',
    openedSelect: 'form-select--opened',
    list: 'form-select__list',
    option: 'form-select__options',
    selectedOption: 'form-select__options--selected'
};
export const monoSelectLocators = {
    select: `.lct-${css.select}`,
    list: `.lct-${css.list}`,
    option: `.lct-${css.option}`,
    selectedOption: `.lct-${css.selectedOption}`
};


@Component({
    selector: 'ode-mono-select',
    templateUrl: './mono-select.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MonoSelectComponent),
            multi: true
        }
    ],
    host: {
        '(document:click)': 'onClickOnDocument($event)',
        '(click)': 'onClickOnHost()'
    }
})
export class MonoSelectComponent<K> extends OdeComponent implements ControlValueAccessor {
    @Input()
    public placeholder = 'monoselect.placeholder.default';

    @Input()
    public options: Array<SelectOption<K>> = [];

    @Input()
    public trackByFn: (optionValue: K) => number | string;

    public opened = false;

    public selectedOption: SelectOption<K> = null;

    public isDisabled = false;

    public optionClicked(option: SelectOption<K>) {
        this.selectedOption = option;
        this.opened = false;
        this.onChange(this.selectedOption.value);
    }

    constructor(injector: Injector,
        private elementRef: ElementRef) {
            super(injector);
    }

    public onClickOnDocument(event: MouseEvent) {
        if (this.opened &&
            !this.elementRef.nativeElement.querySelector(monoSelectLocators.select).contains(event.target)) {
            this.opened = false;
        }
        return true;
    }

    public onClickOnHost() {
        if (!this.opened && !this.isDisabled) {
            this.opened = true;
        } else {
            this.opened = false;
        }
    }

    private onChange = (_: K) => {
    }

    private onTouched = () => {
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    writeValue(obj: K): void {
        this.selectedOption = this.options.find(option => option.value === obj);
        this.onChange(this.selectedOption ? this.selectedOption.value : null);
    }
}
