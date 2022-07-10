/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md.
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CKEditorComponent } from './ckeditor.component';
export class CKEditorModule {
}
CKEditorModule.decorators = [
    { type: NgModule, args: [{
                imports: [FormsModule, CommonModule],
                declarations: [CKEditorComponent],
                exports: [CKEditorComponent]
            },] }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2tlZGl0b3IubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NrZWRpdG9yL2NrZWRpdG9yLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFFSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFPekQsTUFBTSxPQUFPLGNBQWM7OztZQUwxQixRQUFRLFNBQUU7Z0JBQ1YsT0FBTyxFQUFFLENBQUUsV0FBVyxFQUFFLFlBQVksQ0FBRTtnQkFDdEMsWUFBWSxFQUFFLENBQUUsaUJBQWlCLENBQUU7Z0JBQ25DLE9BQU8sRUFBRSxDQUFFLGlCQUFpQixDQUFFO2FBQzlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBsaWNlbnNlIENvcHlyaWdodCAoYykgMjAwMy0yMDIyLCBDS1NvdXJjZSBIb2xkaW5nIHNwLiB6IG8uby4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuICogRm9yIGxpY2Vuc2luZywgc2VlIExJQ0VOU0UubWQuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgQ29tbW9uTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcclxuaW1wb3J0IHsgRm9ybXNNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XHJcbmltcG9ydCB7IENLRWRpdG9yQ29tcG9uZW50IH0gZnJvbSAnLi9ja2VkaXRvci5jb21wb25lbnQnO1xyXG5cclxuQE5nTW9kdWxlKCB7XHJcblx0aW1wb3J0czogWyBGb3Jtc01vZHVsZSwgQ29tbW9uTW9kdWxlIF0sXHJcblx0ZGVjbGFyYXRpb25zOiBbIENLRWRpdG9yQ29tcG9uZW50IF0sXHJcblx0ZXhwb3J0czogWyBDS0VkaXRvckNvbXBvbmVudCBdXHJcbn0gKVxyXG5leHBvcnQgY2xhc3MgQ0tFZGl0b3JNb2R1bGUge31cclxuIl19