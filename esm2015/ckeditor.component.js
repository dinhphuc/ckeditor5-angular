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
            // this.elementRef.nativeElement.removeChild( this.editorElement! );
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2tlZGl0b3IuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NrZWRpdG9yL2NrZWRpdG9yLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBUUgsT0FBTyxFQUNOLFNBQVMsRUFDVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osVUFBVSxFQUVWLFVBQVUsRUFDVixNQUFNLGVBQWUsQ0FBQztBQUV2QixPQUFPLGNBQWMsTUFBTSxpREFBaUQsQ0FBQztBQUM3RSxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFckMsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDO0FBRXhCLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsTUFBTSxnQkFBZ0IsQ0FBQztBQUl4QixNQUFNLHFDQUFxQyxHQUFHLDZEQUE2RCxDQUFDO0FBK0I1RyxNQUFNLE9BQU8saUJBQWlCO0lBMEo3QixZQUFtQixVQUFzQixFQUFFLE1BQWM7UUE5SXpEOzs7O1dBSUc7UUFDYSxXQUFNLEdBQXFCLEVBQUUsQ0FBQztRQUU5Qzs7O1dBR0c7UUFDYSxTQUFJLEdBQUcsRUFBRSxDQUFDO1FBRTFCOzs7O1dBSUc7UUFDYSxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBeUJoQzs7OztXQUlHO1FBQ2MsVUFBSyxHQUFHLElBQUksWUFBWSxFQUFvQixDQUFDO1FBRTlEOzs7O1dBSUc7UUFDYyxXQUFNLEdBQThCLElBQUksWUFBWSxFQUFlLENBQUM7UUFFckY7Ozs7V0FJRztRQUNjLFNBQUksR0FBNEIsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUUvRTs7OztXQUlHO1FBQ2MsVUFBSyxHQUE2QixJQUFJLFlBQVksRUFBYyxDQUFDO1FBRWxGOztXQUVHO1FBQ2MsVUFBSyxHQUF1QixJQUFJLFlBQVksRUFBUSxDQUFDO1FBNEJ0RTs7O1dBR0c7UUFDSyxzQkFBaUIsR0FBRyxLQUFLLENBQUM7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Q0FBQyxZQUFZLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztpQkFDcEI7Z0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7OztZQWxZRCxTQUFTLFNBQUM7Z0JBQ1YsUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLFFBQVEsRUFBRSw2QkFBNkI7Z0JBRXZDLG1DQUFtQztnQkFDbkMsU0FBUyxFQUFFO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxpQkFBaUI7d0JBQzFCLG1FQUFtRTt3QkFDbkUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQzt3QkFDaEQsS0FBSyxFQUFFLElBQUk7cUJBQ1g7aUJBQ0Q7YUFDRDs7O1lBN0NBLFVBQVU7WUFKVixNQUFNOzs7cUJBNERMLEtBQUs7cUJBT0wsS0FBSzttQkFNTCxLQUFLO3NCQU9MLEtBQUs7dUJBS0wsS0FBSzt1QkFPTCxLQUFLO29CQWtCTCxNQUFNO3FCQU9OLE1BQU07bUJBT04sTUFBTTtvQkFPTixNQUFNO29CQUtOLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlIENvcHlyaWdodCAoYykgMjAwMy0yMDIyLCBDS1NvdXJjZSBIb2xkaW5nIHNwLiB6IG8uby4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIEZvciBsaWNlbnNpbmcsIHNlZSBMSUNFTlNFLm1kLlxuICovXG5cbmRlY2xhcmUgZ2xvYmFsIHtcblx0aW50ZXJmYWNlIFdpbmRvdyB7XG5cdFx0Q0tFRElUT1JfVkVSU0lPTj86IHN0cmluZztcblx0fVxufVxuXG5pbXBvcnQge1xuXHRDb21wb25lbnQsXG5cdElucHV0LFxuXHRPdXRwdXQsXG5cdE5nWm9uZSxcblx0RXZlbnRFbWl0dGVyLFxuXHRmb3J3YXJkUmVmLFxuXHRBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3ksXG5cdEVsZW1lbnRSZWZcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCBFZGl0b3JXYXRjaGRvZyBmcm9tICdAY2tlZGl0b3IvY2tlZGl0b3I1LXdhdGNoZG9nL3NyYy9lZGl0b3J3YXRjaGRvZyc7XG5pbXBvcnQge2ZpcnN0fSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB1aWQgZnJvbSAnLi91aWQnO1xuXG5pbXBvcnQge1xuXHRDb250cm9sVmFsdWVBY2Nlc3Nvcixcblx0TkdfVkFMVUVfQUNDRVNTT1Jcbn0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuXG5pbXBvcnQge0NLRWRpdG9yNX0gZnJvbSAnLi9ja2VkaXRvcic7XG5cbmNvbnN0IEFOR1VMQVJfSU5URUdSQVRJT05fUkVBRF9PTkxZX0xPQ0tfSUQgPSAnTG9jayBmcm9tIEFuZ3VsYXIgaW50ZWdyYXRpb24gKEBja2VkaXRvci9ja2VkaXRvcjUtYW5ndWxhciknO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJsdXJFdmVudCB7XG5cdGV2ZW50OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdibHVyJz47XG5cdGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGb2N1c0V2ZW50IHtcblx0ZXZlbnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2ZvY3VzJz47XG5cdGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGFuZ2VFdmVudCB7XG5cdGV2ZW50OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdjaGFuZ2U6ZGF0YSc+O1xuXHRlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3I7XG59XG5cbkBDb21wb25lbnQoe1xuXHRzZWxlY3RvcjogJ2NrZWRpdG9yJyxcblx0dGVtcGxhdGU6ICc8bmctdGVtcGxhdGU+PC9uZy10ZW1wbGF0ZT4nLFxuXG5cdC8vIEludGVncmF0aW9uIHdpdGggQGFuZ3VsYXIvZm9ybXMuXG5cdHByb3ZpZGVyczogW1xuXHRcdHtcblx0XHRcdHByb3ZpZGU6IE5HX1ZBTFVFX0FDQ0VTU09SLFxuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuXHRcdFx0dXNlRXhpc3Rpbmc6IGZvcndhcmRSZWYoKCkgPT4gQ0tFZGl0b3JDb21wb25lbnQpLFxuXHRcdFx0bXVsdGk6IHRydWVcblx0XHR9XG5cdF1cbn0pXG5leHBvcnQgY2xhc3MgQ0tFZGl0b3JDb21wb25lbnQgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3ksIENvbnRyb2xWYWx1ZUFjY2Vzc29yIHtcblx0LyoqXG5cdCAqIFRoZSByZWZlcmVuY2UgdG8gdGhlIERPTSBlbGVtZW50IGNyZWF0ZWQgYnkgdGhlIGNvbXBvbmVudC5cblx0ICovXG5cdHByaXZhdGUgZWxlbWVudFJlZiE6IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+O1xuXG5cdC8qKlxuXHQgKiBUaGUgY29uc3RydWN0b3Igb2YgdGhlIGVkaXRvciB0byBiZSB1c2VkIGZvciB0aGUgaW5zdGFuY2Ugb2YgdGhlIGNvbXBvbmVudC5cblx0ICogSXQgY2FuIGJlIGUuZy4gdGhlIGBDbGFzc2ljRWRpdG9yQnVpbGRgLCBgSW5saW5lRWRpdG9yQnVpbGRgIG9yIHNvbWUgY3VzdG9tIGVkaXRvci5cblx0ICovXG5cdEBJbnB1dCgpIHB1YmxpYyBlZGl0b3I/OiBDS0VkaXRvcjUuRWRpdG9yQ29uc3RydWN0b3I7XG5cblx0LyoqXG5cdCAqIFRoZSBjb25maWd1cmF0aW9uIG9mIHRoZSBlZGl0b3IuXG5cdCAqIFNlZSBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9jb3JlX2VkaXRvcl9lZGl0b3Jjb25maWctRWRpdG9yQ29uZmlnLmh0bWxcblx0ICogdG8gbGVhcm4gbW9yZS5cblx0ICovXG5cdEBJbnB1dCgpIHB1YmxpYyBjb25maWc6IENLRWRpdG9yNS5Db25maWcgPSB7fTtcblxuXHQvKipcblx0ICogVGhlIGluaXRpYWwgZGF0YSBvZiB0aGUgZWRpdG9yLiBVc2VmdWwgd2hlbiBub3QgdXNpbmcgdGhlIG5nTW9kZWwuXG5cdCAqIFNlZSBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2Zvcm1zL05nTW9kZWwgdG8gbGVhcm4gbW9yZS5cblx0ICovXG5cdEBJbnB1dCgpIHB1YmxpYyBkYXRhID0gJyc7XG5cblx0LyoqXG5cdCAqIFRhZyBuYW1lIG9mIHRoZSBlZGl0b3IgY29tcG9uZW50LlxuXHQgKlxuXHQgKiBUaGUgZGVmYXVsdCB0YWcgaXMgJ2RpdicuXG5cdCAqL1xuXHRASW5wdXQoKSBwdWJsaWMgdGFnTmFtZSA9ICdkaXYnO1xuXG5cdC8qKlxuXHQgKiBUaGUgY29udGV4dCB3YXRjaGRvZy5cblx0ICovXG5cdEBJbnB1dCgpIHB1YmxpYyB3YXRjaGRvZz86IENLRWRpdG9yNS5Db250ZXh0V2F0Y2hkb2c7XG5cblx0LyoqXG5cdCAqIFdoZW4gc2V0IGB0cnVlYCwgdGhlIGVkaXRvciBiZWNvbWVzIHJlYWQtb25seS5cblx0ICogU2VlIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2NvcmVfZWRpdG9yX2VkaXRvci1FZGl0b3IuaHRtbCNtZW1iZXItaXNSZWFkT25seVxuXHQgKiB0byBsZWFybiBtb3JlLlxuXHQgKi9cblx0QElucHV0KClcblx0cHVibGljIHNldCBkaXNhYmxlZChpc0Rpc2FibGVkOiBib29sZWFuKSB7XG5cdFx0dGhpcy5zZXREaXNhYmxlZFN0YXRlKGlzRGlzYWJsZWQpO1xuXHR9XG5cblx0cHVibGljIGdldCBkaXNhYmxlZCgpOiBib29sZWFuIHtcblx0XHRpZiAodGhpcy5lZGl0b3JJbnN0YW5jZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZWRpdG9ySW5zdGFuY2UuaXNSZWFkT25seTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5pbml0aWFsbHlEaXNhYmxlZDtcblx0fVxuXG5cdC8qKlxuXHQgKiBGaXJlcyB3aGVuIHRoZSBlZGl0b3IgaXMgcmVhZHkuIEl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGBlZGl0b3IjcmVhZHlgXG5cdCAqIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2NvcmVfZWRpdG9yX2VkaXRvci1FZGl0b3IuaHRtbCNldmVudC1yZWFkeVxuXHQgKiBldmVudC5cblx0ICovXG5cdEBPdXRwdXQoKSBwdWJsaWMgcmVhZHkgPSBuZXcgRXZlbnRFbWl0dGVyPENLRWRpdG9yNS5FZGl0b3I+KCk7XG5cblx0LyoqXG5cdCAqIEZpcmVzIHdoZW4gdGhlIGNvbnRlbnQgb2YgdGhlIGVkaXRvciBoYXMgY2hhbmdlZC4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvci5tb2RlbC5kb2N1bWVudCNjaGFuZ2VgXG5cdCAqIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2VuZ2luZV9tb2RlbF9kb2N1bWVudC1Eb2N1bWVudC5odG1sI2V2ZW50LWNoYW5nZVxuXHQgKiBldmVudC5cblx0ICovXG5cdEBPdXRwdXQoKSBwdWJsaWMgY2hhbmdlOiBFdmVudEVtaXR0ZXI8Q2hhbmdlRXZlbnQ+ID0gbmV3IEV2ZW50RW1pdHRlcjxDaGFuZ2VFdmVudD4oKTtcblxuXHQvKipcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdGluZyB2aWV3IG9mIHRoZSBlZGl0b3IgaXMgYmx1cnJlZC4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvci5lZGl0aW5nLnZpZXcuZG9jdW1lbnQjYmx1cmBcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfZW5naW5lX3ZpZXdfZG9jdW1lbnQtRG9jdW1lbnQuaHRtbCNldmVudC1ldmVudDpibHVyXG5cdCAqIGV2ZW50LlxuXHQgKi9cblx0QE91dHB1dCgpIHB1YmxpYyBibHVyOiBFdmVudEVtaXR0ZXI8Qmx1ckV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8Qmx1ckV2ZW50PigpO1xuXG5cdC8qKlxuXHQgKiBGaXJlcyB3aGVuIHRoZSBlZGl0aW5nIHZpZXcgb2YgdGhlIGVkaXRvciBpcyBmb2N1c2VkLiBJdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBgZWRpdG9yLmVkaXRpbmcudmlldy5kb2N1bWVudCNmb2N1c2Bcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfZW5naW5lX3ZpZXdfZG9jdW1lbnQtRG9jdW1lbnQuaHRtbCNldmVudC1ldmVudDpmb2N1c1xuXHQgKiBldmVudC5cblx0ICovXG5cdEBPdXRwdXQoKSBwdWJsaWMgZm9jdXM6IEV2ZW50RW1pdHRlcjxGb2N1c0V2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8Rm9jdXNFdmVudD4oKTtcblxuXHQvKipcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdG9yIGNvbXBvbmVudCBjcmFzaGVzLlxuXHQgKi9cblx0QE91dHB1dCgpIHB1YmxpYyBlcnJvcjogRXZlbnRFbWl0dGVyPHZvaWQ+ID0gbmV3IEV2ZW50RW1pdHRlcjx2b2lkPigpO1xuXG5cdC8qKlxuXHQgKiBUaGUgaW5zdGFuY2Ugb2YgdGhlIGVkaXRvciBjcmVhdGVkIGJ5IHRoaXMgY29tcG9uZW50LlxuXHQgKi9cblx0cHVibGljIGdldCBlZGl0b3JJbnN0YW5jZSgpOiBDS0VkaXRvcjUuRWRpdG9yIHwgbnVsbCB7XG5cdFx0bGV0IGVkaXRvcldhdGNoZG9nID0gdGhpcy5lZGl0b3JXYXRjaGRvZztcblxuXHRcdGlmICh0aGlzLndhdGNoZG9nKSB7XG5cdFx0XHQvLyBUZW1wb3JhcmlseSB1c2UgdGhlIGBfd2F0Y2hkb2dzYCBpbnRlcm5hbCBtYXAgYXMgdGhlIGBnZXRJdGVtKClgIG1ldGhvZCB0aHJvd3Ncblx0XHRcdC8vIGFuIGVycm9yIHdoZW4gdGhlIGl0ZW0gaXMgbm90IHJlZ2lzdGVyZWQgeWV0LlxuXHRcdFx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ja2VkaXRvci9ja2VkaXRvcjUtYW5ndWxhci9pc3N1ZXMvMTc3LlxuXHRcdFx0ZWRpdG9yV2F0Y2hkb2cgPSB0aGlzLndhdGNoZG9nLl93YXRjaGRvZ3MuZ2V0KHRoaXMuaWQpO1xuXHRcdH1cblxuXHRcdGlmIChlZGl0b3JXYXRjaGRvZykge1xuXHRcdFx0cmV0dXJuIGVkaXRvcldhdGNoZG9nLmVkaXRvcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgZWRpdG9yIHdhdGNoZG9nLiBJdCBpcyBjcmVhdGVkIHdoZW4gdGhlIGNvbnRleHQgd2F0Y2hkb2cgaXMgbm90IHBhc3NlZCB0byB0aGUgY29tcG9uZW50LlxuXHQgKiBJdCBrZWVwcyB0aGUgZWRpdG9yIHJ1bm5pbmcuXG5cdCAqL1xuXHRwcml2YXRlIGVkaXRvcldhdGNoZG9nPzogQ0tFZGl0b3I1LkVkaXRvcldhdGNoZG9nO1xuXG5cdC8qKlxuXHQgKiBJZiB0aGUgY29tcG9uZW50IGlzIHJlYWTigJNvbmx5IGJlZm9yZSB0aGUgZWRpdG9yIGluc3RhbmNlIGlzIGNyZWF0ZWQsIGl0IHJlbWVtYmVycyB0aGF0IHN0YXRlLFxuXHQgKiBzbyB0aGUgZWRpdG9yIGNhbiBiZWNvbWUgcmVhZOKAk29ubHkgb25jZSBpdCBpcyByZWFkeS5cblx0ICovXG5cdHByaXZhdGUgaW5pdGlhbGx5RGlzYWJsZWQgPSBmYWxzZTtcblxuXHQvKipcblx0ICogQW4gaW5zdGFuY2Ugb2YgaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaS9jb3JlL05nWm9uZSB0byBhbGxvdyB0aGUgaW50ZXJhY3Rpb24gd2l0aCB0aGUgZWRpdG9yXG5cdCAqIHdpdGhpbmcgdGhlIEFuZ3VsYXIgZXZlbnQgbG9vcC5cblx0ICovXG5cdHByaXZhdGUgbmdab25lOiBOZ1pvbmU7XG5cblx0LyoqXG5cdCAqIEEgY2FsbGJhY2sgZXhlY3V0ZWQgd2hlbiB0aGUgY29udGVudCBvZiB0aGUgZWRpdG9yIGNoYW5nZXMuIFBhcnQgb2YgdGhlXG5cdCAqIGBDb250cm9sVmFsdWVBY2Nlc3NvcmAgKGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvQ29udHJvbFZhbHVlQWNjZXNzb3IpIGludGVyZmFjZS5cblx0ICpcblx0ICogTm90ZTogVW5zZXQgdW5sZXNzIHRoZSBjb21wb25lbnQgdXNlcyB0aGUgYG5nTW9kZWxgLlxuXHQgKi9cblx0cHJpdmF0ZSBjdmFPbkNoYW5nZT86IChkYXRhOiBzdHJpbmcpID0+IHZvaWQ7XG5cblx0LyoqXG5cdCAqIEEgY2FsbGJhY2sgZXhlY3V0ZWQgd2hlbiB0aGUgZWRpdG9yIGhhcyBiZWVuIGJsdXJyZWQuIFBhcnQgb2YgdGhlXG5cdCAqIGBDb250cm9sVmFsdWVBY2Nlc3NvcmAgKGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvQ29udHJvbFZhbHVlQWNjZXNzb3IpIGludGVyZmFjZS5cblx0ICpcblx0ICogTm90ZTogVW5zZXQgdW5sZXNzIHRoZSBjb21wb25lbnQgdXNlcyB0aGUgYG5nTW9kZWxgLlxuXHQgKi9cblx0cHJpdmF0ZSBjdmFPblRvdWNoZWQ/OiAoKSA9PiB2b2lkO1xuXG5cdC8qKlxuXHQgKiBSZWZlcmVuY2UgdG8gdGhlIHNvdXJjZSBlbGVtZW50IHVzZWQgYnkgdGhlIGVkaXRvci5cblx0ICovXG5cdHByaXZhdGUgZWRpdG9yRWxlbWVudD86IEhUTUxFbGVtZW50O1xuXG5cdC8qKlxuXHQgKiBBIGxvY2sgZmxhZyBwcmV2ZW50aW5nIGZyb20gY2FsbGluZyB0aGUgYGN2YU9uQ2hhbmdlKClgIGR1cmluZyBzZXR0aW5nIGVkaXRvciBkYXRhLlxuXHQgKi9cblx0cHJpdmF0ZSBpc0VkaXRvclNldHRpbmdEYXRhID0gZmFsc2U7XG5cblx0cHJpdmF0ZSBpZCA9IHVpZCgpO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihlbGVtZW50UmVmOiBFbGVtZW50UmVmLCBuZ1pvbmU6IE5nWm9uZSkge1xuXHRcdHRoaXMubmdab25lID0gbmdab25lO1xuXHRcdHRoaXMuZWxlbWVudFJlZiA9IGVsZW1lbnRSZWY7XG5cblx0XHRjb25zdCB7Q0tFRElUT1JfVkVSU0lPTn0gPSB3aW5kb3c7XG5cblx0XHQvLyBTdGFydGluZyBmcm9tIHYzNC4wLjAsIENLRWRpdG9yIDUgaW50cm9kdWNlcyBhIGxvY2sgbWVjaGFuaXNtIGVuYWJsaW5nL2Rpc2FibGluZyB0aGUgcmVhZC1vbmx5IG1vZGUuXG5cdFx0Ly8gQXMgaXQgaXMgYSBicmVha2luZyBjaGFuZ2UgYmV0d2VlbiBtYWpvciByZWxlYXNlcyBvZiB0aGUgaW50ZWdyYXRpb24sIHRoZSBjb21wb25lbnQgcmVxdWlyZXMgdXNpbmdcblx0XHQvLyBDS0VkaXRvciA1IGluIHZlcnNpb24gMzQgb3IgaGlnaGVyLlxuXHRcdGlmIChDS0VESVRPUl9WRVJTSU9OKSB7XG5cdFx0XHRjb25zdCBbbWFqb3JdID0gQ0tFRElUT1JfVkVSU0lPTi5zcGxpdCgnLicpLm1hcChOdW1iZXIpO1xuXG5cdFx0XHRpZiAobWFqb3IgPCAzNCkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oJ1RoZSA8Q0tFZGl0b3I+IGNvbXBvbmVudCByZXF1aXJlcyB1c2luZyBDS0VkaXRvciA1IGluIHZlcnNpb24gMzQgb3IgaGlnaGVyLicpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLndhcm4oJ0Nhbm5vdCBmaW5kIHRoZSBcIkNLRURJVE9SX1ZFUlNJT05cIiBpbiB0aGUgXCJ3aW5kb3dcIiBzY29wZS4nKTtcblx0XHR9XG5cdH1cblxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIEFmdGVyVmlld0luaXQgaW50ZXJmYWNlLlxuXHRwdWJsaWMgbmdBZnRlclZpZXdJbml0KCk6IHZvaWQge1xuXHRcdHRoaXMuYXR0YWNoVG9XYXRjaGRvZygpO1xuXHR9XG5cblx0Ly8gSW1wbGVtZW50aW5nIHRoZSBPbkRlc3Ryb3kgaW50ZXJmYWNlLlxuXHRwdWJsaWMgYXN5bmMgbmdPbkRlc3Ryb3koKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0aWYgKHRoaXMud2F0Y2hkb2cpIHtcblx0XHRcdGF3YWl0IHRoaXMud2F0Y2hkb2cucmVtb3ZlKHRoaXMuaWQpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5lZGl0b3JXYXRjaGRvZyAmJiB0aGlzLmVkaXRvcldhdGNoZG9nLmVkaXRvcikge1xuXHRcdFx0YXdhaXQgdGhpcy5lZGl0b3JXYXRjaGRvZy5kZXN0cm95KCk7XG5cblx0XHRcdHRoaXMuZWRpdG9yV2F0Y2hkb2cgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXHR9XG5cblx0Ly8gSW1wbGVtZW50aW5nIHRoZSBDb250cm9sVmFsdWVBY2Nlc3NvciBpbnRlcmZhY2UgKG9ubHkgd2hlbiBiaW5kaW5nIHRvIG5nTW9kZWwpLlxuXHRwdWJsaWMgd3JpdGVWYWx1ZSh2YWx1ZTogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuXHRcdC8vIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIHRoZSBgbnVsbGAgdmFsdWUgd2hlbiB0aGUgZm9ybSByZXNldHMuXG5cdFx0Ly8gQSBjb21wb25lbnQncyByZXNwb25zaWJpbGl0eSBpcyB0byByZXN0b3JlIHRvIHRoZSBpbml0aWFsIHN0YXRlLlxuXHRcdGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuXHRcdFx0dmFsdWUgPSAnJztcblx0XHR9XG5cblx0XHQvLyBJZiBhbHJlYWR5IGluaXRpYWxpemVkLlxuXHRcdGlmICh0aGlzLmVkaXRvckluc3RhbmNlKSB7XG5cdFx0XHQvLyBUaGUgbG9jayBtZWNoYW5pc20gcHJldmVudHMgZnJvbSBjYWxsaW5nIGBjdmFPbkNoYW5nZSgpYCBkdXJpbmcgY2hhbmdpbmdcblx0XHRcdC8vIHRoZSBlZGl0b3Igc3RhdGUuIFNlZSAjMTM5XG5cdFx0XHR0aGlzLmlzRWRpdG9yU2V0dGluZ0RhdGEgPSB0cnVlO1xuXHRcdFx0dGhpcy5lZGl0b3JJbnN0YW5jZS5zZXREYXRhKHZhbHVlKTtcblx0XHRcdHRoaXMuaXNFZGl0b3JTZXR0aW5nRGF0YSA9IGZhbHNlO1xuXHRcdH1cblx0XHQvLyBJZiBub3QsIHdhaXQgZm9yIGl0IHRvIGJlIHJlYWR5OyBzdG9yZSB0aGUgZGF0YS5cblx0XHRlbHNlIHtcblx0XHRcdC8vIElmIHRoZSBlZGl0b3IgZWxlbWVudCBpcyBhbHJlYWR5IGF2YWlsYWJsZSwgdGhlbiB1cGRhdGUgaXRzIGNvbnRlbnQuXG5cdFx0XHR0aGlzLmRhdGEgPSB2YWx1ZTtcblxuXHRcdFx0Ly8gSWYgbm90LCB0aGVuIHdhaXQgdW50aWwgaXQgaXMgcmVhZHlcblx0XHRcdC8vIGFuZCBjaGFuZ2UgZGF0YSBvbmx5IGZvciB0aGUgZmlyc3QgYHJlYWR5YCBldmVudC5cblx0XHRcdHRoaXMucmVhZHlcblx0XHRcdFx0LnBpcGUoZmlyc3QoKSlcblx0XHRcdFx0LnN1YnNjcmliZSgoZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yKSA9PiB7XG5cdFx0XHRcdFx0ZWRpdG9yLnNldERhdGEodGhpcy5kYXRhKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gSW1wbGVtZW50aW5nIHRoZSBDb250cm9sVmFsdWVBY2Nlc3NvciBpbnRlcmZhY2UgKG9ubHkgd2hlbiBiaW5kaW5nIHRvIG5nTW9kZWwpLlxuXHRwdWJsaWMgcmVnaXN0ZXJPbkNoYW5nZShjYWxsYmFjazogKGRhdGE6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuXHRcdHRoaXMuY3ZhT25DaGFuZ2UgPSBjYWxsYmFjaztcblx0fVxuXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cblx0cHVibGljIHJlZ2lzdGVyT25Ub3VjaGVkKGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG5cdFx0dGhpcy5jdmFPblRvdWNoZWQgPSBjYWxsYmFjaztcblx0fVxuXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cblx0cHVibGljIHNldERpc2FibGVkU3RhdGUoaXNEaXNhYmxlZDogYm9vbGVhbik6IHZvaWQge1xuXHRcdC8vIElmIGFscmVhZHkgaW5pdGlhbGl6ZWQuXG5cdFx0aWYgKHRoaXMuZWRpdG9ySW5zdGFuY2UpIHtcblx0XHRcdGlmIChpc0Rpc2FibGVkKSB7XG5cdFx0XHRcdHRoaXMuZWRpdG9ySW5zdGFuY2UuZW5hYmxlUmVhZE9ubHlNb2RlKEFOR1VMQVJfSU5URUdSQVRJT05fUkVBRF9PTkxZX0xPQ0tfSUQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5lZGl0b3JJbnN0YW5jZS5kaXNhYmxlUmVhZE9ubHlNb2RlKEFOR1VMQVJfSU5URUdSQVRJT05fUkVBRF9PTkxZX0xPQ0tfSUQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFN0b3JlIHRoZSBzdGF0ZSBhbnl3YXkgdG8gdXNlIGl0IG9uY2UgdGhlIGVkaXRvciBpcyBjcmVhdGVkLlxuXHRcdHRoaXMuaW5pdGlhbGx5RGlzYWJsZWQgPSBpc0Rpc2FibGVkO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGVkaXRvciBpbnN0YW5jZSwgc2V0cyBpbml0aWFsIGVkaXRvciBkYXRhLCB0aGVuIGludGVncmF0ZXNcblx0ICogdGhlIGVkaXRvciB3aXRoIHRoZSBBbmd1bGFyIGNvbXBvbmVudC4gVGhpcyBtZXRob2QgZG9lcyBub3QgdXNlIHRoZSBgZWRpdG9yLnNldERhdGEoKWBcblx0ICogYmVjYXVzZSBvZiB0aGUgaXNzdWUgaW4gdGhlIGNvbGxhYm9yYXRpb24gbW9kZSAoIzYpLlxuXHQgKi9cblx0cHJpdmF0ZSBhdHRhY2hUb1dhdGNoZG9nKCkge1xuXHRcdGNvbnN0IGNyZWF0b3IgPSBhc3luYyAoZWxlbWVudDogSFRNTEVsZW1lbnQsIGNvbmZpZzogQ0tFZGl0b3I1LkNvbmZpZykgPT4ge1xuXHRcdFx0cmV0dXJuIHRoaXMubmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKGFzeW5jICgpID0+IHtcblx0XHRcdFx0dGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG5cblx0XHRcdFx0Y29uc3QgZWRpdG9yID0gYXdhaXQgdGhpcy5lZGl0b3IhLmNyZWF0ZShlbGVtZW50LCBjb25maWcpO1xuXG5cdFx0XHRcdGlmICh0aGlzLmluaXRpYWxseURpc2FibGVkKSB7XG5cdFx0XHRcdFx0ZWRpdG9yLmVuYWJsZVJlYWRPbmx5TW9kZShBTkdVTEFSX0lOVEVHUkFUSU9OX1JFQURfT05MWV9MT0NLX0lEKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMubmdab25lLnJ1bigoKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5yZWFkeS5lbWl0KGVkaXRvcik7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHRoaXMuc2V0VXBFZGl0b3JFdmVudHMoZWRpdG9yKTtcblxuXHRcdFx0XHRyZXR1cm4gZWRpdG9yO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdGNvbnN0IGRlc3RydWN0b3IgPSBhc3luYyAoZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yKSA9PiB7XG5cdFx0XHRhd2FpdCBlZGl0b3IuZGVzdHJveSgpO1xuXG5cdFx0XHQvLyB0aGlzLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5yZW1vdmVDaGlsZCggdGhpcy5lZGl0b3JFbGVtZW50ISApO1xuXHRcdH07XG5cblx0XHRjb25zdCBlbWl0RXJyb3IgPSAoKSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oKCkgPT4ge1xuXHRcdFx0XHR0aGlzLmVycm9yLmVtaXQoKTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHRjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLnRhZ05hbWUpO1xuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZ2V0Q29uZmlnKCk7XG5cblx0XHR0aGlzLmVkaXRvckVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8gQmFzZWQgb24gdGhlIHByZXNlbmNlIG9mIHRoZSB3YXRjaGRvZyBkZWNpZGUgaG93IHRvIGluaXRpYWxpemUgdGhlIGVkaXRvci5cblx0XHRpZiAodGhpcy53YXRjaGRvZykge1xuXHRcdFx0Ly8gV2hlbiB0aGUgY29udGV4dCB3YXRjaGRvZyBpcyBwYXNzZWQgYWRkIHRoZSBuZXcgaXRlbSB0byBpdCBiYXNlZCBvbiB0aGUgcGFzc2VkIGNvbmZpZ3VyYXRpb24uXG5cdFx0XHR0aGlzLndhdGNoZG9nLmFkZCh7XG5cdFx0XHRcdGlkOiB0aGlzLmlkLFxuXHRcdFx0XHR0eXBlOiAnZWRpdG9yJyxcblx0XHRcdFx0Y3JlYXRvcixcblx0XHRcdFx0ZGVzdHJ1Y3Rvcixcblx0XHRcdFx0c291cmNlRWxlbWVudE9yRGF0YTogZWxlbWVudCxcblx0XHRcdFx0Y29uZmlnXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy53YXRjaGRvZy5vbignaXRlbUVycm9yJywgKF8sIHtpdGVtSWR9KSA9PiB7XG5cdFx0XHRcdGlmIChpdGVtSWQgPT09IHRoaXMuaWQpIHtcblx0XHRcdFx0XHRlbWl0RXJyb3IoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEluIHRoZSBvdGhlciBjYXNlIGNyZWF0ZSB0aGUgd2F0Y2hkb2cgYnkgaGFuZCB0byBrZWVwIHRoZSBlZGl0b3IgcnVubmluZy5cblx0XHRcdGNvbnN0IGVkaXRvcldhdGNoZG9nOiBDS0VkaXRvcjUuRWRpdG9yV2F0Y2hkb2cgPSBuZXcgRWRpdG9yV2F0Y2hkb2codGhpcy5lZGl0b3IpO1xuXG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5zZXRDcmVhdG9yKGNyZWF0b3IpO1xuXHRcdFx0ZWRpdG9yV2F0Y2hkb2cuc2V0RGVzdHJ1Y3RvcihkZXN0cnVjdG9yKTtcblx0XHRcdGVkaXRvcldhdGNoZG9nLm9uKCdlcnJvcicsIGVtaXRFcnJvcik7XG5cblx0XHRcdHRoaXMuZWRpdG9yV2F0Y2hkb2cgPSBlZGl0b3JXYXRjaGRvZztcblxuXHRcdFx0dGhpcy5lZGl0b3JXYXRjaGRvZy5jcmVhdGUoZWxlbWVudCwgY29uZmlnKTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGdldENvbmZpZygpIHtcblx0XHRpZiAodGhpcy5kYXRhICYmIHRoaXMuY29uZmlnLmluaXRpYWxEYXRhKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0VkaXRvciBkYXRhIHNob3VsZCBiZSBwcm92aWRlZCBlaXRoZXIgdXNpbmcgYGNvbmZpZy5pbml0aWFsRGF0YWAgb3IgYGRhdGFgIHByb3BlcnRpZXMuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29uZmlnID0gey4uLnRoaXMuY29uZmlnfTtcblxuXHRcdC8vIE1lcmdlIHR3byBwb3NzaWJsZSB3YXlzIG9mIHByb3ZpZGluZyBkYXRhIGludG8gdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIGZpZWxkLlxuXHRcdGNvbnN0IGluaXRpYWxEYXRhID0gdGhpcy5jb25maWcuaW5pdGlhbERhdGEgfHwgdGhpcy5kYXRhO1xuXG5cdFx0aWYgKGluaXRpYWxEYXRhKSB7XG5cdFx0XHQvLyBEZWZpbmUgdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIG9ubHkgd2hlbiB0aGUgaW5pdGlhbCBjb250ZW50IGlzIHNwZWNpZmllZC5cblx0XHRcdGNvbmZpZy5pbml0aWFsRGF0YSA9IGluaXRpYWxEYXRhO1xuXHRcdH1cblxuXHRcdHJldHVybiBjb25maWc7XG5cdH1cblxuXHQvKipcblx0ICogSW50ZWdyYXRlcyB0aGUgZWRpdG9yIHdpdGggdGhlIGNvbXBvbmVudCBieSBhdHRhY2hpbmcgcmVsYXRlZCBldmVudCBsaXN0ZW5lcnMuXG5cdCAqL1xuXHRwcml2YXRlIHNldFVwRWRpdG9yRXZlbnRzKGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvcik6IHZvaWQge1xuXHRcdGNvbnN0IG1vZGVsRG9jdW1lbnQgPSBlZGl0b3IubW9kZWwuZG9jdW1lbnQ7XG5cdFx0Y29uc3Qgdmlld0RvY3VtZW50ID0gZWRpdG9yLmVkaXRpbmcudmlldy5kb2N1bWVudDtcblxuXHRcdG1vZGVsRG9jdW1lbnQub24oJ2NoYW5nZTpkYXRhJywgKGV2dDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnY2hhbmdlOmRhdGEnPikgPT4ge1xuXHRcdFx0dGhpcy5uZ1pvbmUucnVuKCgpID0+IHtcblx0XHRcdFx0aWYgKHRoaXMuY3ZhT25DaGFuZ2UgJiYgIXRoaXMuaXNFZGl0b3JTZXR0aW5nRGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBlZGl0b3IuZ2V0RGF0YSgpO1xuXG5cdFx0XHRcdFx0dGhpcy5jdmFPbkNoYW5nZShkYXRhKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuY2hhbmdlLmVtaXQoe2V2ZW50OiBldnQsIGVkaXRvcn0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHR2aWV3RG9jdW1lbnQub24oJ2ZvY3VzJywgKGV2dDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnZm9jdXMnPikgPT4ge1xuXHRcdFx0dGhpcy5uZ1pvbmUucnVuKCgpID0+IHtcblx0XHRcdFx0dGhpcy5mb2N1cy5lbWl0KHtldmVudDogZXZ0LCBlZGl0b3J9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0dmlld0RvY3VtZW50Lm9uKCdibHVyJywgKGV2dDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnYmx1cic+KSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oKCkgPT4ge1xuXHRcdFx0XHRpZiAodGhpcy5jdmFPblRvdWNoZWQpIHtcblx0XHRcdFx0XHR0aGlzLmN2YU9uVG91Y2hlZCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy5ibHVyLmVtaXQoe2V2ZW50OiBldnQsIGVkaXRvcn0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cbiJdfQ==