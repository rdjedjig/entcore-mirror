export class SubjectModel {

    id?: string;
    label?: string;
    code?: string;
    source?: string;
    structureId?: string;

    // toJSON() {
    //     let back = {
    //         id: this.id,
    //         label: this.label,
    //         code: this.code,
    //         structureId: this.structureId
    //     };
    //     if (this.source) {
    //         back['manual'] = this.source;
    //     }
    //     return back;
    // }
}