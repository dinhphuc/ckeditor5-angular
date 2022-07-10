/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md.
 */
import { __awaiter } from "tslib";
import { Component, ElementRef, EventEmitter, forwardRef, Input, NgZone, Output } from '@angular/core';
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
    get disabled() {
        if (this.editorInstance) {
            return this.editorInstance.isReadOnly;
        }
        return this.initiallyDisabled;
    }
    /**
     * When set `true`, the editor becomes read-only.
     * See https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editor-Editor.html#member-isReadOnly
     * to learn more.
     */
    set disabled(isDisabled) {
        this.setDisabledState(isDisabled);
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
        if (value === null || value === undefined) {
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
                if (!this.data) {
                    this.data = '';
                }
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
    ready: [{ type: Output }],
    change: [{ type: Output }],
    blur: [{ type: Output }],
    focus: [{ type: Output }],
    error: [{ type: Output }],
    disabled: [{ type: Input }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2tlZGl0b3IuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NrZWRpdG9yL2NrZWRpdG9yLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBUUgsT0FBTyxFQUFpQixTQUFTLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBYSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFakksT0FBTyxjQUFjLE1BQU0saURBQWlELENBQUM7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRXZDLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQztBQUV4QixPQUFPLEVBQXdCLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFJekUsTUFBTSxxQ0FBcUMsR0FBRyw2REFBNkQsQ0FBQztBQStCNUcsTUFBTSxPQUFPLGlCQUFpQjtJQWtHN0IsWUFBb0IsVUFBc0IsRUFBRSxNQUFjO1FBNUYxRDs7OztXQUlHO1FBQ2EsV0FBTSxHQUFxQixFQUFFLENBQUM7UUFDOUM7OztXQUdHO1FBQ2EsU0FBSSxHQUFHLEVBQUUsQ0FBQztRQUMxQjs7OztXQUlHO1FBQ2EsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUtoQzs7OztXQUlHO1FBQ2MsVUFBSyxHQUFHLElBQUksWUFBWSxFQUFvQixDQUFDO1FBQzlEOzs7O1dBSUc7UUFDYyxXQUFNLEdBQThCLElBQUksWUFBWSxFQUFlLENBQUM7UUFDckY7Ozs7V0FJRztRQUNjLFNBQUksR0FBNEIsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUMvRTs7OztXQUlHO1FBQ2MsVUFBSyxHQUE2QixJQUFJLFlBQVksRUFBYyxDQUFDO1FBQ2xGOztXQUVHO1FBQ2MsVUFBSyxHQUF1QixJQUFJLFlBQVksRUFBUSxDQUFDO1FBVXRFOzs7V0FHRztRQUNLLHNCQUFpQixHQUFHLEtBQUssQ0FBQztR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TUFBTSxFQUFFLENBQUUsR0FBZ0MsRUFBRyxFQUFFO1lBQy9ELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFFLEdBQUcsRUFBRTtnQkFDckIsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO29CQUN0QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7aUJBQ3BCO2dCQUVELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBRSxDQUFDO1lBQzFDLENBQUMsQ0FBRSxDQUFDO1FBQ0wsQ0FBQyxDQUFFLENBQUM7SUFDTCxDQUFDOzs7WUFwWEQsU0FBUyxTQUFFO2dCQUNYLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixRQUFRLEVBQUUsNkJBQTZCO2dCQUV2QyxtQ0FBbUM7Z0JBQ25DLFNBQVMsRUFBRTtvQkFDVjt3QkFDQyxPQUFPLEVBQUUsaUJBQWlCO3dCQUMxQixtRUFBbUU7d0JBQ25FLFdBQVcsRUFBRSxVQUFVLENBQUUsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUU7d0JBQ2xELEtBQUssRUFBRSxJQUFJO3FCQUNYO2lCQUNEO2FBQ0Q7OztZQXpDa0MsVUFBVTtZQUFtQyxNQUFNOzs7cUJBK0NwRixLQUFLO3FCQU1MLEtBQUs7bUJBS0wsS0FBSztzQkFNTCxLQUFLO3VCQUlMLEtBQUs7b0JBTUwsTUFBTTtxQkFNTixNQUFNO21CQU1OLE1BQU07b0JBTU4sTUFBTTtvQkFJTixNQUFNO3VCQTZFTixLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZSBDb3B5cmlnaHQgKGMpIDIwMDMtMjAyMiwgQ0tTb3VyY2UgSG9sZGluZyBzcC4geiBvLm8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBGb3IgbGljZW5zaW5nLCBzZWUgTElDRU5TRS5tZC5cbiAqL1xuXG5kZWNsYXJlIGdsb2JhbCB7XG5cdGludGVyZmFjZSBXaW5kb3cge1xuXHRcdENLRURJVE9SX1ZFUlNJT04/OiBzdHJpbmc7XG5cdH1cbn1cblxuaW1wb3J0IHsgQWZ0ZXJWaWV3SW5pdCwgQ29tcG9uZW50LCBFbGVtZW50UmVmLCBFdmVudEVtaXR0ZXIsIGZvcndhcmRSZWYsIElucHV0LCBOZ1pvbmUsIE9uRGVzdHJveSwgT3V0cHV0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCBFZGl0b3JXYXRjaGRvZyBmcm9tICdAY2tlZGl0b3IvY2tlZGl0b3I1LXdhdGNoZG9nL3NyYy9lZGl0b3J3YXRjaGRvZyc7XG5pbXBvcnQgeyBmaXJzdCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHVpZCBmcm9tICcuL3VpZCc7XG5cbmltcG9ydCB7IENvbnRyb2xWYWx1ZUFjY2Vzc29yLCBOR19WQUxVRV9BQ0NFU1NPUiB9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcblxuaW1wb3J0IHsgQ0tFZGl0b3I1IH0gZnJvbSAnLi9ja2VkaXRvcic7XG5cbmNvbnN0IEFOR1VMQVJfSU5URUdSQVRJT05fUkVBRF9PTkxZX0xPQ0tfSUQgPSAnTG9jayBmcm9tIEFuZ3VsYXIgaW50ZWdyYXRpb24gKEBja2VkaXRvci9ja2VkaXRvcjUtYW5ndWxhciknO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJsdXJFdmVudCB7XG5cdGV2ZW50OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdibHVyJz47XG5cdGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGb2N1c0V2ZW50IHtcblx0ZXZlbnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2ZvY3VzJz47XG5cdGVkaXRvcjogQ0tFZGl0b3I1LkVkaXRvcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGFuZ2VFdmVudCB7XG5cdGV2ZW50OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdjaGFuZ2U6ZGF0YSc+O1xuXHRlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3I7XG59XG5cbkBDb21wb25lbnQoIHtcblx0c2VsZWN0b3I6ICdja2VkaXRvcicsXG5cdHRlbXBsYXRlOiAnPG5nLXRlbXBsYXRlPjwvbmctdGVtcGxhdGU+JyxcblxuXHQvLyBJbnRlZ3JhdGlvbiB3aXRoIEBhbmd1bGFyL2Zvcm1zLlxuXHRwcm92aWRlcnM6IFtcblx0XHR7XG5cdFx0XHRwcm92aWRlOiBOR19WQUxVRV9BQ0NFU1NPUixcblx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmVcblx0XHRcdHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCAoKSA9PiBDS0VkaXRvckNvbXBvbmVudCApLFxuXHRcdFx0bXVsdGk6IHRydWVcblx0XHR9XG5cdF1cbn0gKVxuZXhwb3J0IGNsYXNzIENLRWRpdG9yQ29tcG9uZW50IGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95LCBDb250cm9sVmFsdWVBY2Nlc3NvciB7XG5cdC8qKlxuXHQgKiBUaGUgY29uc3RydWN0b3Igb2YgdGhlIGVkaXRvciB0byBiZSB1c2VkIGZvciB0aGUgaW5zdGFuY2Ugb2YgdGhlIGNvbXBvbmVudC5cblx0ICogSXQgY2FuIGJlIGUuZy4gdGhlIGBDbGFzc2ljRWRpdG9yQnVpbGRgLCBgSW5saW5lRWRpdG9yQnVpbGRgIG9yIHNvbWUgY3VzdG9tIGVkaXRvci5cblx0ICovXG5cdEBJbnB1dCgpIHB1YmxpYyBlZGl0b3I/OiBDS0VkaXRvcjUuRWRpdG9yQ29uc3RydWN0b3I7XG5cdC8qKlxuXHQgKiBUaGUgY29uZmlndXJhdGlvbiBvZiB0aGUgZWRpdG9yLlxuXHQgKiBTZWUgaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfY29yZV9lZGl0b3JfZWRpdG9yY29uZmlnLUVkaXRvckNvbmZpZy5odG1sXG5cdCAqIHRvIGxlYXJuIG1vcmUuXG5cdCAqL1xuXHRASW5wdXQoKSBwdWJsaWMgY29uZmlnOiBDS0VkaXRvcjUuQ29uZmlnID0ge307XG5cdC8qKlxuXHQgKiBUaGUgaW5pdGlhbCBkYXRhIG9mIHRoZSBlZGl0b3IuIFVzZWZ1bCB3aGVuIG5vdCB1c2luZyB0aGUgbmdNb2RlbC5cblx0ICogU2VlIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvTmdNb2RlbCB0byBsZWFybiBtb3JlLlxuXHQgKi9cblx0QElucHV0KCkgcHVibGljIGRhdGEgPSAnJztcblx0LyoqXG5cdCAqIFRhZyBuYW1lIG9mIHRoZSBlZGl0b3IgY29tcG9uZW50LlxuXHQgKlxuXHQgKiBUaGUgZGVmYXVsdCB0YWcgaXMgJ2RpdicuXG5cdCAqL1xuXHRASW5wdXQoKSBwdWJsaWMgdGFnTmFtZSA9ICdkaXYnO1xuXHQvKipcblx0ICogVGhlIGNvbnRleHQgd2F0Y2hkb2cuXG5cdCAqL1xuXHRASW5wdXQoKSBwdWJsaWMgd2F0Y2hkb2c/OiBDS0VkaXRvcjUuQ29udGV4dFdhdGNoZG9nO1xuXHQvKipcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdG9yIGlzIHJlYWR5LiBJdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBgZWRpdG9yI3JlYWR5YFxuXHQgKiBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9jb3JlX2VkaXRvcl9lZGl0b3ItRWRpdG9yLmh0bWwjZXZlbnQtcmVhZHlcblx0ICogZXZlbnQuXG5cdCAqL1xuXHRAT3V0cHV0KCkgcHVibGljIHJlYWR5ID0gbmV3IEV2ZW50RW1pdHRlcjxDS0VkaXRvcjUuRWRpdG9yPigpO1xuXHQvKipcblx0ICogRmlyZXMgd2hlbiB0aGUgY29udGVudCBvZiB0aGUgZWRpdG9yIGhhcyBjaGFuZ2VkLiBJdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBgZWRpdG9yLm1vZGVsLmRvY3VtZW50I2NoYW5nZWBcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfZW5naW5lX21vZGVsX2RvY3VtZW50LURvY3VtZW50Lmh0bWwjZXZlbnQtY2hhbmdlXG5cdCAqIGV2ZW50LlxuXHQgKi9cblx0QE91dHB1dCgpIHB1YmxpYyBjaGFuZ2U6IEV2ZW50RW1pdHRlcjxDaGFuZ2VFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPENoYW5nZUV2ZW50PigpO1xuXHQvKipcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdGluZyB2aWV3IG9mIHRoZSBlZGl0b3IgaXMgYmx1cnJlZC4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvci5lZGl0aW5nLnZpZXcuZG9jdW1lbnQjYmx1cmBcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfZW5naW5lX3ZpZXdfZG9jdW1lbnQtRG9jdW1lbnQuaHRtbCNldmVudC1ldmVudDpibHVyXG5cdCAqIGV2ZW50LlxuXHQgKi9cblx0QE91dHB1dCgpIHB1YmxpYyBibHVyOiBFdmVudEVtaXR0ZXI8Qmx1ckV2ZW50PiA9IG5ldyBFdmVudEVtaXR0ZXI8Qmx1ckV2ZW50PigpO1xuXHQvKipcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdGluZyB2aWV3IG9mIHRoZSBlZGl0b3IgaXMgZm9jdXNlZC4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvci5lZGl0aW5nLnZpZXcuZG9jdW1lbnQjZm9jdXNgXG5cdCAqIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2VuZ2luZV92aWV3X2RvY3VtZW50LURvY3VtZW50Lmh0bWwjZXZlbnQtZXZlbnQ6Zm9jdXNcblx0ICogZXZlbnQuXG5cdCAqL1xuXHRAT3V0cHV0KCkgcHVibGljIGZvY3VzOiBFdmVudEVtaXR0ZXI8Rm9jdXNFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPEZvY3VzRXZlbnQ+KCk7XG5cdC8qKlxuXHQgKiBGaXJlcyB3aGVuIHRoZSBlZGl0b3IgY29tcG9uZW50IGNyYXNoZXMuXG5cdCAqL1xuXHRAT3V0cHV0KCkgcHVibGljIGVycm9yOiBFdmVudEVtaXR0ZXI8dm9pZD4gPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KCk7XG5cdC8qKlxuXHQgKiBUaGUgcmVmZXJlbmNlIHRvIHRoZSBET00gZWxlbWVudCBjcmVhdGVkIGJ5IHRoZSBjb21wb25lbnQuXG5cdCAqL1xuXHRwcml2YXRlIGVsZW1lbnRSZWYhOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50Pjtcblx0LyoqXG5cdCAqIFRoZSBlZGl0b3Igd2F0Y2hkb2cuIEl0IGlzIGNyZWF0ZWQgd2hlbiB0aGUgY29udGV4dCB3YXRjaGRvZyBpcyBub3QgcGFzc2VkIHRvIHRoZSBjb21wb25lbnQuXG5cdCAqIEl0IGtlZXBzIHRoZSBlZGl0b3IgcnVubmluZy5cblx0ICovXG5cdHByaXZhdGUgZWRpdG9yV2F0Y2hkb2c/OiBDS0VkaXRvcjUuRWRpdG9yV2F0Y2hkb2c7XG5cdC8qKlxuXHQgKiBJZiB0aGUgY29tcG9uZW50IGlzIHJlYWTigJNvbmx5IGJlZm9yZSB0aGUgZWRpdG9yIGluc3RhbmNlIGlzIGNyZWF0ZWQsIGl0IHJlbWVtYmVycyB0aGF0IHN0YXRlLFxuXHQgKiBzbyB0aGUgZWRpdG9yIGNhbiBiZWNvbWUgcmVhZOKAk29ubHkgb25jZSBpdCBpcyByZWFkeS5cblx0ICovXG5cdHByaXZhdGUgaW5pdGlhbGx5RGlzYWJsZWQgPSBmYWxzZTtcblx0LyoqXG5cdCAqIEFuIGluc3RhbmNlIG9mIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvY29yZS9OZ1pvbmUgdG8gYWxsb3cgdGhlIGludGVyYWN0aW9uIHdpdGggdGhlIGVkaXRvclxuXHQgKiB3aXRoaW5nIHRoZSBBbmd1bGFyIGV2ZW50IGxvb3AuXG5cdCAqL1xuXHRwcml2YXRlIG5nWm9uZTogTmdab25lO1xuXHQvKipcblx0ICogQSBjYWxsYmFjayBleGVjdXRlZCB3aGVuIHRoZSBjb250ZW50IG9mIHRoZSBlZGl0b3IgY2hhbmdlcy4gUGFydCBvZiB0aGVcblx0ICogYENvbnRyb2xWYWx1ZUFjY2Vzc29yYCAoaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaS9mb3Jtcy9Db250cm9sVmFsdWVBY2Nlc3NvcikgaW50ZXJmYWNlLlxuXHQgKlxuXHQgKiBOb3RlOiBVbnNldCB1bmxlc3MgdGhlIGNvbXBvbmVudCB1c2VzIHRoZSBgbmdNb2RlbGAuXG5cdCAqL1xuXHRwcml2YXRlIGN2YU9uQ2hhbmdlPzogKCBkYXRhOiBzdHJpbmcgKSA9PiB2b2lkO1xuXHQvKipcblx0ICogQSBjYWxsYmFjayBleGVjdXRlZCB3aGVuIHRoZSBlZGl0b3IgaGFzIGJlZW4gYmx1cnJlZC4gUGFydCBvZiB0aGVcblx0ICogYENvbnRyb2xWYWx1ZUFjY2Vzc29yYCAoaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaS9mb3Jtcy9Db250cm9sVmFsdWVBY2Nlc3NvcikgaW50ZXJmYWNlLlxuXHQgKlxuXHQgKiBOb3RlOiBVbnNldCB1bmxlc3MgdGhlIGNvbXBvbmVudCB1c2VzIHRoZSBgbmdNb2RlbGAuXG5cdCAqL1xuXHRwcml2YXRlIGN2YU9uVG91Y2hlZD86ICgpID0+IHZvaWQ7XG5cdC8qKlxuXHQgKiBSZWZlcmVuY2UgdG8gdGhlIHNvdXJjZSBlbGVtZW50IHVzZWQgYnkgdGhlIGVkaXRvci5cblx0ICovXG5cdHByaXZhdGUgZWRpdG9yRWxlbWVudD86IEhUTUxFbGVtZW50O1xuXHQvKipcblx0ICogQSBsb2NrIGZsYWcgcHJldmVudGluZyBmcm9tIGNhbGxpbmcgdGhlIGBjdmFPbkNoYW5nZSgpYCBkdXJpbmcgc2V0dGluZyBlZGl0b3IgZGF0YS5cblx0ICovXG5cdHByaXZhdGUgaXNFZGl0b3JTZXR0aW5nRGF0YSA9IGZhbHNlO1xuXHRwcml2YXRlIGlkID0gdWlkKCk7XG5cblx0cHVibGljIGNvbnN0cnVjdG9yKCBlbGVtZW50UmVmOiBFbGVtZW50UmVmLCBuZ1pvbmU6IE5nWm9uZSApIHtcblx0XHR0aGlzLm5nWm9uZSA9IG5nWm9uZTtcblx0XHR0aGlzLmVsZW1lbnRSZWYgPSBlbGVtZW50UmVmO1xuXG5cdFx0Y29uc3QgeyBDS0VESVRPUl9WRVJTSU9OIH0gPSB3aW5kb3c7XG5cblx0XHQvLyBTdGFydGluZyBmcm9tIHYzNC4wLjAsIENLRWRpdG9yIDUgaW50cm9kdWNlcyBhIGxvY2sgbWVjaGFuaXNtIGVuYWJsaW5nL2Rpc2FibGluZyB0aGUgcmVhZC1vbmx5IG1vZGUuXG5cdFx0Ly8gQXMgaXQgaXMgYSBicmVha2luZyBjaGFuZ2UgYmV0d2VlbiBtYWpvciByZWxlYXNlcyBvZiB0aGUgaW50ZWdyYXRpb24sIHRoZSBjb21wb25lbnQgcmVxdWlyZXMgdXNpbmdcblx0XHQvLyBDS0VkaXRvciA1IGluIHZlcnNpb24gMzQgb3IgaGlnaGVyLlxuXHRcdGlmIChDS0VESVRPUl9WRVJTSU9OKSB7XG5cdFx0XHRjb25zdCBbIG1ham9yIF0gPSBDS0VESVRPUl9WRVJTSU9OLnNwbGl0KCAnLicgKS5tYXAoIE51bWJlciApO1xuXG5cdFx0XHRpZiAobWFqb3IgPCAzNCkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oICdUaGUgPENLRWRpdG9yPiBjb21wb25lbnQgcmVxdWlyZXMgdXNpbmcgQ0tFZGl0b3IgNSBpbiB2ZXJzaW9uIDM0IG9yIGhpZ2hlci4nICk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUud2FybiggJ0Nhbm5vdCBmaW5kIHRoZSBcIkNLRURJVE9SX1ZFUlNJT05cIiBpbiB0aGUgXCJ3aW5kb3dcIiBzY29wZS4nICk7XG5cdFx0fVxuXHR9XG5cblx0cHVibGljIGdldCBkaXNhYmxlZCgpOiBib29sZWFuIHtcblx0XHRpZiAodGhpcy5lZGl0b3JJbnN0YW5jZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZWRpdG9ySW5zdGFuY2UuaXNSZWFkT25seTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5pbml0aWFsbHlEaXNhYmxlZDtcblx0fVxuXG5cdC8qKlxuXHQgKiBXaGVuIHNldCBgdHJ1ZWAsIHRoZSBlZGl0b3IgYmVjb21lcyByZWFkLW9ubHkuXG5cdCAqIFNlZSBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9jb3JlX2VkaXRvcl9lZGl0b3ItRWRpdG9yLmh0bWwjbWVtYmVyLWlzUmVhZE9ubHlcblx0ICogdG8gbGVhcm4gbW9yZS5cblx0ICovXG5cdEBJbnB1dCgpXG5cdHB1YmxpYyBzZXQgZGlzYWJsZWQoIGlzRGlzYWJsZWQ6IGJvb2xlYW4gKSB7XG5cdFx0dGhpcy5zZXREaXNhYmxlZFN0YXRlKCBpc0Rpc2FibGVkICk7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGluc3RhbmNlIG9mIHRoZSBlZGl0b3IgY3JlYXRlZCBieSB0aGlzIGNvbXBvbmVudC5cblx0ICovXG5cdHB1YmxpYyBnZXQgZWRpdG9ySW5zdGFuY2UoKTogQ0tFZGl0b3I1LkVkaXRvciB8IG51bGwge1xuXHRcdGxldCBlZGl0b3JXYXRjaGRvZyA9IHRoaXMuZWRpdG9yV2F0Y2hkb2c7XG5cblx0XHRpZiAodGhpcy53YXRjaGRvZykge1xuXHRcdFx0Ly8gVGVtcG9yYXJpbHkgdXNlIHRoZSBgX3dhdGNoZG9nc2AgaW50ZXJuYWwgbWFwIGFzIHRoZSBgZ2V0SXRlbSgpYCBtZXRob2QgdGhyb3dzXG5cdFx0XHQvLyBhbiBlcnJvciB3aGVuIHRoZSBpdGVtIGlzIG5vdCByZWdpc3RlcmVkIHlldC5cblx0XHRcdC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vY2tlZGl0b3IvY2tlZGl0b3I1LWFuZ3VsYXIvaXNzdWVzLzE3Ny5cblx0XHRcdGVkaXRvcldhdGNoZG9nID0gdGhpcy53YXRjaGRvZy5fd2F0Y2hkb2dzLmdldCggdGhpcy5pZCApO1xuXHRcdH1cblxuXHRcdGlmIChlZGl0b3JXYXRjaGRvZykge1xuXHRcdFx0cmV0dXJuIGVkaXRvcldhdGNoZG9nLmVkaXRvcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQWZ0ZXJWaWV3SW5pdCBpbnRlcmZhY2UuXG5cdHB1YmxpYyBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XG5cdFx0dGhpcy5hdHRhY2hUb1dhdGNoZG9nKCk7XG5cdH1cblxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIE9uRGVzdHJveSBpbnRlcmZhY2UuXG5cdHB1YmxpYyBhc3luYyBuZ09uRGVzdHJveSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRpZiAodGhpcy53YXRjaGRvZykge1xuXHRcdFx0YXdhaXQgdGhpcy53YXRjaGRvZy5yZW1vdmUoIHRoaXMuaWQgKTtcblx0XHR9IGVsc2UgaWYgKHRoaXMuZWRpdG9yV2F0Y2hkb2cgJiYgdGhpcy5lZGl0b3JXYXRjaGRvZy5lZGl0b3IpIHtcblx0XHRcdGF3YWl0IHRoaXMuZWRpdG9yV2F0Y2hkb2cuZGVzdHJveSgpO1xuXG5cdFx0XHR0aGlzLmVkaXRvcldhdGNoZG9nID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0fVxuXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cblx0cHVibGljIHdyaXRlVmFsdWUoIHZhbHVlOiBzdHJpbmcgfCBudWxsICk6IHZvaWQge1xuXHRcdC8vIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIHRoZSBgbnVsbGAgdmFsdWUgd2hlbiB0aGUgZm9ybSByZXNldHMuXG5cdFx0Ly8gQSBjb21wb25lbnQncyByZXNwb25zaWJpbGl0eSBpcyB0byByZXN0b3JlIHRvIHRoZSBpbml0aWFsIHN0YXRlLlxuXHRcdGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YWx1ZSA9ICcnO1xuXHRcdH1cblxuXHRcdC8vIElmIGFscmVhZHkgaW5pdGlhbGl6ZWQuXG5cdFx0aWYgKHRoaXMuZWRpdG9ySW5zdGFuY2UpIHtcblx0XHRcdC8vIFRoZSBsb2NrIG1lY2hhbmlzbSBwcmV2ZW50cyBmcm9tIGNhbGxpbmcgYGN2YU9uQ2hhbmdlKClgIGR1cmluZyBjaGFuZ2luZ1xuXHRcdFx0Ly8gdGhlIGVkaXRvciBzdGF0ZS4gU2VlICMxMzlcblx0XHRcdHRoaXMuaXNFZGl0b3JTZXR0aW5nRGF0YSA9IHRydWU7XG5cdFx0XHR0aGlzLmVkaXRvckluc3RhbmNlLnNldERhdGEoIHZhbHVlICk7XG5cdFx0XHR0aGlzLmlzRWRpdG9yU2V0dGluZ0RhdGEgPSBmYWxzZTtcblx0XHR9XG5cdFx0Ly8gSWYgbm90LCB3YWl0IGZvciBpdCB0byBiZSByZWFkeTsgc3RvcmUgdGhlIGRhdGEuXG5cdFx0ZWxzZSB7XG5cdFx0XHQvLyBJZiB0aGUgZWRpdG9yIGVsZW1lbnQgaXMgYWxyZWFkeSBhdmFpbGFibGUsIHRoZW4gdXBkYXRlIGl0cyBjb250ZW50LlxuXHRcdFx0dGhpcy5kYXRhID0gdmFsdWU7XG5cblx0XHRcdC8vIElmIG5vdCwgdGhlbiB3YWl0IHVudGlsIGl0IGlzIHJlYWR5XG5cdFx0XHQvLyBhbmQgY2hhbmdlIGRhdGEgb25seSBmb3IgdGhlIGZpcnN0IGByZWFkeWAgZXZlbnQuXG5cdFx0XHR0aGlzLnJlYWR5XG5cdFx0XHRcdC5waXBlKCBmaXJzdCgpIClcblx0XHRcdFx0LnN1YnNjcmliZSggKCBlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3IgKSA9PiB7XG5cblx0XHRcdFx0XHRpZiAoIXRoaXMuZGF0YSkge1xuXHRcdFx0XHRcdFx0dGhpcy5kYXRhID0gJyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVkaXRvci5zZXREYXRhKCB0aGlzLmRhdGEgKTtcblx0XHRcdFx0fSApO1xuXHRcdH1cblx0fVxuXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cblx0cHVibGljIHJlZ2lzdGVyT25DaGFuZ2UoIGNhbGxiYWNrOiAoIGRhdGE6IHN0cmluZyApID0+IHZvaWQgKTogdm9pZCB7XG5cdFx0dGhpcy5jdmFPbkNoYW5nZSA9IGNhbGxiYWNrO1xuXHR9XG5cblx0Ly8gSW1wbGVtZW50aW5nIHRoZSBDb250cm9sVmFsdWVBY2Nlc3NvciBpbnRlcmZhY2UgKG9ubHkgd2hlbiBiaW5kaW5nIHRvIG5nTW9kZWwpLlxuXHRwdWJsaWMgcmVnaXN0ZXJPblRvdWNoZWQoIGNhbGxiYWNrOiAoKSA9PiB2b2lkICk6IHZvaWQge1xuXHRcdHRoaXMuY3ZhT25Ub3VjaGVkID0gY2FsbGJhY2s7XG5cdH1cblxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZSAob25seSB3aGVuIGJpbmRpbmcgdG8gbmdNb2RlbCkuXG5cdHB1YmxpYyBzZXREaXNhYmxlZFN0YXRlKCBpc0Rpc2FibGVkOiBib29sZWFuICk6IHZvaWQge1xuXHRcdC8vIElmIGFscmVhZHkgaW5pdGlhbGl6ZWQuXG5cdFx0aWYgKHRoaXMuZWRpdG9ySW5zdGFuY2UpIHtcblx0XHRcdGlmIChpc0Rpc2FibGVkKSB7XG5cdFx0XHRcdHRoaXMuZWRpdG9ySW5zdGFuY2UuZW5hYmxlUmVhZE9ubHlNb2RlKCBBTkdVTEFSX0lOVEVHUkFUSU9OX1JFQURfT05MWV9MT0NLX0lEICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmVkaXRvckluc3RhbmNlLmRpc2FibGVSZWFkT25seU1vZGUoIEFOR1VMQVJfSU5URUdSQVRJT05fUkVBRF9PTkxZX0xPQ0tfSUQgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdG9yZSB0aGUgc3RhdGUgYW55d2F5IHRvIHVzZSBpdCBvbmNlIHRoZSBlZGl0b3IgaXMgY3JlYXRlZC5cblx0XHR0aGlzLmluaXRpYWxseURpc2FibGVkID0gaXNEaXNhYmxlZDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIHRoZSBlZGl0b3IgaW5zdGFuY2UsIHNldHMgaW5pdGlhbCBlZGl0b3IgZGF0YSwgdGhlbiBpbnRlZ3JhdGVzXG5cdCAqIHRoZSBlZGl0b3Igd2l0aCB0aGUgQW5ndWxhciBjb21wb25lbnQuIFRoaXMgbWV0aG9kIGRvZXMgbm90IHVzZSB0aGUgYGVkaXRvci5zZXREYXRhKClgXG5cdCAqIGJlY2F1c2Ugb2YgdGhlIGlzc3VlIGluIHRoZSBjb2xsYWJvcmF0aW9uIG1vZGUgKCM2KS5cblx0ICovXG5cdHByaXZhdGUgYXR0YWNoVG9XYXRjaGRvZygpIHtcblx0XHRjb25zdCBjcmVhdG9yID0gYXN5bmMgKCBlbGVtZW50OiBIVE1MRWxlbWVudCwgY29uZmlnOiBDS0VkaXRvcjUuQ29uZmlnICkgPT4ge1xuXHRcdFx0cmV0dXJuIHRoaXMubmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCBhc3luYyAoKSA9PiB7XG5cdFx0XHRcdHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmFwcGVuZENoaWxkKCBlbGVtZW50ICk7XG5cblx0XHRcdFx0Y29uc3QgZWRpdG9yID0gYXdhaXQgdGhpcy5lZGl0b3IhLmNyZWF0ZSggZWxlbWVudCwgY29uZmlnICk7XG5cblx0XHRcdFx0aWYgKHRoaXMuaW5pdGlhbGx5RGlzYWJsZWQpIHtcblx0XHRcdFx0XHRlZGl0b3IuZW5hYmxlUmVhZE9ubHlNb2RlKCBBTkdVTEFSX0lOVEVHUkFUSU9OX1JFQURfT05MWV9MT0NLX0lEICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0XHR0aGlzLnJlYWR5LmVtaXQoIGVkaXRvciApO1xuXHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0dGhpcy5zZXRVcEVkaXRvckV2ZW50cyggZWRpdG9yICk7XG5cblx0XHRcdFx0cmV0dXJuIGVkaXRvcjtcblx0XHRcdH0gKTtcblx0XHR9O1xuXG5cdFx0Y29uc3QgZGVzdHJ1Y3RvciA9IGFzeW5jICggZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yICkgPT4ge1xuXHRcdFx0YXdhaXQgZWRpdG9yLmRlc3Ryb3koKTtcblxuXHRcdFx0Ly8gdGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQucmVtb3ZlQ2hpbGQoIHRoaXMuZWRpdG9yRWxlbWVudCEgKTtcblx0XHR9O1xuXG5cdFx0Y29uc3QgZW1pdEVycm9yID0gKCkgPT4ge1xuXHRcdFx0dGhpcy5uZ1pvbmUucnVuKCAoKSA9PiB7XG5cdFx0XHRcdHRoaXMuZXJyb3IuZW1pdCgpO1xuXHRcdFx0fSApO1xuXHRcdH07XG5cblx0XHRjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggdGhpcy50YWdOYW1lICk7XG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRDb25maWcoKTtcblxuXHRcdHRoaXMuZWRpdG9yRWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBCYXNlZCBvbiB0aGUgcHJlc2VuY2Ugb2YgdGhlIHdhdGNoZG9nIGRlY2lkZSBob3cgdG8gaW5pdGlhbGl6ZSB0aGUgZWRpdG9yLlxuXHRcdGlmICh0aGlzLndhdGNoZG9nKSB7XG5cdFx0XHQvLyBXaGVuIHRoZSBjb250ZXh0IHdhdGNoZG9nIGlzIHBhc3NlZCBhZGQgdGhlIG5ldyBpdGVtIHRvIGl0IGJhc2VkIG9uIHRoZSBwYXNzZWQgY29uZmlndXJhdGlvbi5cblx0XHRcdHRoaXMud2F0Y2hkb2cuYWRkKCB7XG5cdFx0XHRcdGlkOiB0aGlzLmlkLFxuXHRcdFx0XHR0eXBlOiAnZWRpdG9yJyxcblx0XHRcdFx0Y3JlYXRvcixcblx0XHRcdFx0ZGVzdHJ1Y3Rvcixcblx0XHRcdFx0c291cmNlRWxlbWVudE9yRGF0YTogZWxlbWVudCxcblx0XHRcdFx0Y29uZmlnXG5cdFx0XHR9ICk7XG5cblx0XHRcdHRoaXMud2F0Y2hkb2cub24oICdpdGVtRXJyb3InLCAoIF8sIHsgaXRlbUlkIH0gKSA9PiB7XG5cdFx0XHRcdGlmIChpdGVtSWQgPT09IHRoaXMuaWQpIHtcblx0XHRcdFx0XHRlbWl0RXJyb3IoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBJbiB0aGUgb3RoZXIgY2FzZSBjcmVhdGUgdGhlIHdhdGNoZG9nIGJ5IGhhbmQgdG8ga2VlcCB0aGUgZWRpdG9yIHJ1bm5pbmcuXG5cdFx0XHRjb25zdCBlZGl0b3JXYXRjaGRvZzogQ0tFZGl0b3I1LkVkaXRvcldhdGNoZG9nID0gbmV3IEVkaXRvcldhdGNoZG9nKCB0aGlzLmVkaXRvciApO1xuXG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5zZXRDcmVhdG9yKCBjcmVhdG9yICk7XG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5zZXREZXN0cnVjdG9yKCBkZXN0cnVjdG9yICk7XG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5vbiggJ2Vycm9yJywgZW1pdEVycm9yICk7XG5cblx0XHRcdHRoaXMuZWRpdG9yV2F0Y2hkb2cgPSBlZGl0b3JXYXRjaGRvZztcblxuXHRcdFx0dGhpcy5lZGl0b3JXYXRjaGRvZy5jcmVhdGUoIGVsZW1lbnQsIGNvbmZpZyApO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgZ2V0Q29uZmlnKCkge1xuXHRcdGlmICh0aGlzLmRhdGEgJiYgdGhpcy5jb25maWcuaW5pdGlhbERhdGEpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggJ0VkaXRvciBkYXRhIHNob3VsZCBiZSBwcm92aWRlZCBlaXRoZXIgdXNpbmcgYGNvbmZpZy5pbml0aWFsRGF0YWAgb3IgYGRhdGFgIHByb3BlcnRpZXMuJyApO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5jb25maWcgfTtcblxuXHRcdC8vIE1lcmdlIHR3byBwb3NzaWJsZSB3YXlzIG9mIHByb3ZpZGluZyBkYXRhIGludG8gdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIGZpZWxkLlxuXHRcdGNvbnN0IGluaXRpYWxEYXRhID0gdGhpcy5jb25maWcuaW5pdGlhbERhdGEgfHwgdGhpcy5kYXRhO1xuXG5cdFx0aWYgKGluaXRpYWxEYXRhKSB7XG5cdFx0XHQvLyBEZWZpbmUgdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIG9ubHkgd2hlbiB0aGUgaW5pdGlhbCBjb250ZW50IGlzIHNwZWNpZmllZC5cblx0XHRcdGNvbmZpZy5pbml0aWFsRGF0YSA9IGluaXRpYWxEYXRhO1xuXHRcdH1cblxuXHRcdHJldHVybiBjb25maWc7XG5cdH1cblxuXHQvKipcblx0ICogSW50ZWdyYXRlcyB0aGUgZWRpdG9yIHdpdGggdGhlIGNvbXBvbmVudCBieSBhdHRhY2hpbmcgcmVsYXRlZCBldmVudCBsaXN0ZW5lcnMuXG5cdCAqL1xuXHRwcml2YXRlIHNldFVwRWRpdG9yRXZlbnRzKCBlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3IgKTogdm9pZCB7XG5cdFx0Y29uc3QgbW9kZWxEb2N1bWVudCA9IGVkaXRvci5tb2RlbC5kb2N1bWVudDtcblx0XHRjb25zdCB2aWV3RG9jdW1lbnQgPSBlZGl0b3IuZWRpdGluZy52aWV3LmRvY3VtZW50O1xuXG5cdFx0bW9kZWxEb2N1bWVudC5vbiggJ2NoYW5nZTpkYXRhJywgKCBldnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2NoYW5nZTpkYXRhJz4gKSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0aWYgKHRoaXMuY3ZhT25DaGFuZ2UgJiYgIXRoaXMuaXNFZGl0b3JTZXR0aW5nRGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBlZGl0b3IuZ2V0RGF0YSgpO1xuXG5cdFx0XHRcdFx0dGhpcy5jdmFPbkNoYW5nZSggZGF0YSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy5jaGFuZ2UuZW1pdCggeyBldmVudDogZXZ0LCBlZGl0b3IgfSApO1xuXHRcdFx0fSApO1xuXHRcdH0gKTtcblxuXHRcdHZpZXdEb2N1bWVudC5vbiggJ2ZvY3VzJywgKCBldnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2ZvY3VzJz4gKSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0dGhpcy5mb2N1cy5lbWl0KCB7IGV2ZW50OiBldnQsIGVkaXRvciB9ICk7XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXG5cdFx0dmlld0RvY3VtZW50Lm9uKCAnYmx1cicsICggZXZ0OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdibHVyJz4gKSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0aWYgKHRoaXMuY3ZhT25Ub3VjaGVkKSB7XG5cdFx0XHRcdFx0dGhpcy5jdmFPblRvdWNoZWQoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuYmx1ci5lbWl0KCB7IGV2ZW50OiBldnQsIGVkaXRvciB9ICk7XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXHR9XG59XG4iXX0=