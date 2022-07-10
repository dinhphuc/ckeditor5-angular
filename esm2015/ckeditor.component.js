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
            // fix null by phucnd
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2tlZGl0b3IuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NrZWRpdG9yL2NrZWRpdG9yLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBUUgsT0FBTyxFQUFpQixTQUFTLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBYSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFakksT0FBTyxjQUFjLE1BQU0saURBQWlELENBQUM7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRXZDLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQztBQUV4QixPQUFPLEVBQXdCLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFJekUsTUFBTSxxQ0FBcUMsR0FBRyw2REFBNkQsQ0FBQztBQStCNUcsTUFBTSxPQUFPLGlCQUFpQjtJQWtHN0IsWUFBb0IsVUFBc0IsRUFBRSxNQUFjO1FBNUYxRDs7OztXQUlHO1FBQ2EsV0FBTSxHQUFxQixFQUFFLENBQUM7UUFDOUM7OztXQUdHO1FBQ2EsU0FBSSxHQUFHLEVBQUUsQ0FBQztRQUMxQjs7OztXQUlHO1FBQ2EsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUtoQzs7OztXQUlHO1FBQ2MsVUFBSyxHQUFHLElBQUksWUFBWSxFQUFvQixDQUFDO1FBQzlEOzs7O1dBSUc7UUFDYyxXQUFNLEdBQThCLElBQUksWUFBWSxFQUFlLENBQUM7UUFDckY7Ozs7V0FJRztRQUNjLFNBQUksR0FBNEIsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUMvRTs7OztXQUlHO1FBQ2MsVUFBSyxHQUE2QixJQUFJLFlBQVksRUFBYyxDQUFDO1FBQ2xGOztXQUVHO1FBQ2MsVUFBSyxHQUF1QixJQUFJLFlBQVksRUFBUSxDQUFDO1FBVXRFOzs7V0FHRztRQUNLLHNCQUFpQixHQUFHLEtBQUssQ0FBQztR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QUMsRUFBRSxDQUFFLE1BQU0sRUFBRSxDQUFFLEdBQWdDLEVBQUcsRUFBRTtZQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBRSxHQUFHLEVBQUU7Z0JBQ3JCLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtvQkFDdEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2lCQUNwQjtnQkFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUUsQ0FBQztZQUMxQyxDQUFDLENBQUUsQ0FBQztRQUNMLENBQUMsQ0FBRSxDQUFDO0lBQ0wsQ0FBQzs7O1lBclhELFNBQVMsU0FBRTtnQkFDWCxRQUFRLEVBQUUsVUFBVTtnQkFDcEIsUUFBUSxFQUFFLDZCQUE2QjtnQkFFdkMsbUNBQW1DO2dCQUNuQyxTQUFTLEVBQUU7b0JBQ1Y7d0JBQ0MsT0FBTyxFQUFFLGlCQUFpQjt3QkFDMUIsbUVBQW1FO3dCQUNuRSxXQUFXLEVBQUUsVUFBVSxDQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFFO3dCQUNsRCxLQUFLLEVBQUUsSUFBSTtxQkFDWDtpQkFDRDthQUNEOzs7WUF6Q2tDLFVBQVU7WUFBbUMsTUFBTTs7O3FCQStDcEYsS0FBSztxQkFNTCxLQUFLO21CQUtMLEtBQUs7c0JBTUwsS0FBSzt1QkFJTCxLQUFLO29CQU1MLE1BQU07cUJBTU4sTUFBTTttQkFNTixNQUFNO29CQU1OLE1BQU07b0JBSU4sTUFBTTt1QkE2RU4sS0FBSyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2UgQ29weXJpZ2h0IChjKSAyMDAzLTIwMjIsIENLU291cmNlIEhvbGRpbmcgc3AuIHogby5vLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogRm9yIGxpY2Vuc2luZywgc2VlIExJQ0VOU0UubWQuXG4gKi9cblxuZGVjbGFyZSBnbG9iYWwge1xuXHRpbnRlcmZhY2UgV2luZG93IHtcblx0XHRDS0VESVRPUl9WRVJTSU9OPzogc3RyaW5nO1xuXHR9XG59XG5cbmltcG9ydCB7IEFmdGVyVmlld0luaXQsIENvbXBvbmVudCwgRWxlbWVudFJlZiwgRXZlbnRFbWl0dGVyLCBmb3J3YXJkUmVmLCBJbnB1dCwgTmdab25lLCBPbkRlc3Ryb3ksIE91dHB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgRWRpdG9yV2F0Y2hkb2cgZnJvbSAnQGNrZWRpdG9yL2NrZWRpdG9yNS13YXRjaGRvZy9zcmMvZWRpdG9yd2F0Y2hkb2cnO1xuaW1wb3J0IHsgZmlyc3QgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB1aWQgZnJvbSAnLi91aWQnO1xuXG5pbXBvcnQgeyBDb250cm9sVmFsdWVBY2Nlc3NvciwgTkdfVkFMVUVfQUNDRVNTT1IgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5cbmltcG9ydCB7IENLRWRpdG9yNSB9IGZyb20gJy4vY2tlZGl0b3InO1xuXG5jb25zdCBBTkdVTEFSX0lOVEVHUkFUSU9OX1JFQURfT05MWV9MT0NLX0lEID0gJ0xvY2sgZnJvbSBBbmd1bGFyIGludGVncmF0aW9uIChAY2tlZGl0b3IvY2tlZGl0b3I1LWFuZ3VsYXIpJztcblxuZXhwb3J0IGludGVyZmFjZSBCbHVyRXZlbnQge1xuXHRldmVudDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnYmx1cic+O1xuXHRlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3I7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9jdXNFdmVudCB7XG5cdGV2ZW50OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdmb2N1cyc+O1xuXHRlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3I7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhbmdlRXZlbnQge1xuXHRldmVudDogQ0tFZGl0b3I1LkV2ZW50SW5mbzwnY2hhbmdlOmRhdGEnPjtcblx0ZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yO1xufVxuXG5AQ29tcG9uZW50KCB7XG5cdHNlbGVjdG9yOiAnY2tlZGl0b3InLFxuXHR0ZW1wbGF0ZTogJzxuZy10ZW1wbGF0ZT48L25nLXRlbXBsYXRlPicsXG5cblx0Ly8gSW50ZWdyYXRpb24gd2l0aCBAYW5ndWxhci9mb3Jtcy5cblx0cHJvdmlkZXJzOiBbXG5cdFx0e1xuXHRcdFx0cHJvdmlkZTogTkdfVkFMVUVfQUNDRVNTT1IsXG5cdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVzZS1iZWZvcmUtZGVmaW5lXG5cdFx0XHR1c2VFeGlzdGluZzogZm9yd2FyZFJlZiggKCkgPT4gQ0tFZGl0b3JDb21wb25lbnQgKSxcblx0XHRcdG11bHRpOiB0cnVlXG5cdFx0fVxuXHRdXG59IClcbmV4cG9ydCBjbGFzcyBDS0VkaXRvckNvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSwgQ29udHJvbFZhbHVlQWNjZXNzb3Ige1xuXHQvKipcblx0ICogVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBlZGl0b3IgdG8gYmUgdXNlZCBmb3IgdGhlIGluc3RhbmNlIG9mIHRoZSBjb21wb25lbnQuXG5cdCAqIEl0IGNhbiBiZSBlLmcuIHRoZSBgQ2xhc3NpY0VkaXRvckJ1aWxkYCwgYElubGluZUVkaXRvckJ1aWxkYCBvciBzb21lIGN1c3RvbSBlZGl0b3IuXG5cdCAqL1xuXHRASW5wdXQoKSBwdWJsaWMgZWRpdG9yPzogQ0tFZGl0b3I1LkVkaXRvckNvbnN0cnVjdG9yO1xuXHQvKipcblx0ICogVGhlIGNvbmZpZ3VyYXRpb24gb2YgdGhlIGVkaXRvci5cblx0ICogU2VlIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2NvcmVfZWRpdG9yX2VkaXRvcmNvbmZpZy1FZGl0b3JDb25maWcuaHRtbFxuXHQgKiB0byBsZWFybiBtb3JlLlxuXHQgKi9cblx0QElucHV0KCkgcHVibGljIGNvbmZpZzogQ0tFZGl0b3I1LkNvbmZpZyA9IHt9O1xuXHQvKipcblx0ICogVGhlIGluaXRpYWwgZGF0YSBvZiB0aGUgZWRpdG9yLiBVc2VmdWwgd2hlbiBub3QgdXNpbmcgdGhlIG5nTW9kZWwuXG5cdCAqIFNlZSBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2Zvcm1zL05nTW9kZWwgdG8gbGVhcm4gbW9yZS5cblx0ICovXG5cdEBJbnB1dCgpIHB1YmxpYyBkYXRhID0gJyc7XG5cdC8qKlxuXHQgKiBUYWcgbmFtZSBvZiB0aGUgZWRpdG9yIGNvbXBvbmVudC5cblx0ICpcblx0ICogVGhlIGRlZmF1bHQgdGFnIGlzICdkaXYnLlxuXHQgKi9cblx0QElucHV0KCkgcHVibGljIHRhZ05hbWUgPSAnZGl2Jztcblx0LyoqXG5cdCAqIFRoZSBjb250ZXh0IHdhdGNoZG9nLlxuXHQgKi9cblx0QElucHV0KCkgcHVibGljIHdhdGNoZG9nPzogQ0tFZGl0b3I1LkNvbnRleHRXYXRjaGRvZztcblx0LyoqXG5cdCAqIEZpcmVzIHdoZW4gdGhlIGVkaXRvciBpcyByZWFkeS4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvciNyZWFkeWBcblx0ICogaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfY29yZV9lZGl0b3JfZWRpdG9yLUVkaXRvci5odG1sI2V2ZW50LXJlYWR5XG5cdCAqIGV2ZW50LlxuXHQgKi9cblx0QE91dHB1dCgpIHB1YmxpYyByZWFkeSA9IG5ldyBFdmVudEVtaXR0ZXI8Q0tFZGl0b3I1LkVkaXRvcj4oKTtcblx0LyoqXG5cdCAqIEZpcmVzIHdoZW4gdGhlIGNvbnRlbnQgb2YgdGhlIGVkaXRvciBoYXMgY2hhbmdlZC4gSXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgYGVkaXRvci5tb2RlbC5kb2N1bWVudCNjaGFuZ2VgXG5cdCAqIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2VuZ2luZV9tb2RlbF9kb2N1bWVudC1Eb2N1bWVudC5odG1sI2V2ZW50LWNoYW5nZVxuXHQgKiBldmVudC5cblx0ICovXG5cdEBPdXRwdXQoKSBwdWJsaWMgY2hhbmdlOiBFdmVudEVtaXR0ZXI8Q2hhbmdlRXZlbnQ+ID0gbmV3IEV2ZW50RW1pdHRlcjxDaGFuZ2VFdmVudD4oKTtcblx0LyoqXG5cdCAqIEZpcmVzIHdoZW4gdGhlIGVkaXRpbmcgdmlldyBvZiB0aGUgZWRpdG9yIGlzIGJsdXJyZWQuIEl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGBlZGl0b3IuZWRpdGluZy52aWV3LmRvY3VtZW50I2JsdXJgXG5cdCAqIGh0dHBzOi8vY2tlZGl0b3IuY29tL2RvY3MvY2tlZGl0b3I1L2xhdGVzdC9hcGkvbW9kdWxlX2VuZ2luZV92aWV3X2RvY3VtZW50LURvY3VtZW50Lmh0bWwjZXZlbnQtZXZlbnQ6Ymx1clxuXHQgKiBldmVudC5cblx0ICovXG5cdEBPdXRwdXQoKSBwdWJsaWMgYmx1cjogRXZlbnRFbWl0dGVyPEJsdXJFdmVudD4gPSBuZXcgRXZlbnRFbWl0dGVyPEJsdXJFdmVudD4oKTtcblx0LyoqXG5cdCAqIEZpcmVzIHdoZW4gdGhlIGVkaXRpbmcgdmlldyBvZiB0aGUgZWRpdG9yIGlzIGZvY3VzZWQuIEl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGBlZGl0b3IuZWRpdGluZy52aWV3LmRvY3VtZW50I2ZvY3VzYFxuXHQgKiBodHRwczovL2NrZWRpdG9yLmNvbS9kb2NzL2NrZWRpdG9yNS9sYXRlc3QvYXBpL21vZHVsZV9lbmdpbmVfdmlld19kb2N1bWVudC1Eb2N1bWVudC5odG1sI2V2ZW50LWV2ZW50OmZvY3VzXG5cdCAqIGV2ZW50LlxuXHQgKi9cblx0QE91dHB1dCgpIHB1YmxpYyBmb2N1czogRXZlbnRFbWl0dGVyPEZvY3VzRXZlbnQ+ID0gbmV3IEV2ZW50RW1pdHRlcjxGb2N1c0V2ZW50PigpO1xuXHQvKipcblx0ICogRmlyZXMgd2hlbiB0aGUgZWRpdG9yIGNvbXBvbmVudCBjcmFzaGVzLlxuXHQgKi9cblx0QE91dHB1dCgpIHB1YmxpYyBlcnJvcjogRXZlbnRFbWl0dGVyPHZvaWQ+ID0gbmV3IEV2ZW50RW1pdHRlcjx2b2lkPigpO1xuXHQvKipcblx0ICogVGhlIHJlZmVyZW5jZSB0byB0aGUgRE9NIGVsZW1lbnQgY3JlYXRlZCBieSB0aGUgY29tcG9uZW50LlxuXHQgKi9cblx0cHJpdmF0ZSBlbGVtZW50UmVmITogRWxlbWVudFJlZjxIVE1MRWxlbWVudD47XG5cdC8qKlxuXHQgKiBUaGUgZWRpdG9yIHdhdGNoZG9nLiBJdCBpcyBjcmVhdGVkIHdoZW4gdGhlIGNvbnRleHQgd2F0Y2hkb2cgaXMgbm90IHBhc3NlZCB0byB0aGUgY29tcG9uZW50LlxuXHQgKiBJdCBrZWVwcyB0aGUgZWRpdG9yIHJ1bm5pbmcuXG5cdCAqL1xuXHRwcml2YXRlIGVkaXRvcldhdGNoZG9nPzogQ0tFZGl0b3I1LkVkaXRvcldhdGNoZG9nO1xuXHQvKipcblx0ICogSWYgdGhlIGNvbXBvbmVudCBpcyByZWFk4oCTb25seSBiZWZvcmUgdGhlIGVkaXRvciBpbnN0YW5jZSBpcyBjcmVhdGVkLCBpdCByZW1lbWJlcnMgdGhhdCBzdGF0ZSxcblx0ICogc28gdGhlIGVkaXRvciBjYW4gYmVjb21lIHJlYWTigJNvbmx5IG9uY2UgaXQgaXMgcmVhZHkuXG5cdCAqL1xuXHRwcml2YXRlIGluaXRpYWxseURpc2FibGVkID0gZmFsc2U7XG5cdC8qKlxuXHQgKiBBbiBpbnN0YW5jZSBvZiBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2NvcmUvTmdab25lIHRvIGFsbG93IHRoZSBpbnRlcmFjdGlvbiB3aXRoIHRoZSBlZGl0b3Jcblx0ICogd2l0aGluZyB0aGUgQW5ndWxhciBldmVudCBsb29wLlxuXHQgKi9cblx0cHJpdmF0ZSBuZ1pvbmU6IE5nWm9uZTtcblx0LyoqXG5cdCAqIEEgY2FsbGJhY2sgZXhlY3V0ZWQgd2hlbiB0aGUgY29udGVudCBvZiB0aGUgZWRpdG9yIGNoYW5nZXMuIFBhcnQgb2YgdGhlXG5cdCAqIGBDb250cm9sVmFsdWVBY2Nlc3NvcmAgKGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvQ29udHJvbFZhbHVlQWNjZXNzb3IpIGludGVyZmFjZS5cblx0ICpcblx0ICogTm90ZTogVW5zZXQgdW5sZXNzIHRoZSBjb21wb25lbnQgdXNlcyB0aGUgYG5nTW9kZWxgLlxuXHQgKi9cblx0cHJpdmF0ZSBjdmFPbkNoYW5nZT86ICggZGF0YTogc3RyaW5nICkgPT4gdm9pZDtcblx0LyoqXG5cdCAqIEEgY2FsbGJhY2sgZXhlY3V0ZWQgd2hlbiB0aGUgZWRpdG9yIGhhcyBiZWVuIGJsdXJyZWQuIFBhcnQgb2YgdGhlXG5cdCAqIGBDb250cm9sVmFsdWVBY2Nlc3NvcmAgKGh0dHBzOi8vYW5ndWxhci5pby9hcGkvZm9ybXMvQ29udHJvbFZhbHVlQWNjZXNzb3IpIGludGVyZmFjZS5cblx0ICpcblx0ICogTm90ZTogVW5zZXQgdW5sZXNzIHRoZSBjb21wb25lbnQgdXNlcyB0aGUgYG5nTW9kZWxgLlxuXHQgKi9cblx0cHJpdmF0ZSBjdmFPblRvdWNoZWQ/OiAoKSA9PiB2b2lkO1xuXHQvKipcblx0ICogUmVmZXJlbmNlIHRvIHRoZSBzb3VyY2UgZWxlbWVudCB1c2VkIGJ5IHRoZSBlZGl0b3IuXG5cdCAqL1xuXHRwcml2YXRlIGVkaXRvckVsZW1lbnQ/OiBIVE1MRWxlbWVudDtcblx0LyoqXG5cdCAqIEEgbG9jayBmbGFnIHByZXZlbnRpbmcgZnJvbSBjYWxsaW5nIHRoZSBgY3ZhT25DaGFuZ2UoKWAgZHVyaW5nIHNldHRpbmcgZWRpdG9yIGRhdGEuXG5cdCAqL1xuXHRwcml2YXRlIGlzRWRpdG9yU2V0dGluZ0RhdGEgPSBmYWxzZTtcblx0cHJpdmF0ZSBpZCA9IHVpZCgpO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvciggZWxlbWVudFJlZjogRWxlbWVudFJlZiwgbmdab25lOiBOZ1pvbmUgKSB7XG5cdFx0dGhpcy5uZ1pvbmUgPSBuZ1pvbmU7XG5cdFx0dGhpcy5lbGVtZW50UmVmID0gZWxlbWVudFJlZjtcblxuXHRcdGNvbnN0IHsgQ0tFRElUT1JfVkVSU0lPTiB9ID0gd2luZG93O1xuXG5cdFx0Ly8gU3RhcnRpbmcgZnJvbSB2MzQuMC4wLCBDS0VkaXRvciA1IGludHJvZHVjZXMgYSBsb2NrIG1lY2hhbmlzbSBlbmFibGluZy9kaXNhYmxpbmcgdGhlIHJlYWQtb25seSBtb2RlLlxuXHRcdC8vIEFzIGl0IGlzIGEgYnJlYWtpbmcgY2hhbmdlIGJldHdlZW4gbWFqb3IgcmVsZWFzZXMgb2YgdGhlIGludGVncmF0aW9uLCB0aGUgY29tcG9uZW50IHJlcXVpcmVzIHVzaW5nXG5cdFx0Ly8gQ0tFZGl0b3IgNSBpbiB2ZXJzaW9uIDM0IG9yIGhpZ2hlci5cblx0XHRpZiAoQ0tFRElUT1JfVkVSU0lPTikge1xuXHRcdFx0Y29uc3QgWyBtYWpvciBdID0gQ0tFRElUT1JfVkVSU0lPTi5zcGxpdCggJy4nICkubWFwKCBOdW1iZXIgKTtcblxuXHRcdFx0aWYgKG1ham9yIDwgMzQpIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKCAnVGhlIDxDS0VkaXRvcj4gY29tcG9uZW50IHJlcXVpcmVzIHVzaW5nIENLRWRpdG9yIDUgaW4gdmVyc2lvbiAzNCBvciBoaWdoZXIuJyApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLndhcm4oICdDYW5ub3QgZmluZCB0aGUgXCJDS0VESVRPUl9WRVJTSU9OXCIgaW4gdGhlIFwid2luZG93XCIgc2NvcGUuJyApO1xuXHRcdH1cblx0fVxuXG5cdHB1YmxpYyBnZXQgZGlzYWJsZWQoKTogYm9vbGVhbiB7XG5cdFx0aWYgKHRoaXMuZWRpdG9ySW5zdGFuY2UpIHtcblx0XHRcdHJldHVybiB0aGlzLmVkaXRvckluc3RhbmNlLmlzUmVhZE9ubHk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuaW5pdGlhbGx5RGlzYWJsZWQ7XG5cdH1cblxuXHQvKipcblx0ICogV2hlbiBzZXQgYHRydWVgLCB0aGUgZWRpdG9yIGJlY29tZXMgcmVhZC1vbmx5LlxuXHQgKiBTZWUgaHR0cHM6Ly9ja2VkaXRvci5jb20vZG9jcy9ja2VkaXRvcjUvbGF0ZXN0L2FwaS9tb2R1bGVfY29yZV9lZGl0b3JfZWRpdG9yLUVkaXRvci5odG1sI21lbWJlci1pc1JlYWRPbmx5XG5cdCAqIHRvIGxlYXJuIG1vcmUuXG5cdCAqL1xuXHRASW5wdXQoKVxuXHRwdWJsaWMgc2V0IGRpc2FibGVkKCBpc0Rpc2FibGVkOiBib29sZWFuICkge1xuXHRcdHRoaXMuc2V0RGlzYWJsZWRTdGF0ZSggaXNEaXNhYmxlZCApO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBpbnN0YW5jZSBvZiB0aGUgZWRpdG9yIGNyZWF0ZWQgYnkgdGhpcyBjb21wb25lbnQuXG5cdCAqL1xuXHRwdWJsaWMgZ2V0IGVkaXRvckluc3RhbmNlKCk6IENLRWRpdG9yNS5FZGl0b3IgfCBudWxsIHtcblx0XHRsZXQgZWRpdG9yV2F0Y2hkb2cgPSB0aGlzLmVkaXRvcldhdGNoZG9nO1xuXG5cdFx0aWYgKHRoaXMud2F0Y2hkb2cpIHtcblx0XHRcdC8vIFRlbXBvcmFyaWx5IHVzZSB0aGUgYF93YXRjaGRvZ3NgIGludGVybmFsIG1hcCBhcyB0aGUgYGdldEl0ZW0oKWAgbWV0aG9kIHRocm93c1xuXHRcdFx0Ly8gYW4gZXJyb3Igd2hlbiB0aGUgaXRlbSBpcyBub3QgcmVnaXN0ZXJlZCB5ZXQuXG5cdFx0XHQvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2NrZWRpdG9yL2NrZWRpdG9yNS1hbmd1bGFyL2lzc3Vlcy8xNzcuXG5cdFx0XHRlZGl0b3JXYXRjaGRvZyA9IHRoaXMud2F0Y2hkb2cuX3dhdGNoZG9ncy5nZXQoIHRoaXMuaWQgKTtcblx0XHR9XG5cblx0XHRpZiAoZWRpdG9yV2F0Y2hkb2cpIHtcblx0XHRcdHJldHVybiBlZGl0b3JXYXRjaGRvZy5lZGl0b3I7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIEFmdGVyVmlld0luaXQgaW50ZXJmYWNlLlxuXHRwdWJsaWMgbmdBZnRlclZpZXdJbml0KCk6IHZvaWQge1xuXHRcdHRoaXMuYXR0YWNoVG9XYXRjaGRvZygpO1xuXHR9XG5cblx0Ly8gSW1wbGVtZW50aW5nIHRoZSBPbkRlc3Ryb3kgaW50ZXJmYWNlLlxuXHRwdWJsaWMgYXN5bmMgbmdPbkRlc3Ryb3koKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0aWYgKHRoaXMud2F0Y2hkb2cpIHtcblx0XHRcdGF3YWl0IHRoaXMud2F0Y2hkb2cucmVtb3ZlKCB0aGlzLmlkICk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLmVkaXRvcldhdGNoZG9nICYmIHRoaXMuZWRpdG9yV2F0Y2hkb2cuZWRpdG9yKSB7XG5cdFx0XHRhd2FpdCB0aGlzLmVkaXRvcldhdGNoZG9nLmRlc3Ryb3koKTtcblxuXHRcdFx0dGhpcy5lZGl0b3JXYXRjaGRvZyA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdH1cblxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZSAob25seSB3aGVuIGJpbmRpbmcgdG8gbmdNb2RlbCkuXG5cdHB1YmxpYyB3cml0ZVZhbHVlKCB2YWx1ZTogc3RyaW5nIHwgbnVsbCApOiB2b2lkIHtcblx0XHQvLyBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgd2l0aCB0aGUgYG51bGxgIHZhbHVlIHdoZW4gdGhlIGZvcm0gcmVzZXRzLlxuXHRcdC8vIEEgY29tcG9uZW50J3MgcmVzcG9uc2liaWxpdHkgaXMgdG8gcmVzdG9yZSB0byB0aGUgaW5pdGlhbCBzdGF0ZS5cblx0XHRpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFsdWUgPSAnJztcblx0XHR9XG5cblx0XHQvLyBJZiBhbHJlYWR5IGluaXRpYWxpemVkLlxuXHRcdGlmICh0aGlzLmVkaXRvckluc3RhbmNlKSB7XG5cdFx0XHQvLyBUaGUgbG9jayBtZWNoYW5pc20gcHJldmVudHMgZnJvbSBjYWxsaW5nIGBjdmFPbkNoYW5nZSgpYCBkdXJpbmcgY2hhbmdpbmdcblx0XHRcdC8vIHRoZSBlZGl0b3Igc3RhdGUuIFNlZSAjMTM5XG5cdFx0XHR0aGlzLmlzRWRpdG9yU2V0dGluZ0RhdGEgPSB0cnVlO1xuXHRcdFx0dGhpcy5lZGl0b3JJbnN0YW5jZS5zZXREYXRhKCB2YWx1ZSApO1xuXHRcdFx0dGhpcy5pc0VkaXRvclNldHRpbmdEYXRhID0gZmFsc2U7XG5cdFx0fVxuXHRcdC8vIElmIG5vdCwgd2FpdCBmb3IgaXQgdG8gYmUgcmVhZHk7IHN0b3JlIHRoZSBkYXRhLlxuXHRcdGVsc2Uge1xuXHRcdFx0Ly8gSWYgdGhlIGVkaXRvciBlbGVtZW50IGlzIGFscmVhZHkgYXZhaWxhYmxlLCB0aGVuIHVwZGF0ZSBpdHMgY29udGVudC5cblx0XHRcdHRoaXMuZGF0YSA9IHZhbHVlO1xuXG5cdFx0XHQvLyBJZiBub3QsIHRoZW4gd2FpdCB1bnRpbCBpdCBpcyByZWFkeVxuXHRcdFx0Ly8gYW5kIGNoYW5nZSBkYXRhIG9ubHkgZm9yIHRoZSBmaXJzdCBgcmVhZHlgIGV2ZW50LlxuXHRcdFx0Ly8gZml4IG51bGwgYnkgcGh1Y25kXG5cdFx0XHR0aGlzLnJlYWR5XG5cdFx0XHRcdC5waXBlKCBmaXJzdCgpIClcblx0XHRcdFx0LnN1YnNjcmliZSggKCBlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3IgKSA9PiB7XG5cblx0XHRcdFx0XHRpZiAoIXRoaXMuZGF0YSkge1xuXHRcdFx0XHRcdFx0dGhpcy5kYXRhID0gJyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVkaXRvci5zZXREYXRhKCB0aGlzLmRhdGEgKTtcblx0XHRcdFx0fSApO1xuXHRcdH1cblx0fVxuXG5cdC8vIEltcGxlbWVudGluZyB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIChvbmx5IHdoZW4gYmluZGluZyB0byBuZ01vZGVsKS5cblx0cHVibGljIHJlZ2lzdGVyT25DaGFuZ2UoIGNhbGxiYWNrOiAoIGRhdGE6IHN0cmluZyApID0+IHZvaWQgKTogdm9pZCB7XG5cdFx0dGhpcy5jdmFPbkNoYW5nZSA9IGNhbGxiYWNrO1xuXHR9XG5cblx0Ly8gSW1wbGVtZW50aW5nIHRoZSBDb250cm9sVmFsdWVBY2Nlc3NvciBpbnRlcmZhY2UgKG9ubHkgd2hlbiBiaW5kaW5nIHRvIG5nTW9kZWwpLlxuXHRwdWJsaWMgcmVnaXN0ZXJPblRvdWNoZWQoIGNhbGxiYWNrOiAoKSA9PiB2b2lkICk6IHZvaWQge1xuXHRcdHRoaXMuY3ZhT25Ub3VjaGVkID0gY2FsbGJhY2s7XG5cdH1cblxuXHQvLyBJbXBsZW1lbnRpbmcgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZSAob25seSB3aGVuIGJpbmRpbmcgdG8gbmdNb2RlbCkuXG5cdHB1YmxpYyBzZXREaXNhYmxlZFN0YXRlKCBpc0Rpc2FibGVkOiBib29sZWFuICk6IHZvaWQge1xuXHRcdC8vIElmIGFscmVhZHkgaW5pdGlhbGl6ZWQuXG5cdFx0aWYgKHRoaXMuZWRpdG9ySW5zdGFuY2UpIHtcblx0XHRcdGlmIChpc0Rpc2FibGVkKSB7XG5cdFx0XHRcdHRoaXMuZWRpdG9ySW5zdGFuY2UuZW5hYmxlUmVhZE9ubHlNb2RlKCBBTkdVTEFSX0lOVEVHUkFUSU9OX1JFQURfT05MWV9MT0NLX0lEICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmVkaXRvckluc3RhbmNlLmRpc2FibGVSZWFkT25seU1vZGUoIEFOR1VMQVJfSU5URUdSQVRJT05fUkVBRF9PTkxZX0xPQ0tfSUQgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdG9yZSB0aGUgc3RhdGUgYW55d2F5IHRvIHVzZSBpdCBvbmNlIHRoZSBlZGl0b3IgaXMgY3JlYXRlZC5cblx0XHR0aGlzLmluaXRpYWxseURpc2FibGVkID0gaXNEaXNhYmxlZDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIHRoZSBlZGl0b3IgaW5zdGFuY2UsIHNldHMgaW5pdGlhbCBlZGl0b3IgZGF0YSwgdGhlbiBpbnRlZ3JhdGVzXG5cdCAqIHRoZSBlZGl0b3Igd2l0aCB0aGUgQW5ndWxhciBjb21wb25lbnQuIFRoaXMgbWV0aG9kIGRvZXMgbm90IHVzZSB0aGUgYGVkaXRvci5zZXREYXRhKClgXG5cdCAqIGJlY2F1c2Ugb2YgdGhlIGlzc3VlIGluIHRoZSBjb2xsYWJvcmF0aW9uIG1vZGUgKCM2KS5cblx0ICovXG5cdHByaXZhdGUgYXR0YWNoVG9XYXRjaGRvZygpIHtcblx0XHRjb25zdCBjcmVhdG9yID0gYXN5bmMgKCBlbGVtZW50OiBIVE1MRWxlbWVudCwgY29uZmlnOiBDS0VkaXRvcjUuQ29uZmlnICkgPT4ge1xuXHRcdFx0cmV0dXJuIHRoaXMubmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCBhc3luYyAoKSA9PiB7XG5cdFx0XHRcdHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmFwcGVuZENoaWxkKCBlbGVtZW50ICk7XG5cblx0XHRcdFx0Y29uc3QgZWRpdG9yID0gYXdhaXQgdGhpcy5lZGl0b3IhLmNyZWF0ZSggZWxlbWVudCwgY29uZmlnICk7XG5cblx0XHRcdFx0aWYgKHRoaXMuaW5pdGlhbGx5RGlzYWJsZWQpIHtcblx0XHRcdFx0XHRlZGl0b3IuZW5hYmxlUmVhZE9ubHlNb2RlKCBBTkdVTEFSX0lOVEVHUkFUSU9OX1JFQURfT05MWV9MT0NLX0lEICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0XHR0aGlzLnJlYWR5LmVtaXQoIGVkaXRvciApO1xuXHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0dGhpcy5zZXRVcEVkaXRvckV2ZW50cyggZWRpdG9yICk7XG5cblx0XHRcdFx0cmV0dXJuIGVkaXRvcjtcblx0XHRcdH0gKTtcblx0XHR9O1xuXG5cdFx0Y29uc3QgZGVzdHJ1Y3RvciA9IGFzeW5jICggZWRpdG9yOiBDS0VkaXRvcjUuRWRpdG9yICkgPT4ge1xuXHRcdFx0YXdhaXQgZWRpdG9yLmRlc3Ryb3koKTtcblxuXHRcdFx0Ly8gdGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQucmVtb3ZlQ2hpbGQoIHRoaXMuZWRpdG9yRWxlbWVudCEgKTtcblx0XHR9O1xuXG5cdFx0Y29uc3QgZW1pdEVycm9yID0gKCkgPT4ge1xuXHRcdFx0dGhpcy5uZ1pvbmUucnVuKCAoKSA9PiB7XG5cdFx0XHRcdHRoaXMuZXJyb3IuZW1pdCgpO1xuXHRcdFx0fSApO1xuXHRcdH07XG5cblx0XHRjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggdGhpcy50YWdOYW1lICk7XG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRDb25maWcoKTtcblxuXHRcdHRoaXMuZWRpdG9yRWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBCYXNlZCBvbiB0aGUgcHJlc2VuY2Ugb2YgdGhlIHdhdGNoZG9nIGRlY2lkZSBob3cgdG8gaW5pdGlhbGl6ZSB0aGUgZWRpdG9yLlxuXHRcdGlmICh0aGlzLndhdGNoZG9nKSB7XG5cdFx0XHQvLyBXaGVuIHRoZSBjb250ZXh0IHdhdGNoZG9nIGlzIHBhc3NlZCBhZGQgdGhlIG5ldyBpdGVtIHRvIGl0IGJhc2VkIG9uIHRoZSBwYXNzZWQgY29uZmlndXJhdGlvbi5cblx0XHRcdHRoaXMud2F0Y2hkb2cuYWRkKCB7XG5cdFx0XHRcdGlkOiB0aGlzLmlkLFxuXHRcdFx0XHR0eXBlOiAnZWRpdG9yJyxcblx0XHRcdFx0Y3JlYXRvcixcblx0XHRcdFx0ZGVzdHJ1Y3Rvcixcblx0XHRcdFx0c291cmNlRWxlbWVudE9yRGF0YTogZWxlbWVudCxcblx0XHRcdFx0Y29uZmlnXG5cdFx0XHR9ICk7XG5cblx0XHRcdHRoaXMud2F0Y2hkb2cub24oICdpdGVtRXJyb3InLCAoIF8sIHsgaXRlbUlkIH0gKSA9PiB7XG5cdFx0XHRcdGlmIChpdGVtSWQgPT09IHRoaXMuaWQpIHtcblx0XHRcdFx0XHRlbWl0RXJyb3IoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBJbiB0aGUgb3RoZXIgY2FzZSBjcmVhdGUgdGhlIHdhdGNoZG9nIGJ5IGhhbmQgdG8ga2VlcCB0aGUgZWRpdG9yIHJ1bm5pbmcuXG5cdFx0XHRjb25zdCBlZGl0b3JXYXRjaGRvZzogQ0tFZGl0b3I1LkVkaXRvcldhdGNoZG9nID0gbmV3IEVkaXRvcldhdGNoZG9nKCB0aGlzLmVkaXRvciApO1xuXG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5zZXRDcmVhdG9yKCBjcmVhdG9yICk7XG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5zZXREZXN0cnVjdG9yKCBkZXN0cnVjdG9yICk7XG5cdFx0XHRlZGl0b3JXYXRjaGRvZy5vbiggJ2Vycm9yJywgZW1pdEVycm9yICk7XG5cblx0XHRcdHRoaXMuZWRpdG9yV2F0Y2hkb2cgPSBlZGl0b3JXYXRjaGRvZztcblxuXHRcdFx0dGhpcy5lZGl0b3JXYXRjaGRvZy5jcmVhdGUoIGVsZW1lbnQsIGNvbmZpZyApO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgZ2V0Q29uZmlnKCkge1xuXHRcdGlmICh0aGlzLmRhdGEgJiYgdGhpcy5jb25maWcuaW5pdGlhbERhdGEpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggJ0VkaXRvciBkYXRhIHNob3VsZCBiZSBwcm92aWRlZCBlaXRoZXIgdXNpbmcgYGNvbmZpZy5pbml0aWFsRGF0YWAgb3IgYGRhdGFgIHByb3BlcnRpZXMuJyApO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5jb25maWcgfTtcblxuXHRcdC8vIE1lcmdlIHR3byBwb3NzaWJsZSB3YXlzIG9mIHByb3ZpZGluZyBkYXRhIGludG8gdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIGZpZWxkLlxuXHRcdGNvbnN0IGluaXRpYWxEYXRhID0gdGhpcy5jb25maWcuaW5pdGlhbERhdGEgfHwgdGhpcy5kYXRhO1xuXG5cdFx0aWYgKGluaXRpYWxEYXRhKSB7XG5cdFx0XHQvLyBEZWZpbmUgdGhlIGBjb25maWcuaW5pdGlhbERhdGFgIG9ubHkgd2hlbiB0aGUgaW5pdGlhbCBjb250ZW50IGlzIHNwZWNpZmllZC5cblx0XHRcdGNvbmZpZy5pbml0aWFsRGF0YSA9IGluaXRpYWxEYXRhO1xuXHRcdH1cblxuXHRcdHJldHVybiBjb25maWc7XG5cdH1cblxuXHQvKipcblx0ICogSW50ZWdyYXRlcyB0aGUgZWRpdG9yIHdpdGggdGhlIGNvbXBvbmVudCBieSBhdHRhY2hpbmcgcmVsYXRlZCBldmVudCBsaXN0ZW5lcnMuXG5cdCAqL1xuXHRwcml2YXRlIHNldFVwRWRpdG9yRXZlbnRzKCBlZGl0b3I6IENLRWRpdG9yNS5FZGl0b3IgKTogdm9pZCB7XG5cdFx0Y29uc3QgbW9kZWxEb2N1bWVudCA9IGVkaXRvci5tb2RlbC5kb2N1bWVudDtcblx0XHRjb25zdCB2aWV3RG9jdW1lbnQgPSBlZGl0b3IuZWRpdGluZy52aWV3LmRvY3VtZW50O1xuXG5cdFx0bW9kZWxEb2N1bWVudC5vbiggJ2NoYW5nZTpkYXRhJywgKCBldnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2NoYW5nZTpkYXRhJz4gKSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0aWYgKHRoaXMuY3ZhT25DaGFuZ2UgJiYgIXRoaXMuaXNFZGl0b3JTZXR0aW5nRGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBlZGl0b3IuZ2V0RGF0YSgpO1xuXG5cdFx0XHRcdFx0dGhpcy5jdmFPbkNoYW5nZSggZGF0YSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy5jaGFuZ2UuZW1pdCggeyBldmVudDogZXZ0LCBlZGl0b3IgfSApO1xuXHRcdFx0fSApO1xuXHRcdH0gKTtcblxuXHRcdHZpZXdEb2N1bWVudC5vbiggJ2ZvY3VzJywgKCBldnQ6IENLRWRpdG9yNS5FdmVudEluZm88J2ZvY3VzJz4gKSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0dGhpcy5mb2N1cy5lbWl0KCB7IGV2ZW50OiBldnQsIGVkaXRvciB9ICk7XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXG5cdFx0dmlld0RvY3VtZW50Lm9uKCAnYmx1cicsICggZXZ0OiBDS0VkaXRvcjUuRXZlbnRJbmZvPCdibHVyJz4gKSA9PiB7XG5cdFx0XHR0aGlzLm5nWm9uZS5ydW4oICgpID0+IHtcblx0XHRcdFx0aWYgKHRoaXMuY3ZhT25Ub3VjaGVkKSB7XG5cdFx0XHRcdFx0dGhpcy5jdmFPblRvdWNoZWQoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuYmx1ci5lbWl0KCB7IGV2ZW50OiBldnQsIGVkaXRvciB9ICk7XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXHR9XG59XG4iXX0=