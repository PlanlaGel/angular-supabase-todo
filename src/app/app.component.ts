/* import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'angular-supabase-todo';
}
 */

import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  VERSION as ngVersion,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Template-driven form için
import { SupabaseService } from './services/supabase.service';
import { Todo } from './models/todo.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule], // FormsModule'ı ekleyin
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Performans için
})
export class AppComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef); // ChangeDetectorRef ekleyin

  newTodoText: string = '';
  todos$: Observable<Todo[]> = this.supabaseService.todos$; // Servisten observable'ı al
  editingTodoId: number | null = null;
  editingTodoText: string = '';
  public readonly angularVersion = ngVersion.full; // Angular versiyonunu göstermek için

  async ngOnInit() {
    await this.supabaseService.fetchTodos();
    this.supabaseService.listenToTodoChanges();
    this.cdr.detectChanges();
  }

  async addTodo() {
    if (!this.newTodoText.trim()) return;
    const addedTodo = await this.supabaseService.addTodo(this.newTodoText);
    if (addedTodo) {
      this.newTodoText = '';
    }
  }

  async toggleComplete(todo: Todo) {
    if (todo.id === undefined) return;
    await this.supabaseService.updateTodoStatus(todo.id, !todo.is_completed);
  }

  async deleteTodo(todo: Todo) {
    if (todo.id === undefined) return;
    await this.supabaseService.deleteTodo(todo.id);
  }

  startEdit(todo: Todo) {
    if (todo.id === undefined) return;
    this.editingTodoId = todo.id;
    this.editingTodoText = todo.task;
    // Değişiklik algılamayı tetikle, çünkü `editingTodoId` ve `editingTodoText` değişti
    // ve bu @if bloklarının yeniden değerlendirilmesini gerektirebilir.
    this.cdr.detectChanges();
  }

  async saveEdit(todo: Todo) {
    if (this.editingTodoId === null || !this.editingTodoText.trim()) return;
    const updated = await this.supabaseService.updateTodoTask(
      this.editingTodoId,
      this.editingTodoText
    );
    if (updated) {
      this.cancelEdit(); // Bu zaten cdr.detectChanges() çağıracak
    }
  }

  cancelEdit() {
    this.editingTodoId = null;
    this.editingTodoText = '';
    this.cdr.detectChanges(); // Arayüzün güncellenmesi için
  }

  // trackById fonksiyonu artık @for içinde 'track todo.id' ile sağlandığı için kaldırılabilir.
  // trackById(index: number, item: Todo) {
  //   return item.id;
  // }
}
