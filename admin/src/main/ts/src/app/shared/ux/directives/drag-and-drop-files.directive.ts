import {Directive, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import {InputFileService} from '../services/inputFile.service';

@Directive({
    selector: '[dragAndDropFiles]'
})
export class DragAndDropFilesDirective {
    @Input()
    allowedExtensions: Array<string> = [];
    @Input()
    maxFilesNumber = 1;
    @Input()
    disabled: boolean;

    @Output()
    dragAndDrop: EventEmitter<File[]> = new EventEmitter();
    @Output()
    invalidDragAndDrop: EventEmitter<string> = new EventEmitter();

    @HostBinding('style.background')
    public backgroundColor = '#fafafa';
    @HostBinding('style.border-color')
    public borderColor = '#ddd';

    constructor(private inputFileService: InputFileService) {
    }

    @HostListener('dragover', ['$event'])
    public onDragOver(evt) {
        if (!this.disabled) {
            evt.preventDefault();
            evt.stopPropagation();
            this.highlightColors();
        }
    }

    @HostListener('dragleave', ['$event'])
    public onDragLeave(evt) {
        if (!this.disabled) {
            evt.preventDefault();
            evt.stopPropagation();
            this.resetColors();
        }
    }

    @HostListener('drop', ['$event'])
    public onDrop(event) {
        if (!this.disabled) {
            event.preventDefault();
            event.stopPropagation();

            if (event.dataTransfer) {
                this.inputFileService
                    .validateFiles(event.dataTransfer.files, this.maxFilesNumber, this.allowedExtensions)
                    .subscribe(files => this.dragAndDrop.emit(files)
                        , error => this.invalidDragAndDrop.emit(error));
            }

            this.resetColors();
        }
    }

    private resetColors() {
        this.backgroundColor = '#fafafa';
        this.borderColor = '#ddd';
    }

    private highlightColors() {
        this.backgroundColor = '#ffd1b6';
        this.borderColor = '#ff8352';
    }
}
