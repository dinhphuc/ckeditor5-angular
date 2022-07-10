/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md.
 */
import { __awaiter } from "tslib";
import { Component, Input, Output, NgZone, EventEmitter, forwardRef, ElementRef } from '@angular/core';
import EditorWatchdog from '@ckeditor/ckeditor5-watchdog/src/editorwatchdog';
import { first } from 'rxjs/operators';
import uid from './uid';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
const ANGULAR_INTEGRATION_READ_ONLY_LOCK_ID = 'Lock from Angular integration (@ckeditor/ckeditor5-angular)';
export class CKEditorComponent {
    constructor(elementRef, ngZone) {
        /**
         * The configuration of the editor.
         * See https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editorconfig-EditorConfig.html
         * to learn more.
         */
        this.config = {};
        /**
         * The initial data of the editor. Useful when not using the ngModel.
         * See https://angular.io/api/forms/NgModel to learn more.
         */
        this.data = '';
        /**
         * Tag name of the editor component.
         *
         * The default tag is 'div'.
         */
        this.tagName = 'div';
        /**
         * Fires when the editor is ready. It corresponds with the `editor#ready`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editor-Editor.html#event-ready
         * event.
         */
        this.ready = new EventEmitter();
        /**
         * Fires when the content of the editor has changed. It corresponds with the `editor.model.document#change`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_document-Document.html#event-change
         * event.
         */
        this.change = new EventEmitter();
        /**
         * Fires when the editing view of the editor is blurred. It corresponds with the `editor.editing.view.document#blur`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_view_document-Document.html#event-event:blur
         * event.
         */
        this.blur = new EventEmitter();
        /**
         * Fires when the editing view of the editor is focused. It corresponds with the `editor.editing.view.document#focus`
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_view_document-Document.html#event-event:focus
         * event.
         */
        this.focus = new EventEmitter();
        /**
         * Fires when the editor component crashes.
         */
        this.error = new EventEmitter();
        /**
         * If the component is read–only before the editor instance is created, it remembers that state,
         * so the editor can become read–only once it is ready.
         */
        this.initiallyDisabled = false;
        /**
         * A lock flag preventing from calling the `cvaOnChange()` during setting editor data.
         */
        this.isEditorSettingData = false;
        this.id = uid();
        this.ngZone = ngZone;
        this.elementRef = elementRef;
        const { CKEDITOR_VERSION } = window;
        // Starting from v34.0.0, CKEditor 5 introduces a lock mechanism enabling/disabling the read-only mode.
        // As it is a breaking change between major releases of the integration, the component requires using
        // CKEditor 5 in version 34 or higher.
        if (CKEDITOR_VERSION) {
            const [major] = CKEDITOR_VERSION.split('.').map(Number);
            if (major < 34) {
                console.warn('The <CKEditor> component requires using CKEditor 5 in version 34 or higher.');
            }
        }
        else {
            console.warn('Cannot find the "CKEDITOR_VERSION" in the "window" scope.');
        }
    }
    /**
     * When set `true`, the editor becomes read-only.
     * See https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editor-Editor.html#member-isReadOnly
     * to learn more.
     */
    set disabled(isDisabled) {
        this.setDisabledState(isDisabled);
    }
    get disabled() {
        if (this.editorInstance) {
            return this.editorInstance.isReadOnly;
        }
        return this.initiallyDisabled;
    }
    /**
     * The instance of the editor created by this component.
     */
    get editorInstance() {
        let editorWatchdog = this.editorWatchdog;
        if (this.watchdog) {
            // Temporarily use the `_watchdogs` internal map as the `getItem()` method throws
            // an error when the item is not registered yet.
            // See https://github.com/ckeditor/ckeditor5-angular/issues/177.
            editorWatchdog = this.watchdog._watchdogs.get(this.id);
        }
        if (editorWatchdog) {
            return editorWatchdog.editor;
        }
        return null;
    }
    // Implementing the AfterViewInit interface.
    ngAfterViewInit() {
        this.attachToWatchdog();
    }
    // Implementing the OnDestroy interface.
    ngOnDestroy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.watchdog) {
                yield this.watchdog.remove(this.id);
            }
            else if (this.editorWatchdog && this.editorWatchdog.editor) {
                yield this.editorWatchdog.destroy();
                this.editorWatchdog = undefined;
            }
        });
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    writeValue(value) {
        // This method is called with the `null` value when the form resets.
        // A component's responsibility is to restore to the initial state.
        if (value === null) {
            value = '';
        }
        // If already initialized.
        if (this.editorInstance) {
            // The lock mechanism prevents from calling `cvaOnChange()` during changing
            // the editor state. See #139
            this.isEditorSettingData = true;
            this.editorInstance.setData(value);
            this.isEditorSettingData = false;
        }
        // If not, wait for it to be ready; store the data.
        else {
            // If the editor element is already available, then update its content.
            this.data = value;
            // If not, then wait until it is ready
            // and change data only for the first `ready` event.
            this.ready
                .pipe(first())
                .subscribe((editor) => {
                editor.setData(this.data);
            });
        }
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    registerOnChange(callback) {
        this.cvaOnChange = callback;
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    registerOnTouched(callback) {
        this.cvaOnTouched = callback;
    }
    // Implementing the ControlValueAccessor interface (only when binding to ngModel).
    setDisabledState(isDisabled) {
        // If already initialized.
        if (this.editorInstance) {
            if (isDisabled) {
                this.editorInstance.enableReadOnlyMode(ANGULAR_INTEGRATION_READ_ONLY_LOCK_ID);
            }
            else {
                this.editorInstance.disableReadOnlyMode(ANGULAR_INTEGRATION_READ_ONLY_LOCK_ID);
            }
        }
        // Store the state anyway to use it once the editor is created.
        this.initiallyDisabled = isDisabled;
    }
    /**
     * Creates the editor instance, sets initial editor data, then integrates
     * the editor with the Angular component. This method does not use the `editor.setData()`
     * because of the issue in the collaboration mode (#6).
     */
    attachToWatchdog() {
        const creator = (element, config) => __awaiter(this, void 0, void 0, function* () {
            return this.ngZone.runOutsideAngular(() => __awaiter(this, void 0, void 0, function* () {
                this.elementRef.nativeElement.appendChild(element);
                const editor = yield this.editor.create(element, config);
                if (this.initiallyDisabled) {
                    editor.enableReadOnlyMode(ANGULAR_INTEGRATION_READ_ONLY_LOCK_ID);
                }
                this.ngZone.run(() => {
                    this.ready.emit(editor);
                });
                this.setUpEditorEvents(editor);
                return editor;
            }));
        });
        const destructor = (editor) => __awaiter(this, void 0, void 0, function* () {
            yield editor.destroy();
            if (this.elementRef && this.elementRef.nativeElement) {
                this.elementRef.nativeElement.removeChild(this.editorElement);
            }
        });
        const emitError = () => {
            this.ngZone.run(() => {
                this.error.emit();
            });
        };
        const element = document.createElement(this.tagName);
        const config = this.getConfig();
        this.editorElement = element;
        // Based on the presence of the watchdog decide how to initialize the editor.
        if (this.watchdog) {
            // When the context watchdog is passed add the new item to it based on the passed configuration.
            this.watchdog.add({
                id: this.id,
                type: 'editor',
                creator,
                destructor,
                sourceElementOrData: element,
                config
            });
            this.watchdog.on('itemError', (_, { itemId }) => {
                if (itemId === this.id) {
                    emitError();
                }
            });
        }
        else {
            // In the other case create the watchdog by hand to keep the editor running.
            const editorWatchdog = new EditorWatchdog(this.editor);
            editorWatchdog.setCreator(creator);
            editorWatchdog.setDestructor(destructor);
            editorWatchdog.on('error', emitError);
            this.editorWatchdog = editorWatchdog;
            this.editorWatchdog.create(element, config);
        }
    }
    getConfig() {
        if (this.data && this.config.initialData) {
            throw new Error('Editor data should be provided either using `config.initialData` or `data` properties.');
        }
        const config = Object.assign({}, this.config);
        // Merge two possible ways of providing data into the `config.initialData` field.
        const initialData = this.config.initialData || this.data;
        if (initialData) {
            // Define the `config.initialData` only when the initial content is specified.
            config.initialData = initialData;
        }
        return config;
    }
    /**
     * Integrates the editor with the component by attaching related event listeners.
     */
    setUpEditorEvents(editor) {
        const modelDocument = editor.model.document;
        const viewDocument = editor.editing.view.document;
        modelDocument.on('change:data', (evt) => {
            this.ngZone.run(() => {
                if (this.cvaOnChange && !this.isEditorSettingData) {
                    const data = editor.getData();
                    this.cvaOnChange(data);
                }
                this.change.emit({ event: evt, editor });
            });
        });
        viewDocument.on('focus', (evt) => {
            this.ngZone.run(() => {
                this.focus.emit({ event: evt, editor });
            });
        });
        viewDocument.on('blur', (evt) => {
            this.ngZone.run(() => {
                if (this.cvaOnTouched) {
                    this.cvaOnTouched();
                }
                this.blur.emit({ event: evt, editor });
            });
        });
    }
}
CKEditorComponent.decorators = [
    { type: Component, args: [{
                selector: 'ckeditor',
                template: '<ng-template></ng-template>',
                // Integration with @angular/forms.
                providers: [
                    {
                        provide: NG_VALUE_ACCESSOR,
                        // eslint-disable-next-line @typescript-eslint/no-use-before-define
                        useExisting: forwardRef(() => CKEditorComponent),
                        multi: true
                    }
                ]
            },] }
];
CKEditorComponent.ctorParameters = () => [
    { type: ElementRef },
    { type: NgZone }
];
CKEditorComponent.propDecorators = {
    editor: [{ type: Input }],
    config: [{ type: Input }],
    data: [{ type: Input }],
    tagName: [{ type: Input }],
    watchdog: [{ type: Input }],
    disabled: [{ type: Input }],
    ready: [{ type: Output }],
    change: [{ type: Output }],
    blur: [{ type: Output }],
    focus: [{ type: Output }],
    error: [{ type: Output }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2tlZGl0b3IuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NrZWRpdG9yL2NrZWRpdG9yLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBUUgsT0FBTyxFQUNOLFNBQVMsRUFDVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osVUFBVSxFQUVWLFVBQVUsRUFDVixNQUFNLGVBQWUsQ0FBQztBQUV2QixPQUFPLGNBQWMsTUFBTSxpREFBaUQsQ0FBQztBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFdkMsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDO0FBRXhCLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsTUFBTSxnQkFBZ0IsQ0FBQztBQUl4QixNQUFNLHFDQUFxQyxHQUFHLDZEQUE2RCxDQUFDO0FBK0I1RyxNQUFNLE9BQU8saUJBQWlCO0lBeUo3QixZQUFvQixVQUFzQixFQUFFLE1BQWM7UUE3STFEOzs7O1dBSUc7UUFDYSxXQUFNLEdBQXFCLEVBQUUsQ0FBQztRQUU5Qzs7O1dBR0c7UUFDYSxTQUFJLEdBQUcsRUFBRSxDQUFDO1FBRTFCOzs7O1dBSUc7UUFDYSxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBd0JoQzs7OztXQUlHO1FBQ2MsVUFBSyxHQUFHLElBQUksWUFBWSxFQUFvQixDQUFDO1FBRTlEOzs7O1dBSUc7UUFDYyxXQUFNLEdBQThCLElBQUksWUFBWSxFQUFlLENBQUM7UUFFckY7Ozs7V0FJRztRQUNjLFNBQUksR0FBNEIsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUUvRTs7OztXQUlHO1FBQ2MsVUFBSyxHQUE2QixJQUFJLFlBQVksRUFBYyxDQUFDO1FBRWxGOztXQUVHO1FBQ2MsVUFBSyxHQUF1QixJQUFJLFlBQVksRUFBUSxDQUFDO1FBNEJ0RTs7O1dBR0c7UUFDSyxzQkFBaUIsR0FBRyxLQUFLLENBQUM7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QUFFLENBQUM7UUFFSixZQUFZLENBQUMsRUFBRSxDQUFFLE1BQU0sRUFBRSxDQUFFLEdBQWdDLEVBQUcsRUFBRTtZQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBRSxHQUFHLEVBQUU7Z0JBQ3JCLElBQUssSUFBSSxDQUFDLFlBQVksRUFBRztvQkFDeEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2lCQUNwQjtnQkFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUUsQ0FBQztZQUMxQyxDQUFDLENBQUUsQ0FBQztRQUNMLENBQUMsQ0FBRSxDQUFDO0lBQ0wsQ0FBQzs7O1lBbFlELFNBQVMsU0FBRTtnQkFDWCxRQUFRLEVBQUUsVUFBVTtnQkFDcEIsUUFBUSxFQUFFLDZCQUE2QjtnQkFFdkMsbUNBQW1DO2dCQUNuQyxTQUFTLEVBQUU7b0JBQ1Y7d0JBQ0MsT0FBTyxFQUFFLGlCQUFpQjt3QkFDMUIsbUVBQW1FO3dCQUNuRSxXQUFXLEVBQUUsVUFBVSxDQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFFO3dCQUNsRCxLQUFLLEVBQUUsSUFBSTtxQkFDWDtpQkFDRDthQUNEOzs7WUE3Q0EsVUFBVTtZQUpWLE1BQU07OztxQkE0REwsS0FBSztxQkFPTCxLQUFLO21CQU1MLEtBQUs7c0JBT0wsS0FBSzt1QkFLTCxLQUFLO3VCQU9MLEtBQUs7b0JBaUJMLE1BQU07cUJBT04sTUFBTTttQkFPTixNQUFNO29CQU9OLE1BQU07b0JBS04sTUFBTSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBAbGljZW5zZSBDb3B5cmlnaHQgKGMpIDIwMDMtMjAyMiwgQ0tTb3VyY2UgSG9sZGluZyBzcC4geiBvLm8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXHJcbiAqIEZvciBsaWNlbnNpbmcsIHNlZSBMSUNFTlNFLm1kLlxyXG4gKi9cclxuXHJcbmRlY2xhcmUgZ2xvYmFsIHtcclxuXHRpbnRlcmZhY2UgV2luZG93IHtcclxuXHRcdENLRURJVE9SX1ZFUlNJT04/OiBzdHJpbmc7XHJcblx0fVxyXG59XHJcblxyXG5pbXBvcnQge1xyXG5cdENvbXBvbmVudCxcclxuXHRJbnB1dCxcclxuXHRPdXRwdXQsXHJcblx0Tmdab25lLFxyXG5cdEV2ZW50RW1pdHRlcixcclxuXHRmb3J3YXJkUmVmLFxyXG5cdEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSxcclxuXHRFbGVtZW50UmVmXHJcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcblxyXG5pbXBvcnQgRWRpdG9yV2F0Y2hkb2cgZnJvbSAnQGNrZWRpdG9yL2NrZWRpdG9yNS13YXRjaGRvZy9zcmMvZWRpdG9yd2F0Y2hkb2cnO1xyXG5pbXBvcnQgeyBmaXJzdCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcclxuXHJcbmltcG9ydCB1aWQgZnJvbSAnLi91aWQnO1xyXG5cclxuaW1wb3J0IHtcclxuXHRDb250cm9sVmFsdWVBY2Nlc3NvcixcclxuXHROR19WQUxVRV9BQ0NFU1NPUlxyXG59IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcclxuXHJcbmltcG9ydCB7IENLRWRpdG9yNSB9IGZyb20gJy4vY2tlZGl0b3InO1xyXG5cclxuY29uc3QgQU5HVUxBUl9JTlRFR1JBVElPTl9SRUFEX09OTFlfTE9DS19JRCA9ICdMb2NrIGZyb20gQW5ndWxhciBpbnRlZ3JhdGlvbiAoQGNrZWRpdG9yL2NrZWRpdG9yNS1hbmd1bGFyKSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEJsdXJFdmVudCB7XHJcblx0ZXZlbnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2JsdXInPjtcclxuXHRlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3I7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRm9jdXNFdmVudCB7XHJcblx0ZXZlbnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2ZvY3VzJz47XHJcblx0ZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENoYW5nZUV2ZW50IHtcclxuXHRldmVudDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnY2hhbmdlOmRhdGEnPjtcclxuXHRlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3I7XHJcbn1cclxuXHJcbkBDb21wb25lbnQoIHtcclxuXHRzZWxlY3RvcjogJ2NrZWRpdG9yJyxcclxuXHR0ZW1wbGF0ZTogJzxuZy10ZW1wbGF0ZT48L25nLXRlbXBsYXRlPicsXHJcblxyXG5cdC8vIEludGVncmF0aW9uIHdpdGggQGFuZ3VsYXIvZm9ybXMuXHJcblx0cHJvdmlkZXJzOiBbXHJcblx0XHR7XHJcblx0XHRcdHByb3ZpZGU6IE5HX1ZBTFVFX0FDQ0VTU09SLFxyXG5cdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVzZS1iZWZvcmUtZGVmaW5lXHJcblx0XHRcdHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCAoKSA9PiBDS0VkaXRvckNvbXBvbmVudCApLFxyXG5cdFx0XHRtdWx0aTogdHJ1ZVxyXG5cdFx0fVxyXG5cdF1cclxufSApXHJcbmV4cG9ydCBjbGFzcyBDS0VkaXRvckNvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSwgQ29udHJvbFZhbHVlQWNjZXNzb3Ige1xyXG5cdC8qKlxyXG5cdCAqIFRoZSByZWZlcmVuY2UgdG8gdGhlIERPTSBlbGVtZW50IGNyZWF0ZWQgYnkgdGhlIGNvbXBvbmVudC5cclxuXHQgKi9cclxuXHRwcml2YXRlIGVsZW1lbnRSZWYhOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PjtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBlZGl0b3IgdG8gYmUgdXNlZCBmb3IgdGhlIGluc3RhbmNlIG9mIHRoZSBjb21wb25lbnQuXHJcblx0ICogSXQgY2FuIGJlIGUuZy4gdGhlIGBDbGFzc2ljRWRpdG9yQnVpbGRgLCBgSW5saW5lRWRpdG9yQnVpbGRgIG9yIHNvbWUgY3VzdG9tIGVkaXRvci5cclxuXHQgKi9cclxuXHRASW5wdXQoKSBwdWJsaWMgZWRpdG9yPzogQ0tFZGl0b3I1LkVkaXRvckNvbnN0cnVjdG9yO1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgY29uZmlndXJhdGlvbiBvZiB0aGUgZWRpdG9yLlxyXG5cdCAqIFNlZSBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9jb3JlX2VkaXRvcl9lZGl0b3Jjb25maWctRWRpdG9yQ29uZmlnLmh0bWxcclxuXHQgKiB0byBsZWFybiBtb3JlLlxyXG5cdCAqL1xyXG5cdEBJbnB1dCgpIHB1YmxpYyBjb25maWc6IENLRWRpdG9yNS5Db25maWcgPSB7fTtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGluaXRpYWwgZGF0YSBvZiB0aGUgZWRpdG9yLiBVc2VmdWwgd2hlbiBub3QgdXNpbmcgdGhlIG5nTW9kZWwuXHJcblx0ICogU2VlIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvTmdNb2RlbCB0byBsZWFybiBtb3JlLlxyXG5cdCAqL1xyXG5cdEBJbnB1dCgpIHB1YmxpYyBkYXRhID0gJyc7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRhZyBuYW1lIG9mIHRoZSBlZGl0b3IgY29tcG9uZW50LlxyXG5cdCAqXHJcblx0ICogVGhlIGRlZmF1bHQgdGFnIGlzICdkaXYnLlxyXG5cdCAqL1xyXG5cdEBJbnB1dCgpIHB1YmxpYyB0YWdOYW1lID0gJ2Rpdic7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBjb250ZXh0IHdhdGNoZG9nLlxyXG5cdCAqL1xyXG5cdEBJbnB1dCgpIHB1YmxpYyB3YXRjaGRvZz86IENLRWRpdG9yNS5Db250ZXh0V2F0Y2hkb2c7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFdoZW4gc2V0IGB0cnVlYCwgdGhlIGVkaXRvciBiZWNvbWVzIHJlYWQtb25seS5cclxuXHQgKiBTZWUgaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfY29yZV9lZGl0b3JfZWRpdG9yLUVkaXRvci5odG1sI21lbWJlci1pc1JlYWRPbmx5XHJcblx0ICogdG8gbGVhcm4gbW9yZS5cclxuXHQgKi9cclxuXHRASW5wdXQoKSBwdWJsaWMgc2V0IGRpc2FibGVkKCBpc0Rpc2FibGVkOiBib29sZWFuICkge1xyXG5cdFx0dGhpcy5zZXREaXNhYmxlZFN0YXRlKCBpc0Rpc2FibGVkICk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0IGRpc2FibGVkKCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCB0aGlzLmVkaXRvckluc3RhbmNlICkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5lZGl0b3JJbnN0YW5jZS5pc1JlYWRPbmx5O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLmluaXRpYWxseURpc2FibGVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdG9yIGlzIHJlYWR5LiBJdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBgZWRpdG9yI3JlYWR5YFxyXG5cdCAqIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2NvcmVfZWRpdG9yX2VkaXRvci1FZGl0b3IuaHRtbCNldmVudC1yZWFkeVxyXG5cdCAqIGV2ZW50LlxyXG5cdCAqL1xyXG5cdEBPdXRwdXQoKSBwdWJsaWMgcmVhZHkgPSBuZXcgRXZlbnRFbWl0dGVyPENLRWRpdG9yNS5FZGl0b3I+KCk7XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZpcmVzIHdoZW4gdGhlIGNvbnRlbnQgb2YgdGhlIGVkaXRvciBoYXMgY2hhbmdlZC4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvci5tb2RlbC5kb2N1bWVudCNjaGFuZ2VgXHJcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfZW5naW5lX21vZGVsX2RvY3VtZW50LURvY3VtZW50Lmh0bWwjZXZlbnQtY2hhbmdlXHJcblx0ICogZXZlbnQuXHJcblx0ICovXHJcblx0QE91dHB1dCgpIHB1YmxpYyBjaGFuZ2U6IEV2ZW50RW1pdHRlcjxDaGFuZ2VFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPENoYW5nZUV2ZW50PigpO1xyXG5cclxuXHQvKipcclxuXHQgKiBGaXJlcyB3aGVuIHRoZSBlZGl0aW5nIHZpZXcgb2YgdGhlIGVkaXRvciBpcyBibHVycmVkLiBJdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBgZWRpdG9yLmVkaXRpbmcudmlldy5kb2N1bWVudCNibHVyYFxyXG5cdCAqIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2VuZ2luZV92aWV3X2RvY3VtZW50LURvY3VtZW50Lmh0bWwjZXZlbnQtZXZlbnQ6Ymx1clxyXG5cdCAqIGV2ZW50LlxyXG5cdCAqL1xyXG5cdEBPdXRwdXQoKSBwdWJsaWMgYmx1cjogRXZlbnRFbWl0dGVyPEJsdXJFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPEJsdXJFdmVudD4oKTtcclxuXHJcblx0LyoqXHJcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdGluZyB2aWV3IG9mIHRoZSBlZGl0b3IgaXMgZm9jdXNlZC4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvci5lZGl0aW5nLnZpZXcuZG9jdW1lbnQjZm9jdXNgXHJcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfZW5naW5lX3ZpZXdfZG9jdW1lbnQtRG9jdW1lbnQuaHRtbCNldmVudC1ldmVudDpmb2N1c1xyXG5cdCAqIGV2ZW50LlxyXG5cdCAqL1xyXG5cdEBPdXRwdXQoKSBwdWJsaWMgZm9jdXM6IEV2ZW50RW1pdHRlcjxGb2N1c0V2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8Rm9jdXNFdmVudD4oKTtcclxuXHJcblx0LyoqXHJcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdG9yIGNvbXBvbmVudCBjcmFzaGVzLlxyXG5cdCAqL1xyXG5cdEBPdXRwdXQoKSBwdWJsaWMgZXJyb3I6IEV2ZW50RW1pdHRlcjx2b2lkPiA9IG5ldyBFdmVudEVtaXR0ZXI8dm9pZD4oKTtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGluc3RhbmNlIG9mIHRoZSBlZGl0b3IgY3JlYXRlZCBieSB0aGlzIGNvbXBvbmVudC5cclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0IGVkaXRvckluc3RhbmNlKCk6IENLRWRpdG9yNS5FZGl0b3IgfCBudWxsIHtcclxuXHRcdGxldCBlZGl0b3JXYXRjaGRvZyA9IHRoaXMuZWRpdG9yV2F0Y2hkb2c7XHJcblxyXG5cdFx0aWYgKCB0aGlzLndhdGNoZG9nICkge1xyXG5cdFx0XHQvLyBUZW1wb3JhcmlseSB1c2UgdGhlIGBfd2F0Y2hkb2dzYCBpbnRlcm5hbCBtYXAgYXMgdGhlIGBnZXRJdGVtKClgIG1ldGhvZCB0aHJvd3NcclxuXHRcdFx0Ly8gYW4gZXJyb3Igd2hlbiB0aGUgaXRlbSBpcyBub3QgcmVnaXN0ZXJlZCB5ZXQuXHJcblx0XHRcdC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vY2tlZGl0b3IvY2tlZGl0b3I1LWFuZ3VsYXIvaXNzdWVzLzE3Ny5cclxuXHRcdFx0ZWRpdG9yV2F0Y2hkb2cgPSB0aGlzLndhdGNoZG9nLl93YXRjaGRvZ3MuZ2V0KCB0aGlzLmlkICk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCBlZGl0b3JXYXRjaGRvZyApIHtcclxuXHRcdFx0cmV0dXJuIGVkaXRvcldhdGNoZG9nLmVkaXRvcjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBlZGl0b3Igd2F0Y2hkb2cuIEl0IGlzIGNyZWF0ZWQgd2hlbiB0aGUgY29udGV4dCB3YXRjaGRvZyBpcyBub3QgcGFzc2VkIHRvIHRoZSBjb21wb25lbnQuXHJcblx0ICogSXQga2VlcHMgdGhlIGVkaXRvciBydW5uaW5nLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZWRpdG9yV2F0Y2hkb2c/OiBDS0VkaXRvcjUuRWRpdG9yV2F0Y2hkb2c7XHJcblxyXG5cdC8qKlxyXG5cdCAqIElmIHRoZSBjb21wb25lbnQgaXMgcmVhZOKAk29ubHkgYmVmb3JlIHRoZSBlZGl0b3IgaW5zdGFuY2UgaXMgY3JlYXRlZCwgaXQgcmVtZW1iZXJzIHRoYXQgc3RhdGUsXHJcblx0ICogc28gdGhlIGVkaXRvciBjYW4gYmVjb21lIHJlYWTigJNvbmx5IG9uY2UgaXQgaXMgcmVhZHkuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsbHlEaXNhYmxlZCA9IGZhbHNlO1xyXG5cclxuXHQvKipcclxuXHQgKiBBbiBpbnN0YW5jZSBvZiBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2NvcmUvTmdab25lIHRvIGFsbG93IHRoZSBpbnRlcmFjdGlvbiB3aXRoIHRoZSBlZGl0b3JcclxuXHQgKiB3aXRoaW5nIHRoZSBBbmd1bGFyIGV2ZW50IGxvb3AuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBuZ1pvbmU6IE5nWm9uZTtcclxuXHJcblx0LyoqXHJcblx0ICogQSBjYWxsYmFjayBleGVjdXRlZCB3aGVuIHRoZSBjb250ZW50IG9mIHRoZSBlZGl0b3IgY2hhbmdlcy4gUGFydCBvZiB0aGVcclxuXHQgKiBgQ29udHJvbFZhbHVlQWNjZXNzb3JgIChodHRwczovL2FuZ3VsYXIuaW8vYXBpL2Zvcm1zL0NvbnRyb2xWYWx1ZUFjY2Vzc29yKSBpbnRlcmZhY2UuXHJcblx0ICpcclxuXHQgKiBOb3RlOiBVbnNldCB1bmxlc3MgdGhlIGNvbXBvbmVudCB1c2VzIHRoZSBgbmdNb2RlbGAuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjdmFPbkNoYW5nZT86ICggZGF0YTogc3RyaW5nICkgPT4gdm9pZDtcclxuXHJcblx0LyoqXHJcblx0ICogQSBjYWxsYmFjayBleGVjdXRlZCB3aGVuIHRoZSBlZGl0b3IgaGFzIGJlZW4gYmx1cnJlZC4gUGFydCBvZiB0aGVcclxuXHQgKiBgQ29udHJvbFZhbHVlQWNjZXNzb3JgIChodHRwczovL2FuZ3VsYXIuaW8vYXBpL2Zvcm1zL0NvbnRyb2xWYWx1ZUFjY2Vzc29yKSBpbnRlcmZhY2UuXHJcblx0ICpcclxuXHQgKiBOb3RlOiBVbnNldCB1bmxlc3MgdGhlIGNvbXBvbmVudCB1c2VzIHRoZSBgbmdNb2RlbGAuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjdmFPblRvdWNoZWQ/OiAoKSA9PiB2b2lkO1xyXG5cclxuXHQvKipcclxuXHQgKiBSZWZlcmVuY2UgdG8gdGhlIHNvdXJjZSBlbGVtZW50IHVzZWQgYnkgdGhlIGVkaXRvci5cclxuXHQgKi9cclxuXHRwcml2YXRlIGVkaXRvckVsZW1lbnQ/OiBIVE1MRWxlbWVudDtcclxuXHJcblx0LyoqXHJcblx0ICogQSBsb2NrIGZsYWcgcHJldmVudGluZyBmcm9tIGNhbGxpbmcgdGhlIGBjdmFPbkNoYW5nZSgpYCBkdXJpbmcgc2V0dGluZyBlZGl0b3IgZGF0YS5cclxuXHQgKi9cclxuXHRwcml2YXRlIGlzRWRpdG9yU2V0dGluZ0RhdGEgPSBmYWxzZTtcclxuXHJcblx0cHJpdmF0ZSBpZCA9IHVpZCgpO1xyXG5cclxuXHRwdWJsaWMgY29uc3RydWN0b3IoIGVsZW1lbnRSZWY6IEVsZW1lbnRSZWYsIG5nWm9uZTogTmdab25lICkge1xyXG5cdFx0dGhpcy5uZ1pvbmUgPSBuZ1pvbmU7XHJcblx0XHR0aGlzLmVsZW1lbnRSZWYgPSBlbGVtZW50UmVmO1xyXG5cclxuXHRcdGNvbnN0IHsgQ0tFRElUT1JfVkVSU0lPTiB9ID0gd2luZG93O1xyXG5cclxuXHRcdC8vIFN0YXJ0aW5nIGZyb20gdjM0LjAuMCwgQ0tFZGl0b3IgNSBpbnRyb2R1Y2VzIGEgbG9jayBtZWNoYW5pc20gZW5hYmxpbmcvZGlzYWJsaW5nIHRoZSByZWFkLW9ubHkgbW9kZS5cclxuXHRcdC8vIEFzIGl0IGlzIGEgYnJlYWtpbmcgY2hhbmdlIGJldHdlZW4gbWFqb3IgcmVsZWFzZXMgb2YgdGhlIGludGVncmF0aW9uLCB0aGUgY29tcG9uZW50IHJlcXVpcmVzIHVzaW5nXHJcblx0XHQvLyBDS0VkaXRvciA1IGluIHZlcnNpb24gMzQgb3IgaGlnaGVyLlxyXG5cdFx0aWYgKCBDS0VESVRPUl9WRVJTSU9OICkge1xyXG5cdFx0XHRjb25zdCBbIG1ham9yIF0gPSBDS0VESVRPUl9WRVJTSU9OLnNwbGl0KCAnLicgKS5tYXAoIE51bWJlciApO1xyXG5cclxuXHRcdFx0aWYgKCBtYWpvciA8IDM0ICkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybiggJ1RoZSA8Q0tFZGl0b3I+IGNvbXBvbmVudCByZXF1aXJlcyB1c2luZyBDS0VkaXRvciA1IGluIHZlcnNpb24gMzQgb3IgaGlnaGVyLicgKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKCAnQ2Fubm90IGZpbmQgdGhlIFwiQ0tFRElUT1JfVkVSU0lPTlwiIGluIHRoZSBcIndpbmRvd1wiIHNjb3BlLicgKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQWZ0ZXJWaWV3SW5pdCBpbnRlcmZhY2UuXHJcblx0cHVibGljIG5nQWZ0ZXJWaWV3SW5pdCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuYXR0YWNoVG9XYXRjaGRvZygpO1xyXG5cdH1cclxuXHJcblx0Ly8gSW1wbGVtZW50aW5nIHRoZSBPbkRlc3Ryb3kgaW50ZXJmYWNlLlxyXG5cdHB1YmxpYyBhc3luYyBuZ09uRGVzdHJveSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICggdGhpcy53YXRjaGRvZyApIHtcclxuXHRcdFx0YXdhaXQgdGhpcy53YXRjaGRvZy5yZW1vdmUoIHRoaXMuaWQgKTtcclxuXHRcdH0gZWxzZSBpZiAoIHRoaXMuZWRpdG9yV2F0Y2hkb2cgJiYgdGhpcy5lZGl0b3JXYXRjaGRvZy5lZGl0b3IgKSB7XHJcblx0XHRcdGF3YWl0IHRoaXMuZWRpdG9yV2F0Y2hkb2cuZGVzdHJveSgpO1xyXG5cclxuXHRcdFx0dGhpcy5lZGl0b3JXYXRjaGRvZyA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cclxuXHRwdWJsaWMgd3JpdGVWYWx1ZSggdmFsdWU6IHN0cmluZyB8IG51bGwgKTogdm9pZCB7XHJcblx0XHQvLyBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgd2l0aCB0aGUgYG51bGxgIHZhbHVlIHdoZW4gdGhlIGZvcm0gcmVzZXRzLlxyXG5cdFx0Ly8gQSBjb21wb25lbnQncyByZXNwb25zaWJpbGl0eSBpcyB0byByZXN0b3JlIHRvIHRoZSBpbml0aWFsIHN0YXRlLlxyXG5cdFx0aWYgKCB2YWx1ZSA9PT0gbnVsbCApIHtcclxuXHRcdFx0dmFsdWUgPSAnJztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBhbHJlYWR5IGluaXRpYWxpemVkLlxyXG5cdFx0aWYgKCB0aGlzLmVkaXRvckluc3RhbmNlICkge1xyXG5cdFx0XHQvLyBUaGUgbG9jayBtZWNoYW5pc20gcHJldmVudHMgZnJvbSBjYWxsaW5nIGBjdmFPbkNoYW5nZSgpYCBkdXJpbmcgY2hhbmdpbmdcclxuXHRcdFx0Ly8gdGhlIGVkaXRvciBzdGF0ZS4gU2VlICMxMzlcclxuXHRcdFx0dGhpcy5pc0VkaXRvclNldHRpbmdEYXRhID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5lZGl0b3JJbnN0YW5jZS5zZXREYXRhKCB2YWx1ZSApO1xyXG5cdFx0XHR0aGlzLmlzRWRpdG9yU2V0dGluZ0RhdGEgPSBmYWxzZTtcclxuXHRcdH1cclxuXHRcdC8vIElmIG5vdCwgd2FpdCBmb3IgaXQgdG8gYmUgcmVhZHk7IHN0b3JlIHRoZSBkYXRhLlxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdC8vIElmIHRoZSBlZGl0b3IgZWxlbWVudCBpcyBhbHJlYWR5IGF2YWlsYWJsZSwgdGhlbiB1cGRhdGUgaXRzIGNvbnRlbnQuXHJcblx0XHRcdHRoaXMuZGF0YSA9IHZhbHVlO1xyXG5cclxuXHRcdFx0Ly8gSWYgbm90LCB0aGVuIHdhaXQgdW50aWwgaXQgaXMgcmVhZHlcclxuXHRcdFx0Ly8gYW5kIGNoYW5nZSBkYXRhIG9ubHkgZm9yIHRoZSBmaXJzdCBgcmVhZHlgIGV2ZW50LlxyXG5cdFx0XHR0aGlzLnJlYWR5XHJcblx0XHRcdFx0LnBpcGUoIGZpcnN0KCkgKVxyXG5cdFx0XHRcdC5zdWJzY3JpYmUoICggZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yICkgPT4ge1xyXG5cdFx0XHRcdFx0ZWRpdG9yLnNldERhdGEoIHRoaXMuZGF0YSApO1xyXG5cdFx0XHRcdH0gKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cclxuXHRwdWJsaWMgcmVnaXN0ZXJPbkNoYW5nZSggY2FsbGJhY2s6ICggZGF0YTogc3RyaW5nICkgPT4gdm9pZCApOiB2b2lkIHtcclxuXHRcdHRoaXMuY3ZhT25DaGFuZ2UgPSBjYWxsYmFjaztcclxuXHR9XHJcblxyXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cclxuXHRwdWJsaWMgcmVnaXN0ZXJPblRvdWNoZWQoIGNhbGxiYWNrOiAoKSA9PiB2b2lkICk6IHZvaWQge1xyXG5cdFx0dGhpcy5jdmFPblRvdWNoZWQgPSBjYWxsYmFjaztcclxuXHR9XHJcblxyXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cclxuXHRwdWJsaWMgc2V0RGlzYWJsZWRTdGF0ZSggaXNEaXNhYmxlZDogYm9vbGVhbiApOiB2b2lkIHtcclxuXHRcdC8vIElmIGFscmVhZHkgaW5pdGlhbGl6ZWQuXHJcblx0XHRpZiAoIHRoaXMuZWRpdG9ySW5zdGFuY2UgKSB7XHJcblx0XHRcdGlmICggaXNEaXNhYmxlZCApIHtcclxuXHRcdFx0XHR0aGlzLmVkaXRvckluc3RhbmNlLmVuYWJsZVJlYWRPbmx5TW9kZSggQU5HVUxBUl9JTlRFR1JBVElPTl9SRUFEX09OTFlfTE9DS19JRCApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuZWRpdG9ySW5zdGFuY2UuZGlzYWJsZVJlYWRPbmx5TW9kZSggQU5HVUxBUl9JTlRFR1JBVElPTl9SRUFEX09OTFlfTE9DS19JRCApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3RvcmUgdGhlIHN0YXRlIGFueXdheSB0byB1c2UgaXQgb25jZSB0aGUgZWRpdG9yIGlzIGNyZWF0ZWQuXHJcblx0XHR0aGlzLmluaXRpYWxseURpc2FibGVkID0gaXNEaXNhYmxlZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgdGhlIGVkaXRvciBpbnN0YW5jZSwgc2V0cyBpbml0aWFsIGVkaXRvciBkYXRhLCB0aGVuIGludGVncmF0ZXNcclxuXHQgKiB0aGUgZWRpdG9yIHdpdGggdGhlIEFuZ3VsYXIgY29tcG9uZW50LiBUaGlzIG1ldGhvZCBkb2VzIG5vdCB1c2UgdGhlIGBlZGl0b3Iuc2V0RGF0YSgpYFxyXG5cdCAqIGJlY2F1c2Ugb2YgdGhlIGlzc3VlIGluIHRoZSBjb2xsYWJvcmF0aW9uIG1vZGUgKCM2KS5cclxuXHQgKi9cclxuXHRwcml2YXRlIGF0dGFjaFRvV2F0Y2hkb2coKSB7XHJcblx0XHRjb25zdCBjcmVhdG9yID0gYXN5bmMgKCBlbGVtZW50OiBIVE1MRWxlbWVudCwgY29uZmlnOiBDS0VkaXRvcjUuQ29uZmlnICkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5uZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5hcHBlbmRDaGlsZCggZWxlbWVudCApO1xyXG5cclxuXHRcdFx0XHRjb25zdCBlZGl0b3IgPSBhd2FpdCB0aGlzLmVkaXRvciEuY3JlYXRlKCBlbGVtZW50LCBjb25maWcgKTtcclxuXHJcblx0XHRcdFx0aWYgKCB0aGlzLmluaXRpYWxseURpc2FibGVkICkge1xyXG5cdFx0XHRcdFx0ZWRpdG9yLmVuYWJsZVJlYWRPbmx5TW9kZSggQU5HVUxBUl9JTlRFR1JBVElPTl9SRUFEX09OTFlfTE9DS19JRCApO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGhpcy5uZ1pvbmUucnVuKCAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnJlYWR5LmVtaXQoIGVkaXRvciApO1xyXG5cdFx0XHRcdH0gKTtcclxuXHJcblx0XHRcdFx0dGhpcy5zZXRVcEVkaXRvckV2ZW50cyggZWRpdG9yICk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBlZGl0b3I7XHJcblx0XHRcdH0gKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y29uc3QgZGVzdHJ1Y3RvciA9IGFzeW5jICggZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yICkgPT4ge1xyXG5cdFx0XHRhd2FpdCBlZGl0b3IuZGVzdHJveSgpO1xyXG5cdFx0XHRpZih0aGlzLmVsZW1lbnRSZWYgJiZ0aGlzLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudCApe1xyXG5cdFx0XHRcdHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LnJlbW92ZUNoaWxkKCB0aGlzLmVkaXRvckVsZW1lbnQhICk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Y29uc3QgZW1pdEVycm9yID0gKCkgPT4ge1xyXG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmVycm9yLmVtaXQoKTtcclxuXHRcdFx0fSApO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggdGhpcy50YWdOYW1lICk7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmdldENvbmZpZygpO1xyXG5cclxuXHRcdHRoaXMuZWRpdG9yRWxlbWVudCA9IGVsZW1lbnQ7XHJcblxyXG5cdFx0Ly8gQmFzZWQgb24gdGhlIHByZXNlbmNlIG9mIHRoZSB3YXRjaGRvZyBkZWNpZGUgaG93IHRvIGluaXRpYWxpemUgdGhlIGVkaXRvci5cclxuXHRcdGlmICggdGhpcy53YXRjaGRvZyApIHtcclxuXHRcdFx0Ly8gV2hlbiB0aGUgY29udGV4dCB3YXRjaGRvZyBpcyBwYXNzZWQgYWRkIHRoZSBuZXcgaXRlbSB0byBpdCBiYXNlZCBvbiB0aGUgcGFzc2VkIGNvbmZpZ3VyYXRpb24uXHJcblx0XHRcdHRoaXMud2F0Y2hkb2cuYWRkKCB7XHJcblx0XHRcdFx0aWQ6IHRoaXMuaWQsXHJcblx0XHRcdFx0dHlwZTogJ2VkaXRvcicsXHJcblx0XHRcdFx0Y3JlYXRvcixcclxuXHRcdFx0XHRkZXN0cnVjdG9yLFxyXG5cdFx0XHRcdHNvdXJjZUVsZW1lbnRPckRhdGE6IGVsZW1lbnQsXHJcblx0XHRcdFx0Y29uZmlnXHJcblx0XHRcdH0gKTtcclxuXHJcblx0XHRcdHRoaXMud2F0Y2hkb2cub24oICdpdGVtRXJyb3InLCAoIF8sIHsgaXRlbUlkIH0gKSA9PiB7XHJcblx0XHRcdFx0aWYgKCBpdGVtSWQgPT09IHRoaXMuaWQgKSB7XHJcblx0XHRcdFx0XHRlbWl0RXJyb3IoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEluIHRoZSBvdGhlciBjYXNlIGNyZWF0ZSB0aGUgd2F0Y2hkb2cgYnkgaGFuZCB0byBrZWVwIHRoZSBlZGl0b3IgcnVubmluZy5cclxuXHRcdFx0Y29uc3QgZWRpdG9yV2F0Y2hkb2c6IENLRWRpdG9yNS5FZGl0b3JXYXRjaGRvZyA9IG5ldyBFZGl0b3JXYXRjaGRvZyggdGhpcy5lZGl0b3IgKTtcclxuXHJcblx0XHRcdGVkaXRvcldhdGNoZG9nLnNldENyZWF0b3IoIGNyZWF0b3IgKTtcclxuXHRcdFx0ZWRpdG9yV2F0Y2hkb2cuc2V0RGVzdHJ1Y3RvciggZGVzdHJ1Y3RvciApO1xyXG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5vbiggJ2Vycm9yJywgZW1pdEVycm9yICk7XHJcblxyXG5cdFx0XHR0aGlzLmVkaXRvcldhdGNoZG9nID0gZWRpdG9yV2F0Y2hkb2c7XHJcblxyXG5cdFx0XHR0aGlzLmVkaXRvcldhdGNoZG9nLmNyZWF0ZSggZWxlbWVudCwgY29uZmlnICk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldENvbmZpZygpIHtcclxuXHRcdGlmICggdGhpcy5kYXRhICYmIHRoaXMuY29uZmlnLmluaXRpYWxEYXRhICkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoICdFZGl0b3IgZGF0YSBzaG91bGQgYmUgcHJvdmlkZWQgZWl0aGVyIHVzaW5nIGBjb25maWcuaW5pdGlhbERhdGFgIG9yIGBkYXRhYCBwcm9wZXJ0aWVzLicgKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuY29uZmlnIH07XHJcblxyXG5cdFx0Ly8gTWVyZ2UgdHdvIHBvc3NpYmxlIHdheXMgb2YgcHJvdmlkaW5nIGRhdGEgaW50byB0aGUgYGNvbmZpZy5pbml0aWFsRGF0YWAgZmllbGQuXHJcblx0XHRjb25zdCBpbml0aWFsRGF0YSA9IHRoaXMuY29uZmlnLmluaXRpYWxEYXRhIHx8IHRoaXMuZGF0YTtcclxuXHJcblx0XHRpZiAoIGluaXRpYWxEYXRhICkge1xyXG5cdFx0XHQvLyBEZWZpbmUgdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIG9ubHkgd2hlbiB0aGUgaW5pdGlhbCBjb250ZW50IGlzIHNwZWNpZmllZC5cclxuXHRcdFx0Y29uZmlnLmluaXRpYWxEYXRhID0gaW5pdGlhbERhdGE7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNvbmZpZztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEludGVncmF0ZXMgdGhlIGVkaXRvciB3aXRoIHRoZSBjb21wb25lbnQgYnkgYXR0YWNoaW5nIHJlbGF0ZWQgZXZlbnQgbGlzdGVuZXJzLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2V0VXBFZGl0b3JFdmVudHMoIGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvciApOiB2b2lkIHtcclxuXHRcdGNvbnN0IG1vZGVsRG9jdW1lbnQgPSBlZGl0b3IubW9kZWwuZG9jdW1lbnQ7XHJcblx0XHRjb25zdCB2aWV3RG9jdW1lbnQgPSBlZGl0b3IuZWRpdGluZy52aWV3LmRvY3VtZW50O1xyXG5cclxuXHRcdG1vZGVsRG9jdW1lbnQub24oICdjaGFuZ2U6ZGF0YScsICggZXZ0OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdjaGFuZ2U6ZGF0YSc+ICkgPT4ge1xyXG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcclxuXHRcdFx0XHRpZiAoIHRoaXMuY3ZhT25DaGFuZ2UgJiYgIXRoaXMuaXNFZGl0b3JTZXR0aW5nRGF0YSApIHtcclxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBlZGl0b3IuZ2V0RGF0YSgpO1xyXG5cclxuXHRcdFx0XHRcdHRoaXMuY3ZhT25DaGFuZ2UoIGRhdGEgKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRoaXMuY2hhbmdlLmVtaXQoIHsgZXZlbnQ6IGV2dCwgZWRpdG9yIH0gKTtcclxuXHRcdFx0fSApO1xyXG5cdFx0fSApO1xyXG5cclxuXHRcdHZpZXdEb2N1bWVudC5vbiggJ2ZvY3VzJywgKCBldnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2ZvY3VzJz4gKSA9PiB7XHJcblx0XHRcdHRoaXMubmdab25lLnJ1biggKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuZm9jdXMuZW1pdCggeyBldmVudDogZXZ0LCBlZGl0b3IgfSApO1xyXG5cdFx0XHR9ICk7XHJcblx0XHR9ICk7XHJcblxyXG5cdFx0dmlld0RvY3VtZW50Lm9uKCAnYmx1cicsICggZXZ0OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdibHVyJz4gKSA9PiB7XHJcblx0XHRcdHRoaXMubmdab25lLnJ1biggKCkgPT4ge1xyXG5cdFx0XHRcdGlmICggdGhpcy5jdmFPblRvdWNoZWQgKSB7XHJcblx0XHRcdFx0XHR0aGlzLmN2YU9uVG91Y2hlZCgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGhpcy5ibHVyLmVtaXQoIHsgZXZlbnQ6IGV2dCwgZWRpdG9yIH0gKTtcclxuXHRcdFx0fSApO1xyXG5cdFx0fSApO1xyXG5cdH1cclxufVxyXG4iXX0=